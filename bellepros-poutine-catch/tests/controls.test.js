#!/usr/bin/env node
// Keyboard tray-control test suite — verifies the held-key steering math.
// Run: node tests/controls.test.js

let pass = 0, fail = 0;

function assert(label, condition) {
  if (condition) { console.log(`  ✓ ${label}`); pass++; }
  else           { console.error(`  ✗ ${label}`); fail++; }
}

// ── Load the pure helpers straight from the single-file game ──
// We pull clamp + keyTrayTarget out of index.html (no browser/DOM needed) the same way
// the piri-rush suite sandboxes its CONFIG, so the test exercises the real shipped code.
const { clamp, keyTrayTarget, TRAY_KEY_SPEED, DESIGN_W } = (() => {
  const html = require('fs').readFileSync(__dirname + '/../index.html', 'utf8');
  const grab = (re, name) => {
    const m = html.match(re);
    if (!m) throw new Error(`could not locate ${name} in index.html`);
    return m;
  };
  const speed = parseInt(grab(/const TRAY_KEY_SPEED = (\d+)/, 'TRAY_KEY_SPEED')[1], 10);
  const width = parseInt(grab(/const DESIGN_W = (\d+)/, 'DESIGN_W')[1], 10);
  const clampSrc = grab(/function clamp\([^)]*\)\s*\{[^}]*\}/, 'clamp')[0];
  const keySrc = grab(/function keyTrayTarget\([^)]*\)\s*\{[^}]*\}/, 'keyTrayTarget')[0];
  const factory = new Function(`${clampSrc}\n${keySrc}\nreturn { clamp, keyTrayTarget };`);
  return { ...factory(), TRAY_KEY_SPEED: speed, DESIGN_W: width };
})();

console.log('\n═══ Bellepros Poutine Catch — Controls Tests ═══\n');

console.log('Constants:');
assert('TRAY_KEY_SPEED is a positive speed', TRAY_KEY_SPEED > 0);
assert('DESIGN_W is the 414px logical stage', DESIGN_W === 414);

console.log('\nclamp:');
assert('clamp keeps a value inside range', clamp(50, 0, 100) === 50);
assert('clamp floors below the minimum', clamp(-5, 0, 100) === 0);
assert('clamp caps above the maximum', clamp(150, 0, 100) === 100);

console.log('\nkeyTrayTarget — movement:');
const mid = DESIGN_W / 2;
const dt = 1 / 60; // one frame at 60fps
assert('right key moves the target right', keyTrayTarget(mid, 1, dt, DESIGN_W, TRAY_KEY_SPEED) > mid);
assert('left key moves the target left', keyTrayTarget(mid, -1, dt, DESIGN_W, TRAY_KEY_SPEED) < mid);
assert('no direction leaves the target unchanged', keyTrayTarget(mid, 0, dt, DESIGN_W, TRAY_KEY_SPEED) === mid);

console.log('\nkeyTrayTarget — speed is framerate-independent (per-second):');
const oneSecondRight = keyTrayTarget(0, 1, 1, 10000, TRAY_KEY_SPEED);
assert('moving for 1s travels exactly TRAY_KEY_SPEED px', oneSecondRight === TRAY_KEY_SPEED);
const sixtyFrames = (() => {
  let x = 0;
  for (let i = 0; i < 60; i++) x = keyTrayTarget(x, 1, 1 / 60, 10000, TRAY_KEY_SPEED);
  return x;
})();
assert('60 frames of dt=1/60 ≈ 1s of travel', Math.abs(sixtyFrames - TRAY_KEY_SPEED) < 1e-6);

console.log('\nkeyTrayTarget — bounds:');
assert('cannot move left past 0', keyTrayTarget(0, -1, dt, DESIGN_W, TRAY_KEY_SPEED) === 0);
assert('cannot move right past DESIGN_W', keyTrayTarget(DESIGN_W, 1, dt, DESIGN_W, TRAY_KEY_SPEED) === DESIGN_W);
assert('a large step from near the edge is clamped to DESIGN_W',
  keyTrayTarget(DESIGN_W - 1, 1, 1, DESIGN_W, TRAY_KEY_SPEED) === DESIGN_W);
assert('a large leftward step from near the edge is clamped to 0',
  keyTrayTarget(1, -1, 1, DESIGN_W, TRAY_KEY_SPEED) === 0);

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
