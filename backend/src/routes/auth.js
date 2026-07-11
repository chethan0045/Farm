const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { JWT_SECRET, authenticate } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/rateLimit');
const emailService = require('../services/emailService');

const router = express.Router();

router.post('/register', authRateLimit, async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string'
        || !username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    // Public registration is closed by default: the first account can always
    // be created (bootstrap), after that set ALLOW_REGISTRATION=true to open it.
    const userCount = await User.estimatedDocumentCount();
    if (process.env.ALLOW_REGISTRATION !== 'true' && userCount > 0) {
      return res.status(403).json({ error: 'Registration is disabled' });
    }
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    // The bootstrap account owns the farm — everyone after is created by them
    const user = await User.create({ username, email, password, role: userCount === 0 ? 'admin' : 'user' });
    const token = jwt.sign({ id: user._id, username: user.username, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authRateLimit, async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const loginId = email || username;
    if (typeof loginId !== 'string' || typeof password !== 'string' || !loginId || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const user = await User.findOne({ $or: [{ email: loginId }, { username: loginId }] });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.active === false) {
      return res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
    }
    const token = jwt.sign({ id: user._id, username: user.username, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password -passwordOtp');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Account settings: update own profile (username/email)
router.put('/me', authenticate, async (req, res, next) => {
  try {
    const { username, email } = req.body;
    const updates = {};
    if (username !== undefined) {
      if (typeof username !== 'string' || !username.trim()) return res.status(400).json({ error: 'Invalid username' });
      updates.username = username.trim();
    }
    if (email !== undefined) {
      if (typeof email !== 'string' || !email.trim()) return res.status(400).json({ error: 'Invalid email' });
      updates.email = email.trim().toLowerCase();
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

    const clash = await User.findOne({
      _id: { $ne: req.user.id },
      $or: [
        ...(updates.username ? [{ username: updates.username }] : []),
        ...(updates.email ? [{ email: updates.email }] : [])
      ]
    });
    if (clash) return res.status(409).json({ error: 'Username or email already in use' });

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select('-password -passwordOtp');
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Issue a fresh token so the header/avatar reflect the new identity immediately
    const token = jwt.sign({ id: user._id, username: user.username, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

// Account settings: change own password (requires current password).
// When SMTP is configured, this is a two-step flow: the first valid call
// emails a 6-digit code (202 { otpRequired: true }); the second call must
// include { otp } to apply the change. Without SMTP it applies directly.
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

router.put('/me/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword, otp } = req.body;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (emailService.isConfigured()) {
      if (typeof otp !== 'string' || !otp) {
        // Step 1: send (or resend) the verification code
        if (user.passwordOtp?.sentAt && Date.now() - user.passwordOtp.sentAt.getTime() < 60 * 1000) {
          return res.status(429).json({ error: 'Code already sent — wait a minute before requesting another' });
        }
        const code = crypto.randomInt(100000, 1000000).toString();
        user.passwordOtp = { hash: sha256(code), expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0, sentAt: new Date() };
        await user.save();
        await emailService.sendPasswordOtp(user.email, code);
        const payload = { otpRequired: true, message: `Verification code sent to ${user.email}` };
        if (process.env.NODE_ENV === 'test') payload.devOtp = code; // test-only escape hatch, never set in production
        return res.status(202).json(payload);
      }
      // Step 2: verify the code
      const stored = user.passwordOtp;
      if (!stored?.hash || !stored.expiresAt || stored.expiresAt < new Date()) {
        return res.status(410).json({ error: 'Verification code expired — request a new one' });
      }
      if (stored.attempts >= 5) {
        user.passwordOtp = undefined;
        await user.save();
        return res.status(429).json({ error: 'Too many wrong codes — request a new one' });
      }
      if (sha256(otp.trim()) !== stored.hash) {
        user.passwordOtp.attempts = (stored.attempts || 0) + 1;
        await user.save();
        return res.status(401).json({ error: 'Incorrect verification code' });
      }
      user.passwordOtp = undefined;
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
