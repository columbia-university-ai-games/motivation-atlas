import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2]) throw new Error('Pass the absolute node_modules path containing the pinned libraries and esbuild. See SOURCE.md.');
const modules = path.resolve(process.argv[2]);
const require = createRequire(path.join(modules, '../package.json'));
const { build } = require('esbuild');
for (const [name, version] of [['esbuild','0.25.12'],['three','0.186.1'],['@dimforge/rapier3d-compat','0.21.0']]) {
  const installed = JSON.parse(fs.readFileSync(path.join(modules,name,'package.json'),'utf8')).version;
  if (installed !== version) throw new Error(name + ': expected ' + version + ', got ' + installed);
}
const entries = {
  three: "export * from 'three'; export {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'; export {Sky} from 'three/addons/objects/Sky.js'; export {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';",
  rapier: "export {default} from '@dimforge/rapier3d-compat';",
};
for (const [name,contents] of Object.entries(entries)) await build({stdin:{contents,resolveDir:path.dirname(modules)},bundle:true,format:'esm',target:'es2022',minify:true,legalComments:'inline',outfile:path.join(root,'vendor',name+'.js')});
