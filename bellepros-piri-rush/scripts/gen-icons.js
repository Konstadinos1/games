#!/usr/bin/env node
// Generates PNG app icons for Bellepros Piri Rush without any npm dependencies.
// Uses the raw PNG spec: IHDR + IDAT (zlib-deflated RGBA rows) + IEND.
'use strict';

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── Minimal PNG encoder ─────────────────────────────────────────────────────
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function u32be(n) {
  return Buffer.from([(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF]);
}
function chunk(type, data) {
  const typeB = Buffer.from(type, 'ascii');
  const dataB = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const crc   = crc32(Buffer.concat([typeB, dataB]));
  return Buffer.concat([u32be(dataB.length), typeB, dataB, u32be(crc)]);
}
function encodePNG(pixels, w, h) {
  // pixels: Uint8Array of RGBA, row-major
  const rowLen = w * 4;
  const raw    = Buffer.alloc((rowLen + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (rowLen + 1)] = 0; // filter type: None
    for (let x = 0; x < rowLen; x++) {
      raw[y * (rowLen + 1) + 1 + x] = pixels[y * rowLen + x];
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.concat([
    u32be(w), u32be(h),
    Buffer.from([8, 2, 0, 0, 0]), // 8-bit, RGB (we'll use RGBA → change to 6)
  ]);
  // Fix: use colour type 6 (RGBA)
  const ihdrFixed = Buffer.concat([
    u32be(w), u32be(h),
    Buffer.from([8, 6, 0, 0, 0]),
  ]);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdrFixed), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// ── Icon painter ────────────────────────────────────────────────────────────
function paintIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i]     = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = a;
  }

  function fillRect(x, y, w, h, r, g, b, a = 255) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        setPixel(x + dx, y + dy, r, g, b, a);
  }

  function fillCircle(cx, cy, radius, r, g, b, a = 255) {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++)
        if (dx * dx + dy * dy <= r2)
          setPixel(cx + dx, cy + dy, r, g, b, a);
  }

  // Background: rounded square, brand dark #14080A
  fillRect(0, 0, size, size, 20, 8, 10, 255);

  const s = size / 100; // scale factor

  // Red circle background
  fillCircle(50 * s, 50 * s, 42 * s, 232, 25, 44, 255);

  // White inner circle (body highlight)
  fillCircle(50 * s, 50 * s, 28 * s, 255, 255, 255, 255);

  // Chicken body: golden/orange oval  #F39C12
  fillCircle(50 * s, 55 * s, 20 * s, 243, 156, 18, 255);

  // Chicken head: smaller circle above  #F1C40F
  fillCircle(50 * s, 35 * s, 13 * s, 241, 196, 15, 255);

  // Eye: dark dot
  fillCircle(54 * s, 32 * s, 3 * s, 20, 8, 10, 255);

  // Beak: orange rect
  fillRect(52 * s, 36 * s, 6 * s, 4 * s, 230, 120, 20, 255);

  // Flame effect on top: red/orange dots  #E8192C / #FF6B35
  fillCircle(50 * s, 18 * s, 8 * s, 255, 107, 53, 255);
  fillCircle(44 * s, 22 * s, 5 * s, 255, 50,  20, 255);
  fillCircle(56 * s, 22 * s, 5 * s, 255, 50,  20, 255);
  fillCircle(50 * s, 12 * s, 5 * s, 255, 215, 0,  255);

  return pixels;
}

// ── Output ──────────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'assets', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const sizes = [
  { name: 'icon-512.png',   size: 512  },
  { name: 'icon-192.png',   size: 192  },
  { name: 'icon-96.png',    size: 96   },
  { name: 'icon-48.png',    size: 48   },
  { name: 'icon-1024.png',  size: 1024 }, // App Store
];

for (const { name, size } of sizes) {
  const pixels = paintIcon(size);
  const png    = encodePNG(pixels, size, size);
  const dest   = path.join(outDir, name);
  fs.writeFileSync(dest, png);
  console.log(`  ✓ ${dest}  (${png.length} bytes)`);
}

// Also write a splash screen (390×844, brand dark background + centered logo circle)
function paintSplash(w, h) {
  const pixels = new Uint8Array(w * h * 4);
  function setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const i = (y * w + x) * 4;
    pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a;
  }
  function fillRect(x, y, fw, fh, r, g, b) {
    for (let dy = 0; dy < fh; dy++) for (let dx = 0; dx < fw; dx++) setPixel(x+dx, y+dy, r,g,b);
  }
  function fillCircle(cx, cy, radius, r, g, b) {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++)
        if (dx*dx+dy*dy <= r2) setPixel(cx+dx, cy+dy, r,g,b);
  }
  fillRect(0, 0, w, h, 20, 8, 10);            // dark bg
  fillCircle(w/2, h/2, 110, 232, 25, 44);     // red circle
  fillCircle(w/2, h/2 - 25, 55, 241, 196, 15); // chicken head
  fillCircle(w/2, h/2 + 30, 75, 243, 156, 18); // chicken body
  fillCircle(w/2 + 15, h/2 - 32, 10, 20, 8, 10); // eye
  return pixels;
}

const splashPng = encodePNG(paintSplash(390, 844), 390, 844);
const splashDest = path.join(outDir, 'splash.png');
fs.writeFileSync(splashDest, splashPng);
console.log(`  ✓ ${splashDest}  (${splashPng.length} bytes)`);
console.log('\nAll icons generated.');
