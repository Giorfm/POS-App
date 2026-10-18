const fs = require('fs');
const path = require('path');

/**
 * Automatically patches Next.js RSC client reference manifests
 * to remove JSON-escaped null bytes (\u0000) generated when the workspace
 * path contains '#' characters (e.g., 'POS #2').
 */
function patchManifests(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      patchManifests(fullPath);
    } else if (file.includes('client-reference-manifest')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('\\u0000')) {
        content = content.replace(/\\u0000/g, '');
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

try {
  const targetDir = path.join(process.cwd(), '.next', 'server', 'app');
  patchManifests(targetDir);
} catch {
  // Silent fallback
}
