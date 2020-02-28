# rollup-plugin-assemblyscript

A [Rollup] plugin that allows you to import [AssemblyScript] files and compiles them on-the-fly.

## Example

```js
// rollup.config.js
import { asc } from "rollup-plugin-assemblyscript";
export default {
  input: "main.js",
  output: {
    dir: "dist"
  },
  plugins: [
    asc({
      compilerOptions: {
        runtime: "none"
      }
    })
  ]
};
```

```js
// main.js
import wasmUrl from "asc:./addition.as";

WebAssembly.instantiateStreaming(fetch(wasmUrl), {}).then(({ instance }) =>
  console.log(instance.exports.add(40, 2))
);
```

```js
// addition.as
export function add(a: i32, b: i32): i32 {
  return a + b;
}
```

---

License Apache-2.0

[rollup]: https://rollupjs.org
[assemblyscript]: https://assemblyscript.org
