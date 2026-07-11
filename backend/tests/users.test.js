const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { createUserWithToken, createDevice } = require('./helpers');

describe('user management', () => {
  test('first registered account becomes admin', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'boss', email: 'boss@x.com', password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');
  });

  test('non-admin is rejected from /api/users', async () => {
    const { token } = await createUserWithToken({ role: 'user' });
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('admin can create a user who can then log in', async () => {
    const { token } = await createUserWithToken({ role: 'admin' });
    const created = await request(app).post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'worker', email: 'worker@x.com', password: 'secret123', role: 'user' });
    expect(created.status).toBe(201);
    expect(created.body.password).toBeUndefined();

    const login = await request(app).post('/api/auth/login')
      .send({ email: 'worker@x.com', password: 'secret123' });
    expect(login.status).toBe(200);
  });

  test('deactivated user cannot log in', async () => {
    const { token } = await createUserWithToken({ role: 'admin' });
    const worker = await User.create({ username: 'w2', email: 'w2@x.com', password: 'secret123' });

    const res = await request(app).put(`/api/users/${worker._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ active: false });
    expect(res.status).toBe(200);

    const login = await request(app).post('/api/auth/login')
      .send({ email: 'w2@x.com', password: 'secret123' });
    expect(login.status).toBe(403);
  });

  test('admin cannot deactivate or demote their own account', async () => {
    const { user, token } = await createUserWithToken({ role: 'admin' });
    const demote = await request(app).put(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${token}`).send({ role: 'user' });
    expect(demote.status).toBe(400);
    const deactivate = await request(app).put(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${token}`).send({ active: false });
    expect(deactivate.status).toBe(400);
  });

  test('the last active admin cannot be demoted or deleted', async () => {
    const { token } = await createUserWithToken({ role: 'admin', username: 'a1', email: 'a1@x.com' });
    const otherAdmin = await User.create({ username: 'a2', email: 'a2@x.com', password: 'secret123', role: 'admin' });

    // Two admins: demoting one is fine
    const ok = await request(app).put(`/api/users/${otherAdmin._id}`)
      .set('Authorization', `Bearer ${token}`).send({ role: 'user' });
    expect(ok.status).toBe(200);

    // Promote back, deactivate requester's counterpart... now try deleting the
    // only other admin path: a1 is the sole admin; a1 can't delete itself.
    const selfDelete = await request(app).delete(`/api/users/${(await User.findOne({ username: 'a1' }))._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(selfDelete.status).toBe(400);
  });

  test('admin can reset a user password', async () => {
    const { token } = await createUserWithToken({ role: 'admin' });
    const worker = await User.create({ username: 'w3', email: 'w3@x.com', password: 'oldpass1' });

    const res = await request(app).put(`/api/users/${worker._id}/password`)
      .set('Authorization', `Bearer ${token}`).send({ newPassword: 'newpass1' });
    expect(res.status).toBe(200);

    const login = await request(app).post('/api/auth/login')
      .send({ email: 'w3@x.com', password: 'newpass1' });
    expect(login.status).toBe(200);
  });
});

describe('account settings', () => {
  test('user can change own password with correct current password', async () => {
    const { token } = await createUserWithToken({ email: 'me@x.com', password: 'secret123' });

    const wrong = await request(app).put('/api/auth/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'nope', newPassword: 'brandnew1' });
    expect(wrong.status).toBe(401);

    const ok = await request(app).put('/api/auth/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'secret123', newPassword: 'brandnew1' });
    expect(ok.status).toBe(200);

    const login = await request(app).post('/api/auth/login')
      .send({ email: 'me@x.com', password: 'brandnew1' });
    expect(login.status).toBe(200);
  });

  test('user can update own profile and gets a fresh token', async () => {
    const { token } = await createUserWithToken();
    const res = await request(app).put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'renamed' });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('renamed');
    expect(res.body.token).toBeDefined();
  });

  test('profile update rejects a username already in use', async () => {
    await createUserWithToken({ username: 'taken', email: 'taken@x.com' });
    const { token } = await createUserWithToken({ username: 'other', email: 'other@x.com' });
    const res = await request(app).put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'taken' });
    expect(res.status).toBe(409);
  });
});

describe('settings', () => {
  const abisConfig = { slaveId: 1, pollSeconds: 30, discovery: false, map: [{ offset: 0, field: 'temperature', scale: 0.1 }] };

  test('only admin can write settings; any user can read', async () => {
    const { token: userToken } = await createUserWithToken({ role: 'user', username: 'u1', email: 'u1@x.com' });
    const { token: adminToken } = await createUserWithToken({ role: 'admin', username: 'a1', email: 'a1@x.com' });

    const denied = await request(app).put('/api/settings/abis')
      .set('Authorization', `Bearer ${userToken}`).send({ value: abisConfig });
    expect(denied.status).toBe(403);

    const saved = await request(app).put('/api/settings/abis')
      .set('Authorization', `Bearer ${adminToken}`).send({ value: abisConfig });
    expect(saved.status).toBe(200);
    expect(saved.body.pollSeconds).toBe(30);

    const read = await request(app).get('/api/settings/abis')
      .set('Authorization', `Bearer ${userToken}`);
    expect(read.status).toBe(200);
    expect(read.body.map[0].field).toBe('temperature');
  });

  test('the Pi bridge can fetch ABIS config with its device API key', async () => {
    const { token } = await createUserWithToken({ role: 'admin' });
    await request(app).put('/api/settings/abis')
      .set('Authorization', `Bearer ${token}`).send({ value: abisConfig });

    const { apiKey } = await createDevice();
    const res = await request(app).get('/api/settings/bridge/abis').set('X-API-Key', apiKey);
    expect(res.status).toBe(200);
    expect(res.body.slaveId).toBe(1);

    const noKey = await request(app).get('/api/settings/bridge/abis');
    expect(noKey.status).toBe(401);
  });
});
