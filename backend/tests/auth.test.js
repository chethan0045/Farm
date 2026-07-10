const request = require('supertest');
const app = require('../src/app');
const { createUserWithToken } = require('./helpers');

describe('auth', () => {
  test('first account can always be created (bootstrap)', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'first', email: 'first@x.com', password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  });

  test('registration is closed once a user exists', async () => {
    await createUserWithToken();
    const res = await request(app).post('/api/auth/register')
      .send({ username: 'second', email: 'second@x.com', password: 'secret123' });
    expect(res.status).toBe(403);
  });

  test('ALLOW_REGISTRATION=true opens registration', async () => {
    await createUserWithToken();
    process.env.ALLOW_REGISTRATION = 'true';
    try {
      const res = await request(app).post('/api/auth/register')
        .send({ username: 'second', email: 'second@x.com', password: 'secret123' });
      expect(res.status).toBe(201);
    } finally {
      delete process.env.ALLOW_REGISTRATION;
    }
  });

  test('login works with valid credentials and rejects bad password', async () => {
    await createUserWithToken({ email: 'me@x.com', password: 'secret123' });
    const ok = await request(app).post('/api/auth/login')
      .send({ email: 'me@x.com', password: 'secret123' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeDefined();

    const bad = await request(app).post('/api/auth/login')
      .send({ email: 'me@x.com', password: 'wrong' });
    expect(bad.status).toBe(401);
  });

  test('operator-object login payloads are rejected, not queried', async () => {
    await createUserWithToken();
    const res = await request(app).post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
  });
});
