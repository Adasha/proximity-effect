// Runs tests/bench.html in headless Chrome and prints the results.
//
//   node scripts/bench.js [--n 1000,5000] [--styles all|filter] [--baseline <dir>] [--chrome <path>]
//
// --baseline serves another copy of src/ (for example a git worktree of an
// older commit) and benchmarks it alongside the current one.
// Chrome is found from --chrome, $CHROME_PATH, or the Puppeteer cache.
// No dependencies: it speaks the DevTools protocol over Node's WebSocket.

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, readdir, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, resolve, extname } from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
    options: {
        n:        { type: "string", default: "1000,5000" },
        styles:   { type: "string", default: "all" },
        baseline: { type: "string" },
        chrome:   { type: "string" },
    },
});

const root  = resolve(import.meta.dirname, "..");
const sizes = args.n.split(",").map(Number);
const libs  = { current: "/src/ProximityEffect.js" };
if (args.baseline)
{
    libs.baseline = "/baseline/ProximityEffect.js";
}


// static server: the repo at /, and the baseline src at /baseline/
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };
const server = createServer(async (req, res) =>
{
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = path.startsWith("/baseline/")
        ? join(resolve(args.baseline), path.slice("/baseline/".length))
        : join(root, path);
    try
    {
        const body = await readFile(file);
        res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
        res.end(body);
    }
    catch
    {
        res.writeHead(404).end();
    }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;


async function findChrome()
{
    const explicit = args.chrome ?? process.env.CHROME_PATH;
    if (explicit)
    {
        return explicit;
    }
    const cache = join(homedir(), ".cache/puppeteer/chrome");
    if (existsSync(cache))
    {
        for (const version of (await readdir(cache)).sort().reverse())
        {
            const path = join(cache, version, "chrome-linux64/chrome");
            if (existsSync(path))
            {
                return path;
            }
        }
    }
    throw new Error("Chrome not found: pass --chrome or set CHROME_PATH.");
}


const profile = await mkdtemp(join(tmpdir(), "pe-bench-"));
const chrome  = spawn(await findChrome(), [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--window-size=1280,800", "--no-first-run", "--no-default-browser-check", "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

const wsUrl = await new Promise((done, fail) =>
{
    let log = "";
    chrome.stderr.on("data", chunk =>
    {
        log += chunk;
        const match = log.match(/DevTools listening on (ws:\/\/\S+)/);
        if (match)
        {
            done(match[1]);
        }
    });
    chrome.on("exit", code => fail(new Error(`Chrome exited (${code}):\n${log}`)));
});


// minimal DevTools protocol client
const socket = new WebSocket(wsUrl);
await new Promise(done => socket.addEventListener("open", done, { once: true }));
let nextId = 0;
const pending = new Map();
socket.addEventListener("message", ({ data }) =>
{
    const msg = JSON.parse(data);
    if (pending.has(msg.id))
    {
        const { done, fail } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? fail(new Error(msg.error.message)) : done(msg.result);
    }
});
const send = (method, params = {}, sessionId) => new Promise((done, fail) =>
{
    const id = ++nextId;
    pending.set(id, { done, fail });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
});


async function run(lib, n)
{
    const { targetId } = await send("Target.createTarget", { url: `${origin}/tests/bench.html?n=${n}&styles=${args.styles}&lib=${lib}` });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    // poll rather than await a promise, so a page error can't hang the run
    for (let i=0; i<600; i++)
    {
        const { result } = await send("Runtime.evaluate", { expression: "JSON.stringify(window.benchResult ?? null)", returnByValue: true }, sessionId);
        const value = JSON.parse(result.value ?? "null");
        if (value)
        {
            await send("Target.closeTarget", { targetId });
            return value;
        }
        await new Promise(done => setTimeout(done, 100));
    }
    throw new Error(`Benchmark timed out (${lib}, n=${n}).`);
}


try
{
    for (const n of sizes)
    {
        for (const [name, lib] of Object.entries(libs))
        {
            const result = await run(lib, n);
            console.log(`\n${name}, ${n} nodes, ${args.styles} styles`);
            for (const [key, value] of Object.entries(result))
            {
                if (key==="n" || key==="lib" || key==="styles")
                {
                    continue;
                }
                console.log(`  ${key.padEnd(24)} ${JSON.stringify(value)}`);
            }
        }
    }
}
finally
{
    socket.close();
    const exited = new Promise(done => chrome.once("exit", done));
    chrome.kill();
    await exited;
    server.close();
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
