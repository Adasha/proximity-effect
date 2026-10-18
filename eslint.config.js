import js from "@eslint/js";
import globals from "globals";

export default [
    { ignores: ["dist/", "demos/assets/", "docs/"] },

    js.configs.recommended,

    {
        files: ["src/**/*.{js,mjs}", "demos/**/*.js"],
        languageOptions: { globals: globals.browser },
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
