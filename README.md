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
import wasmUrl from "asc:./addition.as";

WebAssembly.instantiateStreaming(fetch(wasmUrl), {}).then(({ instance }) =>
  console.log(instance.exports.add(40, 2))
);
```

## Options

- `compilerOptions`: Options bag that is passed straight to the [AssemblyScript compiler library].
- `matcher`: A RegExp that is used to decided what imports to handle. The default is `PREFIX_MATCHER`, which will match all imports that start with `asc:`.
- `useAsBind`: Injects the [`as-bind`][as-bind] package into the compilation process for high-level type bindings. See [their README][as-bind] for details (implies `--exportRuntime`).

---

License Apache-2.0

[rollup]: https://rollupjs.org
[assemblyscript]: https://assemblyscript.org
[assemblyscript compiler library]: https://docs.assemblyscript.org/details/compiler#api
[as-bind]: https://npm.im/as-bind
