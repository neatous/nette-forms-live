// Builds dist/ with esbuild: an ES module for bundlers and an IIFE that sets window.NetteFormsLive.
import { build } from 'esbuild';

// ES2020 syntax runs in every browser of the browserslist in package.json. esbuild would put "use strict" at the top
// of the file, outside the IIFE, where it makes a whole concatenated bundle strict (when the file comes first) or does
// nothing (anywhere else); it is turned off and the IIFE builds get it inside a wrapping function instead.
const common = {
    bundle: true,
    target: ['es2020'],
    logLevel: 'info',
    legalComments: 'none',
    tsconfigRaw: { compilerOptions: { alwaysStrict: false } },
};

const strictWrapper = { banner: { js: '(function () {\n"use strict";' }, footer: { js: '})();' } };

await Promise.all([
    build({ ...common, entryPoints: ['src/nette-forms-live.ts'], format: 'esm', outfile: 'dist/nette-forms-live.esm.js' }),
    build({ ...common, ...strictWrapper, entryPoints: ['src/global.ts'], format: 'iife', outfile: 'dist/nette-forms-live.js' }),
    build({ ...common, ...strictWrapper, entryPoints: ['src/global.ts'], format: 'iife', minify: true, outfile: 'dist/nette-forms-live.min.js' }),
]);
