const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function createIcon(size, outputPath) {
  const png = new PNG({ width: size, height: size });

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      
      // Rounded rect mask
      const radius = Math.floor(size * 0.22);
      const dx = Math.max(0, Math.max(radius - x, x - (size - radius - 1)));
      const dy = Math.max(0, Math.max(radius - y, y - (size - radius - 1)));
      const isOutside = (dx * dx + dy * dy) > (radius * radius);

      if (isOutside) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }

      // Background gradient (Emerald 600 to Teal 700: #059669 -> #0f766e)
      const ratio = (x + y) / (size * 2);
      const r = Math.round(5 + (15 - 5) * ratio);
      const g = Math.round(150 + (118 - 150) * ratio);
      const b = Math.round(105 + (110 - 105) * ratio);

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;

      // Draw simple POS symbol in white in center (cash register / cart outline)
      const cx = size / 2;
      const cy = size / 2;
      const s = size * 0.35; // bounding box half-size

      // Register screen: rectangle
      const screenLeft = cx - s * 0.7;
      const screenRight = cx + s * 0.7;
      const screenTop = cy - s * 0.75;
      const screenBottom = cy - s * 0.05;

      const isScreenBorder = 
        ((x >= screenLeft && x <= screenRight && (Math.abs(y - screenTop) <= 2 || Math.abs(y - screenBottom) <= 2)) ||
        (y >= screenTop && y <= screenBottom && (Math.abs(x - screenLeft) <= 2 || Math.abs(x - screenRight) <= 2)));

      // Base stand
      const baseLeft = cx - s * 0.9;
      const baseRight = cx + s * 0.9;
      const baseTop = cy + s * 0.15;
      const baseBottom = cy + s * 0.75;

      const isBaseBorder =
        ((x >= baseLeft && x <= baseRight && (Math.abs(y - baseTop) <= 2 || Math.abs(y - baseBottom) <= 2)) ||
        (y >= baseTop && y <= baseBottom && (Math.abs(x - baseLeft) <= 2 || Math.abs(x - baseRight) <= 2)));

      // Screen interior glow
      const isScreenInside = (x > screenLeft + 2 && x < screenRight - 2 && y > screenTop + 2 && y < screenBottom - 2);

      if (isScreenBorder || isBaseBorder) {
        png.data[idx] = 255;
        png.data[idx + 1] = 255;
        png.data[idx + 2] = 255;
        png.data[idx + 3] = 255;
      } else if (isScreenInside) {
        png.data[idx] = 16;
        png.data[idx + 1] = 185;
        png.data[idx + 2] = 129;
        png.data[idx + 3] = 255;
      }
    }
  }

  const buffer = PNG.sync.write(png);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated ${size}x${size} icon at: ${outputPath}`);
}

const publicDir = path.join(__dirname, '..', 'public');
createIcon(192, path.join(publicDir, 'icon.png'));
createIcon(512, path.join(publicDir, 'icon-512.png'));
