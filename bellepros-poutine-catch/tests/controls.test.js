#!/usr/bin/env node
// Keyboard tray-control test suite for Pluie de Poutine.
// Run: node tests/controls.test.js
//
// These tests pull the real helpers out of the shipped single-file game and then drive them
// through the same integration loop updatePlay() uses, so a regression in the steering math or
// in the tray's reachable bounds fails here rather than in a player's hands.

let pass = 0, fail = 0;

function assert(label, condition) {
  if (condition) { console.log(`  ✓ ${label}`); pass++; }
  else           { console.error(`  ✗ ${label}`); fail++; }
}

function assertClose(label, actual, expected, tolerance) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) { console.log(`  ✓ ${label}`); pass++; }
  else    { console.error(`  ✗ ${label} (got ${actual}, expected ~${expected} ±${tolerance})`); fail++; }
}

// ── Load the pure helpers + tuning constants straight from the single-file game ──
const GAME = (() => {
  const html = require('fs').readFileSync(__dirname + '/../index.html', 'utf8');
  const grab = (re, name) => {
    const m = html.match(re);
    if (!m) throw new Error(`could not locate ${name} in index.html — did the game change shape?`);
    return m;
  };
  const num = (re, name) => parseInt(grab(re, name)[1], 10);

  const constants = {
    TRAY_KEY_SPEED:   num(/const TRAY_KEY_SPEED = (\d+)/, 'TRAY_KEY_SPEED'),
    TRAY_EDGE_MARGIN: num(/const TRAY_EDGE_MARGIN = (\d+)/, 'TRAY_EDGE_MARGIN'),
    DESIGN_W:         num(/const DESIGN_W = (\d+)/, 'DESIGN_W'),
    TRAY_W:           num(/tray:\s*\{[^}]*\bw:\s*(\d+)/, 'tray width'),
    // The follow-lag factor from updatePlay: tray.x += (target - x) * min(1, dt*FOLLOW)
    TRAY_FOLLOW:      num(/game\.tray\.x \+= \(game\.tray\.target - game\.tray\.x\) \* Math\.min\(1, dt\*(\d+)\)/, 'tray follow factor'),
  };

  const srcs = [
    grab(/function clamp\([^)]*\)\s*\{[^}]*\}/, 'clamp')[0],
    grab(/function trayLimits\([\s\S]*?\n        \}/, 'trayLimits')[0],
    grab(/function keyTrayTarget\([\s\S]*?\n        \}/, 'keyTrayTarget')[0],
  ].join('\n');

  const factory = new Function(
    `const TRAY_EDGE_MARGIN = ${constants.TRAY_EDGE_MARGIN};
     ${srcs}
     return { clamp, trayLimits, keyTrayTarget };`
  );
  return { ...factory(), ...constants };
})();

const { clamp, trayLimits, keyTrayTarget,
        TRAY_KEY_SPEED, TRAY_EDGE_MARGIN, DESIGN_W, TRAY_W, TRAY_FOLLOW } = GAME;

const FRAME = 1 / 60;
const LIMITS = trayLimits(TRAY_W, DESIGN_W);

// Drives the real steering + follow math exactly as updatePlay() does.
function simulate({ dir, seconds, target = DESIGN_W / 2, x = DESIGN_W / 2 }) {
  const frames = Math.round(seconds / FRAME);
  for (let i = 0; i < frames; i++) {
    if (dir !== 0) target = keyTrayTarget(target, dir, FRAME, TRAY_W, DESIGN_W, TRAY_KEY_SPEED);
    x += (target - x) * Math.min(1, FRAME * TRAY_FOLLOW);
    x = clamp(x, LIMITS.min, LIMITS.max);
  }
  return { target, x };
}

console.log('\n═══ Pluie de Poutine — Keyboard Controls ═══\n');

console.log('Constants read from the game:');
assert('TRAY_KEY_SPEED is a positive speed', TRAY_KEY_SPEED > 0);
assert('TRAY_EDGE_MARGIN is non-negative', TRAY_EDGE_MARGIN >= 0);
assert('DESIGN_W is the 414px logical stage', DESIGN_W === 414);
assert('tray width is positive and fits the stage', TRAY_W > 0 && TRAY_W < DESIGN_W);

console.log('\ntrayLimits — the reachable range:');
assert('min is half the tray plus the edge margin', LIMITS.min === TRAY_W / 2 + TRAY_EDGE_MARGIN);
assert('range is symmetric about the stage centre',
  Math.abs((LIMITS.min + LIMITS.max) / 2 - DESIGN_W / 2) < 1e-9);
assert('min is strictly inside the stage', LIMITS.min > 0 && LIMITS.max < DESIGN_W);

console.log('\nkeyTrayTarget — direction:');
const mid = DESIGN_W / 2;
assert('right key increases the target',
  keyTrayTarget(mid, 1, FRAME, TRAY_W, DESIGN_W, TRAY_KEY_SPEED) > mid);
assert('left key decreases the target',
  keyTrayTarget(mid, -1, FRAME, TRAY_W, DESIGN_W, TRAY_KEY_SPEED) < mid);
assert('no direction is a no-op',
  keyTrayTarget(mid, 0, FRAME, TRAY_W, DESIGN_W, TRAY_KEY_SPEED) === mid);

console.log('\nkeyTrayTarget — framerate independence:');
assert('one second of travel equals TRAY_KEY_SPEED px',
  keyTrayTarget(LIMITS.min, 1, 1, TRAY_W, 100000, TRAY_KEY_SPEED) === LIMITS.min + TRAY_KEY_SPEED);
const sixty = (() => {
  let t = LIMITS.min;
  for (let i = 0; i < 60; i++) t = keyTrayTarget(t, 1, FRAME, TRAY_W, 100000, TRAY_KEY_SPEED);
  return t;
})();
assertClose('60 frames at dt=1/60 match one 1s step', sixty, LIMITS.min + TRAY_KEY_SPEED, 1e-6);

console.log('\nkeyTrayTarget — clamps to REACHABLE range, not the raw stage:');
assert('cannot steer left past the reachable minimum',
  keyTrayTarget(LIMITS.min, -1, FRAME, TRAY_W, DESIGN_W, TRAY_KEY_SPEED) === LIMITS.min);
assert('cannot steer right past the reachable maximum',
  keyTrayTarget(LIMITS.max, 1, FRAME, TRAY_W, DESIGN_W, TRAY_KEY_SPEED) === LIMITS.max);
assert('a long right hold saturates at the reachable max, NOT at DESIGN_W',
  keyTrayTarget(mid, 1, 10, TRAY_W, DESIGN_W, TRAY_KEY_SPEED) === LIMITS.max);
assert('a long left hold saturates at the reachable min, NOT at 0',
  keyTrayTarget(mid, -1, 10, TRAY_W, DESIGN_W, TRAY_KEY_SPEED) === LIMITS.min);
assert('the target never lands where the tray cannot be drawn',
  keyTrayTarget(mid, 1, 10, TRAY_W, DESIGN_W, TRAY_KEY_SPEED) <= DESIGN_W - TRAY_W / 2);

console.log('\nRegression — no dead zone after holding into a wall:');
// Bug: clamping the target to [0, DESIGN_W] let it bank up overshoot past the tray's real limit,
// so the player had to hold the opposite key for ~133ms before the tray moved a single pixel.
const wall = simulate({ dir: 1, seconds: 1.5 });
assert('holding right parks the target exactly at the reachable max', wall.target === LIMITS.max);
assert('holding right parks the tray at the reachable max', Math.abs(wall.x - LIMITS.max) < 1e-6);
assert('no invisible overshoot is banked past the wall', wall.target - LIMITS.max === 0);

const reversed = simulate({ dir: -1, seconds: FRAME, target: wall.target, x: wall.x });
assert('one frame of the opposite key moves the target immediately', reversed.target < wall.target);
assert('one frame of the opposite key moves the tray immediately', reversed.x < wall.x);
assertClose('the first reversing frame travels the full per-frame distance',
  wall.target - reversed.target, TRAY_KEY_SPEED * FRAME, 1e-6);

console.log('\nRegression — steering stays inside the reachable range throughout a run:');
let strayed = false;
for (const dir of [1, -1]) {
  let t = mid, x = mid;
  for (let i = 0; i < 240; i++) {
    t = keyTrayTarget(t, dir, FRAME, TRAY_W, DESIGN_W, TRAY_KEY_SPEED);
    x += (t - x) * Math.min(1, FRAME * TRAY_FOLLOW);
    if (t < LIMITS.min - 1e-9 || t > LIMITS.max + 1e-9) strayed = true;
    if (x < LIMITS.min - 1e-6 || x > LIMITS.max + 1e-6) strayed = true;
  }
}
assert('target and tray stay within bounds across 4s holds in both directions', !strayed);

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
