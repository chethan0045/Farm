// Runs before any module loads: middleware/auth.js throws at require time
// if JWT_SECRET is missing (by design), so tests must provide one first.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-not-for-production';
delete process.env.ALLOW_REGISTRATION;
