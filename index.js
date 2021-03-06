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
const { basename, join } = require("path");
const { tmpdir } = require("os");
const fsp = require("fs/promises");

const MARKER = "asc:";
const PREFIX_MATCHER = /^asc:(.+)$/;
const defaultOpts = {
  matcher: PREFIX_MATCHER,
  compilerOptions: {},
  useAsBind: false
};

// This special import contains the `compileStreaming` polyfill.
const SPECIAL_IMPORT = "__rollup-plugin-assemblyscript_compileStreaming";

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
      await asCompiler.ready;
      await new Promise(async (resolve, reject) => {
        const params = [
          opts.useAsBind
            ? [
                require.resolve("as-bind/lib/assembly/as-bind.ts"),
                "--exportRuntime"
              ]
            : [],
          id,
          "-b",
          wasmFilePath,
          ...Object.entries(opts.compilerOptions).map(([opt, val]) => {
            if (val === true) {
              return `--${opt}`;
            }
            return `--${opt}=${val}`;
          }),
          opts.fileExtension ? [`--extension`, opts.fileExtension] : []
        ].flat();
        asCompiler.main(params, async err => {
          if (err) {
            return reject(`${err}`);
          }
          resolve();
        });
      });
      const source = await fsp.readFile(wasmFilePath);
      const referenceId = this.emitFile({
        type: "asset",
        name: `${fileName}.wasm`,
        source
      });
      if (opts.compilerOptions.sourceMap) {
        const sourceMapFileName = wasmFileName + ".map";
        const sourceMapFilePath = join(folder, sourceMapFileName);
        this.emitFile({
          type: "asset",
          fileName: `assets/${sourceMapFileName}`,
          source: await fsp.readFile(sourceMapFilePath)
        });
      }

      return `
        import {compileStreaming} from "${SPECIAL_IMPORT}";
        export const wasmUrl = import.meta.ROLLUP_FILE_URL_${referenceId};
        export default wasmUrl;
      `;
    }
  };
}

module.exports = { asc, PREFIX_MATCHER };
