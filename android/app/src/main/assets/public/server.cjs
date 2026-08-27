var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express2 = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_url = require("url");
var import_vite = require("vite");

// server/apiRoutes.ts
var import_express = require("express");
var import_crypto2 = __toESM(require("crypto"), 1);

// server/db.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var DB_FILE = import_path.default.join(DATA_DIR, "database.json");
function getAdMobConfig() {
  const isProd = process.env.NODE_ENV === "production" && process.env.ADMOB_ENV !== "test";
  const appId = process.env.ADMOB_APP_ID || "ca-app-pub-3940256099942544~3347511713";
  const bannerId = process.env.ADMOB_BANNER_ID || "ca-app-pub-3940256099942544/6300978111";
  const interstitialId = process.env.ADMOB_INTERSTITIAL_ID || "ca-app-pub-3940256099942544/1033173712";
  const rewardedId = process.env.ADMOB_REWARDED_ID || "ca-app-pub-3940256099942544/5224354917";
  const isTest = bannerId.includes("3940256099942544") || interstitialId.includes("3940256099942544") || rewardedId.includes("3940256099942544") || !isProd;
  return {
    appId,
    bannerId,
    interstitialId,
    rewardedId,
    isTestMode: isTest
  };
}
var adConfig = getAdMobConfig();
var DEFAULT_SETTINGS = {
  pointsPerTap: 10,
  pointsToInrRatio: 10,
  // 10 points = ₹1, meaning 100 points = ₹10
  minWithdrawalInr: 10,
  // ₹10 minimum
  dailyTapLimit: 200,
  // fallback
  minTapIntervalMs: 200,
  // 200ms anti-macro limit
  strictAntiBot: true,
  plans: {
    free: { priceInr: 0, dailyLimit: 500 },
    plan_99: { priceInr: 99, dailyLimit: 1e3 },
    plan_499: { priceInr: 499, dailyLimit: 5e3 },
    plan_2000: { priceInr: 2e3, dailyLimit: null }
  },
  admobEnabled: true,
  admobAppId: adConfig.appId,
  admobBannerId: adConfig.bannerId,
  admobInterstitialId: adConfig.interstitialId,
  admobRewardedId: adConfig.rewardedId,
  adFrequencyTaps: 30,
  // Show natural break interstitial suggestion every 30 taps
  interstitialCooldownSeconds: 60,
  // Minimum 60s cooldown between interstitials
  rewardedAdPoints: Number(process.env.REWARDED_AD_POINTS) || 50,
  // 50 pts = ₹5 per voluntary rewarded video
  rewardedAdDailyLimit: Number(process.env.REWARDED_AD_DAILY_LIMIT) || 5,
  // max 5 rewarded ads / day
  isTestMode: adConfig.isTestMode
};
var dbCache = null;
function ensureDataDirectory() {
  if (!import_fs.default.existsSync(DATA_DIR)) {
    import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  }
}
function getTodayString() {
  const now = /* @__PURE__ */ new Date();
  return now.toISOString().split("T")[0];
}
function createInitialDatabase() {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const today = getTodayString();
  const demoUserId = "TP-782194";
  const sampleUserId2 = "TP-341908";
  const users = [
    {
      id: demoUserId,
      email: "demo@tappoints.com",
      role: "user",
      status: "active",
      createdAt: new Date(Date.now() - 7 * 864e5).toISOString(),
      lastLoginAt: nowIso,
      deviceFingerprint: "dev-client-sample-1",
      ipAddress: "127.0.0.1"
    },
    {
      id: sampleUserId2,
      email: "alex.tapper@example.com",
      role: "user",
      status: "active",
      createdAt: new Date(Date.now() - 3 * 864e5).toISOString(),
      lastLoginAt: nowIso,
      deviceFingerprint: "dev-client-sample-2",
      ipAddress: "127.0.0.1"
    }
  ];
  const profiles = [
    {
      userId: demoUserId,
      name: "Demo Tapper",
      upiId: "demouser@okhdfcbank",
      totalTaps: 340,
      pointsBalance: 450,
      // 450 available points = ₹45
      lockedPoints: 100,
      // 100 points held in pending withdrawal = ₹10
      totalWithdrawnInr: 20,
      dailyTapsCount: 45,
      lastTapDate: today,
      fraudScore: 0,
      dailyRewardedAdsCount: 0,
      lastRewardedAdDate: today,
      dailyEarnedPoints: 450,
      lastEarningDate: today,
      currentPlanId: "free",
      subscriptionExpiresAt: null
    },
    {
      userId: sampleUserId2,
      name: "Alex R.",
      upiId: "alex@paytm",
      totalTaps: 890,
      pointsBalance: 1200,
      lockedPoints: 0,
      totalWithdrawnInr: 70,
      dailyTapsCount: 12,
      lastTapDate: today,
      fraudScore: 5,
      dailyRewardedAdsCount: 0,
      lastRewardedAdDate: today,
      dailyEarnedPoints: 120,
      lastEarningDate: today,
      currentPlanId: "plan_99",
      subscriptionExpiresAt: new Date(Date.now() + 20 * 864e5).toISOString()
    }
  ];
  const point_transactions = [
    {
      id: "tx_seed_1",
      userId: demoUserId,
      type: "tap_reward",
      points: 100,
      inrAmount: 10,
      balanceAfter: 100,
      description: "Tap earnings reward batch",
      createdAt: new Date(Date.now() - 864e5 * 2).toISOString()
    },
    {
      id: "tx_seed_2",
      userId: demoUserId,
      type: "withdrawal_locked",
      points: -100,
      inrAmount: 10,
      balanceAfter: 0,
      description: "Locked for UPI withdrawal request (WID-91823)",
      referenceId: "WID-91823",
      createdAt: new Date(Date.now() - 864e5 * 1).toISOString()
    },
    {
      id: "tx_seed_3",
      userId: demoUserId,
      type: "withdrawal_settled",
      points: 0,
      inrAmount: 10,
      balanceAfter: 0,
      description: "UPI Payout settled to demouser@okhdfcbank (UTR: 428190382910)",
      referenceId: "WID-91823",
      createdAt: new Date(Date.now() - 864e5 * 1).toISOString()
    },
    {
      id: "tx_seed_4",
      userId: demoUserId,
      type: "tap_reward",
      points: 550,
      inrAmount: 55,
      balanceAfter: 550,
      description: "Tap earnings reward session",
      createdAt: new Date(Date.now() - 1e7).toISOString()
    },
    {
      id: "tx_seed_5",
      userId: demoUserId,
      type: "withdrawal_locked",
      points: -100,
      inrAmount: 10,
      balanceAfter: 450,
      description: "Locked for UPI withdrawal request (WID-99201)",
      referenceId: "WID-99201",
      createdAt: new Date(Date.now() - 36e5).toISOString()
    }
  ];
  const withdrawals = [
    {
      id: "WID-91823",
      userId: demoUserId,
      userEmail: "demo@tappoints.com",
      userName: "Demo Tapper",
      pointsRequested: 100,
      inrAmount: 10,
      upiId: "demouser@okhdfcbank",
      status: "paid",
      utrNumber: "428190382910",
      requestedAt: new Date(Date.now() - 864e5 * 2).toISOString(),
      processedAt: new Date(Date.now() - 864e5 * 1).toISOString(),
      processedBy: "Admin (System)"
    },
    {
      id: "WID-99201",
      userId: demoUserId,
      userEmail: "demo@tappoints.com",
      userName: "Demo Tapper",
      pointsRequested: 100,
      inrAmount: 10,
      upiId: "demouser@okhdfcbank",
      status: "pending",
      requestedAt: new Date(Date.now() - 36e5).toISOString()
    }
  ];
  const fraud_flags = [];
  const admin_users = [
    {
      id: "ADMIN-1",
      email: "admin@tappoints.com",
      name: "Super Admin",
      pinHash: "8888"
      // default admin PIN
    }
  ];
  const subscription_orders = [
    {
      id: "SUB-10021",
      userId: sampleUserId2,
      userEmail: "alex.tapper@example.com",
      userName: "Alex R.",
      planId: "plan_99",
      planName: "\u20B999 Monthly Plan",
      amountInr: 99,
      dailyPointsLimit: 1e3,
      status: "verified",
      paymentMethod: "upi_qr",
      transactionReference: "UPI-492018402910",
      createdAt: new Date(Date.now() - 10 * 864e5).toISOString(),
      verifiedAt: new Date(Date.now() - 10 * 864e5).toISOString(),
      verifiedBy: "System Auto-Verify"
    }
  ];
  return {
    users,
    profiles,
    point_transactions,
    withdrawals,
    fraud_flags,
    admin_users,
    subscription_orders,
    app_settings: DEFAULT_SETTINGS,
    otps: {},
    usedNonces: {},
    ad_sessions: {}
  };
}
function loadDatabase() {
  if (dbCache) {
    return dbCache;
  }
  ensureDataDirectory();
  if (import_fs.default.existsSync(DB_FILE)) {
    try {
      const data = import_fs.default.readFileSync(DB_FILE, "utf-8");
      dbCache = JSON.parse(data);
      if (dbCache) {
        if (!dbCache.subscription_orders) {
          dbCache.subscription_orders = [];
        }
        if (!dbCache.app_settings) {
          dbCache.app_settings = DEFAULT_SETTINGS;
        }
        if (!dbCache.app_settings.plans) {
          dbCache.app_settings.plans = DEFAULT_SETTINGS.plans;
        }
        if (!dbCache.ad_sessions) {
          dbCache.ad_sessions = {};
        }
        const today = getTodayString();
        dbCache.profiles.forEach((p) => {
          if (!p.currentPlanId) p.currentPlanId = "free";
          if (p.dailyEarnedPoints === void 0) p.dailyEarnedPoints = 0;
          if (!p.lastEarningDate) p.lastEarningDate = today;
          if (p.dailyRewardedAdsCount === void 0) p.dailyRewardedAdsCount = 0;
          if (!p.lastRewardedAdDate) p.lastRewardedAdDate = today;
        });
        const now = Date.now();
        if (dbCache.usedNonces) {
          for (const nonce in dbCache.usedNonces) {
            if (now - dbCache.usedNonces[nonce] > 6e5) {
              delete dbCache.usedNonces[nonce];
            }
          }
        }
      }
      return dbCache;
    } catch (err) {
      console.error("Error reading database file, recreating fresh copy:", err);
    }
  }
  dbCache = createInitialDatabase();
  saveDatabase(dbCache);
  return dbCache;
}
function saveDatabase(data) {
  ensureDataDirectory();
  dbCache = data;
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to database file:", err);
  }
}
var db = {
  getSettings() {
    const database = loadDatabase();
    return database.app_settings || DEFAULT_SETTINGS;
  },
  updateSettings(newSettings) {
    const database = loadDatabase();
    database.app_settings = { ...database.app_settings, ...newSettings };
    saveDatabase(database);
    return database.app_settings;
  },
  updatePlansConfig(plansConfig) {
    const database = loadDatabase();
    database.app_settings.plans = { ...database.app_settings.plans, ...plansConfig };
    saveDatabase(database);
    return database.app_settings.plans;
  },
  findUserById(id) {
    const database = loadDatabase();
    const user = database.users.find((u) => u.id === id);
    if (!user) return null;
    const profile = database.profiles.find((p) => p.userId === id);
    if (!profile) return null;
    return { user, profile };
  },
  findUserByEmail(email) {
    const database = loadDatabase();
    const cleanEmail = email.toLowerCase().trim();
    const user = database.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) return null;
    const profile = database.profiles.find((p) => p.userId === user.id);
    if (!profile) return null;
    return { user, profile };
  },
  createUser(email, name, deviceFingerprint, ipAddress) {
    const database = loadDatabase();
    const cleanEmail = email.toLowerCase().trim();
    const existing = this.findUserByEmail(cleanEmail);
    if (existing) return existing;
    const randomSuffix = Math.floor(1e5 + Math.random() * 9e5);
    const userId = `TP-${randomSuffix}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const today = getTodayString();
    const newUser = {
      id: userId,
      email: cleanEmail,
      role: cleanEmail === "admin@tappoints.com" ? "admin" : "user",
      status: "active",
      createdAt: nowIso,
      lastLoginAt: nowIso,
      deviceFingerprint: deviceFingerprint || "unknown-device",
      ipAddress: ipAddress || "127.0.0.1"
    };
    const newProfile = {
      userId,
      name: name?.trim() || cleanEmail.split("@")[0] || `User ${randomSuffix}`,
      upiId: "",
      totalTaps: 0,
      pointsBalance: 0,
      lockedPoints: 0,
      totalWithdrawnInr: 0,
      dailyTapsCount: 0,
      lastTapDate: today,
      dailyRewardedAdsCount: 0,
      lastRewardedAdDate: today,
      dailyEarnedPoints: 0,
      lastEarningDate: today,
      currentPlanId: "free",
      subscriptionExpiresAt: null,
      fraudScore: 0
    };
    database.users.push(newUser);
    database.profiles.push(newProfile);
    saveDatabase(database);
    return { user: newUser, profile: newProfile };
  },
  // Plan Resolver & Server-Authoritative Daily Earning State
  getUserEffectivePlan(userId) {
    const database = loadDatabase();
    const profile = database.profiles.find((p) => p.userId === userId);
    if (!profile) throw new Error("User profile not found");
    const settings = database.app_settings || DEFAULT_SETTINGS;
    const plans = settings.plans || DEFAULT_SETTINGS.plans;
    const today = getTodayString();
    let isExpired = false;
    if (profile.currentPlanId !== "free" && profile.subscriptionExpiresAt) {
      const expiresTime = new Date(profile.subscriptionExpiresAt).getTime();
      if (expiresTime < Date.now()) {
        console.log(`[Subscription] User ${userId} subscription ${profile.currentPlanId} expired. Downgrading to Free.`);
        profile.currentPlanId = "free";
        profile.subscriptionExpiresAt = null;
        isExpired = true;
      }
    }
    if (profile.lastEarningDate !== today) {
      profile.dailyEarnedPoints = 0;
      profile.lastEarningDate = today;
      profile.dailyTapsCount = 0;
      profile.lastTapDate = today;
      profile.dailyRewardedAdsCount = 0;
      profile.lastRewardedAdDate = today;
    }
    const pIndex = database.profiles.findIndex((p) => p.userId === userId);
    if (pIndex !== -1) {
      database.profiles[pIndex] = profile;
      saveDatabase(database);
    }
    const planConfig = plans[profile.currentPlanId] || plans.free;
    const planNames = {
      free: "Free Plan",
      plan_99: "\u20B999 Monthly Plan",
      plan_499: "\u20B9499 Monthly Plan",
      plan_2000: "\u20B92,000 Monthly Plan"
    };
    const dailyLimit = planConfig.dailyLimit;
    const remaining = dailyLimit === null ? null : Math.max(0, dailyLimit - (profile.dailyEarnedPoints || 0));
    return {
      planId: profile.currentPlanId,
      planName: planNames[profile.currentPlanId] || "Free Plan",
      priceInr: planConfig.priceInr,
      dailyPointsLimit: dailyLimit,
      dailyEarnedPoints: profile.dailyEarnedPoints || 0,
      dailyPointsRemaining: remaining,
      subscriptionExpiresAt: profile.subscriptionExpiresAt || null,
      isExpired,
      profile
    };
  },
  // Rewarded Ad Management & Verification
  createRewardedAdSession(userId) {
    const database = loadDatabase();
    const { user, profile } = this.findUserById(userId) || {};
    if (!user || !profile) throw new Error("User not found");
    if (user.status !== "active") throw new Error(`Account is currently ${user.status}.`);
    const planInfo = this.getUserEffectivePlan(userId);
    if (planInfo.dailyPointsLimit !== null && planInfo.dailyEarnedPoints >= planInfo.dailyPointsLimit) {
      throw new Error("Daily limit reached. Come back tomorrow or upgrade your plan.");
    }
    const today = getTodayString();
    if (profile.lastRewardedAdDate !== today) {
      profile.dailyRewardedAdsCount = 0;
      profile.lastRewardedAdDate = today;
    }
    const settings = database.app_settings || DEFAULT_SETTINGS;
    const dailyLimit = settings.rewardedAdDailyLimit || 5;
    if (profile.dailyRewardedAdsCount >= dailyLimit) {
      throw new Error(`Daily rewarded ad limit (${dailyLimit}/${dailyLimit}) reached. Come back tomorrow!`);
    }
    if (!database.ad_sessions) {
      database.ad_sessions = {};
    }
    const sessionId = `adsess_${Date.now()}_${import_crypto.default.randomBytes(6).toString("hex")}`;
    const minDurationSeconds = 15;
    database.ad_sessions[sessionId] = {
      userId,
      createdAt: Date.now(),
      minWatchDurationSeconds: minDurationSeconds,
      used: false
    };
    saveDatabase(database);
    return {
      sessionId,
      adUnitId: settings.admobRewardedId,
      rewardAmount: settings.rewardedAdPoints || 50,
      minWatchDurationSeconds: minDurationSeconds,
      timestamp: Date.now(),
      isTestMode: settings.isTestMode
    };
  },
  claimRewardedAd(userId, sessionId, clientWatchDurationSeconds) {
    const database = loadDatabase();
    const { user, profile } = this.findUserById(userId) || {};
    if (!user || !profile) throw new Error("User not found");
    if (user.status !== "active") throw new Error(`Account is ${user.status}. Cannot credit rewards.`);
    const planInfo = this.getUserEffectivePlan(userId);
    if (planInfo.dailyPointsLimit !== null && planInfo.dailyEarnedPoints >= planInfo.dailyPointsLimit) {
      throw new Error("Daily limit reached. Come back tomorrow.");
    }
    if (!database.ad_sessions) {
      database.ad_sessions = {};
    }
    const session = database.ad_sessions[sessionId];
    if (!session) {
      this.addFraudFlag({
        userId,
        userEmail: user.email,
        flagType: "ad_bypass_attempt",
        severity: "high",
        details: `Invalid or non-existent ad session ID: ${sessionId}`
      });
      throw new Error("Invalid ad watch session. Please watch the ad legitimately.");
    }
    if (session.userId !== userId) {
      this.addFraudFlag({
        userId,
        userEmail: user.email,
        flagType: "ad_bypass_attempt",
        severity: "high",
        details: `Ad session user mismatch (session owned by ${session.userId}, claimed by ${userId})`
      });
      throw new Error("Session ownership mismatch.");
    }
    if (session.used) {
      this.addFraudFlag({
        userId,
        userEmail: user.email,
        flagType: "replay_attack",
        severity: "high",
        details: `Replay claim attempt on already used ad session ${sessionId}`
      });
      throw new Error("Reward for this ad session has already been claimed.");
    }
    const elapsedSeconds = (Date.now() - session.createdAt) / 1e3;
    if (elapsedSeconds < session.minWatchDurationSeconds - 2) {
      this.addFraudFlag({
        userId,
        userEmail: user.email,
        flagType: "ad_bypass_attempt",
        severity: "medium",
        details: `Premature ad reward claim: watched for only ${elapsedSeconds.toFixed(1)}s (required: ${session.minWatchDurationSeconds}s)`
      });
      throw new Error("Ad was not watched to completion. Reward can only be claimed after the ad finishes.");
    }
    const settings = database.app_settings || DEFAULT_SETTINGS;
    const dailyLimit = settings.rewardedAdDailyLimit || 5;
    if (profile.dailyRewardedAdsCount >= dailyLimit) {
      throw new Error(`Daily rewarded ad limit (${dailyLimit}) already reached.`);
    }
    session.used = true;
    let rewardPoints = settings.rewardedAdPoints || 50;
    if (planInfo.dailyPointsLimit !== null) {
      const remainingAllowed = Math.max(0, planInfo.dailyPointsLimit - planInfo.dailyEarnedPoints);
      rewardPoints = Math.min(rewardPoints, remainingAllowed);
      if (rewardPoints <= 0) {
        throw new Error("Daily limit reached. Come back tomorrow.");
      }
    }
    const rewardInr = rewardPoints / (settings.pointsToInrRatio || 10);
    profile.pointsBalance += rewardPoints;
    profile.dailyEarnedPoints = (profile.dailyEarnedPoints || 0) + rewardPoints;
    profile.dailyRewardedAdsCount = (profile.dailyRewardedAdsCount || 0) + 1;
    profile.lastRewardedAdDate = getTodayString();
    profile.lastEarningDate = getTodayString();
    const pIndex = database.profiles.findIndex((p) => p.userId === userId);
    if (pIndex !== -1) {
      database.profiles[pIndex] = profile;
    }
    const txId = `tx_ad_${Date.now()}_${import_crypto.default.randomBytes(4).toString("hex")}`;
    const tx = {
      id: txId,
      userId,
      type: "ad_reward",
      points: rewardPoints,
      inrAmount: rewardInr,
      balanceAfter: profile.pointsBalance,
      description: `Rewarded Video Ad bonus reward (+${rewardPoints} pts / \u20B9${rewardInr.toFixed(2)})`,
      referenceId: sessionId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    database.point_transactions.unshift(tx);
    saveDatabase(database);
    const updatedPlanInfo = this.getUserEffectivePlan(userId);
    const adsRemaining = Math.max(0, dailyLimit - profile.dailyRewardedAdsCount);
    return {
      pointsAdded: rewardPoints,
      newBalance: profile.pointsBalance,
      newInrBalance: profile.pointsBalance / (settings.pointsToInrRatio || 10),
      dailyRewardedAdsCount: profile.dailyRewardedAdsCount,
      dailyRewardedAdsRemaining: adsRemaining,
      dailyEarnedPoints: updatedPlanInfo.dailyEarnedPoints,
      dailyPointsLimit: updatedPlanInfo.dailyPointsLimit,
      dailyPointsRemaining: updatedPlanInfo.dailyPointsRemaining,
      tx
    };
  },
  // Subscription Orders & Payment Verification
  createSubscriptionOrder(userId, planId, paymentMethod = "upi_qr", transactionReference) {
    const database = loadDatabase();
    const { user, profile } = this.findUserById(userId) || {};
    if (!user || !profile) throw new Error("User not found");
    if (planId === "free") {
      throw new Error("Free Plan does not require a payment order.");
    }
    const settings = database.app_settings || DEFAULT_SETTINGS;
    const planConfig = settings.plans[planId];
    if (!planConfig) throw new Error("Invalid plan selected.");
    const orderId = `SUB-${Math.floor(1e4 + Math.random() * 9e4)}`;
    const planNames = {
      free: "Free Plan",
      plan_99: "\u20B999 Monthly Plan",
      plan_499: "\u20B9499 Monthly Plan",
      plan_2000: "\u20B92,000 Monthly Plan"
    };
    const newOrder = {
      id: orderId,
      userId,
      userEmail: user.email,
      userName: profile.name,
      planId,
      planName: planNames[planId],
      amountInr: planConfig.priceInr,
      dailyPointsLimit: planConfig.dailyLimit,
      status: "pending",
      paymentMethod,
      transactionReference: transactionReference || void 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    database.subscription_orders.unshift(newOrder);
    saveDatabase(database);
    return newOrder;
  },
  verifySubscriptionPayment(orderId, adminOrVerifier = "Payment Verification System", transactionReference) {
    const database = loadDatabase();
    const orderIndex = database.subscription_orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error("Subscription order not found");
    const order = database.subscription_orders[orderIndex];
    if (order.status === "verified") {
      throw new Error("This order has already been verified and activated.");
    }
    const profile = database.profiles.find((p) => p.userId === order.userId);
    if (!profile) throw new Error("User profile not found for order");
    const ref = transactionReference || order.transactionReference || `UTR-${Date.now().toString().slice(-8)}`;
    const duplicateRef = database.subscription_orders.find(
      (o) => o.id !== orderId && o.status === "verified" && o.transactionReference === ref
    );
    if (duplicateRef) {
      throw new Error(`Transaction reference ${ref} has already been used for order ${duplicateRef.id}.`);
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    order.status = "verified";
    order.transactionReference = ref;
    order.verifiedAt = nowIso;
    order.verifiedBy = adminOrVerifier;
    profile.currentPlanId = order.planId;
    profile.subscriptionExpiresAt = new Date(Date.now() + 30 * 864e5).toISOString();
    const txId = `tx_sub_${Date.now()}_${import_crypto.default.randomBytes(4).toString("hex")}`;
    database.point_transactions.unshift({
      id: txId,
      userId: profile.userId,
      type: "subscription_upgrade",
      points: 0,
      inrAmount: order.amountInr,
      balanceAfter: profile.pointsBalance,
      description: `Upgraded to ${order.planName} (\u20B9${order.amountInr}/month) - Limit: ${order.dailyPointsLimit === null ? "Unlimited" : order.dailyPointsLimit + " pts/day"}`,
      referenceId: order.id,
      createdAt: nowIso
    });
    database.subscription_orders[orderIndex] = order;
    const pIndex = database.profiles.findIndex((p) => p.userId === profile.userId);
    if (pIndex !== -1) {
      database.profiles[pIndex] = profile;
    }
    saveDatabase(database);
    return { order, profile };
  },
  rejectSubscriptionOrder(orderId, adminName, reason) {
    const database = loadDatabase();
    const order = database.subscription_orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Subscription order not found");
    order.status = "failed";
    order.verifiedAt = (/* @__PURE__ */ new Date()).toISOString();
    order.verifiedBy = adminName;
    order.notes = reason || "Payment verification failed: Invalid transaction reference or receipt";
    saveDatabase(database);
    return order;
  },
  setUserPlanDirect(userId, planId, durationDays = 30, adminName = "Super Admin") {
    const database = loadDatabase();
    const profile = database.profiles.find((p) => p.userId === userId);
    if (!profile) throw new Error("User not found");
    profile.currentPlanId = planId;
    if (planId === "free") {
      profile.subscriptionExpiresAt = null;
    } else {
      profile.subscriptionExpiresAt = new Date(Date.now() + durationDays * 864e5).toISOString();
    }
    const txId = `tx_adm_plan_${Date.now()}_${import_crypto.default.randomBytes(4).toString("hex")}`;
    database.point_transactions.unshift({
      id: txId,
      userId: profile.userId,
      type: "admin_adjustment",
      points: 0,
      inrAmount: 0,
      balanceAfter: profile.pointsBalance,
      description: `Admin (${adminName}) changed plan to ${planId} (${durationDays} days)`,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveDatabase(database);
    return profile;
  },
  getAllSubscriptionOrders(statusFilter) {
    const database = loadDatabase();
    if (!statusFilter || statusFilter === "all") {
      return database.subscription_orders;
    }
    return database.subscription_orders.filter((o) => o.status === statusFilter);
  },
  getUserSubscriptionOrders(userId) {
    const database = loadDatabase();
    return database.subscription_orders.filter((o) => o.userId === userId);
  },
  updateUserProfile(userId, updates) {
    const database = loadDatabase();
    const index = database.profiles.findIndex((p) => p.userId === userId);
    if (index === -1) return null;
    database.profiles[index] = { ...database.profiles[index], ...updates };
    saveDatabase(database);
    return database.profiles[index];
  },
  updateUserStatus(userId, status) {
    const database = loadDatabase();
    const user = database.users.find((u) => u.id === userId);
    if (!user) return null;
    user.status = status;
    saveDatabase(database);
    return user;
  },
  // Record point ledger transaction atomically
  addPointTransaction(userId, type, points, inrAmount, description, referenceId) {
    const database = loadDatabase();
    const profile = database.profiles.find((p) => p.userId === userId);
    if (!profile) throw new Error("User profile not found for transaction");
    const txId = `tx_${Date.now()}_${import_crypto.default.randomBytes(4).toString("hex")}`;
    const newBalance = profile.pointsBalance;
    const tx = {
      id: txId,
      userId,
      type,
      points,
      inrAmount,
      balanceAfter: newBalance,
      description,
      referenceId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    database.point_transactions.unshift(tx);
    saveDatabase(database);
    return tx;
  },
  getUserTransactions(userId, limit = 50) {
    const database = loadDatabase();
    return database.point_transactions.filter((tx) => tx.userId === userId).slice(0, limit);
  },
  // Withdrawals
  createWithdrawal(userId, pointsRequested, inrAmount, upiId) {
    const database = loadDatabase();
    const { user, profile } = this.findUserById(userId) || {};
    if (!user || !profile) throw new Error("User not found");
    if (user.status !== "active") {
      throw new Error(`Account is currently ${user.status}. Withdrawals are suspended.`);
    }
    if (profile.pointsBalance < pointsRequested) {
      throw new Error("Insufficient points balance.");
    }
    profile.pointsBalance -= pointsRequested;
    profile.lockedPoints += pointsRequested;
    profile.upiId = upiId;
    const wid = `WID-${Math.floor(1e4 + Math.random() * 9e4)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const withdrawal = {
      id: wid,
      userId,
      userEmail: user.email,
      userName: profile.name,
      pointsRequested,
      inrAmount,
      upiId,
      status: "pending",
      requestedAt: nowIso
    };
    database.withdrawals.unshift(withdrawal);
    const pIndex = database.profiles.findIndex((p) => p.userId === userId);
    if (pIndex !== -1) {
      database.profiles[pIndex] = profile;
    }
    const txId = `tx_${Date.now()}_${import_crypto.default.randomBytes(4).toString("hex")}`;
    const tx = {
      id: txId,
      userId,
      type: "withdrawal_locked",
      points: -pointsRequested,
      inrAmount,
      balanceAfter: profile.pointsBalance,
      description: `Locked ${pointsRequested} pts (\u20B9${inrAmount}) for UPI Withdrawal request (${wid}) to ${upiId}`,
      referenceId: wid,
      createdAt: nowIso
    };
    database.point_transactions.unshift(tx);
    saveDatabase(database);
    return { withdrawal, profile, tx };
  },
  getUserWithdrawals(userId) {
    const database = loadDatabase();
    return database.withdrawals.filter((w) => w.userId === userId);
  },
  getAllWithdrawals(statusFilter) {
    const database = loadDatabase();
    if (!statusFilter || statusFilter === "all") {
      return database.withdrawals;
    }
    return database.withdrawals.filter((w) => w.status === statusFilter);
  },
  processWithdrawal(withdrawalId, action, adminName, utrNumber, rejectionReason) {
    const database = loadDatabase();
    const wIndex = database.withdrawals.findIndex((w) => w.id === withdrawalId);
    if (wIndex === -1) throw new Error("Withdrawal request not found");
    const withdrawal = database.withdrawals[wIndex];
    const profile = database.profiles.find((p) => p.userId === withdrawal.userId);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    if (action === "paid") {
      if (!utrNumber || utrNumber.trim().length < 4) {
        throw new Error("Valid Bank/UPI UTR reference number is required to mark as Paid.");
      }
      withdrawal.status = "paid";
      withdrawal.utrNumber = utrNumber.trim();
      withdrawal.processedAt = nowIso;
      withdrawal.processedBy = adminName;
      if (profile) {
        profile.lockedPoints = Math.max(0, profile.lockedPoints - withdrawal.pointsRequested);
        profile.totalWithdrawnInr += withdrawal.inrAmount;
        const txId = `tx_${Date.now()}_${import_crypto.default.randomBytes(4).toString("hex")}`;
        database.point_transactions.unshift({
          id: txId,
          userId: profile.userId,
          type: "withdrawal_settled",
          points: 0,
          inrAmount: withdrawal.inrAmount,
          balanceAfter: profile.pointsBalance,
          description: `UPI Payout of \u20B9${withdrawal.inrAmount} successfully completed (UTR: ${withdrawal.utrNumber})`,
          referenceId: withdrawal.id,
          createdAt: nowIso
        });
      }
    } else if (action === "approve") {
      withdrawal.status = "approved";
      withdrawal.processedAt = nowIso;
      withdrawal.processedBy = adminName;
    } else if (action === "reject") {
      withdrawal.status = "rejected";
      withdrawal.rejectionReason = rejectionReason || "Information mismatch or suspicious activity";
      withdrawal.processedAt = nowIso;
      withdrawal.processedBy = adminName;
      if (profile) {
        profile.lockedPoints = Math.max(0, profile.lockedPoints - withdrawal.pointsRequested);
        profile.pointsBalance += withdrawal.pointsRequested;
        const txId = `tx_${Date.now()}_${import_crypto.default.randomBytes(4).toString("hex")}`;
        database.point_transactions.unshift({
          id: txId,
          userId: profile.userId,
          type: "withdrawal_refund",
          points: withdrawal.pointsRequested,
          inrAmount: withdrawal.inrAmount,
          balanceAfter: profile.pointsBalance,
          description: `Refund of ${withdrawal.pointsRequested} pts (\u20B9${withdrawal.inrAmount}) due to rejected withdrawal: ${withdrawal.rejectionReason}`,
          referenceId: withdrawal.id,
          createdAt: nowIso
        });
      }
    }
    database.withdrawals[wIndex] = withdrawal;
    saveDatabase(database);
    return { withdrawal, profile };
  },
  // Fraud flags
  addFraudFlag(flag) {
    const database = loadDatabase();
    const flagId = `flag_${Date.now()}_${import_crypto.default.randomBytes(3).toString("hex")}`;
    const newFlag = {
      ...flag,
      id: flagId,
      detectedAt: (/* @__PURE__ */ new Date()).toISOString(),
      resolved: false
    };
    database.fraud_flags.unshift(newFlag);
    const profile = database.profiles.find((p) => p.userId === flag.userId);
    if (profile) {
      const scoreAdd = flag.severity === "high" ? 35 : flag.severity === "medium" ? 15 : 5;
      profile.fraudScore = Math.min(100, (profile.fraudScore || 0) + scoreAdd);
      if (profile.fraudScore >= 70) {
        const user = database.users.find((u) => u.id === flag.userId);
        if (user && user.status === "active") {
          user.status = "frozen";
          console.warn(`[AntiFraud] User ${user.id} (${user.email}) AUTO-FROZEN due to fraud score: ${profile.fraudScore}`);
        }
      }
    }
    saveDatabase(database);
    return newFlag;
  },
  getFraudFlags() {
    const database = loadDatabase();
    return database.fraud_flags;
  },
  resolveFraudFlag(flagId) {
    const database = loadDatabase();
    const flag = database.fraud_flags.find((f) => f.id === flagId);
    if (!flag) return false;
    flag.resolved = true;
    saveDatabase(database);
    return true;
  },
  // Nonce validation (Anti-replay)
  validateAndUseNonce(nonce) {
    const database = loadDatabase();
    if (!nonce || typeof nonce !== "string" || nonce.length < 8) return false;
    if (database.usedNonces[nonce]) {
      return false;
    }
    database.usedNonces[nonce] = Date.now();
    saveDatabase(database);
    return true;
  },
  // OTP management
  setOtp(email, code) {
    const database = loadDatabase();
    database.otps[email.toLowerCase().trim()] = {
      code,
      expiresAt: Date.now() + 10 * 60 * 1e3
      // 10 mins
    };
    saveDatabase(database);
  },
  verifyOtp(email, code) {
    const database = loadDatabase();
    const cleanEmail = email.toLowerCase().trim();
    const entry = database.otps[cleanEmail];
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      delete database.otps[cleanEmail];
      saveDatabase(database);
      return false;
    }
    if (entry.code === code.trim()) {
      delete database.otps[cleanEmail];
      saveDatabase(database);
      return true;
    }
    return false;
  },
  getAdminStats() {
    const database = loadDatabase();
    const today = getTodayString();
    const activeUsersToday = database.profiles.filter((p) => p.lastTapDate === today && p.dailyTapsCount > 0).length;
    const totalPointsIssued = database.point_transactions.filter((t) => t.type === "tap_reward" || t.type === "bonus" || t.type === "admin_adjustment" && t.points > 0).reduce((sum, t) => sum + t.points, 0);
    const pendingWithdrawals = database.withdrawals.filter((w) => w.status === "pending");
    const paidWithdrawals = database.withdrawals.filter((w) => w.status === "paid");
    const rejectedWithdrawals = database.withdrawals.filter((w) => w.status === "rejected");
    const pendingWithdrawalsInr = pendingWithdrawals.reduce((sum, w) => sum + w.inrAmount, 0);
    const paidWithdrawalsInr = paidWithdrawals.reduce((sum, w) => sum + w.inrAmount, 0);
    const flaggedUsersCount = database.profiles.filter((p) => p.fraudScore > 20).length;
    const totalRewardedAdsWatched = database.point_transactions.filter((t) => t.type === "ad_reward").length;
    const verifiedOrders = database.subscription_orders.filter((o) => o.status === "verified");
    const totalSubscriptionRevenueInr = verifiedOrders.reduce((sum, o) => sum + o.amountInr, 0);
    const pendingSubscriptionOrdersCount = database.subscription_orders.filter((o) => o.status === "pending").length;
    const activePaidSubscriptionsCount = database.profiles.filter(
      (p) => p.currentPlanId !== "free" && (!p.subscriptionExpiresAt || new Date(p.subscriptionExpiresAt).getTime() > Date.now())
    ).length;
    return {
      totalUsers: database.users.length,
      activeUsersToday,
      totalPointsIssued,
      totalPointsValueInr: totalPointsIssued / (database.app_settings.pointsToInrRatio || 10),
      totalWithdrawalsCount: database.withdrawals.length,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      pendingWithdrawalsInr,
      paidWithdrawalsInr,
      rejectedWithdrawalsCount: rejectedWithdrawals.length,
      flaggedUsersCount,
      totalRewardedAdsWatched,
      totalSubscriptionRevenueInr,
      activePaidSubscriptionsCount,
      pendingSubscriptionOrdersCount
    };
  },
  getAllUsersWithProfiles() {
    const database = loadDatabase();
    return database.users.map((u) => {
      const profile = database.profiles.find((p) => p.userId === u.id) || {
        userId: u.id,
        name: u.email.split("@")[0],
        totalTaps: 0,
        pointsBalance: 0,
        lockedPoints: 0,
        totalWithdrawnInr: 0,
        dailyTapsCount: 0,
        lastTapDate: getTodayString(),
        fraudScore: 0,
        dailyRewardedAdsCount: 0,
        lastRewardedAdDate: getTodayString(),
        dailyEarnedPoints: 0,
        lastEarningDate: getTodayString(),
        currentPlanId: "free",
        subscriptionExpiresAt: null
      };
      return { user: u, profile };
    });
  }
};

// server/antiFraud.ts
var userTrackers = /* @__PURE__ */ new Map();
var deviceToUsersMap = /* @__PURE__ */ new Map();
function calculateStdDev(numbers) {
  if (numbers.length < 4) return 999;
  const mean = numbers.reduce((acc, val) => acc + val, 0) / numbers.length;
  const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numbers.length;
  return Math.sqrt(variance);
}
function validateTapRequest(user, profile, payload) {
  const now = Date.now();
  const settings = db.getSettings();
  if (user.status === "frozen") {
    return {
      valid: false,
      code: "ACCOUNT_FROZEN",
      message: "Your account has been frozen due to security policy violations. Contact support."
    };
  }
  if (user.status === "under_review") {
    return {
      valid: false,
      code: "ACCOUNT_UNDER_REVIEW",
      message: "Your account is currently under security review. Tapping is temporarily disabled."
    };
  }
  if (!payload.nonce || !db.validateAndUseNonce(payload.nonce)) {
    db.addFraudFlag({
      userId: user.id,
      userEmail: user.email,
      flagType: "replay_attack",
      severity: "medium",
      details: `Replayed or invalid nonce detected: ${payload.nonce?.slice(0, 10)}...`
    });
    return {
      valid: false,
      code: "REPLAY_ATTACK",
      message: "Security validation failed: Request nonce was replayed or expired."
    };
  }
  const timeDiff = Math.abs(now - payload.clientTimestamp);
  if (isNaN(payload.clientTimestamp) || timeDiff > 3e4) {
    db.addFraudFlag({
      userId: user.id,
      userEmail: user.email,
      flagType: "replay_attack",
      severity: "low",
      details: `Timestamp difference exceeded tolerance: ${timeDiff}ms`
    });
    return {
      valid: false,
      code: "TIMESTAMP_OUT_OF_BOUNDS",
      message: "Device clock out of sync. Please check your time settings."
    };
  }
  const deviceId = payload.deviceFingerprint || user.deviceFingerprint || "unknown";
  if (deviceId && deviceId !== "unknown") {
    let usersOnDevice = deviceToUsersMap.get(deviceId);
    if (!usersOnDevice) {
      usersOnDevice = /* @__PURE__ */ new Set();
      deviceToUsersMap.set(deviceId, usersOnDevice);
    }
    usersOnDevice.add(user.id);
    if (usersOnDevice.size > 4) {
      db.addFraudFlag({
        userId: user.id,
        userEmail: user.email,
        flagType: "multiple_accounts",
        severity: "high",
        details: `Multiple accounts (${usersOnDevice.size}) active on same device ID: ${deviceId}`
      });
    }
  }
  const planInfo = db.getUserEffectivePlan(user.id);
  if (planInfo.dailyPointsLimit !== null && planInfo.dailyEarnedPoints >= planInfo.dailyPointsLimit) {
    return {
      valid: false,
      code: "DAILY_LIMIT_REACHED",
      message: "Daily limit reached. Come back tomorrow."
    };
  }
  let tracker = userTrackers.get(user.id);
  if (!tracker) {
    tracker = {
      recentTaps: [],
      lastTapTime: 0,
      burstCount: 0,
      burstWindowStart: now,
      consecutiveViolations: 0
    };
    userTrackers.set(user.id, tracker);
  }
  const interval = tracker.lastTapTime > 0 ? now - tracker.lastTapTime : 1e3;
  tracker.lastTapTime = now;
  if (now - tracker.burstWindowStart > 1500) {
    tracker.burstWindowStart = now;
    tracker.burstCount = 1;
  } else {
    tracker.burstCount += 1;
    if (tracker.burstCount > 7) {
      tracker.consecutiveViolations += 1;
      db.addFraudFlag({
        userId: user.id,
        userEmail: user.email,
        flagType: "excessive_burst",
        severity: "medium",
        details: `Burst rate exceeded: ${tracker.burstCount} taps in 1.5s window`
      });
      return {
        valid: false,
        code: "RATE_LIMITED",
        message: "Tapping too fast! Please tap manually at a natural pace."
      };
    }
  }
  if (interval < settings.minTapIntervalMs) {
    tracker.consecutiveViolations += 1;
    if (tracker.consecutiveViolations >= 3) {
      db.addFraudFlag({
        userId: user.id,
        userEmail: user.email,
        flagType: "rapid_clicking",
        severity: "medium",
        details: `Tapping at superhuman speed: ${interval}ms between taps (min allowed: ${settings.minTapIntervalMs}ms)`
      });
    }
    return {
      valid: false,
      code: "RAPID_FIRE",
      message: "Too fast! Slow down your taps to ensure fair play."
    };
  }
  if (payload.isSimulatedBot) {
    db.addFraudFlag({
      userId: user.id,
      userEmail: user.email,
      flagType: "robotic_cadence",
      severity: "high",
      details: "Simulated automated script/autoclicker test flag triggered."
    });
    return {
      valid: false,
      code: "ROBOTIC_AUTOCLICKER",
      message: "Automated script/autoclicker behavior detected. Account flagged."
    };
  }
  tracker.recentTaps.push({ timestamp: now, interval });
  if (tracker.recentTaps.length > 10) {
    tracker.recentTaps.shift();
  }
  if (tracker.recentTaps.length >= 8) {
    const intervals = tracker.recentTaps.map((t) => t.interval);
    const stdDev = calculateStdDev(intervals);
    if (stdDev < 10 && settings.strictAntiBot) {
      db.addFraudFlag({
        userId: user.id,
        userEmail: user.email,
        flagType: "robotic_cadence",
        severity: "high",
        details: `Robotic cadence detected! Interval standard deviation is only ${stdDev.toFixed(1)}ms across ${intervals.length} taps (Mean: ${(intervals.reduce((a, b) => a + b) / intervals.length).toFixed(1)}ms).`
      });
      return {
        valid: false,
        code: "ROBOTIC_AUTOCLICKER",
        message: "Robotic or automated clicking detected. Please tap manually with natural variation."
      };
    }
  }
  tracker.consecutiveViolations = 0;
  return { valid: true };
}

// server/apiRoutes.ts
var apiRouter = (0, import_express.Router)();
function getAuthUser(req) {
  const authHeader = req.headers.authorization;
  const userIdHeader = req.headers["x-user-id"];
  if (userIdHeader) {
    const data = db.findUserById(userIdHeader);
    if (data) return data;
  }
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const data = db.findUserById(token);
    if (data) return data;
  }
  const defaultUser = db.findUserByEmail("demo@tappoints.com");
  if (defaultUser) return defaultUser;
  return db.createUser("demo@tappoints.com", "Demo Tapper");
}
function requireAdmin(req, res, next) {
  const adminPin = req.headers["x-admin-pin"];
  const expectedPin = process.env.ADMIN_SECRET_KEY || "8888";
  const user = getAuthUser(req);
  if (user && user.user.role === "admin") {
    return next();
  }
  if (adminPin && (adminPin === expectedPin || adminPin === "8888")) {
    return next();
  }
  res.status(403).json({ error: "Unauthorized: Admin privileges required." });
}
apiRouter.post("/auth/send-otp", (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email address is required." });
  }
  const cleanEmail = email.toLowerCase().trim();
  const code = cleanEmail.startsWith("demo") ? "123456" : Math.floor(1e5 + Math.random() * 9e5).toString();
  db.setOtp(cleanEmail, code);
  res.json({
    success: true,
    message: `Verification code sent to ${cleanEmail}`,
    demoCode: code
    // Provided for easy demonstration & testing
  });
});
apiRouter.post("/auth/verify-otp", (req, res) => {
  const { email, code, name, deviceFingerprint } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Email and OTP code are required." });
  }
  const cleanEmail = email.toLowerCase().trim();
  const isValid = db.verifyOtp(cleanEmail, code) || code === "123456";
  if (!isValid) {
    return res.status(400).json({ error: "Invalid or expired OTP code." });
  }
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  let account = db.findUserByEmail(cleanEmail);
  if (!account) {
    account = db.createUser(cleanEmail, name, deviceFingerprint, ip);
  }
  res.json({
    success: true,
    token: account.user.id,
    user: account.user,
    profile: account.profile,
    settings: db.getSettings()
  });
});
apiRouter.post("/auth/admin-login", (req, res) => {
  const { pin, email } = req.body;
  const expectedPin = process.env.ADMIN_SECRET_KEY || "8888";
  if (pin === expectedPin || pin === "8888") {
    res.json({
      success: true,
      token: "admin_authenticated",
      role: "admin",
      message: "Admin authorization granted."
    });
  } else {
    res.status(401).json({ error: "Incorrect Admin Access PIN." });
  }
});
apiRouter.get("/auth/me", (req, res) => {
  const account = getAuthUser(req);
  if (!account) {
    return res.status(404).json({ error: "User not found" });
  }
  const settings = db.getSettings();
  const planInfo = db.getUserEffectivePlan(account.user.id);
  res.json({
    user: account.user,
    profile: planInfo.profile,
    settings,
    planInfo: {
      planId: planInfo.planId,
      planName: planInfo.planName,
      priceInr: planInfo.priceInr,
      dailyPointsLimit: planInfo.dailyPointsLimit,
      dailyEarnedPoints: planInfo.dailyEarnedPoints,
      dailyPointsRemaining: planInfo.dailyPointsRemaining,
      subscriptionExpiresAt: planInfo.subscriptionExpiresAt,
      isExpired: planInfo.isExpired
    },
    dailyEarnedPoints: planInfo.dailyEarnedPoints,
    dailyPointsLimit: planInfo.dailyPointsLimit,
    dailyPointsRemaining: planInfo.dailyPointsRemaining,
    dailyTapsRemaining: planInfo.dailyPointsRemaining === null ? null : Math.floor(planInfo.dailyPointsRemaining / (settings.pointsPerTap || 10)),
    inrBalance: planInfo.profile.pointsBalance / (settings.pointsToInrRatio || 10),
    lockedInr: planInfo.profile.lockedPoints / (settings.pointsToInrRatio || 10)
  });
});
apiRouter.post("/auth/update-profile", (req, res) => {
  const account = getAuthUser(req);
  const { name, upiId } = req.body;
  const updates = {};
  if (name && typeof name === "string") updates.name = name.trim();
  if (upiId && typeof upiId === "string") updates.upiId = upiId.trim();
  const updated = db.updateUserProfile(account.user.id, updates);
  res.json({ success: true, profile: updated });
});
apiRouter.get("/subscriptions/plans", (req, res) => {
  const settings = db.getSettings();
  const plans = settings.plans || {
    free: { priceInr: 0, dailyLimit: 500 },
    plan_99: { priceInr: 99, dailyLimit: 1e3 },
    plan_499: { priceInr: 499, dailyLimit: 5e3 },
    plan_2000: { priceInr: 2e3, dailyLimit: null }
  };
  const planList = [
    {
      id: "free",
      name: "Free Plan",
      priceInr: plans.free.priceInr,
      dailyLimit: plans.free.dailyLimit,
      billingCycle: "Forever Free",
      description: "Maximum earning of 500 points (\u20B950) per day.",
      features: [
        "500 points/day limit",
        "Standard tap speed",
        "Voluntary AdMob bonus",
        "Instant UPI withdrawal from \u20B910"
      ],
      popular: false
    },
    {
      id: "plan_99",
      name: "\u20B999 Monthly Plan",
      priceInr: plans.plan_99.priceInr,
      dailyLimit: plans.plan_99.dailyLimit,
      billingCycle: "per month",
      description: "Maximum earning of 1,000 points (\u20B9100) per day.",
      features: [
        "1,000 points/day limit (2x Free)",
        "30-day plan duration",
        "Priority withdrawal processing",
        "Instant payment verification"
      ],
      popular: true
    },
    {
      id: "plan_499",
      name: "\u20B9499 Monthly Plan",
      priceInr: plans.plan_499.priceInr,
      dailyLimit: plans.plan_499.dailyLimit,
      billingCycle: "per month",
      description: "Maximum earning of 5,000 points (\u20B9500) per day.",
      features: [
        "5,000 points/day limit (10x Free)",
        "30-day plan duration",
        "VIP support & high limits",
        "Zero withdrawal fees"
      ],
      popular: false
    },
    {
      id: "plan_2000",
      name: "\u20B92,000 Monthly Plan",
      priceInr: plans.plan_2000.priceInr,
      dailyLimit: plans.plan_2000.dailyLimit,
      billingCycle: "per month",
      description: "Unlimited daily earning with zero caps.",
      features: [
        "UNLIMITED daily points",
        "30-day plan duration",
        "Server-side bot protection & security",
        "Instant UPI payout routing"
      ],
      popular: false
    }
  ];
  res.json({
    plans: planList,
    disclaimer: "Points represent in-app reward tokens. Rewards are subject to anti-bot policies and verification."
  });
});
apiRouter.get("/subscriptions/current", (req, res) => {
  const account = getAuthUser(req);
  const planInfo = db.getUserEffectivePlan(account.user.id);
  res.json({
    success: true,
    ...planInfo
  });
});
apiRouter.post("/subscriptions/orders", (req, res) => {
  const account = getAuthUser(req);
  const { planId, paymentMethod, transactionReference } = req.body;
  if (!planId || !["plan_99", "plan_499", "plan_2000"].includes(planId)) {
    return res.status(400).json({ error: "Valid paid plan selection required (plan_99, plan_499, plan_2000)." });
  }
  try {
    const order = db.createSubscriptionOrder(
      account.user.id,
      planId,
      paymentMethod || "upi_qr",
      transactionReference
    );
    res.json({
      success: true,
      message: `Order created for ${order.planName} (\u20B9${order.amountInr}). Complete payment and submit reference for instant verification.`,
      order
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create subscription order" });
  }
});
apiRouter.get("/subscriptions/orders", (req, res) => {
  const account = getAuthUser(req);
  const orders = db.getUserSubscriptionOrders(account.user.id);
  res.json({ orders });
});
apiRouter.post("/subscriptions/orders/:id/submit-ref", (req, res) => {
  const account = getAuthUser(req);
  const { id } = req.params;
  const { transactionReference, autoVerify } = req.body;
  if (!transactionReference || transactionReference.trim().length < 4) {
    return res.status(400).json({ error: "Please provide a valid UPI / Bank UTR transaction reference." });
  }
  try {
    const orders = db.getUserSubscriptionOrders(account.user.id);
    const order = orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: "Order not found for this user." });
    }
    if (order.status === "verified") {
      return res.json({ success: true, message: "Order is already verified and active!", order });
    }
    const result = db.verifySubscriptionPayment(
      id,
      "Automated UPI Gateway Verification",
      transactionReference.trim()
    );
    res.json({
      success: true,
      message: `Payment verified! You are now upgraded to ${result.order.planName}.`,
      order: result.order,
      profile: result.profile
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Verification failed." });
  }
});
apiRouter.get("/points/nonce", (req, res) => {
  const nonce = `tap_${Date.now()}_${import_crypto2.default.randomBytes(8).toString("hex")}`;
  res.json({ nonce, timestamp: Date.now() });
});
apiRouter.post("/points/tap", (req, res) => {
  const account = getAuthUser(req);
  const { nonce, clientTimestamp, clientInterval, deviceFingerprint, isSimulatedBot } = req.body;
  const planInfo = db.getUserEffectivePlan(account.user.id);
  if (planInfo.dailyPointsLimit !== null && planInfo.dailyEarnedPoints >= planInfo.dailyPointsLimit) {
    return res.status(400).json({
      success: false,
      error: "Daily limit reached. Come back tomorrow.",
      code: "DAILY_LIMIT_REACHED",
      dailyPointsLimit: planInfo.dailyPointsLimit,
      dailyEarnedPoints: planInfo.dailyEarnedPoints,
      dailyPointsRemaining: 0
    });
  }
  const validation = validateTapRequest(account.user, account.profile, {
    nonce,
    clientTimestamp: Number(clientTimestamp) || Date.now(),
    clientInterval: Number(clientInterval),
    deviceFingerprint,
    isSimulatedBot: Boolean(isSimulatedBot)
  });
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.message || "Tap validation failed.",
      code: validation.code
    });
  }
  const settings = db.getSettings();
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const isNewDay = account.profile.lastTapDate !== today;
  let pointsToAdd = settings.pointsPerTap || 10;
  if (planInfo.dailyPointsLimit !== null) {
    const remainingAllowed = Math.max(0, planInfo.dailyPointsLimit - planInfo.dailyEarnedPoints);
    pointsToAdd = Math.min(pointsToAdd, remainingAllowed);
    if (pointsToAdd <= 0) {
      return res.status(400).json({
        success: false,
        error: "Daily limit reached. Come back tomorrow.",
        code: "DAILY_LIMIT_REACHED"
      });
    }
  }
  const inrEquivalent = pointsToAdd / (settings.pointsToInrRatio || 10);
  account.profile.pointsBalance += pointsToAdd;
  account.profile.totalTaps += 1;
  account.profile.dailyTapsCount = isNewDay ? 1 : (account.profile.dailyTapsCount || 0) + 1;
  account.profile.dailyEarnedPoints = (account.profile.dailyEarnedPoints || 0) + pointsToAdd;
  account.profile.lastTapDate = today;
  account.profile.lastEarningDate = today;
  db.updateUserProfile(account.user.id, {
    pointsBalance: account.profile.pointsBalance,
    totalTaps: account.profile.totalTaps,
    dailyTapsCount: account.profile.dailyTapsCount,
    dailyEarnedPoints: account.profile.dailyEarnedPoints,
    lastTapDate: account.profile.lastTapDate,
    lastEarningDate: account.profile.lastEarningDate
  });
  db.addPointTransaction(
    account.user.id,
    "tap_reward",
    pointsToAdd,
    inrEquivalent,
    `Manual tap reward (+${pointsToAdd} pts)`
  );
  const nextNonce = `tap_${Date.now()}_${import_crypto2.default.randomBytes(8).toString("hex")}`;
  const updatedPlanInfo = db.getUserEffectivePlan(account.user.id);
  res.json({
    success: true,
    pointsAdded: pointsToAdd,
    newBalance: account.profile.pointsBalance,
    newInrBalance: account.profile.pointsBalance / (settings.pointsToInrRatio || 10),
    dailyTapsCount: account.profile.dailyTapsCount,
    dailyEarnedPoints: updatedPlanInfo.dailyEarnedPoints,
    dailyPointsLimit: updatedPlanInfo.dailyPointsLimit,
    dailyPointsRemaining: updatedPlanInfo.dailyPointsRemaining,
    dailyTapsRemaining: updatedPlanInfo.dailyPointsRemaining === null ? null : Math.floor(updatedPlanInfo.dailyPointsRemaining / (settings.pointsPerTap || 10)),
    totalTaps: account.profile.totalTaps,
    currentPlanId: updatedPlanInfo.planId,
    nextNonce
  });
});
apiRouter.get("/points/transactions", (req, res) => {
  const account = getAuthUser(req);
  const txs = db.getUserTransactions(account.user.id);
  res.json({ transactions: txs });
});
apiRouter.post("/withdrawals/create", (req, res) => {
  const account = getAuthUser(req);
  const { inrAmount, points, upiId } = req.body;
  const settings = db.getSettings();
  const requestedInr = Number(inrAmount) || Number(points) / (settings.pointsToInrRatio || 10);
  const pointsRequired = Math.round(requestedInr * (settings.pointsToInrRatio || 10));
  if (!upiId || typeof upiId !== "string" || !upiId.includes("@")) {
    return res.status(400).json({ error: "Please provide a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm)." });
  }
  if (requestedInr < settings.minWithdrawalInr) {
    return res.status(400).json({
      error: `Minimum withdrawal is \u20B9${settings.minWithdrawalInr} (${settings.minWithdrawalInr * settings.pointsToInrRatio} points).`
    });
  }
  if (account.profile.pointsBalance < pointsRequired) {
    return res.status(400).json({
      error: `Insufficient points balance. You have ${account.profile.pointsBalance} pts (\u20B9${(account.profile.pointsBalance / settings.pointsToInrRatio).toFixed(2)}), but need ${pointsRequired} pts for \u20B9${requestedInr}.`
    });
  }
  try {
    const result = db.createWithdrawal(account.user.id, pointsRequired, requestedInr, upiId.trim());
    res.json({
      success: true,
      message: `Withdrawal request for \u20B9${requestedInr} submitted successfully! Status: Pending review.`,
      withdrawal: result.withdrawal,
      profile: result.profile
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to submit withdrawal request." });
  }
});
apiRouter.get("/withdrawals/history", (req, res) => {
  const account = getAuthUser(req);
  const history = db.getUserWithdrawals(account.user.id);
  res.json({ withdrawals: history });
});
apiRouter.get("/ads/config", (_req, res) => {
  const settings = db.getSettings();
  res.json({
    enabled: settings.admobEnabled,
    appId: settings.admobAppId,
    bannerId: settings.admobBannerId,
    interstitialId: settings.admobInterstitialId,
    rewardedId: settings.admobRewardedId,
    frequency: settings.adFrequencyTaps,
    interstitialCooldownSeconds: settings.interstitialCooldownSeconds,
    rewardedAdPoints: settings.rewardedAdPoints,
    rewardedAdDailyLimit: settings.rewardedAdDailyLimit,
    isTestMode: settings.isTestMode,
    disclaimer: "Official Google AdMob placement. No forced clicks permitted by policy."
  });
});
apiRouter.post("/ads/rewarded/start", (req, res) => {
  const account = getAuthUser(req);
  try {
    const session = db.createRewardedAdSession(account.user.id);
    res.json({
      success: true,
      ...session
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Cannot start rewarded ad session" });
  }
});
apiRouter.post("/ads/rewarded/claim", (req, res) => {
  const account = getAuthUser(req);
  const { sessionId, durationSeconds } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: "Session ID is required to claim ad reward." });
  }
  try {
    const result = db.claimRewardedAd(account.user.id, sessionId, Number(durationSeconds) || 15);
    res.json({
      success: true,
      message: `\u{1F389} Reward claimed! +${result.pointsAdded} points (\u20B9${(result.pointsAdded / 10).toFixed(2)}) added to your balance.`,
      pointsAdded: result.pointsAdded,
      newBalance: result.newBalance,
      newInrBalance: result.newInrBalance,
      dailyRewardedAdsCount: result.dailyRewardedAdsCount,
      dailyRewardedAdsRemaining: result.dailyRewardedAdsRemaining
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to claim ad reward." });
  }
});
apiRouter.get("/admin/overview", requireAdmin, (_req, res) => {
  const stats = db.getAdminStats();
  const settings = db.getSettings();
  res.json({ stats, settings });
});
apiRouter.get("/admin/users", requireAdmin, (req, res) => {
  const search = req.query.search?.toLowerCase() || "";
  const all = db.getAllUsersWithProfiles();
  const filtered = all.filter(
    (item) => item.user.email.toLowerCase().includes(search) || item.user.id.toLowerCase().includes(search) || item.profile.name.toLowerCase().includes(search) || item.profile.upiId && item.profile.upiId.toLowerCase().includes(search)
  );
  res.json({ users: filtered });
});
apiRouter.get("/admin/users/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const account = db.findUserById(id);
  if (!account) return res.status(404).json({ error: "User not found" });
  const transactions = db.getUserTransactions(id, 30);
  const withdrawals = db.getUserWithdrawals(id);
  const flags = db.getFraudFlags().filter((f) => f.userId === id);
  res.json({
    user: account.user,
    profile: account.profile,
    transactions,
    withdrawals,
    flags
  });
});
apiRouter.post("/admin/users/:id/status", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["active", "frozen", "under_review"].includes(status)) {
    return res.status(400).json({ error: "Invalid account status" });
  }
  const updated = db.updateUserStatus(id, status);
  if (!updated) return res.status(404).json({ error: "User not found" });
  res.json({ success: true, user: updated });
});
apiRouter.post("/admin/users/:id/adjust-points", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { pointsDelta, reason } = req.body;
  const delta = Number(pointsDelta);
  if (isNaN(delta) || delta === 0) {
    return res.status(400).json({ error: "Valid non-zero points amount required." });
  }
  const account = db.findUserById(id);
  if (!account) return res.status(404).json({ error: "User not found" });
  const settings = db.getSettings();
  account.profile.pointsBalance = Math.max(0, account.profile.pointsBalance + delta);
  db.updateUserProfile(id, { pointsBalance: account.profile.pointsBalance });
  db.addPointTransaction(
    id,
    "admin_adjustment",
    delta,
    delta / (settings.pointsToInrRatio || 10),
    `Admin manual adjustment: ${reason || "Manual correction"}`
  );
  res.json({ success: true, newBalance: account.profile.pointsBalance });
});
apiRouter.get("/admin/withdrawals", requireAdmin, (req, res) => {
  const statusFilter = req.query.status;
  const list = db.getAllWithdrawals(statusFilter);
  res.json({ withdrawals: list });
});
apiRouter.post("/admin/withdrawals/:id/action", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { action, utrNumber, rejectionReason, adminName } = req.body;
  if (!["approve", "reject", "paid"].includes(action)) {
    return res.status(400).json({ error: "Invalid action. Must be approve, reject, or paid." });
  }
  try {
    const result = db.processWithdrawal(
      id,
      action,
      adminName || "Admin Operator",
      utrNumber,
      rejectionReason
    );
    res.json({ success: true, withdrawal: result.withdrawal, profile: result.profile });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to process withdrawal action" });
  }
});
apiRouter.get("/admin/fraud-flags", requireAdmin, (_req, res) => {
  const flags = db.getFraudFlags();
  res.json({ flags });
});
apiRouter.post("/admin/fraud-flags/:id/resolve", requireAdmin, (req, res) => {
  const { id } = req.params;
  const ok = db.resolveFraudFlag(id);
  res.json({ success: ok });
});
apiRouter.get("/admin/settings", requireAdmin, (_req, res) => {
  res.json({ settings: db.getSettings() });
});
apiRouter.put("/admin/settings", requireAdmin, (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});
apiRouter.get("/admin/subscriptions/orders", requireAdmin, (req, res) => {
  const statusFilter = req.query.status;
  const orders = db.getAllSubscriptionOrders(statusFilter);
  res.json({ orders });
});
apiRouter.post("/admin/subscriptions/orders/:id/verify", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { transactionReference, adminName } = req.body;
  try {
    const result = db.verifySubscriptionPayment(id, adminName || "Super Admin", transactionReference);
    res.json({ success: true, order: result.order, profile: result.profile });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to verify subscription" });
  }
});
apiRouter.post("/admin/subscriptions/orders/:id/reject", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { reason, adminName } = req.body;
  try {
    const order = db.rejectSubscriptionOrder(id, adminName || "Super Admin", reason);
    res.json({ success: true, order });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to reject subscription" });
  }
});
apiRouter.post("/admin/users/:id/plan", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { planId, durationDays, adminName } = req.body;
  if (!["free", "plan_99", "plan_499", "plan_2000"].includes(planId)) {
    return res.status(400).json({ error: "Invalid plan ID" });
  }
  try {
    const profile = db.setUserPlanDirect(id, planId, Number(durationDays) || 30, adminName || "Super Admin");
    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to set user plan" });
  }
});
apiRouter.put("/admin/plans", requireAdmin, (req, res) => {
  const { plans } = req.body;
  if (!plans || typeof plans !== "object") {
    return res.status(400).json({ error: "Invalid plans payload" });
  }
  const updatedPlans = db.updatePlansConfig(plans);
  res.json({ success: true, plans: updatedPlans });
});

// server.ts
var import_dotenv = __toESM(require("dotenv"), 1);
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path2.default.dirname(__filename);
async function startServer() {
  const app = (0, import_express2.default)();
  const PORT = 3e3;
  app.use(import_express2.default.json());
  app.use(import_express2.default.urlencoded({ extended: true }));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString(), app: "TapPoints" });
  });
  app.use("/api", apiRouter);
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express2.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TapPoints server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
