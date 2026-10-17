// Accessibility check: runs axe-core on a demo page in headless Chrome, at
// rest and with the pointer over the nodes, plus checks of its own that axe
// can't make (the contrast of text faded by filter: opacity(), reduced
// motion, keyboard focus as the target).
//
//   node scripts/a11y.js [--page tests/a11y.html] [--chrome <path>]
//
// The page must expose its instance as window.pe. Exits with 1 on any failure.

import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { serve, launch } from "./chrome.js";

const { values: args } = parseArgs({
    options: {
        page:   { type: "string", default: "tests/a11y.html" },
        chrome: { type: "string" },
    },
});

const root    = resolve(import.meta.dirname, "..");
const server  = await serve({ "/": root });
const browser = await launch(args.chrome);
let failures  = 0;

function report(name, problems)
{
    console.log(`${problems.length ? "FAIL" : "ok  "}  ${name}`);
    for (const problem of problems)
    {
        console.log(`        ${problem}`);
    }
    failures += problems.length;
}


// page-side helpers, added to the page as window.a11y
const helpers = `
window.a11y = {
    frames: (n = 1) => new Promise(done => { const go = () => n-- > 0 ? requestAnimationFrame(go) : done(); go(); }),

    // wait until nothing changes for a few frames
    async settled()
    {
        let last = "", still = 0;
        for (let i=0; i<600 && still<5; i++)
        {
            await this.frames();
            const now = [...pe.nodes].map(n => n.style.cssText).join("|");
            still = now===last ? still+1 : 0;
            last = now;
        }
    },

    async axe()
    {
        const { violations } = await axe.run(document, { resultTypes: ["violations"] });
        return violations.flatMap(v => v.nodes.map(n => v.id + ": " + n.target.join(" ") + " (" + v.help + ")"));
    },

    // contrast of each node's text, with the opacity of the node and its
    // ancestors (CSS opacity and filter: opacity()) blended into the text
    // colour, over the page background. Assumes the nodes have no background.
    contrast()
    {
        const rgb = (str) => str.match(/[\\d.]+/g).map(Number);
        const lum = ([r, g, b]) =>
        {
            const c = [r, g, b].map(v => { v /= 255; return v<=0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4; });
            return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2];
        };
        const bg = rgb(getComputedStyle(document.body).backgroundColor);
        return [...pe.nodes].map(node =>
        {
            let alpha = 1;
            for (let el = node; el; el = el.parentElement)
            {
                const cs = getComputedStyle(el);
                alpha *= Number(cs.opacity);
                for (const [, v, pc] of cs.filter.matchAll(/opacity\\(([\\d.]+)(%?)\\)/g))
                {
                    alpha *= pc ? v/100 : Number(v);
                }
            }
            const [r, g, b, a = 1] = rgb(getComputedStyle(node).color),
                  k  = alpha*a,
                  fg = [r, g, b].map((v, i) => v*k + bg[i]*(1-k)),
                  [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y-x),
                  size = parseFloat(getComputedStyle(node).fontSize),
                  bold = Number(getComputedStyle(node).fontWeight)>=700,
                  // WCAG large text: 18pt (24px), or 14pt (18.66px) bold
                  need = size>=24 || (bold && size>=18.66) ? 3 : 4.5;
            return { text: node.textContent.trim(), ratio: Math.round((hi+0.05)/(lo+0.05)*100)/100, need };
        }).filter(c => c.text && c.ratio<c.need).map(c => c.text + ": " + c.ratio + ":1, needs " + c.need + ":1");
    },

    // nodes not at rest (as far from the target as they can be)
    notAtRest()
    {
        return pe.nodes.filter((n, i) => pe.getNodeIndexData(i, "lastDelta")!==(pe.invert ? 0 : 1))
            .map(n => n.textContent.trim() + " is not at rest (" + n.style.cssText + ")");
    },
};`;


async function check(page)
{
    await page.evaluate(`new Promise(done => { const wait = () => window.pe ? done() : setTimeout(wait, 20); wait(); })`);
    // the instance starts just after load
    await page.evaluate(`new Promise(done => document.readyState==="complete" ? setTimeout(done) : addEventListener("load", () => setTimeout(done)))`);
    await page.evaluate(helpers);
    await page.evaluate(`new Promise((done, fail) => { const s = document.createElement("script"); s.src = "/node_modules/axe-core/axe.min.js"; s.onload = done; s.onerror = fail; document.head.append(s); })`);

    const centre = JSON.parse(await page.evaluate(`JSON.stringify((() => { const b = pe.nodes[Math.floor(pe.nodes.length/2)].getBoundingClientRect(); return { x: (b.left+b.right)/2, y: (b.top+b.bottom)/2 }; })())`));
    const mouse  = (x, y) => page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });

    await page.evaluate("a11y.settled()");
    report("axe, at rest", await page.evaluate("a11y.axe()"));
    report("text contrast, at rest", await page.evaluate("a11y.contrast()"));

    await mouse(centre.x, centre.y);
    await page.evaluate("a11y.settled()");
    report("axe, pointer over a node", await page.evaluate("a11y.axe()"));
    report("text contrast, pointer over a node", await page.evaluate("a11y.contrast()"));
    report("the pointer moves the nodes", await page.evaluate("a11y.notAtRest().length>0") ? [] : ["every node is still at rest"]);

    // keyboard focus becomes the target (if the page offers it)
    if (await page.evaluate(`!!document.getElementById("follow-focus")`))
    {
        await mouse(0, 0);
        for (let i=0; i<6; i++)
        {
            await page.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
            await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
        }
        report("keyboard focus becomes the target", await page.evaluate(`pe.target===document.activeElement && pe.nodes.includes(document.activeElement)`)
            ? [] : ["pe.target is not the focused node"]);
        await page.evaluate("document.activeElement.blur()");
        report("blurring clears the target", await page.evaluate("pe.target===null") ? [] : ["pe.target is still set"]);
    }

    // reduced motion: by default the nodes rest, and the change is picked up live
    await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await mouse(centre.x+1, centre.y);
    await page.evaluate("a11y.settled()");
    report("reduced motion: motionReduced is true", await page.evaluate("pe.motionReduced") ? [] : ["motionReduced is false"]);
    report("reduced motion: nodes stay at rest", await page.evaluate("a11y.notAtRest()"));
    report("axe, reduced motion", await page.evaluate("a11y.axe()"));
    await page.send("Emulation.setEmulatedMedia", { features: [] });
}


try
{
    const page = await browser.open(`${server.origin}/${args.page}`);
    console.log(args.page);
    await check(page);
    await page.close();
}
finally
{
    await browser.close();
    server.close();
}

console.log(failures ? `\n${failures} problem(s) found.` : "\nNo problems found.");
process.exitCode = failures ? 1 : 0;
