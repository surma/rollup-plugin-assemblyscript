let asc = require("../index.js").asc;

export default {
  input: "main.js",
  output: {
    file: "build/main.js",
    name: "test",
    format: "umd"
  },
  plugins: [
    asc({
      fileExtension: ".as",
      compilerOptions: {
        optimizeLevel: 3,
        runtime: "none"
        //shrinkLevel: 1,
        //importMemory: true
      }
    })
  ]
};
