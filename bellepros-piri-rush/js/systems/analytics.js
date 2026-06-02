'use strict';

// Analytics system — Firebase Analytics integration point
// In production, replace _send() with firebase.analytics().logEvent()
class AnalyticsSystem {
  constructor() {
    this._queue = [];
    this._sessionStart = Date.now();
    this._sessionId = Date.now().toString(36);
    this._userId = Utils.loadState('analyticsUserId', null);
    if (!this._userId) {
      this._userId = Math.random().toString(36).slice(2);
      Utils.saveState('analyticsUserId', this._userId);
    }
    this._firebase = null;
    this._buffer = [];
  }

  // Call this after Firebase SDK loads
  initFirebase(firebaseApp) {
    this._firebase = firebaseApp;
    // Flush buffer
    this._buffer.forEach(([name, params]) => this._firebaseLog(name, params));
    this._buffer = [];
  }

  event(name, params = {}) {
    const enriched = {
      ...params,
      session_id: this._sessionId,
      user_id: this._userId,
      platform: Utils.isMobile() ? (Utils.isIOS() ? 'ios' : 'android') : 'web',
      level: Progression.level,
      tier: Progression.getTier().name,
      has_spicy_pass: Monetization.hasSpicyPass,
      timestamp: Date.now(),
    };

    if (this._firebase) {
      this._firebaseLog(name, enriched);
    } else {
      this._buffer.push([name, enriched]);
      console.log('[Analytics]', name, enriched);
    }
  }

  _firebaseLog(name, params) {
    try {
      // firebase.analytics().logEvent(name, params);
      // In production: uncomment above and remove console.log
      console.log('[Firebase Analytics]', name, params);
    } catch (e) {}
  }

  // ── Key game events ──

  sessionStart() {
    this.event('session_start', {
      total_runs: Progression.totalRuns,
      high_score: Progression.highScore,
    });
  }

  runStart(characterId, isPiriZone) {
    this.event('run_start', { character: characterId, piri_zone: isPiriZone });
  }

  runEnd(data) {
    this.event('run_end', {
      score: data.score,
      duration_ms: data.duration,
      chickens_caught: data.chickens,
      best_streak: data.streak,
      cause_of_death: data.deathCause,
      piri_zone: data.isPiriZone,
      distance: data.distance,
    });
  }

  chickenCaught(type, streak) {
    this.event('chicken_caught', { rarity: type, current_streak: streak });
  }

  obstacleHit(type) {
    this.event('obstacle_hit', { obstacle_type: type });
  }

  streakReached(level, multiplier) {
    this.event('streak_milestone', { streak: level, multiplier });
  }

  screenView(screenName) {
    this.event('screen_view', { screen_name: screenName });
  }

  missionCompleted(missionId, isWeekly) {
    this.event('mission_completed', { mission_id: missionId, is_weekly: isWeekly });
  }

  characterUnlocked(charId, level) {
    this.event('character_unlocked', { character_id: charId, at_level: level });
  }

  piriZoneEntered(locationName) {
    this.event('piri_zone_entered', { location: locationName });
  }

  arSessionStart() {
    this.event('ar_session_start', {});
  }

  shareAction(type) {
    this.event('share', { content_type: type });
  }

  // ── Retention ──

  dayN() {
    const installDate = Utils.loadState('installDate', Date.now());
    if (!Utils.loadState('installDate', null)) Utils.saveState('installDate', installDate);
    return Math.floor((Date.now() - installDate) / 86400000);
  }

  // ── A/B Testing framework ──
  getVariant(experimentId, variants = ['control', 'test']) {
    // Deterministic based on userId + experimentId
    const hash = (this._userId + experimentId).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return variants[hash % variants.length];
  }
}

const Analytics = new AnalyticsSystem();
