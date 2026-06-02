'use strict';

class HUD {
  constructor(game) {
    this.game = game;
    this._streakLabelTimer = 0;
    this._streakLabel = '';
    this._levelUpTimer = 0;
    this._levelUpText = '';
    this._coinPopTimer = 0;
    this._piriZonePulse = 0;
    this._comboFlash = 0;
  }

  showStreakLabel(label) {
    this._streakLabel = label;
    this._streakLabelTimer = 2000;
  }

  showLevelUp(level) {
    this._levelUpText = `LEVEL ${level}! 🎉`;
    this._levelUpTimer = 3000;
  }

  showCoinPop() {
    this._coinPopTimer = 800;
  }

  triggerComboFlash() {
    this._comboFlash = 300;
  }

  update(dt) {
    if (this._streakLabelTimer > 0) this._streakLabelTimer -= dt;
    if (this._levelUpTimer > 0) this._levelUpTimer -= dt;
    if (this._coinPopTimer > 0) this._coinPopTimer -= dt;
    if (this._comboFlash > 0) this._comboFlash -= dt;
    this._piriZonePulse = (this._piriZonePulse + dt * 0.004) % (Math.PI * 2);
  }

  draw(ctx, state, t) {
    const W = CONFIG.CANVAS_WIDTH;
    const { score, streak, multiplier, lives, chickens, isPiriZone, distance, coins } = state;

    this._drawTopBar(ctx, W, score, coins, isPiriZone, t);
    this._drawLives(ctx, W, lives);
    this._drawStreak(ctx, W, streak, multiplier, t);
    this._drawDistance(ctx, W, distance);

    if (isPiriZone) this._drawPiriZoneBanner(ctx, W, t);
    if (this._streakLabelTimer > 0) this._drawStreakLabel(ctx, W, t);
    if (this._levelUpTimer > 0) this._drawLevelUp(ctx, W, t);
    if (this._comboFlash > 0) this._drawComboFlash(ctx, W);
  }

  _drawTopBar(ctx, W, score, coins, isPiriZone, t) {
    // Semi-transparent top bar
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, 68);

    // Score
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 16, 20);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 26px Arial';
    ctx.fillText(Utils.formatNumber(score), 16, 48);

    // High score indicator
    if (score > Progression.highScore && score > 0) {
      ctx.fillStyle = '#FF6B35';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      const pulse = 0.7 + 0.3 * Math.sin(t * 0.01);
      ctx.globalAlpha = pulse;
      ctx.fillText('⬆ BEST', 80, 58);
      ctx.globalAlpha = 1;
    }

    // Piri coins
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('🪙 PIRI COINS', W / 2, 20);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(Utils.formatNumber(Progression.coins), W / 2, 44);

    // Level badge
    ctx.textAlign = 'right';
    ctx.fillStyle = CONFIG.COLORS.PRIMARY;
    ctx.fillRect(W - 72, 8, 62, 52);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 9px Arial';
    ctx.fillText('LVL', W - 10, 24);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(Progression.level, W - 10, 52);

    // XP bar inside level badge
    const { fraction } = Progression.xpProgress();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(W - 70, 60, 58, 4);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(W - 70, 60, 58 * fraction, 4);
  }

  _drawLives(ctx, W, lives) {
    for (let i = 0; i < CONFIG.PLAYER.START_LIVES; i++) {
      ctx.font = '22px serif';
      ctx.textAlign = 'left';
      const x = 16 + i * 28;
      ctx.globalAlpha = i < lives ? 1 : 0.25;
      ctx.fillText('❤️', x, 92);
      ctx.globalAlpha = 1;
    }
  }

  _drawStreak(ctx, W, streak, multiplier, t) {
    if (streak === 0) return;

    const centerX = W / 2;
    const y = 82;

    // Multiplier badge
    if (multiplier > 1) {
      const pulse = 1 + 0.06 * Math.sin(t * 0.015);
      ctx.save();
      ctx.translate(centerX, y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = multiplier >= 5 ? '#E8192C' : multiplier >= 3 ? '#FF6B35' : '#F39C12';
      ctx.fillRect(-36, -18, 72, 22);
      ctx.fillStyle = '#FFF';
      ctx.font = `bold ${multiplier >= 10 ? 16 : 20}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${multiplier}x`, 0, 0);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }

    // Streak fire counter
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = streak >= 10 ? '#FF6B35' : '#FFD700';
    ctx.fillText(`🔥 ${streak}`, W - 16, 92);
  }

  _drawDistance(ctx, W, distance) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(distance)}m`, W - 16, 116);
  }

  _drawPiriZoneBanner(ctx, W, t) {
    const alpha = 0.7 + 0.2 * Math.sin(this._piriZonePulse);
    const y = CONFIG.CANVAS_HEIGHT - 110;
    ctx.fillStyle = `rgba(232,25,44,${alpha * 0.9})`;
    ctx.fillRect(0, y, W, 32);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🌶️ PIRI ZONE — 2x REWARDS ACTIVE! 🌶️', W / 2, y + 21);
  }

  _drawStreakLabel(ctx, W, t) {
    const alpha = Math.min(1, this._streakLabelTimer / 300);
    const yOffset = (1 - this._streakLabelTimer / 2000) * -30;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, 180 + yOffset);
    const scale = 1 + 0.15 * Utils.easeOutBounce(Math.min(1, (2000 - this._streakLabelTimer) / 500));
    ctx.scale(scale, scale);
    ctx.fillStyle = '#FF6B35';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    ctx.fillText(this._streakLabel, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  _drawLevelUp(ctx, W, t) {
    const alpha = Math.min(1, this._levelUpTimer / 400);
    ctx.save();
    ctx.globalAlpha = alpha;
    const centerY = CONFIG.CANVAS_HEIGHT / 2 - 50;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(W / 2 - 140, centerY - 30, 280, 70);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 140, centerY - 30, 280, 70);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this._levelUpText, W / 2, centerY + 14);

    // Check for char unlock
    const unlockedChar = CONFIG.CHARACTERS.find(c => c.unlockLevel === parseInt(this._levelUpText.match(/\d+/)?.[0]));
    if (unlockedChar) {
      ctx.fillStyle = '#FFF';
      ctx.font = '14px Arial';
      ctx.fillText(`${unlockedChar.emoji} ${unlockedChar.name} unlocked!`, W / 2, centerY + 36);
    }
    ctx.restore();
  }

  _drawComboFlash(ctx, W) {
    const alpha = (this._comboFlash / 300) * 0.12;
    ctx.fillStyle = `rgba(255,215,0,${alpha})`;
    ctx.fillRect(0, 0, W, CONFIG.CANVAS_HEIGHT);
  }

  // Mini score popup above chicken catch position
  static scorePopup(ctx, x, y, text, color = '#FFD700') {
    ctx.fillStyle = color;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 6;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
  }
}
