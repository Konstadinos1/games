'use strict';

class Player {
  constructor(game) {
    this.game = game;
    this.x = CONFIG.PLAYER.X;
    this.y = CONFIG.PLAYER.GROUND_Y;
    this.vy = 0;
    this.state = 'running'; // running | jumping | sliding | hit | celebrating
    this.lives = CONFIG.PLAYER.START_LIVES;
    this.isInvincible = false;
    this._invincibleTimer = 0;
    this._slideTimer = 0;
    this.character = CONFIG.CHARACTERS[0];
    this.runFrame = 0;
    this._runTimer = 0;
    this._hitShake = 0;
    this._celebrateTimer = 0;
    this._jumpCount = 0; // double jump support
    this._jumpBufferTimer = 0; // buffers a jump press while airborne
    this.onGround = true;
  }

  setCharacter(charConfig) {
    this.character = charConfig;
  }

  jump() {
    if (this.state === 'sliding') {
      this._slideTimer = 0;
      this.state = 'running';
      return;
    }
    if (this.onGround) {
      this.vy = CONFIG.PLAYER.JUMP_FORCE;
      this.state = 'jumping';
      this.onGround = false;
      this._jumpCount = 1;
      this._jumpBufferTimer = 0;
      Audio.play('jump');
      this.game.spawnParticles(this.x, this.y + CONFIG.PLAYER.HEIGHT / 2, 'dust', 4);
    } else if (this._jumpCount === 1) {
      // Double jump
      this.vy = CONFIG.PLAYER.JUMP_FORCE * 0.8;
      this._jumpCount = 2;
      this._jumpBufferTimer = 0;
      Audio.play('jump');
      this.game.spawnParticles(this.x, this.y, 'star', 6);
    } else {
      // Buffer this jump — execute it on next landing
      this._jumpBufferTimer = 130;
    }
  }

  slide() {
    if (this.onGround && this.state !== 'hit') {
      this.state = 'sliding';
      this._slideTimer = CONFIG.PLAYER.SLIDE_DURATION;
    }
  }

  hit() {
    if (this.isInvincible) return false;

    // Shield absorbs the hit — no life lost, no streak reset
    if (this.game.activePowerUps && this.game.activePowerUps.SHIELD > 0) {
      this.game.activePowerUps.SHIELD = 0;
      this.isInvincible = true;
      this._invincibleTimer = 1500;
      this._hitShake = 200;
      this.game._shakeTimer = 300;
      Audio.play('shield_break');
      Utils.vibrate([30]);
      this.game.spawnParticles(this.x, this.y, 'shield_break', 14);
      Screens.showToast('🛡️ Shield absorbed the hit!', 1600, 'piri');
      return false;
    }

    this.lives--;
    this.isInvincible = true;
    this._invincibleTimer = CONFIG.PLAYER.INVINCIBLE_DURATION;
    this._hitShake = 400;
    this.state = 'hit';
    Audio.play('hit');
    Utils.vibrate([80, 40, 80]);
    this.game.spawnParticles(this.x, this.y, 'hit', 12);
    setTimeout(() => { if (this.state === 'hit') this.state = this.onGround ? 'running' : 'jumping'; }, 500);
    return true;
  }

  celebrate(dur = 1000) {
    this.state = 'celebrating';
    this._celebrateTimer = dur;
  }

  update(dt) {
    const P = CONFIG.PLAYER;
    this._runTimer += dt;
    if (this._runTimer > 120) { this.runFrame = (this.runFrame + 1) % 4; this._runTimer = 0; }

    // Gravity
    if (!this.onGround || this.vy < 0) {
      this.vy += P.GRAVITY * (dt / 16);
      this.y += this.vy * (dt / 16);
    }

    // Ground check
    if (this.y >= P.GROUND_Y) {
      this.y = P.GROUND_Y;
      this.vy = 0;
      this.onGround = true;
      this._jumpCount = 0;
      if (this.state === 'jumping') this.state = 'running';
      // Execute buffered jump
      if (this._jumpBufferTimer > 0) {
        this._jumpBufferTimer = 0;
        this.jump();
      }
    }

    // Tick buffer timer
    if (this._jumpBufferTimer > 0) this._jumpBufferTimer -= dt;

    // Slide timer
    if (this.state === 'sliding') {
      this._slideTimer -= dt;
      if (this._slideTimer <= 0) this.state = 'running';
    }

    // Invincible timer
    if (this.isInvincible) {
      this._invincibleTimer -= dt;
      if (this._invincibleTimer <= 0) this.isInvincible = false;
    }

    // Hit shake
    if (this._hitShake > 0) this._hitShake -= dt;

    // Celebrate timer
    if (this._celebrateTimer > 0) {
      this._celebrateTimer -= dt;
      if (this._celebrateTimer <= 0 && this.state === 'celebrating') this.state = 'running';
    }
  }

  getHitbox() {
    const P = CONFIG.PLAYER;
    if (this.state === 'sliding') {
      return { x: this.x - P.WIDTH / 2 + 4, y: P.GROUND_Y - 18, w: P.WIDTH - 6, h: 18 };
    }
    return { x: this.x - P.WIDTH / 2 + 6, y: this.y - P.HEIGHT + 8, w: P.WIDTH - 12, h: P.HEIGHT - 8 };
  }

  draw(ctx, t) {
    const P = CONFIG.PLAYER;
    const char = this.character;
    const isSliding = this.state === 'sliding';
    const isJumping = this.state === 'jumping';
    const isCelebrating = this.state === 'celebrating';

    // Blink when invincible
    if (this.isInvincible && Math.floor(t / 80) % 2 === 0) return;

    ctx.save();

    // Hit shake
    const shakeX = this._hitShake > 0 ? Math.sin(t * 0.08) * 4 * (this._hitShake / 400) : 0;
    ctx.translate(this.x + shakeX, this.y);

    // Shadow
    const shadowScale = isSliding ? 1.4 : (isJumping ? 0.6 : 1);
    const shadowY = isJumping ? CONFIG.PLAYER.GROUND_Y - this.y + 10 : 10;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.scale(shadowScale, 0.3);
    ctx.beginPath();
    ctx.ellipse(0, shadowY / 0.3, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (isSliding) {
      ctx.save();
      ctx.rotate(-0.3);
      // Sliding body
      ctx.fillStyle = char.bodyColor;
      ctx.fillRect(-30, -16, 58, 28);
      ctx.fillStyle = char.hatColor;
      ctx.fillRect(-30, -18, 58, 8);
      // Face
      ctx.font = '22px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char.emoji, 10, -4);
      ctx.restore();
    } else {
      // Legs (running animation)
      const legSwing = isJumping ? 0 : Math.sin(this._runTimer * 0.03 + this.runFrame * 1.5) * 18;
      ctx.save();
      ctx.fillStyle = isCelebrating ? char.bodyColor : '#333';
      // Left leg
      ctx.save();
      ctx.translate(-9, 8);
      ctx.rotate((legSwing * Math.PI) / 180);
      ctx.fillRect(-5, 0, 10, 28);
      // Shoe
      ctx.fillStyle = '#222';
      ctx.fillRect(-6, 24, 14, 6);
      ctx.restore();
      // Right leg
      ctx.save();
      ctx.translate(9, 8);
      ctx.rotate((-legSwing * Math.PI) / 180);
      ctx.fillRect(-5, 0, 10, 28);
      ctx.fillStyle = '#222';
      ctx.fillRect(-6, 24, 14, 6);
      ctx.restore();
      ctx.restore();

      // Body
      const bodyBob = isCelebrating ? Math.sin(t * 0.015) * 5 : 0;
      ctx.fillStyle = char.bodyColor;
      ctx.fillRect(-18, -42 + bodyBob, 36, 50);

      // Apron
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(-12, -30 + bodyBob, 24, 35);

      // Arms
      const armSwing = isJumping ? -30 : Math.sin(this._runTimer * 0.03 + this.runFrame * 1.5 + Math.PI) * 22;
      ctx.fillStyle = char.bodyColor;
      ctx.save();
      ctx.translate(-22, -28 + bodyBob);
      ctx.rotate((armSwing * Math.PI) / 180);
      ctx.fillRect(-5, 0, 10, 24);
      ctx.restore();
      ctx.save();
      ctx.translate(22, -28 + bodyBob);
      ctx.rotate((-armSwing * Math.PI) / 180);
      ctx.fillRect(-5, 0, 10, 24);
      ctx.restore();

      // Head
      ctx.fillStyle = '#FDBCB4';
      ctx.beginPath();
      ctx.ellipse(0, -54 + bodyBob, 16, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chef hat
      ctx.fillStyle = char.hatColor;
      ctx.fillRect(-14, -75 + bodyBob, 28, 12);
      ctx.fillRect(-10, -92 + bodyBob, 20, 20);

      // Emoji face
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char.emoji, 0, -54 + bodyBob);

      // Celebrate sparkles
      if (isCelebrating) {
        for (let i = 0; i < 4; i++) {
          const angle = (t * 0.006 + i * Math.PI / 2);
          const rx = Math.cos(angle) * 35;
          const ry = Math.sin(angle) * 35 - 40;
          ctx.font = '14px serif';
          ctx.fillText(['⭐', '✨', '🎉', '💫'][i], rx, ry);
        }
      }
    }

    ctx.restore();

    // Shield visual
    if (this.game.activePowerUps && this.game.activePowerUps.SHIELD > 0) {
      const shieldAlpha = 0.45 + 0.3 * Math.sin(t * 0.012);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = `rgba(39,174,96,${shieldAlpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, -40, 32, 56, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(39,174,96,${shieldAlpha * 0.18})`;
      ctx.fill();
      ctx.restore();
    }
  }
}
