const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_IMAGE = 'C:\\Users\\Reini\\.gemini\\antigravity-ide\\brain\\3c4ea658-f77d-4c6b-ad1e-3747b76ff9cb\\app_icon_logo_1792902599814.jpg';
const BUILD_DIR = path.join(__dirname, '..', 'build');
const os = require('os');
const TEMP_DIR = path.join(os.tmpdir(), 'pac_icons_' + Date.now());

if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

console.log('Generating PNG sizes using PowerShell & System.Drawing in:', TEMP_DIR);

// PowerShell script to produce high quality resized PNGs
const psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing
$srcPath = "${SOURCE_IMAGE.replace(/\\/g, '\\\\')}"
$src = [System.Drawing.Image]::FromFile($srcPath)
$sizes = @(16, 32, 48, 64, 128, 256, 512, 1024)

foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $s, $s)
    $g.Dispose()

    $outPath = Join-Path "${TEMP_DIR.replace(/\\/g, '\\\\')}" ("icon_" + $s + ".png")
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Generated icon_$s.png"
}
$src.Dispose()
`;

const psPath = path.join(TEMP_DIR, 'resize.ps1');
// Write UTF-8 with BOM for PowerShell
fs.writeFileSync(psPath, '\ufeff' + psScript, 'utf8');

execSync(`powershell -ExecutionPolicy Bypass -File "${psPath}"`, { stdio: 'inherit' });

// Copy 512 & 256 to build/icon.png and favicon.png
fs.copyFileSync(path.join(TEMP_DIR, 'icon_512.png'), path.join(BUILD_DIR, 'icon.png'));
fs.copyFileSync(path.join(TEMP_DIR, 'icon_32.png'), path.join(__dirname, '..', 'favicon.png'));
console.log('Copied build/icon.png and favicon.png');

// 1. Pack Windows .ico with PNG images (256, 128, 64, 48, 32, 16)
const icoSizes = [256, 128, 64, 48, 32, 16];
const imagesData = icoSizes.map(s => {
  const buf = fs.readFileSync(path.join(TEMP_DIR, `icon_${s}.png`));
  return { size: s, data: buf };
});

const headerSize = 6;
const dirEntrySize = 16;
const numImages = imagesData.length;
let offset = headerSize + dirEntrySize * numImages;

const icoHeader = Buffer.alloc(headerSize);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // type: 1 = icon
icoHeader.writeUInt16LE(numImages, 4);

const entries = [];
for (const img of imagesData) {
  const entry = Buffer.alloc(dirEntrySize);
  entry.writeUInt8(img.size === 256 ? 0 : img.size, 0); // width
  entry.writeUInt8(img.size === 256 ? 0 : img.size, 1); // height
  entry.writeUInt8(0, 2); // colors
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(img.data.length, 8); // image size
  entry.writeUInt32LE(offset, 12); // image offset
  entries.push(entry);
  offset += img.data.length;
}

const icoBuffer = Buffer.concat([
  icoHeader,
  ...entries,
  ...imagesData.map(img => img.data)
]);

const icoPath = path.join(BUILD_DIR, 'icon.ico');
fs.writeFileSync(icoPath, icoBuffer);
console.log(`Successfully generated Windows icon: ${icoPath} (${icoBuffer.length} bytes)`);

// Also save favicon.ico
fs.writeFileSync(path.join(BUILD_DIR, 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(__dirname, '..', 'favicon.ico'), icoBuffer);

// 2. Generate macOS .icns file
// Apple ICNS format: 4 bytes 'icns', 4 bytes big-endian total length, followed by chunks:
// 4 bytes OSType + 4 bytes big-endian chunk length + PNG data
// Common OSTypes for PNGs in icns:
// 'icp4' = 16x16 PNG
// 'icp5' = 32x32 PNG
// 'icp6' = 64x64 PNG
// 'ic07' = 128x128 PNG
// 'ic08' = 256x256 PNG
// 'ic09' = 512x512 PNG
// 'ic10' = 1024x1024 PNG
const icnsMap = [
  { type: 'icp4', size: 16 },
  { type: 'icp5', size: 32 },
  { type: 'icp6', size: 64 },
  { type: 'ic07', size: 128 },
  { type: 'ic08', size: 256 },
  { type: 'ic09', size: 512 },
  { type: 'ic10', size: 1024 }
];

const icnsChunks = [];
for (const item of icnsMap) {
  const filePath = path.join(TEMP_DIR, `icon_${item.size}.png`);
  if (fs.existsSync(filePath)) {
    const pngBuf = fs.readFileSync(filePath);
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.write(item.type, 0, 4, 'ascii');
    chunkHeader.writeUInt32BE(pngBuf.length + 8, 4);
    icnsChunks.push(Buffer.concat([chunkHeader, pngBuf]));
  }
}

const totalIcnsLength = 8 + icnsChunks.reduce((acc, chunk) => acc + chunk.length, 0);
const icnsHeader = Buffer.alloc(8);
icnsHeader.write('icns', 0, 4, 'ascii');
icnsHeader.writeUInt32BE(totalIcnsLength, 4);

const icnsBuffer = Buffer.concat([icnsHeader, ...icnsChunks]);
const icnsPath = path.join(BUILD_DIR, 'icon.icns');
fs.writeFileSync(icnsPath, icnsBuffer);
console.log(`Successfully generated macOS icon: ${icnsPath} (${icnsBuffer.length} bytes)`);

// Clean up temp
try {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
} catch (e) {
  // ignore
}
console.log('All icons generated successfully!');
