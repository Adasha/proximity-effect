// Shared by the scripts that drive pages in headless Chrome (bench.js, a11y.js):
// a static file server and a minimal DevTools protocol client.
// No dependencies: it speaks the protocol over Node's WebSocket.
// Chrome is found from the given path, $CHROME_PATH, or the Puppeteer cache.

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, readdir, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, resolve, extname, sep } from "node:path";


const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css" };


/**
 * Serve folders over HTTP on a free local port.
 * @param {Object<string, string>} mounts URL prefixes ("/", "/baseline/") mapped to folders.
 * @returns {Promise<{origin: string, close: Function}>}
 */
export async function serve(mounts)
{
    // longest prefix first, so "/baseline/" wins over "/"
    const entries = Object.entries(mounts)
        .map(([prefix, dir]) => [prefix, resolve(dir)])
        .sort((a, b) => b[0].length - a[0].length);

    // the file a request path maps to, or null if it would fall outside the
    // folder being served (decoding turns %2F.. into a real ../)
    const fileFor = (url) =>
    {
        const path  = decodeURIComponent(new URL(url, "http://x").pathname),
              mount = entries.find(([prefix]) => path.startsWith(prefix));
        if (!mount)
        {
            return null;
        }
        const [prefix, base] = mount,
              file           = resolve(base, `./${path.slice(prefix.length)}`);
        return file.startsWith(base + sep) ? file : null;
    };

    const server = createServer(async (req, res) =>
    {
        try
        {
            const file = fileFor(req.url);
            if (!file)
            {
                throw new Error("Outside the served folder.");
            }
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

    return {
        origin: `http://127.0.0.1:${server.address().port}`,
        close:  () => server.close(),
    };
}



async function findChrome(explicit)
{
    explicit ??= process.env.CHROME_PATH;
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



/**
 * Start headless Chrome and connect to it.
 * @param {string} [chromePath] The Chrome executable.
 * @returns {Promise<{send: Function, open: Function, close: Function}>}
 */
export async function launch(chromePath)
{
    const profile = await mkdtemp(join(tmpdir(), "pe-chrome-"));
    const chrome  = spawn(await findChrome(chromePath), [
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

    const socket = new WebSocket(wsUrl);
    await new Promise(done => socket.addEventListener("open", done, { once: true }));
    let nextId = 0;
    const pending = new Map(),
          waiting = new Set();
    socket.addEventListener("message", ({ data }) =>
    {
        const msg = JSON.parse(data);
        for (const waiter of waiting)
        {
            if (waiter.method===msg.method && waiter.sessionId===msg.sessionId)
            {
                waiting.delete(waiter);
                waiter.done(msg.params);
            }
        }
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

    // resolves with the next event of that name from that session
    const next = (method, sessionId) => new Promise(done => waiting.add({ method, sessionId, done }));

    // open a tab and wait for the page to load, returning helpers bound to it
    const open = async (url) =>
    {
        const { targetId }  = await send("Target.createTarget", { url: "about:blank" });
        const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
        await send("Page.enable", {}, sessionId);
        const loaded = next("Page.loadEventFired", sessionId);
        await send("Page.navigate", { url }, sessionId);
        await loaded;
        return {
            send:     (method, params) => send(method, params, sessionId),
            // evaluate an expression in the page, awaiting a promise, and return its JSON value
            evaluate: async (expression) =>
            {
                const { result, exceptionDetails } = await send("Runtime.evaluate",
                    { expression, awaitPromise: true, returnByValue: true }, sessionId);
                if (exceptionDetails)
                {
                    throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
                }
                return result.value;
            },
            close:    () => send("Target.closeTarget", { targetId }),
        };
    };

    const close = async () =>
    {
        socket.close();
        const exited = new Promise(done => chrome.once("exit", done));
        chrome.kill();
        await exited;
        await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    };

    return { send, open, close };
}
