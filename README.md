# rollup-plugin-assemblyscript

A [Rollup] plugin that allows you to import [AssemblyScript] files and compiles them on-the-fly.

## Usage

### Installation

```
$ npm install --save rollup-plugin-assemblyscript
```

### Configuration

```js
// rollup.config.js
import { asc } from "rollup-plugin-assemblyscript";

export default {
  /* ... */
  plugins: [
    // ...
    asc(options)
    // ...
  ]
};
```

And in your JavaScript code you can now import AssemblyScript as usual:

```js
// addition.as
export function add(a: i32, b: i32): i32 {
  return a + b;
}
```

```js
// main.js
import { wasmUrl } from "asc:./addition.as";

WebAssembly.instantiateStreaming(fetch(wasmUrl), {}).then(({ instance }) =>
  console.log(instance.exports.add(40, 2))
);
```

### Convenience imports

Instead of fetching and instantiating the module yourself, you can also import (a promise for) the module or the instance directly:

```js
// main.js
import { instancePromise } from "asc:./addition.as";
import { modulePromise } from "asc:./subtraction.as";

instancePromise.then(instance => {
  console.log(instance.exports.add(40, 2));
});

modulePromise
  .then(module => WebAssembly.instantiate(module, {}))
  .then(instance => {
    console.log(instance.exports.subtract(40, 2));
  });
```

Internally, the module passes `{}` to `instantiate` as the `importsObject` and will throw when the module expects any imports. If you don’t use `instancePromise`, the export will be tree-shaken and no error will occur.

## Options

- `compilerOptions`: Options bag that is passed straight to the [AssemblyScript compiler library].
- `matcher`: A RegExp that is used to decided what imports to handle. The default is `PREFIX_MATCHER`, which will match all imports that start with `asc:`.
- `sourceMapURLPattern`: A pattern rendering the full, absolute URL a source map. If not set (default), no source maps will be generated. `[name]` will be replace with the file name of the source map file. The URL needs to be absolute as relative source map URLs do not seem to be supported in browsers.
- `sourceMapFolder`: The folder inside the output directory into which source maps will be put. Default: `asc-sourcemaps`

---

License Apache-2.0

[rollup]: https://rollupjs.org
[assemblyscript]: https://assemblyscript.org
[assemblyscript compiler library]: https://docs.assemblyscript.org/details/compiler#api
