import { build } from "esbuild";
import { readFile, rm } from "node:fs/promises";

const entry = "src/ProximityEffect.js";
const outdir = "dist";

// Matches the syntax used in src (private fields and methods).
const target = "es2022";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const banner = { js: `/*! ${pkg.name} v${pkg.version} | ${pkg.license} | ${pkg.repository.url} */` };

await rm(outdir, { recursive: true, force: true });

await Promise.all([
    // ES module for bundlers and <script type="module">.
    // Left unminified: consumers' bundlers minify it themselves.
    build({
        entryPoints: [entry],
        outfile: `${outdir}/proximity-effect.mjs`,
        format: "esm",
        target,
        bundle: true,
        legalComments: "none",
        banner,
    }),

    // Classic script for <script src> / CDN use: exposes window.ProximityEffect.
    build({
        stdin: {
            contents: `import ProximityEffect from "./${entry}"; globalThis.ProximityEffect = ProximityEffect;`,
            resolveDir: ".",
            sourcefile: "global-entry.js",
        },
        outfile: `${outdir}/proximity-effect.min.js`,
        format: "iife",
        target,
        bundle: true,
        minify: true,
        sourcemap: true,
        legalComments: "none",
        banner,
    }),
]);

console.log(`Built ${outdir}/proximity-effect.mjs and ${outdir}/proximity-effect.min.js`);
