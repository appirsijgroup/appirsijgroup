const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE_ICON = path.join(__dirname, '../public/logorsijsp.png');
const OUTPUT_DIR = path.join(__dirname, '../public');

const SIZES = [
  { size: 72, name: 'icon-72.png' },
  { size: 96, name: 'icon-96.png' },
  { size: 128, name: 'icon-128.png' },
  { size: 144, name: 'icon-144.png' },
  { size: 152, name: 'icon-152.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 384, name: 'icon-384.png' },
  { size: 512, name: 'icon-512.png' },
];

// Favicon sizes
const FAVICON_SIZES = [16, 32, 48];

async function generateIcons() {
  console.log('🎨 Generating PWA icons from logorsijsp.png...\n');

  try {
    // Generate main app icons
    console.log('Generating app icons:');
    for (const { size, name } of SIZES) {
      const outputPath = path.join(OUTPUT_DIR, name);
      await sharp(SOURCE_ICON)
        .resize(size, size, { fit: 'cover', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outputPath);
      console.log(`  ✓ Generated ${name} (${size}x${size})`);
    }

    // Generate favicon
    console.log('\nGenerating favicons:');
    for (const size of FAVICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `favicon-${size}x${size}.png`);
      await sharp(SOURCE_ICON)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toFile(outputPath);
      console.log(`  ✓ Generated favicon-${size}x${size}.png`);
    }

    // Generate apple touch icon
    console.log('\nGenerating Apple touch icon:');
    const appleTouchIconPath = path.join(OUTPUT_DIR, 'apple-touch-icon.png');
    await sharp(SOURCE_ICON)
      .resize(180, 180, { fit: 'cover' })
      .png()
      .toFile(appleTouchIconPath);
    console.log('  ✓ Generated apple-touch-icon.png (180x180)');

    // Generate ICO file for favicon
    console.log('\nGenerating favicon.ico:');
    const faviconIcoPath = path.join(OUTPUT_DIR, 'favicon.ico');
    await sharp(SOURCE_ICON)
      .resize(32, 32, { fit: 'cover' })
      .toFile(faviconIcoPath);
    console.log('  ✓ Generated favicon.ico (32x32)');

    console.log('\n✅ All icons generated successfully!');
    console.log(`\nGenerated ${SIZES.length} app icons, ${FAVICON_SIZES.length} favicons, and 1 Apple touch icon.`);

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
