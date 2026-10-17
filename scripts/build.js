import { build } from "esbuild";
import { copyFile, readFile, rm, writeFile } from "node:fs/promises";

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

// Hand-written type declarations (checked by tests/api.test.js and `npm run typecheck`).
await copyFile("src/ProximityEffect.d.ts", `${outdir}/proximity-effect.d.ts`);

// The global declaration for the classic script imports the module's types,
// whose file is renamed in dist.
const globalTypes = await readFile("src/ProximityEffect.global.d.ts", "utf8");
await writeFile(`${outdir}/proximity-effect.global.d.ts`,
    globalTypes.replace(`from "./ProximityEffect.js"`, `from "./proximity-effect.js"`));

console.log(`Built ${outdir}/proximity-effect.mjs, ${outdir}/proximity-effect.min.js and their type declarations`);
