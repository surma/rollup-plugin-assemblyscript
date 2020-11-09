/**
 * Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const asCompiler = require("assemblyscript/cli/asc");
const { basename, join, relative } = require("path");
const { Transform } = require("stream");
const { tmpdir } = require("os");
const { promises: fsp } = require("fs");

const MARKER = "asc:";
const PREFIX_MATCHER = /^asc:(.+)$/;
const defaultOpts = {
  matcher: PREFIX_MATCHER,
  sourceMapFolder: `asc-sourcemaps`,
  sourceMapURLPattern: null,
  compilerOptions: {}
};

// Modified version of from rollup/rollup/src/utils/renderNamePatter.ts:
function renderNamePattern(pattern, replacements) {
  return pattern.replace(/\[(\w+)\]/g, (_match, type) => {
    if (!replacements.hasOwnProperty(type)) {
      throw Error(
        `"[${type}]" is not a valid placeholder in "${pattern}" pattern.`
      );
    }
    let v = replacements[type];
    if (typeof v === "function") {
      v = v();
    }
    return v;
  });
}

// This special import contains the `compileStreaming` polyfill.
const SPECIAL_IMPORT = "__rollup-plugin-assemblyscript_compileStreaming";

function streamCollector() {
  const stream = new Transform({
    transform(chunk, _enc, cb) {
      this.push(chunk);
      cb();
    }
  });
  let chunks = [];
  const result = new Promise((resolve, reject) => {
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
  return { stream, result };
}

function shouldGenerateSourceMaps(opts) {
  return opts.sourceMapURLPattern;
}

function asc(opts) {
  opts = { ...defaultOpts, ...opts };

  return {
    name: "assemblyscript",
    async resolveId(rawId, importee) {
      if (rawId === SPECIAL_IMPORT) {
        return SPECIAL_IMPORT;
      }
      const matches = opts.matcher.exec(rawId);
      if (!matches) {
        return;
      }
      const { id } = await this.resolve(matches[1], importee);
      this.addWatchFile(id);
      return MARKER + id;
    },
    async load(id) {
      if (id === SPECIAL_IMPORT) {
        return `
          export async function compileStreaming(respP) {
            if('compileStreaming' in WebAssembly) {
              return WebAssembly.compileStreaming(respP);
            }
            return respP
              .then(resp => resp.arrayBuffer())
              .then(buffer => WebAssembly.compile(buffer));
          }
        `;
      }
      if (!id.startsWith(MARKER)) {
        return;
      }
      id = id.slice(MARKER.length);
      const fileName = basename(id).replace(/\.[^.]+$/, "");
      const wasmFileName = `${fileName}.wasm`;
      const folder = tmpdir();
      const wasmFilePath = join(folder, wasmFileName);
      const sourceMapFileName = wasmFileName + ".map";
      const sourceMapFilePath = join(folder, sourceMapFileName);
      await asCompiler.ready;
      await new Promise(async (resolve, reject) => {
        const errorCollector = streamCollector();
        const params = [
          id,
          "-b",
          relative(process.env.PWD, wasmFilePath),
          ...(shouldGenerateSourceMaps(opts)
            ? [
                `--sourceMap=${renderNamePattern(opts.sourceMapURLPattern, {
                  name: sourceMapFileName
                })}`
              ]
            : []),
          ...Object.entries(opts.compilerOptions).map(([opt, val]) => {
            if (typeof val === "boolean") {
              return `--${opt}`;
            }
            return `--${opt}=${val}`;
          }),
          ...(opts.fileExtension ? [`--extension`, opts.fileExtension] : [])
        ];
        asCompiler.main(
          params,
          { stderr: errorCollector.stream },
          async err => {
            if (err) {
              errorCollector.stream.end();
              const stderr = await errorCollector.result;
              const msg = new TextDecoder().decode(stderr);
              return reject(msg);
            }
            resolve();
          }
        );
      });
      const referenceId = this.emitFile({
        type: "asset",
        name: `${fileName}.wasm`,
        source: await fsp.readFile(wasmFilePath)
      });
      if (shouldGenerateSourceMaps(opts)) {
        this.emitFile({
          type: "asset",
          fileName: join(opts.sourceMapFolder, sourceMapFileName),
          source: await fsp.readFile(sourceMapFilePath)
        });
      }

      return `
        import {compileStreaming} from "${SPECIAL_IMPORT}";
        const wasmUrl = import.meta.ROLLUP_FILE_URL_${referenceId}
        const modulePromise = /*@__PURE__*/(() => compileStreaming(fetch(wasmUrl)))();
        const instancePromise = /*@__PURE__*/(() => modulePromise.then(module => WebAssembly.instantiate(module, {})))();
        export default wasmUrl;
        export {wasmUrl, modulePromise, instancePromise};
      `;
    }
  };
}

module.exports = { asc, PREFIX_MATCHER };
