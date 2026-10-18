import fs from 'node:fs';
import type { NextConfig } from 'next';

// Workaround for Webpack 5 / @vercel/nft / React Server Components bug when project directory contains '#'
// (Webpack internally encodes '#' as '\0#', causing Node.js fs methods to throw null byte errors
// and React Server Components to fail resolving client components in clientReferenceManifest)
function sanitizePath<T>(p: T): T {
  if (typeof p === 'string' && p.includes('\0')) {
    return p.replace(/\0/g, '') as unknown as T;
  }
  return p;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeManifestJson(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj;
  for (const k of Object.keys(obj)) {
    if (typeof k === 'string' && k.includes('\0')) {
      const clean = k.replace(/\0/g, '');
      if (!(clean in obj)) {
        obj[clean] = obj[k];
      }
    }
  }
  return obj;
}

function normalizeManifestString(content: string): string {
  if (!content.includes('\0') && !content.includes('\\u0000')) {
    return content;
  }
  try {
    if (content.includes('__RSC_MANIFEST')) {
      const idx = content.indexOf(']=');
      if (idx !== -1) {
        const prefix = content.slice(0, idx + 2);
        const manifest = JSON.parse(content.slice(idx + 2));
        if (manifest.clientModules) normalizeManifestJson(manifest.clientModules);
        if (manifest.ssrModuleMapping) normalizeManifestJson(manifest.ssrModuleMapping);
        if (manifest.rscModuleMapping) normalizeManifestJson(manifest.rscModuleMapping);
        if (manifest.edgeSSRModuleMapping) normalizeManifestJson(manifest.edgeSSRModuleMapping);
        if (manifest.edgeRscModuleMapping) normalizeManifestJson(manifest.edgeRscModuleMapping);
        return prefix + JSON.stringify(manifest);
      }
    } else if (content.trim().startsWith('{')) {
      const parsed = JSON.parse(content);
      normalizeManifestJson(parsed);
      return JSON.stringify(parsed);
    }
  } catch {
    // fallback to original content if json parsing fails
  }
  return content;
}

const fsMethodsToPatch = [
  'readlink',
  'readlinkSync',
  'stat',
  'statSync',
  'lstat',
  'lstatSync',
  'realpath',
  'realpathSync',
  'readFile',
  'access',
  'accessSync',
] as const;

for (const method of fsMethodsToPatch) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orig = (fs as any)[method];
  if (typeof orig === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fs as any)[method] = function (p: any, ...args: any[]) {
      return orig.call(this, sanitizePath(p), ...args);
    };
  }
}

// Special wrapper for readFileSync to sanitize paths and augment manifests with non-null keys
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const origReadFileSync = (fs as any).readFileSync;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(fs as any).readFileSync = function (p: any, ...args: any[]) {
  const sanitized = sanitizePath(p);
  const result = origReadFileSync.call(this, sanitized, ...args);
  if (
    typeof sanitized === 'string' &&
    sanitized.includes('manifest') &&
    typeof result === 'string'
  ) {
    return normalizeManifestString(result);
  }
  return result;
};

if (fs.promises) {
  const promiseMethods = ['readlink', 'stat', 'lstat', 'realpath', 'readFile', 'access'] as const;
  for (const method of promiseMethods) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orig = (fs.promises as any)[method];
    if (typeof orig === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fs.promises as any)[method] = function (p: any, ...args: any[]) {
        return orig.call(this, sanitizePath(p), ...args);
      };
    }
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.plugins.push({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apply(compiler: any) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        compiler.hooks.compilation.tap('SanitizeNullBytesPlugin', (compilation: any) => {
          const ifs = compilation.inputFileSystem;
          if (ifs) {
            const methods = ['readlink', 'stat', 'lstat', 'readFile', 'readJson'];
            for (const m of methods) {
              const orig = ifs[m];
              if (typeof orig === 'function') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ifs[m] = function (p: any, ...args: any[]) {
                  return orig.call(this, sanitizePath(p), ...args);
                };
              }
            }
          }

          // Also sanitize manifest assets in Webpack compilation
          if (compilation.hooks.processAssets) {
            compilation.hooks.processAssets.tap(
              {
                name: 'NormalizeManifestAssetsPlugin',
                stage: compilation.constructor.PROCESS_ASSETS_STAGE_REPORT || 5000,
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (assets: any) => {
                for (const assetName of Object.keys(assets)) {
                  if (!assetName.includes('manifest')) continue;
                  try {
                    const asset = assets[assetName];
                    const raw = asset.source();
                    const content = typeof raw === 'string' ? raw : raw.toString('utf-8');
                    const updated = normalizeManifestString(content);
                    if (updated !== content) {
                      const { RawSource } = compiler.webpack.sources;
                      compilation.updateAsset(assetName, new RawSource(updated));
                    }
                  } catch {
                    // ignore errors
                  }
                }
              }
            );
          }
        });
      },
    });
    return config;
  },
};

export default nextConfig;
