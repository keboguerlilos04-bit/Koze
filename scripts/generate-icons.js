// Generates Koze app icons, splash and login logo from src/assets/logo.svg.
// Usage (the rasterizer is not a project dependency):
//   npm install --no-save @resvg/resvg-js@2 && node scripts/generate-icons.js
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'src/assets/logo.svg'), 'utf8');

const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
// Mark only (frame + K), without the "Koze" text: unreadable at icon size.
const markOnly = inner.replace(/<!-- Tèks Koze -->[\s\S]*?<\/text>/, '');
if (markOnly === inner) throw new Error('could not strip text');

// Frame outer bounds incl. stroke: x 63..449, y 17..403 -> center (256, 210), size 386.
const CX = 256;
const CY = 210;
const MARK = 386;

function squareSvg(fraction, background) {
  const size = MARK / fraction;
  const x = CX - size / 2;
  const y = CY - size / 2;
  const bg = background
    ? `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${background}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${size} ${size}">${bg}${markOnly}</svg>`;
}

function fullLogoOnCanvas(width, height, logoWidth, background) {
  // Full logo (512x600 viewBox) centered on a canvas.
  const scale = 512 / logoWidth;
  const vw = width * scale;
  const vh = height * scale;
  const x = 256 - vw / 2;
  const y = 300 - vh / 2;
  const bg = background
    ? `<rect x="${x}" y="${y}" width="${vw}" height="${vh}" fill="${background}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${vw} ${vh}">${bg}${inner}</svg>`;
}

function render(svg, width, out) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' },
  })
    .render()
    .asPng();
  fs.writeFileSync(path.join(root, out), png);
  console.log('wrote', out, png.length, 'bytes');
}

// iOS / general icon: opaque white, mark at 72% of the square.
render(squareSvg(0.72, '#ffffff'), 1024, 'assets/icon.png');
// Android adaptive foreground: transparent, mark inside the 66% safe zone.
render(squareSvg(0.55, null), 1024, 'assets/adaptive-icon.png');
// Splash: full logo with text, centered on white.
render(fullLogoOnCanvas(1284, 2778, 520, '#ffffff'), 1284, 'assets/splash.png');
// Login screen logo: full logo cropped to its content (412x500), transparent, 3x of 80x97 dp.
render(
  src.replace('viewBox="0 0 512 600" width="100%" height="100%"', 'viewBox="50 10 412 500"'),
  240,
  'src/assets/images/logo.png',
);
