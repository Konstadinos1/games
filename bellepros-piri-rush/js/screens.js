'use strict';

class ScreenManager {
  constructor() {
    this._current = null;
    this._toastTimer = null;
  }

  show(screenId, data = {}) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    const el = document.getElementById('screen-' + screenId);
    if (el) {
      el.classList.add('active');
      this._current = screenId;
    }

    // Render dynamic content
    switch (screenId) {
      case 'menu':       this._renderMenu(); break;
      case 'game':       this._renderGame(); break;
      case 'pause':      this._renderPause(); break;
      case 'results':    this._renderResults(data); break;
      case 'characters': this._renderCharacters(); break;
      case 'shop':       this._renderShop(); break;
      case 'missions':   this._renderMissions(); break;
      case 'social':     this._renderSocial(); break;
      case 'leaderboard':this._renderLeaderboard(); break;
      case 'settings':   this._renderSettings(); break;
      case 'store':      this._renderStore(); break;
      case 'rewards':    this._renderRewards(); break;
      case 'ar':         this._renderAR(); break;
    }

    if (window.Analytics) Analytics.screenView(screenId);
  }

  showToast(msg, duration = 2500, type = 'default') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast show toast-${type}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  // ── Menu ──
  _renderMenu() {
    const stats = Progression.getStats();
    const tier = stats.tier;
    const missions = Missions.hasUnclaimedRewards();
    const zoneStatus = Geofencing.getZoneStatus();
    const challenges = Social.getPendingChallenges();

    document.getElementById('menu-level').textContent = `Level ${stats.level}`;
    document.getElementById('menu-coins').textContent = `🪙 ${Utils.formatNumber(stats.coins)}`;
    document.getElementById('menu-tier').textContent = tier.name;
    document.getElementById('menu-tier').style.color = tier.color;

    const char = Progression.getActiveChar();
    document.getElementById('menu-char-emoji').textContent = char.emoji;
    document.getElementById('menu-char-name').textContent = char.name;

    // Notifications
    const notifBadge = document.getElementById('missions-badge');
    if (notifBadge) notifBadge.style.display = missions ? 'flex' : 'none';

    const socialBadge = document.getElementById('social-badge');
    if (socialBadge) socialBadge.style.display = challenges.length > 0 ? 'flex' : 'none';

    // Piri Zone indicator
    const zoneEl = document.getElementById('piri-zone-indicator');
    if (zoneEl) {
      if (zoneStatus.active) {
        zoneEl.classList.add('active');
        zoneEl.innerHTML = `🌶️ PIRI ZONE — ${zoneStatus.locationName}<br><small>2x Rewards Active!</small>`;
        zoneEl.style.display = 'block';
      } else if (zoneStatus.locationName && zoneStatus.distance < 2000) {
        zoneEl.classList.remove('active');
        zoneEl.innerHTML = `📍 ${zoneStatus.locationName}: ${zoneStatus.distance}m away`;
        zoneEl.style.display = 'block';
      } else {
        zoneEl.style.display = 'none';
      }
    }

    // XP bar
    const xpBar = document.getElementById('menu-xp-bar-fill');
    if (xpBar) xpBar.style.width = (stats.xp / stats.xpNeeded * 100) + '%';

    // Sponsored challenge
    const sponsored = Monetization.getSponsoredChallenge();
    const spEl = document.getElementById('sponsored-challenge');
    if (spEl) spEl.innerHTML = `${sponsored.emoji} <strong>${sponsored.brand}</strong>: ${sponsored.challenge}<br><em>${sponsored.reward}</em>`;
  }

  // ── Game HUD overlay (minimal — main HUD is on canvas) ──
  _renderGame() {
    const pauseBtn = document.getElementById('pause-btn');
    if (pauseBtn) pauseBtn.onclick = () => game.togglePause();
  }

  // ── Pause ──
  _renderPause() {
    document.getElementById('pause-resume-btn').onclick = () => game.togglePause();
    document.getElementById('pause-menu-btn').onclick = () => {
      game.state = GAME_STATE.MENU;
      Audio.stopBGM();
      this.show('menu');
    };
    document.getElementById('pause-mute-btn').textContent = Audio.muted ? '🔊 Unmute' : '🔇 Mute';
    document.getElementById('pause-mute-btn').onclick = () => {
      Audio.setMuted(!Audio.muted);
      document.getElementById('pause-mute-btn').textContent = Audio.muted ? '🔊 Unmute' : '🔇 Mute';
    };
  }

  // ── Results ──
  _renderResults(data) {
    const { score, xpGained, coinsEarned, levelUps, streak, chickens, epics, legendaries, isPiriZone, highScore, canRevive } = data;

    const isNewBest = score >= highScore;
    document.getElementById('results-score').textContent = Utils.formatNumber(score);
    document.getElementById('results-is-best').style.display = isNewBest ? 'block' : 'none';
    document.getElementById('results-streak').textContent = streak + 'x';
    document.getElementById('results-chickens').textContent = chickens;
    document.getElementById('results-xp').textContent = '+' + Utils.formatNumber(xpGained) + ' XP';
    document.getElementById('results-coins').textContent = '🪙 +' + Utils.formatNumber(coinsEarned);
    const coinsCountEl = document.getElementById('results-coins-count');
    if (coinsCountEl) coinsCountEl.textContent = Utils.formatNumber(coinsEarned);

    if (isPiriZone) {
      document.getElementById('results-piri-bonus').textContent = '🌶️ Piri Zone 1.5x bonus applied!';
      document.getElementById('results-piri-bonus').style.display = 'block';
    } else {
      document.getElementById('results-piri-bonus').style.display = 'none';
    }

    const levelUpEl = document.getElementById('results-levelups');
    if (levelUps && levelUps.length > 0) {
      levelUpEl.innerHTML = levelUps.map(l => {
        const char = CONFIG.CHARACTERS.find(c => c.unlockLevel === l);
        return `🎉 Level ${l}!${char ? ` ${char.emoji} ${char.name} unlocked!` : ''}`;
      }).join('<br>');
      levelUpEl.style.display = 'block';
    } else {
      levelUpEl.style.display = 'none';
    }

    // Revive button
    const reviveBtn = document.getElementById('revive-btn');
    if (reviveBtn) {
      reviveBtn.style.display = canRevive ? 'flex' : 'none';
      reviveBtn.onclick = async () => {
        reviveBtn.disabled = true;
        const revived = await game.offerRevive();
        if (!revived) {
          reviveBtn.disabled = false;
          this.showToast('Ad cancelled — no revive', 2000);
        }
      };
    }

    // Buttons
    document.getElementById('results-play-again').onclick = () => game.startRun();
    document.getElementById('results-menu').onclick = () => { game.state = GAME_STATE.MENU; this.show('menu'); };
    document.getElementById('results-share').onclick = async () => {
      Audio.play('button');
      await Social.shareScore(score, streak, chickens, game.canvas);
      this.showToast('Copied to clipboard! 📋');
      Analytics.shareAction('score');
    };
  }

  // ── Characters ──
  _renderCharacters() {
    const container = document.getElementById('char-grid');
    const activeChar = Progression.activeChar;
    container.innerHTML = '';

    CONFIG.CHARACTERS.forEach(char => {
      const unlocked = Progression.isCharUnlocked(char.id);
      const card = document.createElement('div');
      card.className = `char-card ${unlocked ? 'unlocked' : 'locked'} ${char.id === activeChar ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="char-emoji">${char.emoji}</div>
        <div class="char-name">${char.name}</div>
        <div class="char-bio">${unlocked ? char.bio : `Unlock at Level ${char.unlockLevel}`}</div>
        ${char.id === activeChar ? '<div class="char-badge">ACTIVE</div>' : ''}
        ${!unlocked ? `<div class="char-lock">🔒 Lv.${char.unlockLevel}</div>` : ''}
      `;
      if (unlocked && char.id !== activeChar) {
        card.onclick = () => {
          Audio.play('button');
          Progression.setActiveChar(char.id);
          this._renderCharacters();
          this.showToast(`${char.emoji} ${char.name} selected!`);
        };
      }
      container.appendChild(card);
    });

    document.getElementById('char-back').onclick = () => { Audio.play('button'); this.show('menu'); };
  }

  // ── Shop / Rewards ──
  _renderShop() {
    const container = document.getElementById('shop-items');
    container.innerHTML = '';

    CONFIG.REWARDS.forEach(reward => {
      const canAfford = Progression.coins >= reward.cost;
      const item = document.createElement('div');
      item.className = `shop-item ${canAfford ? 'affordable' : 'expensive'}`;
      item.innerHTML = `
        <div class="shop-item-emoji">${reward.emoji}</div>
        <div class="shop-item-info">
          <div class="shop-item-name">${reward.name}</div>
          <div class="shop-item-desc">${reward.desc}</div>
        </div>
        <button class="shop-btn ${canAfford ? '' : 'disabled'}" data-id="${reward.id}">
          🪙 ${reward.cost}
        </button>
      `;
      item.querySelector('.shop-btn').onclick = () => {
        if (!canAfford) { this.showToast('Not enough Piri Coins! 🪙', 2000, 'error'); return; }
        Audio.play('coin');
        const redemption = Rewards.redeem(reward.id);
        if (redemption) {
          this._showRedemptionModal(redemption);
          this._renderShop(); // refresh
        }
      };
      container.appendChild(item);
    });

    document.getElementById('shop-coins').textContent = Utils.formatNumber(Progression.coins);
    document.getElementById('shop-tier').textContent = Progression.getTier().name;
    document.getElementById('shop-back').onclick = () => { Audio.play('button'); this.show('menu'); };
    document.getElementById('shop-store-btn').onclick = () => { Audio.play('button'); this.show('store'); };
    document.getElementById('shop-history-btn').onclick = () => { Audio.play('button'); this.show('rewards'); };
  }

  _showRedemptionModal(redemption) {
    const qr = Rewards.generateQRDisplay(redemption);
    const modal = document.getElementById('redemption-modal');
    modal.querySelector('.modal-emoji').textContent = redemption.rewardEmoji;
    modal.querySelector('.modal-title').textContent = redemption.rewardName;
    modal.querySelector('.modal-code').textContent = redemption.code;
    modal.querySelector('.modal-instructions').textContent = qr.instructions;
    modal.querySelector('.modal-expiry').textContent = `Expires: ${qr.expiresText}`;
    modal.style.display = 'flex';
    this.showToast('🎉 Reward unlocked! Show this at Bellepros', 4000, 'success');
  }

  _renderRewards() {
    const container = document.getElementById('rewards-list');
    const active = Rewards.getActive();
    container.innerHTML = active.length === 0
      ? '<p class="empty-state">No active rewards. Spend Piri Coins in the shop!</p>'
      : '';

    active.forEach(r => {
      const item = document.createElement('div');
      item.className = 'reward-item';
      item.innerHTML = `
        <div class="reward-emoji">${r.rewardEmoji}</div>
        <div class="reward-info">
          <div class="reward-name">${r.rewardName}</div>
          <div class="reward-code">${r.code}</div>
          <div class="reward-expiry">Expires ${new Date(r.expiresAt).toLocaleDateString('fr-CA')}</div>
        </div>
        <button class="redeem-btn" data-id="${r.id}">Show 📲</button>
      `;
      item.querySelector('.redeem-btn').onclick = () => this._showRedemptionModal(r);
      container.appendChild(item);
    });

    document.getElementById('rewards-back').onclick = () => { Audio.play('button'); this.show('shop'); };
  }

  // ── Missions ──
  _renderMissions() {
    const { daily, weekly } = Missions.getAll();

    const renderMissionList = (missions, containerId, type) => {
      const el = document.getElementById(containerId);
      el.innerHTML = '';
      missions.forEach((m, i) => {
        const complete = m.progress >= m.target;
        const div = document.createElement('div');
        div.className = `mission-item ${complete ? 'complete' : ''} ${m.claimed ? 'claimed' : ''}`;
        const pct = Math.min(100, (m.progress / m.target * 100)).toFixed(0);
        div.innerHTML = `
          <div class="mission-label">${m.label}</div>
          <div class="mission-progress-bar"><div class="mission-progress-fill" style="width:${pct}%"></div></div>
          <div class="mission-progress-text">${Utils.formatNumber(m.progress)} / ${Utils.formatNumber(m.target)}</div>
          <div class="mission-rewards">+${m.xp} XP • 🪙${m.coins}</div>
          ${complete && !m.claimed ? `<button class="mission-claim-btn" data-type="${type}" data-idx="${i}">Claim! 🎁</button>` : ''}
          ${m.claimed ? '<span class="mission-claimed-badge">✓ Claimed</span>' : ''}
        `;
        if (complete && !m.claimed) {
          div.querySelector('.mission-claim-btn').onclick = () => {
            Audio.play('level_up');
            const result = Missions.claimMission(type, i);
            if (result) {
              this.showToast(`+${result.xp} XP & 🪙${result.coins} claimed!`, 3000, 'success');
              this._renderMissions();
            }
          };
        }
        el.appendChild(div);
      });
    };

    renderMissionList(daily, 'daily-missions', 'daily');
    renderMissionList(weekly, 'weekly-missions', 'weekly');

    document.getElementById('missions-back').onclick = () => { Audio.play('button'); this.show('menu'); };
  }

  // ── Social ──
  _renderSocial() {
    const pending = Social.getPendingChallenges();
    const sent = Social.getSentChallenges();
    const referralCode = Social.getMyReferralCode();

    // Auth status banner
    const authBanner = document.getElementById('social-auth-banner');
    if (authBanner) {
      if (FirebaseBackend.isSignedIn()) {
        authBanner.innerHTML = `<span style="color:var(--success)">✓ Signed in as ${FirebaseBackend.getDisplayName()}</span>`;
      } else {
        authBanner.innerHTML = `
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Sign in to sync progress, challenge real players & appear on the global leaderboard</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button id="signin-google" class="btn-secondary" style="flex:1;font-size:12px">🔵 Google</button>
            <button id="signin-apple"  class="btn-secondary" style="flex:1;font-size:12px">⬛ Apple</button>
          </div>
        `;
        document.getElementById('signin-google')?.addEventListener('click', async () => {
          Audio.play('button');
          const user = await FirebaseBackend.signInWithGoogle();
          if (user) { this.showToast(`Welcome, ${user.displayName}! ✓`, 3000, 'success'); this._renderSocial(); }
        });
        document.getElementById('signin-apple')?.addEventListener('click', async () => {
          Audio.play('button');
          const user = await FirebaseBackend.signInWithApple();
          if (user) { this.showToast(`Welcome, ${user.displayName}! ✓`, 3000, 'success'); this._renderSocial(); }
        });
      }
    }

    document.getElementById('referral-code').textContent = referralCode;
    document.getElementById('copy-referral').onclick = () => {
      navigator.clipboard?.writeText(`Join me on Bellepros Piri Rush! Use code ${referralCode} for a FREE Legendary Chicken! 🍗👑`);
      this.showToast('Referral link copied! 📋');
    };

    // Simulate incoming challenge button
    document.getElementById('simulate-challenge').onclick = () => {
      Audio.play('button');
      const ch = Social.simulateIncomingChallenge();
      this.showToast(`${ch.from} challenged you! Score to beat: ${Utils.formatNumber(ch.score)}`, 4000, 'info');
      this._renderSocial();
    };

    // Pending challenges
    const pendingEl = document.getElementById('pending-challenges');
    pendingEl.innerHTML = pending.length === 0
      ? '<p class="empty-state">No pending challenges. Dare your friends! 😤</p>' : '';
    pending.forEach(ch => {
      const div = document.createElement('div');
      div.className = 'challenge-item';
      div.innerHTML = `
        <div class="challenge-from">👊 <strong>${ch.from}</strong> challenged you!</div>
        <div class="challenge-score">Beat: ${Utils.formatNumber(ch.score)} pts (${ch.streak}x streak)</div>
        <button class="btn-primary btn-sm accept-challenge" data-id="${ch.id}">Accept Challenge 🏃</button>
      `;
      div.querySelector('.accept-challenge').onclick = () => {
        Audio.play('button');
        Social.acceptChallenge(ch.id);
        game.startRun();
        this.showToast(`Challenge accepted! Beat ${Utils.formatNumber(ch.score)} pts!`, 3000);
      };
      pendingEl.appendChild(div);
    });

    // Send challenge
    document.getElementById('challenge-send-btn').onclick = () => {
      const score = Progression.highScore || 1000;
      const streak = Progression.bestStreak || 5;
      const fakeFriends = ['Alex_Mtl', 'Sophie_QC', 'MaximePiri', 'Julie_NDG'];
      const friend = fakeFriends[Utils.randomInt(0, fakeFriends.length - 1)];
      const ch = Social.sendChallenge(friend, score, streak);
      this.showToast(`Challenge sent to ${friend}! 💪`, 3000, 'success');
      this._renderSocial();
    };

    // Redeem referral
    document.getElementById('redeem-referral-btn').onclick = () => {
      const code = document.getElementById('referral-input')?.value.trim().toUpperCase();
      if (!code) { this.showToast('Enter a referral code', 2000, 'error'); return; }
      const result = Social.redeemReferralCode(code);
      if (result.success) {
        this.showToast(`🍗 Legendary Chicken unlocked! +${result.coins} coins!`, 4000, 'success');
        Audio.play('catch_legendary');
      } else {
        const msgs = { own_code: "That's your own code!", already_used: 'Code already used.' };
        this.showToast(msgs[result.reason] || 'Invalid code', 2500, 'error');
      }
    };

    document.getElementById('social-back').onclick = () => { Audio.play('button'); this.show('menu'); };
  }

  // ── Leaderboard ──
  async _renderLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted)">Loading…</div>';
    const entries = await FirebaseBackend.fetchLeaderboard(100);
    list.innerHTML = '';

    entries.forEach(e => {
      const div = document.createElement('div');
      div.className = `leaderboard-entry ${e.isPlayer ? 'is-player' : ''} rank-${Math.min(e.rank, 4)}`;
      const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
      div.innerHTML = `
        <div class="lb-rank">${medals[e.rank] || e.rank}</div>
        <div class="lb-avatar">${e.avatar}</div>
        <div class="lb-name">${e.name}${e.isPlayer ? ' (You)' : ''}</div>
        <div class="lb-score">${Utils.formatNumber(e.score)}</div>
      `;
      list.appendChild(div);
    });

    document.getElementById('lb-back').onclick = () => { Audio.play('button'); this.show('menu'); };

    // Challenge top player
    document.getElementById('challenge-top').onclick = () => {
      const top = entries.find(e => !e.isPlayer);
      if (top) {
        Social.sendChallenge(top.name, Progression.highScore, Progression.bestStreak);
        this.showToast(`Challenged ${top.name}! 💪`, 3000, 'success');
      }
    };
  }

  // ── Settings ──
  _renderSettings() {
    const muteBtn = document.getElementById('settings-mute');
    muteBtn.textContent = Audio.muted ? '🔊 Unmute Music' : '🔇 Mute Music';
    muteBtn.onclick = () => {
      Audio.setMuted(!Audio.muted);
      this._renderSettings();
    };

    document.getElementById('settings-name').value = Social.playerName || '';
    document.getElementById('settings-save-name').onclick = () => {
      const name = document.getElementById('settings-name').value;
      Social.setPlayerName(name);
      this.showToast('Name saved!', 2000, 'success');
    };

    document.getElementById('settings-notif').onclick = async () => {
      const granted = await Notifications.requestPermission();
      this.showToast(granted ? '🔔 Notifications enabled!' : 'Notifications blocked', 2500);
    };

    document.getElementById('settings-geo').onclick = () => {
      Geofencing.simulateLocation(0);
      this.showToast('🌶️ Simulating Piri Zone...', 3000, 'piri');
    };

    document.getElementById('settings-reset').onclick = () => {
      if (confirm('Reset ALL progress? This cannot be undone!')) {
        localStorage.clear();
        location.reload();
      }
    };

    document.getElementById('settings-privacy').onclick = () => {
      alert('Privacy Policy: This app collects gameplay data for analytics and improvement. No personal data is sold. You can request deletion at privacy@bellepros.com. GDPR/Bill 25 compliant.');
    };

    document.getElementById('settings-back').onclick = () => { Audio.play('button'); this.show('menu'); };
  }

  // ── In-App Store ──
  _renderStore() {
    const passStatus = Monetization.getSpicyPassStatus();
    const passEl = document.getElementById('spicy-pass-card');

    if (passStatus.active) {
      passEl.innerHTML = `<div class="pass-active">🌶️ SPICY PASS ACTIVE<br><small>Renews ${passStatus.expiry}</small></div>`;
    } else {
      const p = passStatus.product;
      passEl.innerHTML = `
        <div class="pass-header">${p.emoji} ${p.name}</div>
        <div class="pass-price">${p.price}/month</div>
        <ul class="pass-perks">${p.perks.map(pk => `<li>✓ ${pk}</li>`).join('')}</ul>
        <button class="btn-primary btn-glow" id="buy-pass-btn">Subscribe Now</button>
      `;
      document.getElementById('buy-pass-btn').onclick = async () => {
        Audio.play('button');
        const result = await Monetization.purchase(p.id);
        if (result.success) {
          this.showToast('🌶️ Welcome to the Spicy Pass!', 3000, 'success');
          Audio.play('level_up');
          this._renderStore();
        }
      };
    }

    // Coin bundles
    const bundleContainer = document.getElementById('coin-bundles');
    bundleContainer.innerHTML = '';
    const coinProducts = ['COINS_SMALL', 'COINS_MEDIUM', 'COINS_LARGE'].map(k => Monetization.getProducts()[k]);
    coinProducts.forEach(p => {
      const div = document.createElement('div');
      div.className = 'store-item';
      div.innerHTML = `
        <div class="store-emoji">${p.emoji}</div>
        <div class="store-name">${p.name}</div>
        <button class="btn-primary btn-sm" data-id="${p.id}">${p.price}</button>
      `;
      div.querySelector('button').onclick = async () => {
        Audio.play('button');
        const result = await Monetization.purchase(p.id);
        if (result.success) {
          this.showToast(`${p.name} added!`, 2500, 'success');
          this._renderStore();
        }
      };
      bundleContainer.appendChild(div);
    });

    // Skin packs
    const skinContainer = document.getElementById('skin-bundles');
    skinContainer.innerHTML = '';
    ['SKIN_PACK_1', 'SKIN_PACK_2'].forEach(key => {
      const p = Monetization.getProducts()[key];
      const div = document.createElement('div');
      div.className = 'store-item';
      div.innerHTML = `
        <div class="store-emoji">${p.emoji}</div>
        <div class="store-name">${p.name}</div>
        <div class="store-chars">${p.chars.map(id => CONFIG.CHARACTERS.find(c => c.id === id)?.emoji || '🍗').join(' ')}</div>
        <button class="btn-primary btn-sm" data-id="${p.id}">${p.price}</button>
      `;
      div.querySelector('button').onclick = async () => {
        Audio.play('button');
        const result = await Monetization.purchase(p.id);
        if (result.success) {
          this.showToast(`${p.name} unlocked! 🎉`, 3000, 'success');
          this._renderStore();
        }
      };
      skinContainer.appendChild(div);
    });

    document.getElementById('store-back').onclick = () => { Audio.play('button'); this.show('shop'); };
    document.getElementById('store-restore').onclick = async () => {
      const result = await Monetization.restorePurchases();
      this.showToast(`Restored ${result.restored} purchase(s)`, 2500);
    };
  }

  // ── AR Mode ──
  _renderAR() {
    const videoEl = document.getElementById('ar-video');
    const overlayCanvas = document.getElementById('ar-canvas');

    overlayCanvas.width = window.innerWidth;
    overlayCanvas.height = window.innerHeight;

    AR.onCatch = (chicken) => {
      const foodNames = { COMMON: '🍔 Burger', RARE: '🌭 Hot Dog', EPIC: '🍟 Poutine', LEGENDARY: '🍗 Bellepros Chicken' };
      this.showToast(`${chicken.type === 'LEGENDARY' ? '👑 LEGENDARY ' : ''}${foodNames[chicken.type] || 'Food'} caught! +${chicken.score} pts`, 2000, 'success');
      Audio.play('ar_catch');
    };

    overlayCanvas.addEventListener('click', (e) => {
      const rect = overlayCanvas.getBoundingClientRect();
      const scaleX = overlayCanvas.width / rect.width;
      const scaleY = overlayCanvas.height / rect.height;
      AR.tap((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    });

    overlayCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = overlayCanvas.getBoundingClientRect();
      const scaleX = overlayCanvas.width / rect.width;
      const scaleY = overlayCanvas.height / rect.height;
      const touch = e.touches[0];
      AR.tap((touch.clientX - rect.left) * scaleX, (touch.clientY - rect.top) * scaleY);
    }, { passive: false });

    AR.start(videoEl, overlayCanvas).then(success => {
      if (!success) {
        this.showToast('Camera access required for AR mode', 3000, 'error');
        this.show('menu');
      }
    });

    document.getElementById('ar-close-btn').onclick = () => {
      AR.stop();
      const { score, caught } = AR.getScore();
      if (score > 0) {
        this.showToast(`AR Session: ${Utils.formatNumber(score)} pts, ${caught} chickens!`, 4000, 'success');
        Progression.addCoins(Math.floor(caught * 5));
      }
      this.show('menu');
    };

    document.getElementById('ar-photo-btn').onclick = async () => {
      const screenshot = AR.captureScreenshot();
      await Social.shareAR(screenshot);
      this.showToast('Shared! 📸', 2000, 'success');
      Analytics.shareAction('ar');
    };
  }
}

const Screens = new ScreenManager();
