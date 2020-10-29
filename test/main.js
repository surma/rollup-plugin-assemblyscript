import { instancePromise } from "asc:./addition.as";

instancePromise.then(instance => {
  alert(instance.exports.add(40, 2));
});
