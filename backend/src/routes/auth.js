const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET, authenticate } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/rateLimit');

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
    if (process.env.ALLOW_REGISTRATION !== 'true') {
      const userCount = await User.estimatedDocumentCount();
      if (userCount > 0) {
        return res.status(403).json({ error: 'Registration is disabled' });
      }
    }
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const user = await User.create({ username, email, password });
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
    const token = jwt.sign({ id: user._id, username: user.username, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
