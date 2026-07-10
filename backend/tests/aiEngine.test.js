const DailyLog = require('../src/models/DailyLog');
const PredictionLog = require('../src/models/PredictionLog');
const { predictMortality, backfillPredictionAccuracy } = require('../src/services/aiEngine');
const { createBatch } = require('./helpers');

describe('AI engine', () => {
  test('mortality rates divide by the flock size on each past day, not the current count', async () => {
    const batch = await createBatch({
      chicksArrived: 1000,
      currentCount: 900,
      arrivalDate: new Date(Date.now() - 3 * 86400000)
    });
    // Day 1: 100 deaths out of 1000 (rate 0.10). Day 2: none out of 900.
    await DailyLog.create({
      batch: batch._id, date: new Date(Date.now() - 2 * 86400000), dayNumber: 1,
      mortalityCount: 100
    });
    await DailyLog.create({
      batch: batch._id, date: new Date(Date.now() - 1 * 86400000), dayNumber: 2,
      mortalityCount: 0
    });

    const result = await predictMortality(batch);
    // EMA: start at oldest rate 0.10, blend newest 0 → 0.3*0 + 0.7*0.10 = 0.07
    // The old bug divided day 1 by today's 900 (rate 0.111) → EMA 7.78
    expect(result.currentEMA).toBeCloseTo(7.0, 3);
  });

  test('prediction dates are normalized to UTC midnight (stable upsert keys)', async () => {
    const batch = await createBatch();
    const result = await predictMortality(batch, 3);
    for (const day of result.daily) {
      const d = new Date(day.date);
      expect(d.getUTCHours()).toBe(0);
      expect(d.getUTCMinutes()).toBe(0);
    }
  });

  test('backfill fills actualValue and accuracy from the daily log once the day passes', async () => {
    const batch = await createBatch();
    const yesterday = new Date();
    yesterday.setUTCHours(0, 0, 0, 0);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    await PredictionLog.create({
      batch: batch._id, type: 'mortality',
      predictedDate: yesterday, predictedValue: 10
    });
    await DailyLog.create({
      batch: batch._id, dayNumber: 9,
      date: new Date(yesterday.getTime() + 12 * 3600 * 1000), // noon that day
      mortalityCount: 8
    });

    await backfillPredictionAccuracy();

    const log = await PredictionLog.findOne({ batch: batch._id });
    expect(log.actualValue).toBe(8);
    expect(log.accuracy).toBe(80); // 100 * (1 - |10-8| / 10)
  });

  test('backfill leaves predictions without a daily log untouched', async () => {
    const batch = await createBatch();
    const yesterday = new Date();
    yesterday.setUTCHours(0, 0, 0, 0);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    await PredictionLog.create({
      batch: batch._id, type: 'mortality',
      predictedDate: yesterday, predictedValue: 10
    });

    await backfillPredictionAccuracy();

    const log = await PredictionLog.findOne({ batch: batch._id });
    expect(log.actualValue).toBeUndefined();
  });
});
