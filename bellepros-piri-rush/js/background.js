'use strict';

class Background {
  constructor() {
    this.offset = 0;
    this.speed = 0;
    this.time = 0;

    // Building layer data (generated procedurally from seed)
    this._farBuildings  = this._genBuildings(25, 80, 200, 600, ['#1a1a2e', '#16213e', '#0f3460', '#23344a', '#1d2d44']);
    this._midBuildings  = this._genBuildings(18, 110, 320, 380, ['#2c3e50', '#34495e', '#3d566e', '#2e4057', '#405e76']);
    this._nearBuildings = this._genBuildings(12, 160, 500, 280, ['#4a5568', '#3a4a5c', '#546477', '#3e505e', '#4d5f6e']);

    // Street details pool
    this._details = this._genStreetDetails();
    this._clouds  = this._genClouds();
    this._stars   = this._genStars();
  }

  _genBuildings(count, minH, maxH, baseY, colors) {
    const buildings = [];
    for (let i = 0; i < count; i++) {
      const w = Utils.randomBetween(40, 100);
      buildings.push({
        x: i * (CONFIG.CANVAS_WIDTH / count * 1.2),
        y: baseY - Utils.randomBetween(minH, maxH),
        w,
        h: Utils.randomBetween(minH, maxH),
        color: colors[Math.floor(Math.random() * colors.length)],
        winRows: Utils.randomInt(2, 8),
        winCols: Utils.randomInt(1, 4),
        litWindows: Array.from({ length: 40 }, () => Math.random() < 0.4),
      });
    }
    return buildings;
  }

  _genStreetDetails() {
    const details = [];
    for (let i = 0; i < 30; i++) {
      const type = ['hydrant', 'bench', 'light', 'sign', 'tree'][Utils.randomInt(0, 4)];
      details.push({ type, x: i * 140 + Utils.randomBetween(0, 100), phase: Math.random() * Math.PI * 2 });
    }
    return details;
  }

  _genClouds() {
    return Array.from({ length: 8 }, (_, i) => ({
      x: i * 130 + Utils.randomBetween(0, 80),
      y: Utils.randomBetween(30, 160),
      w: Utils.randomBetween(80, 180),
      h: Utils.randomBetween(30, 60),
      speed: Utils.randomBetween(0.15, 0.4),
    }));
  }

  _genStars() {
    return Array.from({ length: 40 }, () => ({
      x: Math.random() * CONFIG.CANVAS_WIDTH,
      y: Math.random() * 250,
      r: Math.random() * 1.5 + 0.5,
      twinkle: Math.random() * Math.PI * 2,
    }));
  }

  update(dt, gameSpeed, isPiriZone = false) {
    this.time += dt;
    this.speed = gameSpeed;
    const scroll = gameSpeed * dt * 0.06;
    this.offset += scroll;

    // Scroll buildings
    this._scrollLayer(this._farBuildings,  scroll * 0.15, CONFIG.CANVAS_WIDTH + 120);
    this._scrollLayer(this._midBuildings,  scroll * 0.35, CONFIG.CANVAS_WIDTH + 120);
    this._scrollLayer(this._nearBuildings, scroll * 0.6,  CONFIG.CANVAS_WIDTH + 180);
    this._scrollDetails(scroll);
    this._clouds.forEach(c => { c.x -= c.speed * scroll * 10; if (c.x + c.w < 0) c.x = CONFIG.CANVAS_WIDTH + 20; });
  }

  _scrollLayer(layer, dx, wrap) {
    const spread = wrap * 1.4;
    layer.forEach(b => {
      b.x -= dx;
      if (b.x + b.w < -20) b.x += spread;
    });
  }

  _scrollDetails(dx) {
    this._details.forEach(d => {
      d.x -= dx * 0.9;
      if (d.x < -30) d.x += 30 * 140 / 28;
    });
  }

  draw(ctx, isPiriZone = false) {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    const t = this.time;

    // ── Sky ──
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.65);
    if (isPiriZone) {
      skyGrad.addColorStop(0, '#1a0008');
      skyGrad.addColorStop(0.4, '#3d0015');
      skyGrad.addColorStop(1, '#7a1a30');
    } else {
      skyGrad.addColorStop(0, '#0d0d1a');
      skyGrad.addColorStop(0.35, '#1a1a3e');
      skyGrad.addColorStop(0.75, '#2e3a5c');
      skyGrad.addColorStop(1, '#4a6080');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.65);

    // Stars
    this._stars.forEach(s => {
      const alpha = 0.4 + 0.5 * Math.sin(t * 0.001 + s.twinkle);
      ctx.fillStyle = `rgba(255,255,240,${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Moon
    const moonX = 340, moonY = 60;
    ctx.fillStyle = '#FFFDE7';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isPiriZone ? '#3d0015' : '#1a1a3e';
    ctx.beginPath();
    ctx.arc(moonX + 10, moonY - 4, 22, 0, Math.PI * 2);
    ctx.fill();

    // Piri Zone effect
    if (isPiriZone) {
      const piriGlow = ctx.createRadialGradient(W / 2, H * 0.6, 0, W / 2, H * 0.6, W * 0.8);
      piriGlow.addColorStop(0, `rgba(232,25,44,${0.1 + 0.05 * Math.sin(t * 0.005)})`);
      piriGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = piriGlow;
      ctx.fillRect(0, 0, W, H);
    }

    // Clouds
    this._clouds.forEach(c => this._drawCloud(ctx, c));

    // Far buildings
    this._farBuildings.forEach(b => this._drawBuilding(ctx, b, 0.6));

    // Mid buildings
    this._midBuildings.forEach(b => this._drawBuilding(ctx, b, 0.8));

    // Horizon gradient
    const horizGrad = ctx.createLinearGradient(0, H * 0.52, 0, H * 0.68);
    horizGrad.addColorStop(0, 'rgba(100,120,160,0)');
    horizGrad.addColorStop(1, 'rgba(70,70,90,0.5)');
    ctx.fillStyle = horizGrad;
    ctx.fillRect(0, H * 0.52, W, H * 0.16);

    // Near buildings
    this._nearBuildings.forEach(b => this._drawBuilding(ctx, b, 1.0));

    // Ground – road & sidewalk
    this._drawGround(ctx, isPiriZone);

    // Street details
    this._details.forEach(d => this._drawDetail(ctx, d, t));

    // Speed lines at high speed
    if (this.speed > 9) {
      const alpha = Math.min((this.speed - 9) / 6, 0.3);
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const lineY = 500 + Math.sin(t * 0.01 + i) * 30;
        const lineX = ((this.offset * 0.5 + i * 80) % (W + 100)) - 50;
        ctx.beginPath();
        ctx.moveTo(lineX, lineY);
        ctx.lineTo(lineX - 60, lineY + 4);
        ctx.stroke();
      }
    }
  }

  _drawBuilding(ctx, b, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Windows
    const wW = Math.max(4, (b.w - 10) / b.winCols - 2);
    const wH = 6;
    const colGap = (b.w - 10) / b.winCols;
    const rowGap = 18;
    for (let row = 0; row < b.winRows; row++) {
      for (let col = 0; col < b.winCols; col++) {
        const winIdx = row * b.winCols + col;
        const isLit = b.litWindows[winIdx % b.litWindows.length];
        ctx.fillStyle = isLit ? 'rgba(255,220,100,0.85)' : 'rgba(80,100,120,0.4)';
        ctx.fillRect(b.x + 5 + col * colGap, b.y + 8 + row * rowGap, wW, wH);
      }
    }
    ctx.restore();
  }

  _drawCloud(ctx, c) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#9ab';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x + c.w * 0.25, c.y - c.h * 0.2, c.w * 0.35, c.h * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawGround(ctx, isPiriZone) {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    const groundY = 690;

    // Road
    ctx.fillStyle = isPiriZone ? '#2a0a10' : '#2a2a2a';
    ctx.fillRect(0, groundY, W, H - groundY);

    // Sidewalk
    ctx.fillStyle = isPiriZone ? '#3d1520' : '#5a5a55';
    ctx.fillRect(0, groundY, W, 30);

    // Road markings
    ctx.fillStyle = '#888';
    ctx.fillRect(0, groundY - 5, W, 5);

    // Dashed center line
    ctx.fillStyle = '#FFD700';
    ctx.globalAlpha = 0.5;
    const dashW = 40, dashGap = 30;
    const totalPeriod = dashW + dashGap;
    const offset = this.offset % totalPeriod;
    for (let x = -totalPeriod + offset; x < W + totalPeriod; x += totalPeriod) {
      ctx.fillRect(x, groundY + 18, dashW, 3);
    }
    ctx.globalAlpha = 1;

    // Sidewalk cracks / tiles
    ctx.strokeStyle = isPiriZone ? '#5a2030' : '#888';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.4;
    const tileW = 60;
    const tileOffset = this.offset % tileW;
    for (let x = -tileW + tileOffset; x < W + tileW; x += tileW) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x, groundY + 28);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  _drawDetail(ctx, d, t) {
    if (d.x < -50 || d.x > CONFIG.CANVAS_WIDTH + 50) return;
    const groundY = 690;
    ctx.save();
    ctx.translate(d.x, groundY);

    switch (d.type) {
      case 'hydrant':
        ctx.fillStyle = '#C0392B';
        ctx.fillRect(-6, -24, 12, 24);
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(-9, -26, 18, 6);
        ctx.fillRect(-10, -10, 20, 4);
        break;

      case 'light':
        ctx.fillStyle = '#888';
        ctx.fillRect(-2, -70, 4, 70);
        ctx.fillStyle = '#555';
        ctx.fillRect(-2, -72, 30, 4);
        ctx.fillStyle = `rgba(255,230,100,${0.7 + 0.2 * Math.sin(t * 0.003 + d.phase)})`;
        ctx.beginPath();
        ctx.arc(28, -72, 8, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'bench':
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(-20, -8, 40, 4);
        ctx.fillRect(-18, -4, 5, 8);
        ctx.fillRect(13, -4, 5, 8);
        ctx.fillRect(-22, -14, 44, 5);
        break;

      case 'sign':
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(-2, -50, 4, 50);
        ctx.fillStyle = '#E8192C';
        ctx.fillRect(-20, -50, 40, 20);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 7px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BELLES', 0, -37);
        ctx.fillText('PROS', 0, -28);
        break;

      case 'tree':
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(-4, -35, 8, 35);
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.arc(0, -42, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#388E3C';
        ctx.beginPath();
        ctx.arc(-6, -50, 14, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.restore();
  }
}
