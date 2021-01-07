import { modulePromise } from "asc:./subtraction.ts";

modulePromise
  .then((module) => WebAssembly.instantiate(module, {}))
  .then((instance) => {
    assert(instance.exports.subtract(40, 2) === 38);
  });

function assert(val) {
  if (!val) {
    throw Error(`Assertaion failed`);
  }
}
