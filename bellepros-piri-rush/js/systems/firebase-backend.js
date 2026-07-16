'use strict';

// ════════════════════════════════════════════════════════
//  Firebase Backend — Bellepros Piri Rush
//
//  Services:
//    Auth        — Apple / Google / Facebook + anonymous fallback
//    Firestore   — Cloud saves, leaderboard, challenges, referrals
//    FCM         — Push notifications (friend challenges, piri zone)
//    Analytics   — Firebase Analytics (replaces stub in analytics.js)
//
//  Call FirebaseBackend.init() from game.js after DOMContentLoaded.
//  The game works fully offline; Firebase adds sync on top.
// ════════════════════════════════════════════════════════

class FirebaseBackendSystem {
  constructor() {
    this._app      = null;
    this._auth     = null;
    this._db       = null;
    this._analytics = null;
    this._messaging = null;
    this._user     = null;
    this._ready    = false;
    this._syncTimer = null;

    // Paths in Firestore
    this._paths = {
      userDoc:    (uid) => `users/${uid}`,
      saveDoc:    (uid) => `saves/${uid}`,
      leaderboard:      'leaderboard/global/scores',
      challenges: (uid) => `challenges/${uid}/inbox`,
      sentChallenges: (uid) => `challenges/${uid}/sent`,
      referrals:        'referrals',
      analytics:  (uid) => `analytics/${uid}`,
    };
  }

  // ── Initialization ──────────────────────────────────

  async init() {
    // Bail out gracefully if Firebase SDK not loaded (offline / config not set)
    if (typeof firebase === 'undefined') {
      console.log('[Firebase] SDK not loaded — running in offline mode');
      return false;
    }
    if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
      console.log('[Firebase] Config not set — running in offline mode');
      return false;
    }

    try {
      this._app      = firebase.initializeApp(FIREBASE_CONFIG);
      this._auth     = firebase.auth();
      this._db       = firebase.firestore();
      this._analytics = firebase.analytics();

      // Wire analytics to the stub system
      Analytics.initFirebase(this._analytics);

      // Enable Firestore offline persistence
      await this._db.enablePersistence({ synchronizeTabs: true })
        .catch(e => console.log('[Firestore] Persistence unavailable:', e.code));

      // Auth state listener
      this._auth.onAuthStateChanged(user => this._onAuthChange(user));

      // FCM (only on HTTPS or localhost)
      if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        await this._initFCM();
      }

      this._ready = true;
      console.log('[Firebase] Initialized');
      return true;
    } catch (e) {
      console.error('[Firebase] Init failed:', e);
      return false;
    }
  }

  isReady() { return this._ready; }
  getCurrentUser() { return this._user; }
  isSignedIn() { return this._user !== null && !this._user.isAnonymous; }

  // ── Authentication ──────────────────────────────────

  async signInAnonymously() {
    if (!this._ready) return null;
    try {
      const cred = await this._auth.signInAnonymously();
      return cred.user;
    } catch (e) { console.error('[Auth] Anonymous sign-in failed:', e); return null; }
  }

  async signInWithGoogle() {
    if (!this._ready) return null;
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      // On mobile use redirect; on desktop use popup
      if (Utils.isMobile()) {
        await this._auth.signInWithRedirect(provider);
        return null; // will resume via onAuthStateChanged after redirect
      } else {
        const result = await this._auth.signInWithPopup(provider);
        return result.user;
      }
    } catch (e) { console.error('[Auth] Google sign-in failed:', e); return null; }
  }

  async signInWithApple() {
    if (!this._ready) return null;
    try {
      const provider = new firebase.auth.OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      if (Utils.isMobile()) {
        await this._auth.signInWithRedirect(provider);
        return null;
      } else {
        const result = await this._auth.signInWithPopup(provider);
        return result.user;
      }
    } catch (e) { console.error('[Auth] Apple sign-in failed:', e); return null; }
  }

  async signInWithFacebook() {
    if (!this._ready) return null;
    try {
      const provider = new firebase.auth.FacebookAuthProvider();
      provider.addScope('public_profile');
      if (Utils.isMobile()) {
        await this._auth.signInWithRedirect(provider);
        return null;
      } else {
        const result = await this._auth.signInWithPopup(provider);
        return result.user;
      }
    } catch (e) { console.error('[Auth] Facebook sign-in failed:', e); return null; }
  }

  async signOut() {
    if (!this._ready) return;
    await this._auth.signOut();
  }

  async _onAuthChange(user) {
    const wasSignedIn = this._user !== null;
    this._user = user;

    if (user) {
      console.log('[Auth] Signed in:', user.uid, user.isAnonymous ? '(anonymous)' : user.displayName);

      // Merge local progress → cloud on first sign-in
      await this._mergeLocalToCloud(user.uid);

      // Start periodic cloud sync
      this._startSync(user.uid);

      // Subscribe to incoming challenges
      this._listenForChallenges(user.uid);

      Analytics.event('login', {
        method: user.providerData[0]?.providerId || 'anonymous',
        is_new_user: !wasSignedIn,
      });
    } else {
      console.log('[Auth] Signed out');
      this._stopSync();
    }
  }

  // ── Cloud Save / Sync ──────────────────────────────

  async _mergeLocalToCloud(uid) {
    const cloudSave = await this._fetchCloudSave(uid);
    const localLevel = Progression.level;

    if (!cloudSave) {
      // First time — push local progress to cloud
      await this._pushSave(uid);
    } else if (cloudSave.level > localLevel) {
      // Cloud is ahead — pull it down
      this._applyCloudSave(cloudSave);
      console.log('[Sync] Pulled cloud save (cloud level', cloudSave.level, '> local', localLevel, ')');
    } else if (localLevel > cloudSave.level) {
      // Local is ahead — push it up
      await this._pushSave(uid);
      console.log('[Sync] Pushed local save (local level', localLevel, '> cloud', cloudSave.level, ')');
    }
  }

  async _fetchCloudSave(uid) {
    try {
      const doc = await this._db.doc(this._paths.saveDoc(uid)).get();
      return doc.exists ? doc.data() : null;
    } catch (e) { console.error('[Sync] Fetch failed:', e); return null; }
  }

  async _pushSave(uid) {
    if (!this._db || !uid) return;
    try {
      const save = {
        level:            Progression.level,
        xp:               Progression.xp,
        totalXP:          Progression.totalXP,
        coins:            Progression.coins,
        totalCoins:       Progression.totalCoins,
        monthlyCoins:     Progression.monthlyCoins,
        highScore:        Progression.highScore,
        totalRuns:        Progression.totalRuns,
        totalChickens:    Progression.totalChickens,
        totalEpics:       Progression.totalEpics,
        totalLegendaries: Progression.totalLegendaries,
        bestStreak:       Progression.bestStreak,
        unlockedChars:    Progression.unlockedChars,
        activeChar:       Progression.activeChar,
        playerName:       Social.playerName || '',
        updatedAt:        firebase.firestore.FieldValue.serverTimestamp(),
        platform:         Utils.isMobile() ? (Utils.isIOS() ? 'ios' : 'android') : 'web',
        appVersion:       CONFIG.VERSION,
      };

      await this._db.doc(this._paths.saveDoc(uid)).set(save, { merge: true });

      // Update leaderboard entry
      await this._updateLeaderboard(uid, save);
    } catch (e) { console.error('[Sync] Push failed:', e); }
  }

  _applyCloudSave(save) {
    Progression.level            = save.level;
    Progression.xp               = save.xp;
    Progression.totalXP          = save.totalXP;
    Progression.coins            = save.coins;
    Progression.totalCoins       = save.totalCoins;
    Progression.monthlyCoins     = save.monthlyCoins || 0;
    Progression.highScore        = save.highScore;
    Progression.totalRuns        = save.totalRuns;
    Progression.totalChickens    = save.totalChickens;
    Progression.totalEpics       = save.totalEpics || 0;
    Progression.totalLegendaries = save.totalLegendaries || 0;
    Progression.bestStreak       = save.bestStreak;
    Progression.unlockedChars    = save.unlockedChars;
    Progression.activeChar       = save.activeChar;
    if (save.playerName) Social.setPlayerName(save.playerName);
    Progression._save(); // persist locally too
  }

  _startSync(uid) {
    this._stopSync();
    // Sync after each run ends (triggered by game.js) + every 5 minutes as safety net
    this._syncTimer = setInterval(() => this._pushSave(uid), 5 * 60 * 1000);
  }

  _stopSync() {
    if (this._syncTimer) { clearInterval(this._syncTimer); this._syncTimer = null; }
  }

  // Called by game.js after every run
  async syncAfterRun() {
    if (!this._user) return;
    await this._pushSave(this._user.uid);
  }

  // ── Leaderboard ────────────────────────────────────

  async _updateLeaderboard(uid, save) {
    if (!this._db) return;
    try {
      const char = CONFIG.CHARACTERS.find(c => c.id === save.activeChar) || CONFIG.CHARACTERS[0];
      await this._db.doc(`${this._paths.leaderboard}/${uid}`).set({
        uid,
        displayName: save.playerName || 'Anonymous Chef',
        avatar:      char.emoji,
        highScore:   save.highScore,
        level:       save.level,
        tier:        Progression.getTier().name,
        updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (e) { console.error('[Leaderboard] Update failed:', e); }
  }

  async fetchLeaderboard(limit = 100) {
    if (!this._db) return Progression.getLeaderboard(); // offline fallback

    try {
      const snapshot = await this._db
        .collection(this._paths.leaderboard)
        .orderBy('highScore', 'desc')
        .limit(limit)
        .get();

      const entries = [];
      // QuerySnapshot.forEach passes no index — track rank manually
      let rank = 0;
      snapshot.forEach((doc) => {
        rank += 1;
        const d = doc.data();
        entries.push({
          rank,
          uid:      d.uid,
          name:     d.displayName,
          avatar:   d.avatar,
          score:    d.highScore,
          level:    d.level,
          tier:     d.tier,
          isPlayer: this._user && d.uid === this._user.uid,
        });
      });

      // Ensure current player appears even if not in top N
      const currentUserInList = entries.some(e => e.isPlayer);
      if (!currentUserInList && this._user) {
        const myDoc = await this._db.doc(`${this._paths.leaderboard}/${this._user.uid}`).get();
        if (myDoc.exists) {
          const d = myDoc.data();
          entries.push({ rank: '?', name: d.displayName, avatar: d.avatar, score: d.highScore, level: d.level, isPlayer: true });
        }
      }

      return entries;
    } catch (e) {
      console.error('[Leaderboard] Fetch failed:', e);
      return Progression.getLeaderboard();
    }
  }

  // ── Friend Challenges (real-time) ─────────────────

  async sendChallenge(targetUid, targetName, score, streak) {
    if (!this._db || !this._user) {
      // Offline fallback
      return Social.sendChallenge(targetName, score, streak);
    }

    const char = Progression.getActiveChar();
    const discountCode = Utils.generateCode('BELLES', 6);
    const challenge = {
      id:           this._db.collection('tmp').doc().id,
      from:         this._user.uid,
      fromName:     Social.playerName || 'Anonymous Chef',
      fromAvatar:   char.emoji,
      to:           targetUid,
      toName:       targetName,
      score,
      streak,
      discountCode,
      status:       'pending',
      createdAt:    firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    try {
      // Write to target's inbox
      await this._db
        .collection(this._paths.challenges(targetUid))
        .doc(challenge.id)
        .set(challenge);

      // Write to sender's sent box
      await this._db
        .collection(this._paths.sentChallenges(this._user.uid))
        .doc(challenge.id)
        .set({ ...challenge, direction: 'sent' });

      // FCM push to target
      await this._sendFCMToUser(targetUid, {
        title:  `${challenge.fromName} challenged you! 🏆`,
        body:   `Beat ${Utils.formatNumber(score)} pts to make them buy you Bellepros!`,
        data:   { type: 'challenge', challengeId: challenge.id },
      });

      Analytics.event('challenge_sent', { score, streak });
      return challenge;
    } catch (e) {
      console.error('[Challenge] Send failed:', e);
      return Social.sendChallenge(targetName, score, streak);
    }
  }

  _listenForChallenges(uid) {
    if (!this._db) return;
    this._db
      .collection(this._paths.challenges(uid))
      .where('status', '==', 'pending')
      .onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added') {
            const ch = change.doc.data();
            Screens.showToast(`${ch.fromName} challenged you! Beat ${Utils.formatNumber(ch.score)} pts! 👊`, 5000, 'info');
            Audio.play('button');
          }
        });
      }, err => console.error('[Challenges] Listen error:', err));
  }

  async resolveChallenge(challengeId, fromUid, myScore, theirScore) {
    if (!this._db || !this._user) return;

    const won = myScore > theirScore;
    const ref = this._db.collection(this._paths.challenges(this._user.uid)).doc(challengeId);

    try {
      await ref.update({ status: won ? 'won' : 'lost', myScore, resolvedAt: firebase.firestore.FieldValue.serverTimestamp() });

      if (!won) {
        // Notify winner and give loser a discount
        await this._sendFCMToUser(fromUid, {
          title: 'You won the challenge! 🏆🍗',
          body:  `${Social.playerName || 'Your rival'} couldn't beat your score of ${Utils.formatNumber(theirScore)}!`,
          data:  { type: 'challenge_won' },
        });

        const loserCode = Rewards.generateLoserDiscount();
        Screens.showToast(`You lost 😭 Here's your consolation: ${loserCode.code}`, 5000, 'error');
      }
    } catch (e) { console.error('[Challenge] Resolve failed:', e); }
  }

  // ── Referral System ────────────────────────────────

  async redeemReferralCode(code) {
    if (!this._db || !this._user) return Social.redeemReferralCode(code);

    const myCode = Social.getMyReferralCode();
    if (code === myCode) return { success: false, reason: 'own_code' };

    const docRef = this._db.collection(this._paths.referrals).doc(code);
    try {
      const result = await this._db.runTransaction(async (tx) => {
        const doc = await tx.get(docRef);
        if (!doc.exists) return { success: false, reason: 'invalid_code' };

        const data = doc.data();
        if (data.redeemedBy && data.redeemedBy.includes(this._user.uid)) {
          return { success: false, reason: 'already_used' };
        }

        tx.update(docRef, {
          redeemedBy: firebase.firestore.FieldValue.arrayUnion(this._user.uid),
          redeemCount: firebase.firestore.FieldValue.increment(1),
        });

        return { success: true };
      });

      if (result.success) {
        Progression.addCoins(50);
        Analytics.event('referral_redeemed', { code });
      }
      return result;
    } catch (e) {
      console.error('[Referral] Redeem failed:', e);
      return Social.redeemReferralCode(code);
    }
  }

  async registerReferralCode(code, uid) {
    if (!this._db) return;
    try {
      await this._db.collection(this._paths.referrals).doc(code).set({
        ownerUid: uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        redeemCount: 0,
        redeemedBy: [],
      });
    } catch (e) { console.error('[Referral] Register failed:', e); }
  }

  // ── Firebase Cloud Messaging ───────────────────────

  async _initFCM() {
    try {
      if (!('Notification' in window)) return;

      this._messaging = firebase.messaging();
      this._messaging.usePublicVapidKey(FCM_VAPID_KEY);

      // Register service worker
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      this._messaging.useServiceWorker(reg);

      // Store FCM token in Firestore when user signs in
      this._auth.onAuthStateChanged(async user => {
        if (user) await this._refreshFCMToken(user.uid);
      });

      // Foreground message handler
      this._messaging.onMessage(payload => {
        const { title, body } = payload.notification || {};
        if (title) Screens.showToast(`${title}: ${body}`, 5000, 'info');
      });

    } catch (e) { console.log('[FCM] Unavailable:', e.message); }
  }

  async requestPushPermission() {
    if (!this._messaging) return false;
    try {
      const token = await this._messaging.getToken();
      if (token && this._user) {
        await this._refreshFCMToken(this._user.uid);
      }
      Notifications.permission = 'granted';
      return true;
    } catch (e) {
      console.log('[FCM] Permission denied:', e.message);
      return false;
    }
  }

  async _refreshFCMToken(uid) {
    if (!this._messaging || !this._db) return;
    try {
      const token = await this._messaging.getToken();
      if (token) {
        await this._db.doc(this._paths.userDoc(uid)).set({
          fcmToken: token,
          platform: Utils.isMobile() ? (Utils.isIOS() ? 'ios' : 'android') : 'web',
          lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    } catch (e) { /* Token refresh is best-effort */ }
  }

  // Sends FCM via Cloud Function (direct server-to-device requires backend)
  async _sendFCMToUser(targetUid, notification) {
    if (!this._db) return;
    // Write to a Firestore collection that triggers a Cloud Function
    try {
      await this._db.collection('fcm_queue').add({
        targetUid,
        notification,
        sentAt: firebase.firestore.FieldValue.serverTimestamp(),
        sentBy: this._user?.uid || 'system',
      });
    } catch (e) { /* Non-critical */ }
  }

  // ── User Profile ───────────────────────────────────

  async updateProfile(displayName, avatarEmoji) {
    if (!this._user || !this._db) return;
    try {
      await this._user.updateProfile({ displayName });
      await this._db.doc(this._paths.userDoc(this._user.uid)).set({
        displayName,
        avatar: avatarEmoji,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      Social.setPlayerName(displayName);
    } catch (e) { console.error('[Profile] Update failed:', e); }
  }

  async searchUsers(query) {
    if (!this._db) return [];
    try {
      const snap = await this._db
        .collection('users')
        .where('displayName', '>=', query)
        .where('displayName', '<=', query + '')
        .limit(10)
        .get();
      const results = [];
      snap.forEach(doc => results.push({ uid: doc.id, ...doc.data() }));
      return results;
    } catch (e) { return []; }
  }

  // ── Getters ────────────────────────────────────────

  getUserId()      { return this._user?.uid || Analytics._userId; }
  getDisplayName() { return this._user?.displayName || Social.playerName || 'Anonymous Chef'; }
  getPhotoURL()    { return this._user?.photoURL || null; }
}

const FirebaseBackend = new FirebaseBackendSystem();
