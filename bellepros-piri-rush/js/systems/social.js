'use strict';

class SocialSystem {
  constructor() {
    this.playerName = Utils.loadState('playerName', null);
    this.friends = Utils.loadState('friends', []);
    this.pendingChallenges = Utils.loadState('pendingChallenges', []);
    this.sentChallenges = Utils.loadState('sentChallenges', []);
    this._replayFrames = [];
    this._recording = false;
  }

  setPlayerName(name) {
    this.playerName = name.slice(0, 20).replace(/[^\w\s\-_.]/g, '');
    Utils.saveState('playerName', this.playerName);
  }

  // ── Friend challenges (async) ──

  sendChallenge(friendName, score, streak) {
    const challenge = {
      id: Date.now().toString(),
      from: this.playerName || 'Anonymous Chef',
      to: friendName,
      score,
      streak,
      timestamp: Date.now(),
      status: 'pending',
      discountCode: Utils.generateCode('BELLES', 6)
    };
    this.sentChallenges.unshift(challenge);
    if (this.sentChallenges.length > 20) this.sentChallenges.pop();
    Utils.saveState('sentChallenges', this.sentChallenges);

    // Simulate friend getting a notification
    setTimeout(() => {
      Notifications.sendFriendChallenge(challenge.from, score);
    }, 2000);

    return challenge;
  }

  acceptChallenge(challengeId) {
    const ch = this.pendingChallenges.find(c => c.id === challengeId);
    if (!ch) return null;
    ch.status = 'accepted';
    Utils.saveState('pendingChallenges', this.pendingChallenges);
    return ch;
  }

  completeChallenge(challengeId, myScore) {
    const ch = this.pendingChallenges.find(c => c.id === challengeId) ||
               this.sentChallenges.find(c => c.id === challengeId);
    if (!ch) return null;

    const won = myScore > ch.score;
    ch.status = won ? 'won' : 'lost';
    ch.myScore = myScore;

    // "Loser buys" — if they lost, they get a discount push notification
    if (!won) {
      Notifications.scheduleLocal(
        `${ch.from} beat you! 😂🍗`,
        `They scored ${Utils.formatNumber(ch.score)}. Here's a consolation discount: ${ch.discountCode}`,
        500
      );
    } else {
      // Winner gets a Bellepros discount code too (drives foot traffic)
      const winnerCode = Utils.generateCode('CHAMP', 6);
      Notifications.scheduleLocal(
        `You crushed ${ch.from}! 🏆`,
        `Claim your winner reward: ${winnerCode}. Good at all Bellepros locations!`,
        500
      );
    }

    Utils.saveState('pendingChallenges', this.pendingChallenges);
    Utils.saveState('sentChallenges', this.sentChallenges);
    return { won, opponentScore: ch.score, myScore, discountCode: ch.discountCode };
  }

  // Simulate incoming challenges for demo
  simulateIncomingChallenge() {
    const fakeChallengers = [
      { name: 'PiriQueen_Mtl', score: 4820, streak: 12 },
      { name: 'ChickenChaser99', score: 3150, streak: 8 },
      { name: 'SpicyStreak_QC', score: 6700, streak: 18 },
    ];
    const fake = fakeChallengers[Utils.randomInt(0, fakeChallengers.length - 1)];
    const challenge = {
      id: Date.now().toString(),
      from: fake.name,
      to: this.playerName || 'You',
      score: fake.score,
      streak: fake.streak,
      timestamp: Date.now(),
      status: 'pending',
      discountCode: Utils.generateCode('LOSER', 6)
    };
    this.pendingChallenges.unshift(challenge);
    Utils.saveState('pendingChallenges', this.pendingChallenges);
    return challenge;
  }

  // ── Replay recording ──

  startRecording() {
    this._replayFrames = [];
    this._recording = true;
  }

  recordFrame(state) {
    if (!this._recording) return;
    // Sample at ~10fps to keep size manageable
    if (this._replayFrames.length === 0 || Date.now() - this._replayFrames[this._replayFrames.length - 1].t > 100) {
      this._replayFrames.push({ t: Date.now(), ...state });
    }
  }

  stopRecording() {
    this._recording = false;
    return this._replayFrames;
  }

  // ── Social sharing ──

  async shareScore(score, streak, chickens, canvas) {
    const shareText = `I caught ${chickens} chickens and scored ${Utils.formatNumber(score)} pts with a ${streak}x streak in Bellepros Piri Rush! 🍗🔥 Can you beat me? #BelleprosPiriRush #Montreal`;

    // Try native canvas-to-blob share (iOS/Android)
    if (canvas && navigator.share) {
      try {
        canvas.toBlob(async (blob) => {
          const file = new File([blob], 'piri-rush-score.png', { type: 'image/png' });
          await navigator.share({
            title: 'Bellepros Piri Rush 🍗',
            text: shareText,
            files: navigator.canShare({ files: [file] }) ? [file] : undefined,
            url: 'https://bellepros.com/game'
          });
        }, 'image/png');
        return true;
      } catch (e) {}
    }

    // Fallback: copy to clipboard
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
        return 'clipboard';
      } catch (e) {}
    }

    return false;
  }

  async shareAR(canvas) {
    const shareText = 'I found a Bellepros Piri chicken in AR! 🍗📱 #BelleprosPiriRush #ARChicken #Montreal';
    if (canvas && navigator.share) {
      try {
        canvas.toBlob(async (blob) => {
          const file = new File([blob], 'piri-rush-ar.png', { type: 'image/png' });
          await navigator.share({ title: 'Bellepros AR Chicken! 🍗', text: shareText, files: [file] });
        }, 'image/png');
        return true;
      } catch (e) {}
    }
    return false;
  }

  // ── Referral system ──

  generateReferralCode() {
    const code = Utils.generateCode('PIRI', 6);
    Utils.saveState('myReferralCode', code);
    return code;
  }

  getMyReferralCode() {
    return Utils.loadState('myReferralCode', null) || this.generateReferralCode();
  }

  redeemReferralCode(code) {
    const myCode = this.getMyReferralCode();
    if (code === myCode) return { success: false, reason: 'own_code' };
    const usedCodes = Utils.loadState('usedReferralCodes', []);
    if (usedCodes.includes(code)) return { success: false, reason: 'already_used' };

    // Grant legendary chicken encounter + bonus coins
    usedCodes.push(code);
    Utils.saveState('usedReferralCodes', usedCodes);
    Progression.addCoins(50);

    return { success: true, reward: 'legendary_chicken', coins: 50 };
  }

  getFriendCount() { return this.friends.length; }
  getPendingChallenges() { return this.pendingChallenges.filter(c => c.status === 'pending'); }
  getSentChallenges() { return this.sentChallenges; }
}

const Social = new SocialSystem();
