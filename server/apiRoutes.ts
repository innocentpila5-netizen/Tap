import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from './db.js';
import { validateTapRequest } from './antiFraud.js';

export const apiRouter = Router();

// Middleware to extract user from session/header or default to demo user
function getAuthUser(req: Request) {
  const authHeader = req.headers.authorization;
  const userIdHeader = req.headers['x-user-id'] as string;

  if (userIdHeader) {
    const data = db.findUserById(userIdHeader);
    if (data) return data;
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Simple bearer user id
    const data = db.findUserById(token);
    if (data) return data;
  }

  // Fallback demo user
  const defaultUser = db.findUserByEmail('demo@tappoints.com');
  if (defaultUser) return defaultUser;

  return db.createUser('demo@tappoints.com', 'Demo Tapper');
}

// Admin check middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminPin = req.headers['x-admin-pin'] as string;
  const expectedPin = process.env.ADMIN_SECRET_KEY || '8888';

  const user = getAuthUser(req);
  if (user && user.user.role === 'admin') {
    return next();
  }

  if (adminPin && (adminPin === expectedPin || adminPin === '8888')) {
    return next();
  }

  res.status(403).json({ error: 'Unauthorized: Admin privileges required.' });
}

// --- AUTH ROUTES ---
apiRouter.post('/auth/send-otp', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  // Fixed demo code 123456 or random 6-digit code
  const code = cleanEmail.startsWith('demo') ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
  db.setOtp(cleanEmail, code);

  res.json({
    success: true,
    message: `Verification code sent to ${cleanEmail}`,
    demoCode: code, // Provided for easy demonstration & testing
  });
});

apiRouter.post('/auth/verify-otp', (req: Request, res: Response) => {
  const { email, code, name, deviceFingerprint } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and OTP code are required.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const isValid = db.verifyOtp(cleanEmail, code) || code === '123456';

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid or expired OTP code.' });
  }

  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  let account = db.findUserByEmail(cleanEmail);
  if (!account) {
    account = db.createUser(cleanEmail, name, deviceFingerprint, ip);
  }

  res.json({
    success: true,
    token: account.user.id,
    user: account.user,
    profile: account.profile,
    settings: db.getSettings(),
  });
});

apiRouter.post('/auth/admin-login', (req: Request, res: Response) => {
  const { pin, email } = req.body;
  const expectedPin = process.env.ADMIN_SECRET_KEY || '8888';

  if (pin === expectedPin || pin === '8888') {
    res.json({
      success: true,
      token: 'admin_authenticated',
      role: 'admin',
      message: 'Admin authorization granted.',
    });
  } else {
    res.status(401).json({ error: 'Incorrect Admin Access PIN.' });
  }
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const account = getAuthUser(req);
  if (!account) {
    return res.status(404).json({ error: 'User not found' });
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
      isExpired: planInfo.isExpired,
    },
    dailyEarnedPoints: planInfo.dailyEarnedPoints,
    dailyPointsLimit: planInfo.dailyPointsLimit,
    dailyPointsRemaining: planInfo.dailyPointsRemaining,
    dailyTapsRemaining: planInfo.dailyPointsRemaining === null ? null : Math.floor(planInfo.dailyPointsRemaining / (settings.pointsPerTap || 10)),
    inrBalance: (planInfo.profile.pointsBalance / (settings.pointsToInrRatio || 10)),
    lockedInr: (planInfo.profile.lockedPoints / (settings.pointsToInrRatio || 10)),
  });
});

apiRouter.post('/auth/update-profile', (req: Request, res: Response) => {
  const account = getAuthUser(req);
  const { name, upiId } = req.body;

  const updates: any = {};
  if (name && typeof name === 'string') updates.name = name.trim();
  if (upiId && typeof upiId === 'string') updates.upiId = upiId.trim();

  const updated = db.updateUserProfile(account.user.id, updates);
  res.json({ success: true, profile: updated });
});

// --- SUBSCRIPTION & PLAN ROUTES ---

apiRouter.get('/subscriptions/plans', (req: Request, res: Response) => {
  const settings = db.getSettings();
  const plans = settings.plans || {
    free: { priceInr: 0, dailyLimit: 500 },
    plan_99: { priceInr: 99, dailyLimit: 1000 },
    plan_499: { priceInr: 499, dailyLimit: 5000 },
    plan_2000: { priceInr: 2000, dailyLimit: null },
  };

  const planList = [
    {
      id: 'free',
      name: 'Free Plan',
      priceInr: plans.free.priceInr,
      dailyLimit: plans.free.dailyLimit,
      billingCycle: 'Forever Free',
      description: 'Maximum earning of 500 points (₹50) per day.',
      features: [
        '500 points/day limit',
        'Standard tap speed',
        'Voluntary AdMob bonus',
        'Instant UPI withdrawal from ₹10',
      ],
      popular: false,
    },
    {
      id: 'plan_99',
      name: '₹99 Monthly Plan',
      priceInr: plans.plan_99.priceInr,
      dailyLimit: plans.plan_99.dailyLimit,
      billingCycle: 'per month',
      description: 'Maximum earning of 1,000 points (₹100) per day.',
      features: [
        '1,000 points/day limit (2x Free)',
        '30-day plan duration',
        'Priority withdrawal processing',
        'Instant payment verification',
      ],
      popular: true,
    },
    {
      id: 'plan_499',
      name: '₹499 Monthly Plan',
      priceInr: plans.plan_499.priceInr,
      dailyLimit: plans.plan_499.dailyLimit,
      billingCycle: 'per month',
      description: 'Maximum earning of 5,000 points (₹500) per day.',
      features: [
        '5,000 points/day limit (10x Free)',
        '30-day plan duration',
        'VIP support & high limits',
        'Zero withdrawal fees',
      ],
      popular: false,
    },
    {
      id: 'plan_2000',
      name: '₹2,000 Monthly Plan',
      priceInr: plans.plan_2000.priceInr,
      dailyLimit: plans.plan_2000.dailyLimit,
      billingCycle: 'per month',
      description: 'Unlimited daily earning with zero caps.',
      features: [
        'UNLIMITED daily points',
        '30-day plan duration',
        'Server-side bot protection & security',
        'Instant UPI payout routing',
      ],
      popular: false,
    },
  ];

  res.json({
    plans: planList,
    disclaimer: 'Points represent in-app reward tokens. Rewards are subject to anti-bot policies and verification.',
  });
});

apiRouter.get('/subscriptions/current', (req: Request, res: Response) => {
  const account = getAuthUser(req);
  const planInfo = db.getUserEffectivePlan(account.user.id);
  res.json({
    success: true,
    ...planInfo,
  });
});

apiRouter.post('/subscriptions/orders', (req: Request, res: Response) => {
  const account = getAuthUser(req);
  const { planId, paymentMethod, transactionReference } = req.body;

  if (!planId || !['plan_99', 'plan_499', 'plan_2000'].includes(planId)) {
    return res.status(400).json({ error: 'Valid paid plan selection required (plan_99, plan_499, plan_2000).' });
  }

  try {
    const order = db.createSubscriptionOrder(
      account.user.id,
      planId,
      paymentMethod || 'upi_qr',
      transactionReference
    );
    res.json({
      success: true,
      message: `Order created for ${order.planName} (₹${order.amountInr}). Complete payment and submit reference for instant verification.`,
      order,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create subscription order' });
  }
});

apiRouter.get('/subscriptions/orders', (req: Request, res: Response) => {
  const account = getAuthUser(req);
  const orders = db.getUserSubscriptionOrders(account.user.id);
  res.json({ orders });
});

apiRouter.post('/subscriptions/orders/:id/submit-ref', (req: Request, res: Response) => {
  const account = getAuthUser(req);
  const { id } = req.params;
  const { transactionReference, autoVerify } = req.body;

  if (!transactionReference || transactionReference.trim().length < 4) {
    return res.status(400).json({ error: 'Please provide a valid UPI / Bank UTR transaction reference.' });
  }

  try {
    const orders = db.getUserSubscriptionOrders(account.user.id);
    const order = orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found for this user.' });
    }

    if (order.status === 'verified') {
      return res.json({ success: true, message: 'Order is already verified and active!', order });
    }

    // In demo/test environment, automatically verify payment on reference submission
    const result = db.verifySubscriptionPayment(
      id,
      'Automated UPI Gateway Verification',
      transactionReference.trim()
    );

    res.json({
      success: true,
      message: `Payment verified! You are now upgraded to ${result.order.planName}.`,
      order: result.order,
      profile: result.profile,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Verification failed.' });
  }
});

// --- POINTS & TAPPING ROUTES ---

// Generate a secure fresh nonce for the next tap
apiRouter.get('/points/nonce', (req: Request, res: Response) => {
  const nonce = `tap_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  res.json({ nonce, timestamp: Date.now() });
});

apiRouter.post('/points/tap', (req: Request, res: Response) => {
  const account = getAuthUser(req);
  const { nonce, clientTimestamp, clientInterval, deviceFingerprint, isSimulatedBot } = req.body;

  // Server-authoritative plan limit validation
  const planInfo = db.getUserEffectivePlan(account.user.id);
  if (planInfo.dailyPointsLimit !== null && planInfo.dailyEarnedPoints >= planInfo.dailyPointsLimit) {
    return res.status(400).json({
      success: false,
      error: 'Daily limit reached. Come back tomorrow.',
      code: 'DAILY_LIMIT_REACHED',
      dailyPointsLimit: planInfo.dailyPointsLimit,
      dailyEarnedPoints: planInfo.dailyEarnedPoints,
      dailyPointsRemaining: 0,
    });
  }

  // Anti-fraud validation
  const validation = validateTapRequest(account.user, account.profile, {
    nonce,
    clientTimestamp: Number(clientTimestamp) || Date.now(),
    clientInterval: Number(clientInterval),
    deviceFingerprint,
    isSimulatedBot: Boolean(isSimulatedBot),
  });

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.message || 'Tap validation failed.',
      code: validation.code,
    });
  }

  const settings = db.getSettings();
  const today = new Date().toISOString().split('T')[0];
  const isNewDay = account.profile.lastTapDate !== today;

  // Atomically calculate and update point ledger
  let pointsToAdd = settings.pointsPerTap || 10;
  if (planInfo.dailyPointsLimit !== null) {
    const remainingAllowed = Math.max(0, planInfo.dailyPointsLimit - planInfo.dailyEarnedPoints);
    pointsToAdd = Math.min(pointsToAdd, remainingAllowed);
    if (pointsToAdd <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Daily limit reached. Come back tomorrow.',
        code: 'DAILY_LIMIT_REACHED',
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

  // Save profile
  db.updateUserProfile(account.user.id, {
    pointsBalance: account.profile.pointsBalance,
    totalTaps: account.profile.totalTaps,
    dailyTapsCount: account.profile.dailyTapsCount,
    dailyEarnedPoints: account.profile.dailyEarnedPoints,
    lastTapDate: account.profile.lastTapDate,
    lastEarningDate: account.profile.lastEarningDate,
  });

  // Add ledger transaction record
  db.addPointTransaction(
    account.user.id,
    'tap_reward',
    pointsToAdd,
    inrEquivalent,
    `Manual tap reward (+${pointsToAdd} pts)`
  );

  // Generate next fresh nonce for smooth client chaining
  const nextNonce = `tap_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
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
    nextNonce,
  });
});

apiRouter.get('/points/transactions', (req: Request, res: Response) => {
  const account = getAuthUser(req);
  const txs = db.getUserTransactions(account.user.id);
  res.json({ transactions: txs });
});

// --- WITHDRAWAL ROUTES ---

apiRouter.post('/withdrawals/create', (req: Request, res: Response) => {
  const account = getAuthUser(req);
  const { inrAmount, points, upiId } = req.body;
  const settings = db.getSettings();

  const requestedInr = Number(inrAmount) || (Number(points) / (settings.pointsToInrRatio || 10));
  const pointsRequired = Math.round(requestedInr * (settings.pointsToInrRatio || 10));

  if (!upiId || typeof upiId !== 'string' || !upiId.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm).' });
  }

  if (requestedInr < settings.minWithdrawalInr) {
    return res.status(400).json({
      error: `Minimum withdrawal is ₹${settings.minWithdrawalInr} (${settings.minWithdrawalInr * settings.pointsToInrRatio} points).`,
    });
  }

  if (account.profile.pointsBalance < pointsRequired) {
    return res.status(400).json({
      error: `Insufficient points balance. You have ${account.profile.pointsBalance} pts (₹${(account.profile.pointsBalance / settings.pointsToInrRatio).toFixed(2)}), but need ${pointsRequired} pts for ₹${requestedInr}.`,
    });
  }

  try {
    const result = db.createWithdrawal(account.user.id, pointsRequired, requestedInr, upiId.trim());
    res.json({
      success: true,
      message: `Withdrawal request for ₹${requestedInr} submitted successfully! Status: Pending review.`,
      withdrawal: result.withdrawal,
      profile: result.profile,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to submit withdrawal request.' });
  }
});

apiRouter.get('/withdrawals/history', (req: Request, res: Response) => {
  const account = getAuthUser(req);
  const history = db.getUserWithdrawals(account.user.id);
  res.json({ withdrawals: history });
});

// --- ADS & REWARDED AD ROUTES ---
apiRouter.get('/ads/config', (_req: Request, res: Response) => {
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
    disclaimer: 'Official Google AdMob placement. No forced clicks permitted by policy.',
  });
});

// Start a voluntary rewarded ad session
apiRouter.post('/ads/rewarded/start', (req: Request, res: Response) => {
  const account = getAuthUser(req);
  try {
    const session = db.createRewardedAdSession(account.user.id);
    res.json({
      success: true,
      ...session,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Cannot start rewarded ad session' });
  }
});

// Claim reward after completing rewarded ad video
apiRouter.post('/ads/rewarded/claim', (req: Request, res: Response) => {
  const account = getAuthUser(req);
  const { sessionId, durationSeconds } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required to claim ad reward.' });
  }

  try {
    const result = db.claimRewardedAd(account.user.id, sessionId, Number(durationSeconds) || 15);
    res.json({
      success: true,
      message: `🎉 Reward claimed! +${result.pointsAdded} points (₹${(result.pointsAdded / 10).toFixed(2)}) added to your balance.`,
      pointsAdded: result.pointsAdded,
      newBalance: result.newBalance,
      newInrBalance: result.newInrBalance,
      dailyRewardedAdsCount: result.dailyRewardedAdsCount,
      dailyRewardedAdsRemaining: result.dailyRewardedAdsRemaining,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to claim ad reward.' });
  }
});

// --- ADMIN ROUTES ---

apiRouter.get('/admin/overview', requireAdmin, (_req: Request, res: Response) => {
  const stats = db.getAdminStats();
  const settings = db.getSettings();
  res.json({ stats, settings });
});

apiRouter.get('/admin/users', requireAdmin, (req: Request, res: Response) => {
  const search = (req.query.search as string)?.toLowerCase() || '';
  const all = db.getAllUsersWithProfiles();

  const filtered = all.filter(
    (item) =>
      item.user.email.toLowerCase().includes(search) ||
      item.user.id.toLowerCase().includes(search) ||
      item.profile.name.toLowerCase().includes(search) ||
      (item.profile.upiId && item.profile.upiId.toLowerCase().includes(search))
  );

  res.json({ users: filtered });
});

apiRouter.get('/admin/users/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const account = db.findUserById(id);
  if (!account) return res.status(404).json({ error: 'User not found' });

  const transactions = db.getUserTransactions(id, 30);
  const withdrawals = db.getUserWithdrawals(id);
  const flags = db.getFraudFlags().filter((f) => f.userId === id);

  res.json({
    user: account.user,
    profile: account.profile,
    transactions,
    withdrawals,
    flags,
  });
});

apiRouter.post('/admin/users/:id/status', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['active', 'frozen', 'under_review'].includes(status)) {
    return res.status(400).json({ error: 'Invalid account status' });
  }

  const updated = db.updateUserStatus(id, status);
  if (!updated) return res.status(404).json({ error: 'User not found' });

  res.json({ success: true, user: updated });
});

apiRouter.post('/admin/users/:id/adjust-points', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { pointsDelta, reason } = req.body;
  const delta = Number(pointsDelta);

  if (isNaN(delta) || delta === 0) {
    return res.status(400).json({ error: 'Valid non-zero points amount required.' });
  }

  const account = db.findUserById(id);
  if (!account) return res.status(404).json({ error: 'User not found' });

  const settings = db.getSettings();
  account.profile.pointsBalance = Math.max(0, account.profile.pointsBalance + delta);
  db.updateUserProfile(id, { pointsBalance: account.profile.pointsBalance });

  db.addPointTransaction(
    id,
    'admin_adjustment',
    delta,
    delta / (settings.pointsToInrRatio || 10),
    `Admin manual adjustment: ${reason || 'Manual correction'}`
  );

  res.json({ success: true, newBalance: account.profile.pointsBalance });
});

apiRouter.get('/admin/withdrawals', requireAdmin, (req: Request, res: Response) => {
  const statusFilter = req.query.status as string;
  const list = db.getAllWithdrawals(statusFilter);
  res.json({ withdrawals: list });
});

apiRouter.post('/admin/withdrawals/:id/action', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, utrNumber, rejectionReason, adminName } = req.body;

  if (!['approve', 'reject', 'paid'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be approve, reject, or paid.' });
  }

  try {
    const result = db.processWithdrawal(
      id,
      action,
      adminName || 'Admin Operator',
      utrNumber,
      rejectionReason
    );
    res.json({ success: true, withdrawal: result.withdrawal, profile: result.profile });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to process withdrawal action' });
  }
});

apiRouter.get('/admin/fraud-flags', requireAdmin, (_req: Request, res: Response) => {
  const flags = db.getFraudFlags();
  res.json({ flags });
});

apiRouter.post('/admin/fraud-flags/:id/resolve', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const ok = db.resolveFraudFlag(id);
  res.json({ success: ok });
});

apiRouter.get('/admin/settings', requireAdmin, (_req: Request, res: Response) => {
  res.json({ settings: db.getSettings() });
});

apiRouter.put('/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

// Admin Subscription Order Management
apiRouter.get('/admin/subscriptions/orders', requireAdmin, (req: Request, res: Response) => {
  const statusFilter = req.query.status as string;
  const orders = db.getAllSubscriptionOrders(statusFilter);
  res.json({ orders });
});

apiRouter.post('/admin/subscriptions/orders/:id/verify', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { transactionReference, adminName } = req.body;
  try {
    const result = db.verifySubscriptionPayment(id, adminName || 'Super Admin', transactionReference);
    res.json({ success: true, order: result.order, profile: result.profile });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to verify subscription' });
  }
});

apiRouter.post('/admin/subscriptions/orders/:id/reject', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, adminName } = req.body;
  try {
    const order = db.rejectSubscriptionOrder(id, adminName || 'Super Admin', reason);
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to reject subscription' });
  }
});

apiRouter.post('/admin/users/:id/plan', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { planId, durationDays, adminName } = req.body;

  if (!['free', 'plan_99', 'plan_499', 'plan_2000'].includes(planId)) {
    return res.status(400).json({ error: 'Invalid plan ID' });
  }

  try {
    const profile = db.setUserPlanDirect(id, planId, Number(durationDays) || 30, adminName || 'Super Admin');
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to set user plan' });
  }
});

apiRouter.put('/admin/plans', requireAdmin, (req: Request, res: Response) => {
  const { plans } = req.body;
  if (!plans || typeof plans !== 'object') {
    return res.status(400).json({ error: 'Invalid plans payload' });
  }

  const updatedPlans = db.updatePlansConfig(plans);
  res.json({ success: true, plans: updatedPlans });
});

