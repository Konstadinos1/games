'use strict';

class ProgressionSystem {
  constructor() {
    this._load();
  }

  _load() {
    const saved = Utils.loadState('progression', null);
    if (saved) {
      Object.assign(this, saved);
    } else {
      this.level = 1;
      this.xp = 0;
      this.totalXP = 0;
      this.coins = 0;
      this.totalCoins = 0;
      this.monthlyCoins = 0;
      this.highScore = 0;
      this.totalRuns = 0;
      this.totalChickens = 0;
      this.totalEpics = 0;
      this.totalLegendaries = 0;
      this.bestStreak = 0;
      this.unlockedChars = ['classic'];
      this.activeChar = 'classic';
      this.achievements = {};
      this.monthKey = Utils.monthKey();
    }
    this._checkMonthReset();
  }

  _save() {
    Utils.saveState('progression', {
      level: this.level, xp: this.xp, totalXP: this.totalXP,
      coins: this.coins, totalCoins: this.totalCoins,
      monthlyCoins: this.monthlyCoins, highScore: this.highScore,
      totalRuns: this.totalRuns, totalChickens: this.totalChickens,
      totalEpics: this.totalEpics, totalLegendaries: this.totalLegendaries,
      bestStreak: this.bestStreak, unlockedChars: this.unlockedChars,
      activeChar: this.activeChar, achievements: this.achievements,
      monthKey: this.monthKey
    });
  }

  _checkMonthReset() {
    const currentMonth = Utils.monthKey();
    if (this.monthKey !== currentMonth) {
      this.monthlyCoins = 0;
      this.monthKey = currentMonth;
      this._save();
    }
  }

  xpForLevel(level) {
    const P = CONFIG.PROGRESSION;
    return Math.floor(P.BASE_LEVEL_XP * Math.pow(P.LEVEL_XP_SCALE, level - 1));
  }

  xpToNextLevel() {
    return this.xpForLevel(this.level);
  }

  xpProgress() {
    const needed = this.xpToNextLevel();
    return { current: this.xp, needed, fraction: Math.min(this.xp / needed, 1) };
  }

  addXP(amount) {
    const levelUps = [];
    this.xp += amount;
    this.totalXP += amount;

    while (this.level < CONFIG.PROGRESSION.MAX_LEVEL && this.xp >= this.xpForLevel(this.level)) {
      this.xp -= this.xpForLevel(this.level);
      this.level++;
      levelUps.push(this.level);
      this._checkCharUnlocks(this.level);
    }

    this._save();
    return levelUps;
  }

  addCoins(amount) {
    const tier = this.getTier();
    const bonus = Math.floor(amount * tier.bonus);
    const total = amount + bonus;
    this.coins += total;
    this.totalCoins += total;
    this.monthlyCoins += total;
    this._save();
    return total;
  }

  spendCoins(amount) {
    if (this.coins < amount) return false;
    this.coins -= amount;
    this._save();
    return true;
  }

  getTier() {
    const tiers = CONFIG.TIERS;
    let tier = tiers[0];
    for (const t of tiers) {
      if (this.monthlyCoins >= t.minCoins) tier = t;
    }
    return tier;
  }

  getTierIndex() {
    const tiers = CONFIG.TIERS;
    let idx = 0;
    for (let i = 0; i < tiers.length; i++) {
      if (this.monthlyCoins >= tiers[i].minCoins) idx = i;
    }
    return idx;
  }

  nextTier() {
    const idx = this.getTierIndex();
    return idx < CONFIG.TIERS.length - 1 ? CONFIG.TIERS[idx + 1] : null;
  }

  _checkCharUnlocks(level) {
    const newUnlocks = [];
    CONFIG.CHARACTERS.forEach(char => {
      if (char.unlockLevel <= level && !this.unlockedChars.includes(char.id)) {
        this.unlockedChars.push(char.id);
        newUnlocks.push(char);
      }
    });
    return newUnlocks;
  }

  isCharUnlocked(charId) {
    return this.unlockedChars.includes(charId);
  }

  setActiveChar(charId) {
    if (this.isCharUnlocked(charId)) {
      this.activeChar = charId;
      this._save();
      return true;
    }
    return false;
  }

  getActiveChar() {
    return CONFIG.CHARACTERS.find(c => c.id === this.activeChar) || CONFIG.CHARACTERS[0];
  }

  recordRun(score, coins, streak, chickens, epics, legendaries) {
    this.totalRuns++;
    this.totalChickens += chickens;
    this.totalEpics += epics;
    this.totalLegendaries += legendaries;
    if (score > this.highScore) this.highScore = score;
    if (streak > this.bestStreak) this.bestStreak = streak;

    const P = CONFIG.PROGRESSION;
    const xpGained = Math.floor(score / 100 * P.XP_PER_100_SCORE) + coins * P.XP_PER_COIN;
    const levelUps = this.addXP(xpGained);
    const coinsEarned = this.addCoins(coins);

    this._save();
    return { xpGained, levelUps, coinsEarned };
  }

  getStats() {
    return {
      level: this.level,
      xp: this.xp,
      xpNeeded: this.xpToNextLevel(),
      coins: this.coins,
      monthlyCoins: this.monthlyCoins,
      tier: this.getTier(),
      highScore: this.highScore,
      totalRuns: this.totalRuns,
      totalChickens: this.totalChickens,
      totalEpics: this.totalEpics,
      totalLegendaries: this.totalLegendaries,
      bestStreak: this.bestStreak,
    };
  }

  // Leaderboard simulation (real implementation uses Firebase)
  getLeaderboard() {
    const player = {
      rank: 1, name: 'You', score: this.highScore, avatar: '👨‍🍳', isPlayer: true
    };
    const fakeEntries = [
      { rank: 2,  name: 'PiriQueen_Mtl',     score: Math.max(this.highScore + Utils.randomInt(100, 500), 1200), avatar: '👸' },
      { rank: 3,  name: 'ChickenChaser99',   score: Math.max(this.highScore - Utils.randomInt(50, 200), 800),  avatar: '🏃' },
      { rank: 4,  name: 'SpicyStreak_QC',    score: Math.max(this.highScore - Utils.randomInt(200, 500), 600), avatar: '🌶️' },
      { rank: 5,  name: 'BelleprosFan',      score: Math.max(this.highScore - Utils.randomInt(400, 800), 400), avatar: '🍗' },
      { rank: 6,  name: 'PiriNinja_514',     score: Math.max(this.highScore - Utils.randomInt(600, 1000), 300),avatar: '🥷' },
      { rank: 7,  name: 'MontrealRunner',    score: Math.max(this.highScore - Utils.randomInt(800, 1200), 200),avatar: '🏙️' },
      { rank: 8,  name: 'RotisserieKing',    score: Math.max(this.highScore - Utils.randomInt(1000, 1500), 150),avatar:'👑' },
      { rank: 9,  name: 'PoutineWarrior_QC', score: Math.max(this.highScore - Utils.randomInt(1200, 1800), 100),avatar:'🛡️' },
      { rank: 10, name: 'HeatWave_Laval',    score: Math.max(this.highScore - Utils.randomInt(1400, 2000), 50), avatar:'🔥' },
    ];

    // Sort by score and re-rank
    const all = [player, ...fakeEntries].sort((a, b) => b.score - a.score);
    all.forEach((e, i) => e.rank = i + 1);
    return all;
  }
}

const Progression = new ProgressionSystem();
