const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '../src/assets');
const optimizedDir = path.join(assetsDir, 'optimized');

if (!fs.existsSync(optimizedDir)) {
  fs.mkdirSync(optimizedDir, { recursive: true });
}

// Optimize gallery-33 to gallery-83
const filesToOptimize = [];
for (let i = 33; i <= 83; i++) {
  const exts = ['.jpg', '.jpeg', '.png', '.webp'];
  for (const ext of exts) {
    const candidates = [`gallery-${i}${ext}`];
    for (const name of candidates) {
      const full = path.join(assetsDir, name);
      if (fs.existsSync(full)) {
        filesToOptimize.push({ src: full, name: `gallery-${i}` });
        break;
      }
    }
  }
}

console.log(`Found ${filesToOptimize.length} files to optimize...`);

async function optimizeAll() {
  for (const file of filesToOptimize) {
    const outPath = path.join(optimizedDir, `${file.name}.webp`);
    const srcStat = fs.statSync(file.src);
    const srcSizeMB = (srcStat.size / 1024 / 1024).toFixed(1);

    try {
      await sharp(file.src)
        .resize({ width: 1800, withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toFile(outPath);

      const outStat = fs.statSync(outPath);
      const outSizeKB = (outStat.size / 1024).toFixed(0);
      console.log(`✅ ${file.name}: ${srcSizeMB}MB → ${outSizeKB}KB`);
    } catch (err) {
      console.error(`❌ ${file.name}: ${err.message}`);
    }
  }
  console.log('\n🎉 Done! All images optimized.');
}

optimizeAll();
