import js from "@eslint/js";
import globals from "globals";

export default [
    { ignores: ["dist/", "tests/assets/", "docs/"] },

    js.configs.recommended,

    {
        files: ["src/**/*.{js,mjs}"],
        languageOptions: { globals: globals.browser },
        rules: {
            // These flag known bugs and dead code that Sessions 2 and 3 of
            // PLAN.md fix (Session 1 makes no behaviour changes). They are
            // warnings until then; promote them back to errors afterwards.
            // (no-unused-private-class-members was promoted in Session 2.)
            "valid-typeof": "warn",
            "no-undef": "warn",
            "no-setter-return": "warn",
            "no-unused-vars": "warn",
        },
    },

    {
        // Tests run in Node with a jsdom-provided browser environment.
        files: ["tests/**/*.js"],
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
    },

    {
        files: ["scripts/**/*.js", "*.config.js"],
        languageOptions: { globals: globals.node },
    },
];
