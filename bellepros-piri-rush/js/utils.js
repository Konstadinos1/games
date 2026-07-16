'use strict';

const Utils = {
  lerp(a, b, t) { return a + (b - a) * t; },

  clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },

  randomBetween(min, max) { return Math.random() * (max - min) + min; },

  randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },

  weightedRandom(items) {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = Math.random() * total;
    for (const item of items) {
      r -= item.weight;
      if (r <= 0) return item;
    }
    return items[items.length - 1];
  },

  formatScore(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  },

  formatNumber(n) {
    return (n == null ? 0 : n).toLocaleString('en-CA');
  },

  // For any user-controlled string that ends up in innerHTML (leaderboard
  // names/avatars, OAuth display names) — Firestore rules don't strip HTML
  escapeHTML(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  },

  distanceBetween(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },

  rectOverlap(r1, r2) {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
  },

  saveState(key, data) {
    try { localStorage.setItem('bpr_' + key, JSON.stringify(data)); } catch (e) {}
  },

  loadState(key, fallback = null) {
    try {
      const raw = localStorage.getItem('bpr_' + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  },

  vibrate(pattern = [30]) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  },

  generateCode(prefix, length = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = prefix + '-';
    for (let i = 0; i < length; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  },

  dayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  },

  weekKey() {
    const d = new Date();
    const startOfYear = new Date(d.getFullYear(), 0, 0);
    const week = Math.floor((d - startOfYear) / 604800000);
    return `${d.getFullYear()}-W${week}`;
  },

  monthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}`;
  },

  seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
      return (s >>> 0) / 0xFFFFFFFF;
    };
  },

  easeOutBounce(t) {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
    if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
    t -= 2.625 / 2.75;
    return 7.5625 * t * t + 0.984375;
  },

  easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); },
  easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },

  now() { return performance.now(); },

  isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent); },
  isAndroid() { return /Android/.test(navigator.userAgent); },
  isMobile() { return this.isIOS() || this.isAndroid(); },
};
