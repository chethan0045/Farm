const express = require('express');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

// Guard helper: every destructive change must leave at least one active admin.
async function wouldRemoveLastAdmin(targetId, changes = {}) {
  const target = await User.findById(targetId).select('role active').lean();
  if (!target) return false;
  const demoting = changes.role !== undefined && changes.role !== 'admin';
  const deactivating = changes.active === false;
  const deleting = changes.delete === true;
  const losesAdmin = target.role === 'admin' && target.active !== false && (demoting || deactivating || deleting);
  if (!losesAdmin) return false;
  const otherAdmins = await User.countDocuments({ _id: { $ne: targetId }, role: 'admin', active: { $ne: false } });
  return otherAdmins === 0;
}

// GET /api/users - list all accounts
router.get('/', async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// POST /api/users - admin creates an account (registration stays closed)
router.post('/', async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string'
        || !username.trim() || !email.trim() || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (role !== undefined && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or user' });
    }
    const existing = await User.findOne({ $or: [{ email: email.trim().toLowerCase() }, { username: username.trim() }] });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const user = await User.create({ username: username.trim(), email: email.trim().toLowerCase(), password, role: role || 'user' });
    const safe = user.toObject();
    delete safe.password;
    res.status(201).json(safe);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id - update username/email/role/active
router.put('/:id', async (req, res, next) => {
  try {
    const { username, email, role, active } = req.body;
    const updates = {};
    if (username !== undefined) {
      if (typeof username !== 'string' || !username.trim()) return res.status(400).json({ error: 'Invalid username' });
      updates.username = username.trim();
    }
    if (email !== undefined) {
      if (typeof email !== 'string' || !email.trim()) return res.status(400).json({ error: 'Invalid email' });
      updates.email = email.trim().toLowerCase();
    }
    if (role !== undefined) {
      if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Role must be admin or user' });
      updates.role = role;
    }
    if (active !== undefined) updates.active = active === true;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

    // You can't lock yourself out mid-session
    if (req.params.id === req.user.id && (updates.active === false || (updates.role && updates.role !== 'admin'))) {
      return res.status(400).json({ error: 'You cannot deactivate or demote your own account' });
    }
    if (await wouldRemoveLastAdmin(req.params.id, updates)) {
      return res.status(400).json({ error: 'At least one active admin account is required' });
    }
    if (updates.username || updates.email) {
      const clash = await User.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(updates.username ? [{ username: updates.username }] : []),
          ...(updates.email ? [{ email: updates.email }] : [])
        ]
      });
      if (clash) return res.status(409).json({ error: 'Username or email already in use' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id/password - admin resets a user's password
router.put('/:id/password', async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password reset' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id - remove an account
router.delete('/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    if (await wouldRemoveLastAdmin(req.params.id, { delete: true })) {
      return res.status(400).json({ error: 'At least one active admin account is required' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
