const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

beforeAll(async () => {
  // Pinned: mongod 8.x needs VC++ runtime DLLs beyond the common redist set
  // on Windows; 7.0.x runs with the widely available vcruntime/msvcp 140 DLLs.
  mongod = await MongoMemoryServer.create({ binary: { version: '7.0.24' } });
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  // Isolate tests: wipe every collection between test cases
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map(c => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});
