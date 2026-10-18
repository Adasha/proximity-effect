// Runs tests/bench.html in headless Chrome and prints the results.
//
//   node scripts/bench.js [--n 1000,5000] [--styles all|filter|layout] [--baseline <dir>] [--chrome <path>]
//
// --baseline serves another copy of src/ (for example a git worktree of an
// older commit) and benchmarks it alongside the current one.
// Chrome is found from --chrome, $CHROME_PATH, or the Puppeteer cache.
// No dependencies: it speaks the DevTools protocol over Node's WebSocket.

import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { serve, launch } from "./chrome.js";

const { values: args } = parseArgs({
    options: {
        n:        { type: "string", default: "1000,5000" },
        styles:   { type: "string", default: "all" },
        baseline: { type: "string" },
        chrome:   { type: "string" },
    },
});

const root   = resolve(import.meta.dirname, "..");
const sizes  = args.n.split(",").map(Number);
const libs   = { current: "/src/ProximityEffect.js" };
const mounts = { "/": root };
if (args.baseline)
{
    libs.baseline = "/baseline/ProximityEffect.js";
    mounts["/baseline/"] = args.baseline;
}

// the repo at /, and the baseline src at /baseline/
const server  = await serve(mounts);
const browser = await launch(args.chrome);


async function run(lib, n)
{
    const page = await browser.open(`${server.origin}/tests/bench.html?n=${n}&styles=${args.styles}&lib=${lib}`);
    // poll rather than await a promise, so a page error can't hang the run
    for (let i=0; i<600; i++)
    {
        const value = JSON.parse(await page.evaluate("JSON.stringify(window.benchResult ?? null)") ?? "null");
        if (value)
        {
            await page.close();
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
    await browser.close();
    server.close();
}
