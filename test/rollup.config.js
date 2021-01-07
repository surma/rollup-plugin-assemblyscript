let asc = require("../index.js").asc;

export default [
  {
    input: "main.js",
    output: {
      file: "build/umd/main.js",
      name: "test",
      format: "umd",
    },
    plugins: [
      asc({
        fileExtension: ".as",
        compilerOptions: {
          optimizeLevel: 3,
          runtime: "none",
          //shrinkLevel: 1,
          //importMemory: true
        },
      }),
    ],
  },
  {
    input: "main2.js",
    output: {
      file: "build/es/main.js",
      name: "test",
      format: "es",
    },
    plugins: [asc()],
  },
];
