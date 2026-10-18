# Contributing

Thanks for helping. Bug reports, fixes, demos and documentation improvements are all welcome. Please follow the [code of conduct](CODE_OF_CONDUCT.md).

For a security problem, please don't open a public issue: see [SECURITY.md](SECURITY.md) instead.

## Reporting a bug

Open an [issue](https://github.com/Adasha/proximity-effect/issues/new/choose) using the bug report template. The most useful thing you can include is the smallest piece of code that shows the problem, along with the browser and how you load the script.

For a new feature, check the [roadmap](README.md#roadmap) first, then open a feature request to discuss it before writing much code.

## Setting up

You'll need Node 24 (there's an `.nvmrc`, so `nvm use` will sort you out).

```sh
npm install
npm test            # run the test suite once
npm run test:watch  # re-run tests as you edit
npm run lint        # check the code
npm run typecheck   # check the TypeScript declarations
npm run build       # build the files in dist/
```

Two more scripts drive headless Chrome, so they need Chrome installed (they look in `$CHROME_PATH`, then the Puppeteer cache):

```sh
npm run a11y        # check every demo with axe-core, plus contrast, focus and reduced motion
npm run bench       # time the animation with 1,000 and 5,000 nodes
```

The demos in `demos/` import the source directly, so you can see a change without building. They need serving over HTTP rather than opening as files, e.g. with `npx serve` from the project folder, then opening `/demos/`.

## Making a change

- Work from the latest default branch, in a branch of your own.
- Every bug fix needs a test that fails without it. Tests live in `tests/` and run in Vitest with jsdom.
- Add a line to the `[Unreleased]` section of [CHANGELOG.md](CHANGELOG.md) for anything a user would notice.
- If you change the public API, update `src/ProximityEffect.d.ts` and [docs/API.md](docs/API.md) to match. `tests/api.test.js` checks the declarations list the same members as the class, so it will tell you if they drift apart.
- Keep the library free of runtime dependencies.
- Check values before changing anything, and throw a `TypeError` for the wrong type or a `RangeError` for a value that isn't allowed, as the rest of the code does.
- The effect must only ever write inline styles to the nodes it's given. It must not touch ARIA attributes, `hidden`, `tabindex`, text or the DOM structure.
- Match the existing code style: four-space indents, braces on their own lines, and double quotes in new code. `npm run lint` catches most other problems.
- Before opening a pull request, run `npm run lint`, `npm test`, `npm run typecheck` and `npm run build`. CI runs them all too.

## Writing documentation

Documentation is written in British English, in short, plain sentences. Describe what something does for the person using it, and give an example where it helps.

## Licence

By contributing, you agree that your contributions are licensed under the [Mozilla Public License 2.0](LICENSE), like the rest of the project.
