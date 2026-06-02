#!/usr/bin/env node
// Copies web assets into www/ for Capacitor sync.
// No transpilation — just a selective copy of the HTML5 sources.
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WWW  = path.join(ROOT, 'www');

fs.mkdirSync(WWW, { recursive: true });

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

const FILES = [
  'index.html',
  'manifest.json',
  'firebase-messaging-sw.js',
  'firestore.rules',
];
const DIRS = ['js', 'css', 'assets'];

for (const f of FILES) {
  const src = path.join(ROOT, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(WWW, f));
    console.log(`  copy  ${f}`);
  }
}
for (const d of DIRS) {
  const src = path.join(ROOT, d);
  if (fs.existsSync(src)) {
    copyDir(src, path.join(WWW, d));
    console.log(`  copy  ${d}/`);
  }
}

console.log('\n  www/ ready for cap sync');
