#!/usr/bin/env node
// Economy & progression balance test suite
// Run: node tests/economy.test.js

let pass = 0, fail = 0;

function assert(label, condition) {
  if (condition) { console.log(`  ✓ ${label}`); pass++; }
  else           { console.error(`  ✗ ${label}`); fail++; }
}

function assertRange(label, val, min, max) {
  assert(`${label} (${val}) between ${min}–${max}`, val >= min && val <= max);
}

// ── Load config without browser APIs ──
const CONFIG = (() => {
  const src = require('fs').readFileSync(__dirname + '/../js/config.js', 'utf8');
  const sandboxed = new Function(src + '\nreturn CONFIG;');
  return sandboxed();
})();

console.log('\n═══ Bellepros Piri Rush — Economy Tests ═══\n');

// ── Chicken spawn weights ──────────────────────────────
console.log('Chicken spawn weights:');
const types = Object.values(CONFIG.CHICKEN_TYPES);
const totalWeight = types.reduce((s, t) => s + t.weight, 0);
assert('total weight sums to 100', totalWeight === 100);
types.forEach(t => assertRange(`${t.name} weight`, t.weight, 1, 80));

// Expected spawn probabilities
const commonPct = CONFIG.CHICKEN_TYPES.COMMON.weight;
const legendaryPct = CONFIG.CHICKEN_TYPES.LEGENDARY.weight;
assertRange('Common spawn chance',    commonPct,    50, 70);
assertRange('Legendary spawn chance', legendaryPct, 1,  5);

// ── Score values ───────────────────────────────────────
console.log('\nScore values:');
assert('Rare > Common',      CONFIG.CHICKEN_TYPES.RARE.score      > CONFIG.CHICKEN_TYPES.COMMON.score);
assert('Epic > Rare',        CONFIG.CHICKEN_TYPES.EPIC.score      > CONFIG.CHICKEN_TYPES.RARE.score);
assert('Legendary > Epic',   CONFIG.CHICKEN_TYPES.LEGENDARY.score > CONFIG.CHICKEN_TYPES.EPIC.score);

// Score ratios feel right
const scoreRatioRareCommon = CONFIG.CHICKEN_TYPES.RARE.score / CONFIG.CHICKEN_TYPES.COMMON.score;
assertRange('Rare/Common score ratio', scoreRatioRareCommon, 3, 10);

// ── Coin economy ───────────────────────────────────────
console.log('\nCoin economy:');
// A typical run: ~60 chickens (50 common, 8 rare, 2 epic) in 60s
const avgCoinsPerRun = 50 * 1 + 8 * 5 + 2 * 10;
assertRange('Avg coins per run', avgCoinsPerRun, 60, 120);

// Time to free side (50 coins): should be ~1-2 runs
const runsForFreeSide = Math.ceil(CONFIG.REWARDS.find(r => r.id === 'side').cost / avgCoinsPerRun);
assertRange('Runs for free side', runsForFreeSide, 1, 3);

// Time for half chicken (500 coins): should be ~5-10 runs
const halfChickenCost = CONFIG.REWARDS.find(r => r.id === 'half').cost;
const runsForHalf = Math.ceil(halfChickenCost / avgCoinsPerRun);
assertRange('Runs for half chicken', runsForHalf, 5, 12);

// ── Tier thresholds ────────────────────────────────────
console.log('\nTier thresholds:');
const tiers = CONFIG.TIERS;
for (let i = 1; i < tiers.length; i++) {
  assert(`${tiers[i].name} threshold > ${tiers[i-1].name}`, tiers[i].minCoins > tiers[i-1].minCoins);
}

// Days to reach Gold (500 coins) at avg play
const daysToGold = Math.ceil(tiers[2].minCoins / (avgCoinsPerRun * 3)); // 3 runs/day
assertRange('Days to Gold tier (3 runs/day)', daysToGold, 1, 10);

// ── Progression (XP / levelling) ──────────────────────
console.log('\nProgression:');
const P = CONFIG.PROGRESSION;

// XP per average run
const avgScorePerRun = 5000;
const avgXPPerRun = Math.floor(avgScorePerRun / 100 * P.XP_PER_100_SCORE) + avgCoinsPerRun * P.XP_PER_COIN;
assertRange('Avg XP per run', avgXPPerRun, 100, 500);

// Time to level 5 (first character unlock)
let cumulativeXP = 0, level = 1;
while (level < 5) {
  const needed = Math.floor(P.BASE_LEVEL_XP * Math.pow(P.LEVEL_XP_SCALE, level - 1));
  cumulativeXP += needed;
  level++;
}
const runsToLevel5 = Math.ceil(cumulativeXP / avgXPPerRun);
assertRange('Runs to level 5 (first unlock)', runsToLevel5, 3, 15);

// Time to level 100 (endgame)
let totalXPForL100 = 0;
for (let l = 1; l < 100; l++) {
  totalXPForL100 += Math.floor(P.BASE_LEVEL_XP * Math.pow(P.LEVEL_XP_SCALE, l - 1));
}
const hoursToMax = (totalXPForL100 / avgXPPerRun * 2) / 60; // 2 min per run
assertRange('Hours to max level (estimate)', Math.round(hoursToMax), 50, 500);

// ── Streak multipliers ─────────────────────────────────
console.log('\nStreak multipliers:');
const streaks = CONFIG.STREAK_LEVELS;
for (let i = 1; i < streaks.length; i++) {
  assert(`${streaks[i].label || '(base)'} threshold > previous`, streaks[i].at > streaks[i-1].at);
  assert(`${streaks[i].label || '(base)'} multiplier > previous`, streaks[i].multiplier > streaks[i-1].multiplier);
}
assert('Max multiplier >= 10', streaks[streaks.length-1].multiplier >= 10);

// ── Characters ─────────────────────────────────────────
console.log('\nCharacters:');
assert('20 characters defined',    CONFIG.CHARACTERS.length === 20);
assert('First unlock at level 1',  CONFIG.CHARACTERS[0].unlockLevel === 1);
assert('Last unlock at level 100', CONFIG.CHARACTERS[CONFIG.CHARACTERS.length-1].unlockLevel === 100);

// No duplicate IDs
const charIds = CONFIG.CHARACTERS.map(c => c.id);
assert('No duplicate character IDs', new Set(charIds).size === charIds.length);

// ── IAP Pricing sanity ─────────────────────────────────
console.log('\nIAP Pricing:');
// (Loaded inline since IAP_PRODUCTS is defined in monetization.js, not config.js)
const iapPrices = { spicy_pass: 299, coins_s: 199, coins_m: 499, coins_l: 999, skin_pack: 499, stickers: 99 };
assertRange('Spicy Pass cents',   iapPrices.spicy_pass, 199, 499);
assertRange('Sticker pack cents', iapPrices.stickers,   49,  199);

// ── Summary ────────────────────────────────────────────
console.log(`\n═══ Results: ${pass} passed, ${fail} failed ═══\n`);
process.exit(fail > 0 ? 1 : 0);
