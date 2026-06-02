'use strict';

class MissionsSystem {
  constructor() {
    this._load();
  }

  _load() {
    const saved = Utils.loadState('missions', null);
    const dayKey = Utils.dayKey();
    const weekKey = Utils.weekKey();

    if (saved && saved.dayKey === dayKey) {
      this.daily = saved.daily;
      this.dayKey = dayKey;
    } else {
      this.daily = this._generateMissions(dayKey, 3);
      this.dayKey = dayKey;
    }

    if (saved && saved.weekKey === weekKey) {
      this.weekly = saved.weekly;
      this.weekKey = weekKey;
    } else {
      this.weekly = this._generateMissions(weekKey, 2, true);
      this.weekKey = weekKey;
    }

    // Restore progress from saved
    if (saved) {
      this.daily.forEach((m, i) => {
        if (saved.dailyProgress && saved.dailyProgress[i]) {
          m.progress = saved.dailyProgress[i];
          m.claimed = saved.dailyClaimed && saved.dailyClaimed[i];
        }
      });
      this.weekly.forEach((m, i) => {
        if (saved.weeklyProgress && saved.weeklyProgress[i]) {
          m.progress = saved.weeklyProgress[i];
          m.claimed = saved.weeklyClaimed && saved.weeklyClaimed[i];
        }
      });
    }
  }

  _generateMissions(seed, count, harder = false) {
    const rng = Utils.seededRandom(seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    const pool = [...CONFIG.MISSION_POOL];
    const shuffled = pool.sort(() => rng() - 0.5).slice(0, count);

    return shuffled.map(template => {
      const rawIdx = harder ? Math.min(2, Math.floor(rng() * 3)) : Math.floor(rng() * 2);
      const diffIdx = Math.min(rawIdx, template.targets.length - 1);
      const target = template.targets[diffIdx];
      return {
        id: template.id,
        label: template.label.replace('{n}', Utils.formatNumber(target)),
        target,
        progress: 0,
        xp: template.xp[diffIdx],
        coins: template.coins[diffIdx],
        claimed: false,
        harder
      };
    });
  }

  _save() {
    Utils.saveState('missions', {
      dayKey: this.dayKey,
      weekKey: this.weekKey,
      daily: this.daily,
      weekly: this.weekly,
      dailyProgress: this.daily.map(m => m.progress),
      dailyClaimed: this.daily.map(m => m.claimed),
      weeklyProgress: this.weekly.map(m => m.progress),
      weeklyClaimed: this.weekly.map(m => m.claimed),
    });
  }

  onRunEnd(runData) {
    const { score, chickens, streak, epics, legendaries, runs, coinsEarned, noObstacleHit } = runData;

    const update = (missions) => {
      missions.forEach(m => {
        if (m.claimed) return;
        switch (m.id) {
          case 'catch_chickens':  m.progress += chickens; break;
          case 'reach_streak':    m.progress = Math.max(m.progress, streak); break;
          case 'play_runs':       m.progress += 1; break;
          case 'score_single':    m.progress = Math.max(m.progress, score); break;
          case 'catch_epic':      m.progress += epics; break;
          case 'catch_legendary': m.progress += legendaries; break;
          case 'no_obstacle_hit': if (noObstacleHit) m.progress = 1; break;
          case 'collect_coins':   m.progress += coinsEarned; break;
        }
        m.progress = Math.min(m.progress, m.target);
      });
    };

    update(this.daily);
    update(this.weekly);
    this._save();
  }

  claimMission(type, index) {
    const missions = type === 'daily' ? this.daily : this.weekly;
    const m = missions[index];
    if (!m || m.claimed || m.progress < m.target) return null;
    m.claimed = true;
    Progression.addXP(m.xp);
    const coinsEarned = Progression.addCoins(m.coins);
    this._save();
    return { xp: m.xp, coins: coinsEarned };
  }

  getClaimable() {
    const check = (missions) => missions.filter(m => !m.claimed && m.progress >= m.target);
    return { daily: check(this.daily), weekly: check(this.weekly) };
  }

  hasUnclaimedRewards() {
    const { daily, weekly } = this.getClaimable();
    return daily.length > 0 || weekly.length > 0;
  }

  getAll() {
    return { daily: this.daily, weekly: this.weekly };
  }
}

const Missions = new MissionsSystem();
