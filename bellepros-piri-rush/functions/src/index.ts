import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// ════════════════════════════════════════════════════════
//  Bellepros Piri Rush — Cloud Functions
// ════════════════════════════════════════════════════════

// ── FCM Queue Processor ──────────────────────────────────
// Triggered when a doc is written to fcm_queue collection.
// Sends push notification to target user and deletes the doc.
export const processFCMQueue = functions.firestore
  .document('fcm_queue/{docId}')
  .onCreate(async (snap, context) => {
    const { targetUid, notification } = snap.data();
    if (!targetUid || !notification) {
      await snap.ref.delete();
      return;
    }

    try {
      // Fetch target's FCM token
      const userDoc = await db.doc(`users/${targetUid}`).get();
      const fcmToken = userDoc.data()?.fcmToken;
      if (!fcmToken) { await snap.ref.delete(); return; }

      await messaging.send({
        token: fcmToken,
        notification: {
          title: notification.title,
          body:  notification.body,
          imageUrl: notification.image,
        },
        data: notification.data || {},
        android: {
          priority: 'high',
          notification: { channelId: 'bellepros_game', sound: 'default' },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
          headers: { 'apns-priority': '10' },
        },
        webpush: {
          headers: { Urgency: 'high' },
          notification: { icon: '/assets/icon-192.png', badge: '/assets/badge-96.png' },
        },
      });

      functions.logger.info(`[FCM] Sent to ${targetUid}`);
    } catch (e) {
      functions.logger.error(`[FCM] Send failed for ${targetUid}:`, e);
    } finally {
      await snap.ref.delete();
    }
  });

// ── Leaderboard Aggregation ──────────────────────────────
// Recalculates top-100 cache document once per minute using a schedule.
export const aggregateLeaderboard = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    const snap = await db
      .collection('leaderboard/global/scores')
      .orderBy('highScore', 'desc')
      .limit(100)
      .get();

    // QuerySnapshot.forEach passes no index — track rank manually
    const entries: any[] = [];
    let rank = 0;
    snap.forEach((doc) => {
      rank += 1;
      entries.push({ rank, ...doc.data(), uid: doc.id });
    });

    await db.doc('leaderboard/global/cache').set({
      entries,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      count: snap.size,
    });

    functions.logger.info(`[Leaderboard] Cached ${snap.size} entries`);
  });

// ── Score Validation (anti-cheat) ───────────────────────
// Intercepts leaderboard writes and rejects statistically impossible scores.
export const validateScore = functions.firestore
  .document('leaderboard/global/scores/{uid}')
  .onWrite(async (change, context) => {
    if (!change.after.exists) return;
    const data = change.after.data()!;
    const uid  = context.params.uid;

    // Check previous high score — reject if increase is > 10x in one write
    const prev = change.before.exists ? change.before.data()!.highScore : 0;
    const curr = data.highScore;

    if (curr > prev * 10 && prev > 0) {
      functions.logger.warn(`[AntiCheat] Suspicious score jump: ${uid} ${prev} → ${curr}`);
      // Revert to previous value + flag account
      await change.after.ref.set({ highScore: prev, flagged: true }, { merge: true });
      await db.doc(`users/${uid}`).set({ flagged: true, flaggedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
  });

// ── New User Setup ───────────────────────────────────────
// Creates default user document and registers referral code on first sign-in.
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;

  // Default user document
  await db.doc(`users/${uid}`).set({
    displayName: user.displayName || 'Anonymous Chef',
    avatar:      '👨‍🍳',
    createdAt:   admin.firestore.FieldValue.serverTimestamp(),
    platform:    'unknown',
    referralCode: generateReferralCode(uid),
  });

  // Default save document (level 1, no progress)
  await db.doc(`saves/${uid}`).set({
    level: 1, xp: 0, totalXP: 0,
    coins: 0, totalCoins: 0, monthlyCoins: 0,
    highScore: 0, totalRuns: 0, totalChickens: 0,
    totalEpics: 0, totalLegendaries: 0, bestStreak: 0,
    unlockedChars: ['classic'], activeChar: 'classic',
    playerName: user.displayName || '',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    appVersion: '1.0.0',
  });

  functions.logger.info(`[User] Created: ${uid}`);
});

// ── User Deletion (GDPR / Bill 25 compliance) ────────────
export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const batch = db.batch();

  // Delete all user data (analytics included — Loi 25/GDPR erasure must
  // cover every collection keyed by uid)
  batch.delete(db.doc(`users/${uid}`));
  batch.delete(db.doc(`saves/${uid}`));
  batch.delete(db.doc(`leaderboard/global/scores/${uid}`));
  batch.delete(db.doc(`analytics/${uid}`));

  await batch.commit();

  // Delete subcollections (challenges) — Firestore doesn't cascade
  const [inbox, sent] = await Promise.all([
    db.collection(`challenges/${uid}/inbox`).get(),
    db.collection(`challenges/${uid}/sent`).get(),
  ]);
  const deleteBatch = db.batch();
  [...inbox.docs, ...sent.docs].forEach(d => deleteBatch.delete(d.ref));
  await deleteBatch.commit();

  functions.logger.info(`[GDPR] Deleted all data for user ${uid}`);
});

// ── Piri Zone Notification Scheduler ─────────────────────
// Sends promotional push to all users within 500m of any Bellepros
// (In production: triggered by server-side geofence events or via partner API)
export const sendPiriZonePromo = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in required');

  const { locationName, targetTokens } = data;
  if (!locationName || !targetTokens?.length) {
    throw new functions.https.HttpsError('invalid-argument', 'locationName and targetTokens required');
  }

  const message = {
    notification: {
      title: '🌶️ Piri Zone Activated!',
      body:  `You're near ${locationName}! Play now for 2x rewards & exclusive chickens!`,
    },
    tokens: targetTokens.slice(0, 500), // FCM sendEachForMulticast limit
  };

  const result = await messaging.sendEachForMulticast(message);
  functions.logger.info(`[PiriZone] Sent to ${result.successCount}/${targetTokens.length} devices`);
  return { sent: result.successCount, failed: result.failureCount };
});

// ── Helper ────────────────────────────────────────────────
function generateReferralCode(uid: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seed = uid.slice(-8);
  return 'PIRI-' + seed.split('').map(c =>
    chars[c.charCodeAt(0) % chars.length]
  ).join('').slice(0, 6);
}
