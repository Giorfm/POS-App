const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'server', 'load-components.js');

if (!fs.existsSync(targetFile)) {
  console.log('[patch-next] load-components.js not found, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(targetFile, 'utf8');

if (content.includes('makeNullResistantProxy')) {
  console.log('[patch-next] load-components.js is already patched.');
  process.exit(0);
}

const marker = 'async function loadClientReferenceManifest(manifestPath, entryName, attempts) {';
if (!content.includes(marker)) {
  console.warn('[patch-next] Warning: loadClientReferenceManifest signature not found in load-components.js');
  process.exit(0);
}

const helperAndReplacement = `
function makeNullResistantProxy(target) {
    if (!target || typeof target !== 'object') return target;
    return new Proxy(target, {
        get(t, prop) {
            if (typeof prop === 'string') {
                if (prop in t) return t[prop];
                const withoutNull = prop.replace(/\\0/g, '');
                if (withoutNull in t) return t[withoutNull];
                const withNull = prop.replace(/#/g, '\\0#');
                if (withNull in t) return t[withNull];
            }
            return t[prop];
        },
        has(t, prop) {
            if (typeof prop === 'string') {
                if (prop in t) return true;
                if (prop.replace(/\\0/g, '') in t) return true;
                if (prop.replace(/#/g, '\\0#') in t) return true;
            }
            return prop in t;
        }
    });
}
async function loadClientReferenceManifest(manifestPath, entryName, attempts) {
    try {
        const context = await evalManifestWithRetries(manifestPath, attempts);
        let manifest = context.__RSC_MANIFEST[entryName];
        if (manifest) {
            manifest = {
                ...manifest,
                clientModules: makeNullResistantProxy(manifest.clientModules),
                ssrModuleMapping: makeNullResistantProxy(manifest.ssrModuleMapping),
                rscModuleMapping: makeNullResistantProxy(manifest.rscModuleMapping),
            };
        }
        return manifest;
    } catch (err) {
        return undefined;
    }
}
`.trim();

content = content.replace(
  /async function loadClientReferenceManifest\(manifestPath, entryName, attempts\) {[\s\S]*?catch\s*\(\w+\)\s*{[\s\S]*?}\s*}/,
  helperAndReplacement
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('[patch-next] Successfully patched load-components.js for null byte resistance!');
