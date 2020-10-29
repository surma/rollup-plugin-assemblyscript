import { instancePromise } from "asc:./addition.ts";

instancePromise.then(instance => {
  alert(instance.exports.add(40, 2));
});
