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
const { promises: fsp } = require("fs");
const { basename } = require("path");

const MARKER = "asc:";
const PREFIX_MATCHER = /^asc:(.+)$/;
const defaultOpts = {
  matcher: PREFIX_MATCHER,
  compilerOptions: {}
};

function asc(opts) {
  opts = { ...defaultOpts, ...opts };

  return {
    name: "assemblyscript",
    async resolveId(prefixedId, importee) {
      const matches = opts.matcher.exec(prefixedId);
      if (!matches) {
        return;
      }
      const {id} = await this.resolve(matches[1], importee);
      this.addWatchFile(id);
      return MARKER + id;
    },
    async load(id) {
      if (!id.startsWith(MARKER)) {
        return;
      }
      id = id.slice(MARKER.length);
      const fileName = basename(id).replace(/\.[^.]+$/, "");
      const ascCode = await fsp.readFile(id, "utf8");
      await asCompiler.ready;
      const { stderr, binary } = asCompiler.compileString(
        ascCode,
        opts.compilerOptions
      );
      if (!binary) {
        this.error(stderr.toString());
        return;
      }
      const referenceId = this.emitFile({
        type: "asset",
        name: `${fileName}.wasm`,
        source: Buffer.from(binary.buffer)
      });
      return `

        const wasmUrl = import.meta.ROLLUP_FILE_URL_${referenceId}
        const modulePromise = /*@__PURE__*/(() => WebAssembly.compileStreaming(fetch(wasmUrl)))();
        const instancePromise = /*@__PURE__*/(() => modulePromise.then(module => WebAssembly.instantiate(module, {})))();
        export default wasmUrl;
        export {wasmUrl, modulePromise, instancePromise};
      `;
    }
  };
}

module.exports = { asc, PREFIX_MATCHER };
