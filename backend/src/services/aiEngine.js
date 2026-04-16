const Batch = require('../models/Batch');
const DailyLog = require('../models/DailyLog');
const HealthLog = require('../models/HealthLog');
const SensorData = require('../models/SensorData');
const Vaccination = require('../models/Vaccination');
const AIInsight = require('../models/AIInsight');
const PredictionLog = require('../models/PredictionLog');
const {
  getOptimalRanges, getStandardWeight, getStandardFCR,
  getExpectedMortality, getBaselineDailyMortality, getSeasonRisk, ammoniaEnumToApprox
} = require('./breedStandards');

// ============== DISEASE RISK SCORE (0-100) ==============

function calcTempRisk(currentTemp, birdAgeDays) {
  if (currentTemp == null) return 0;
  const optimal = getOptimalRanges(birdAgeDays);
  if (currentTemp >= optimal.temp.min && currentTemp <= optimal.temp.max) return 0;
  const deviation = currentTemp > optimal.temp.max
    ? currentTemp - optimal.temp.max
    : optimal.temp.min - currentTemp;
  return Math.min(100, deviation * 15);
}

function calcAmmoniaRisk(ppm) {
  if (ppm == null || ppm <= 10) return 0;
  if (ppm <= 25) return ((ppm - 10) / 15) * 40;
  if (ppm <= 50) return 40 + ((ppm - 25) / 25) * 40;
  return Math.min(100, 80 + ((ppm - 50) / 25) * 20);
}

function calcMortalityRisk(mortalityPercent, birdAgeDays) {
  if (mortalityPercent == null) return 0;
  const expected = getExpectedMortality(birdAgeDays);
  if (expected <= 0) return 0;
  const ratio = mortalityPercent / expected;
  if (ratio <= 1.0) return 0;
  if (ratio <= 1.5) return (ratio - 1.0) * 60;
  if (ratio <= 2.0) return 30 + (ratio - 1.5) * 80;
  return Math.min(100, 70 + (ratio - 2.0) * 60);
}

function calcAgeRisk(birdAgeDays) {
  if (birdAgeDays <= 3) return 40;
  if (birdAgeDays <= 7) return 25;
  if (birdAgeDays <= 14) return 15;
  if (birdAgeDays <= 28) return 10;
  if (birdAgeDays <= 35) return 15;
  return 20 + Math.min(30, (birdAgeDays - 35) * 2);
}

function calcHumidityRisk(humidity) {
  if (humidity == null) return 0;
  if (humidity >= 50 && humidity <= 70) return 0;
  if (humidity > 70) return Math.min(100, (humidity - 70) * 3.3);
  return Math.min(100, (50 - humidity) * 3.3);
}

async function calcHealthHistoryRisk(batchId) {
  const recentHealth = await HealthLog.find({
    batch: batchId,
    date: { $gte: new Date(Date.now() - 14 * 86400000) },
    type: 'disease'
  });
  if (recentHealth.length === 0) return 0;
  const severityScores = { low: 15, medium: 35, high: 60, critical: 90 };
  const maxSeverity = Math.max(...recentHealth.map(h => severityScores[h.severity] || 0));
  const countFactor = Math.min(1.5, 1 + recentHealth.length * 0.1);
  return Math.min(100, maxSeverity * countFactor);
}

async function calculateDiseaseRisk(batch, latestLog, sensorAvg) {
  const ageDays = batch.dayCount || 1;
  const mortalityPct = parseFloat(batch.mortalityPercent) || 0;
  const temp = sensorAvg?.temperature ?? latestLog?.temperature;
  const humidity = sensorAvg?.humidity ?? latestLog?.humidity;
  const ammonia = sensorAvg?.ammoniaPPM ?? latestLog?.ammoniaPPM ?? ammoniaEnumToApprox(latestLog?.ammonia);
  const month = new Date().getMonth() + 1;

  const tempRisk = calcTempRisk(temp, ageDays);
  const ammoniaRisk = calcAmmoniaRisk(ammonia);
  const mortalityRisk = calcMortalityRisk(mortalityPct, ageDays);
  const ageRisk = calcAgeRisk(ageDays);
  const seasonRisk = getSeasonRisk(month);
  const humidityRisk = calcHumidityRisk(humidity);
  const healthRisk = await calcHealthHistoryRisk(batch._id);

  const score = Math.round(
    0.20 * tempRisk +
    0.20 * ammoniaRisk +
    0.20 * mortalityRisk +
    0.10 * ageRisk +
    0.10 * seasonRisk +
    0.10 * humidityRisk +
    0.10 * healthRisk
  );

  const factors = [];
  if (tempRisk > 30) factors.push(`Temperature stress (risk: ${Math.round(tempRisk)})`);
  if (ammoniaRisk > 30) factors.push(`High ammonia (risk: ${Math.round(ammoniaRisk)})`);
  if (mortalityRisk > 30) factors.push(`Elevated mortality (risk: ${Math.round(mortalityRisk)})`);
  if (healthRisk > 30) factors.push(`Recent disease history (risk: ${Math.round(healthRisk)})`);
  if (humidityRisk > 30) factors.push(`Humidity outside range (risk: ${Math.round(humidityRisk)})`);
  if (seasonRisk > 40) factors.push(`Seasonal risk (${month})`);

  return {
    score: Math.min(100, Math.max(0, score)),
    factors,
    breakdown: { tempRisk, ammoniaRisk, mortalityRisk, ageRisk, seasonRisk, humidityRisk, healthRisk }
  };
}

// ============== MORTALITY PREDICTION ==============

async function predictMortality(batch, days = 7) {
  const logs = await DailyLog.find({ batch: batch._id }).sort({ date: -1 }).limit(14);
  const dailyRates = logs.map(l => (l.mortalityCount || 0) / (batch.currentCount || 1));

  // EMA with alpha = 0.3
  let ema = dailyRates[dailyRates.length - 1] || 0;
  for (let i = dailyRates.length - 2; i >= 0; i--) {
    ema = 0.3 * dailyRates[i] + 0.7 * ema;
  }

  const predictions = [];
  let remainingBirds = batch.currentCount;
  const ageDays = batch.dayCount || 1;

  for (let d = 1; d <= days; d++) {
    const futureDay = ageDays + d;
    const baseline = getBaselineDailyMortality(futureDay);
    const predictedRate = 0.6 * ema + 0.4 * baseline;
    const predictedCount = Math.round(remainingBirds * predictedRate);

    predictions.push({
      day: futureDay,
      date: new Date(Date.now() + d * 86400000),
      predictedMortality: predictedCount,
      predictedRate: +(predictedRate * 100).toFixed(3),
      confidence: Math.max(50, 100 - d * 5)
    });

    remainingBirds -= predictedCount;
  }

  const baseline = getBaselineDailyMortality(ageDays);
  return {
    totalPredicted: predictions.reduce((s, p) => s + p.predictedMortality, 0),
    daily: predictions,
    currentTrend: ema > baseline ? 'above_normal' : 'normal',
    currentEMA: +(ema * 100).toFixed(3)
  };
}

// ============== FCR OPTIMIZATION ==============

async function optimizeFCR(batch) {
  const logs = await DailyLog.find({ batch: batch._id }).sort({ date: 1 });
  if (logs.length === 0) return null;

  const ageDays = batch.dayCount || 1;
  const latestLog = logs[logs.length - 1];

  // Calculate actual FCR
  const totalFeedKg = logs.reduce((sum, l) => sum + (l.feedGivenKg || 0), 0);
  const totalFeedGrams = totalFeedKg * 1000;
  const currentWeight = latestLog.avgBodyWeightGrams || 0;
  const actualFCR = currentWeight > 0 ? totalFeedGrams / (currentWeight * batch.currentCount) : 0;

  const targetFCR = getStandardFCR(ageDays);
  const targetWeight = getStandardWeight(ageDays);
  const fcrDeviation = actualFCR - targetFCR;

  // Suggest daily feed per bird
  const { getStandardDailyFeed } = require('./breedStandards');
  let suggestedFeedPerBird = getStandardDailyFeed(ageDays);

  const weightDeviation = currentWeight - targetWeight;
  if (weightDeviation < -targetWeight * 0.05) {
    suggestedFeedPerBird *= 1.07; // underweight: increase 7%
  } else if (weightDeviation > targetWeight * 0.10) {
    suggestedFeedPerBird *= 0.96; // overweight: reduce 4%
  }

  // Temperature adjustment
  if (latestLog.temperature > 30) {
    suggestedFeedPerBird *= 0.95; // heat reduces appetite
  }

  return {
    currentFCR: +actualFCR.toFixed(3),
    targetFCR: +targetFCR.toFixed(3),
    fcrStatus: fcrDeviation <= 0.05 ? 'good' : fcrDeviation <= 0.15 ? 'acceptable' : 'poor',
    suggestedDailyFeedKg: +(suggestedFeedPerBird * batch.currentCount / 1000).toFixed(1),
    suggestedFeedPerBirdGrams: Math.round(suggestedFeedPerBird),
    currentWeightGrams: currentWeight,
    targetWeightGrams: Math.round(targetWeight),
    weightStatus: Math.abs(weightDeviation) <= targetWeight * 0.05 ? 'on_track'
      : weightDeviation > 0 ? 'above' : 'below'
  };
}

// ============== ENVIRONMENT SCORE (0-100) ==============

function calculateEnvironmentScore(logData, birdAgeDays) {
  let score = 100;
  const optimal = getOptimalRanges(birdAgeDays);

  if (logData.temperature != null) {
    if (logData.temperature < optimal.temp.min) {
      score -= Math.min(40, (optimal.temp.min - logData.temperature) * 8);
    } else if (logData.temperature > optimal.temp.max) {
      score -= Math.min(40, (logData.temperature - optimal.temp.max) * 8);
    }
  }

  if (logData.humidity != null) {
    if (logData.humidity < optimal.humidity.min) {
      score -= Math.min(25, (optimal.humidity.min - logData.humidity) * 1.5);
    } else if (logData.humidity > optimal.humidity.max) {
      score -= Math.min(25, (logData.humidity - optimal.humidity.max) * 1.5);
    }
  }

  const ppm = logData.ammoniaPPM ?? logData.ammonia_ppm ?? ammoniaEnumToApprox(logData.ammonia);
  if (ppm > 10) {
    score -= Math.min(25, (ppm - 10) * 0.625);
  }

  if (logData.ventilation === 'moderate') score -= 5;
  if (logData.ventilation === 'poor') score -= 10;

  return Math.max(0, Math.round(score));
}

// ============== FULL ANALYSIS ==============

async function analyzeBatch(batchId) {
  const batch = await Batch.findById(batchId);
  if (!batch || batch.status !== 'active') return null;

  const latestLog = await DailyLog.findOne({ batch: batchId }).sort({ date: -1 });
  const ageDays = batch.dayCount || 1;

  // Get sensor averages for last 24h
  let sensorAvg = null;
  if (batch.houseNumber) {
    const pipeline = await SensorData.aggregate([
      { $match: { houseNumber: batch.houseNumber, timestamp: { $gte: new Date(Date.now() - 24 * 3600 * 1000) } } },
      { $group: {
        _id: null,
        temperature: { $avg: '$temperature' },
        humidity: { $avg: '$humidity' },
        ammoniaPPM: { $avg: '$ammoniaPPM' },
        co2PPM: { $avg: '$co2PPM' }
      }}
    ]);
    if (pipeline.length > 0) sensorAvg = pipeline[0];
  }

  const diseaseRisk = await calculateDiseaseRisk(batch, latestLog, sensorAvg);
  const mortalityPrediction = await predictMortality(batch);
  const fcrData = await optimizeFCR(batch);
  const envData = sensorAvg || latestLog || {};
  const environmentScore = calculateEnvironmentScore(envData, ageDays);

  return {
    batchId: batch._id,
    batchNumber: batch.batchNumber,
    houseNumber: batch.houseNumber,
    dayCount: ageDays,
    phase: batch.phase,
    diseaseRisk,
    mortalityPrediction,
    fcrOptimization: fcrData,
    environmentScore,
    analyzedAt: new Date()
  };
}

// ============== GENERATE INSIGHTS ==============

async function generateInsights(analysis) {
  if (!analysis) return;

  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
  const insights = [];

  // Disease risk insight
  const dr = analysis.diseaseRisk;
  if (dr.score > 20) {
    const severity = dr.score > 70 ? 'critical' : dr.score > 50 ? 'high' : dr.score > 30 ? 'medium' : 'low';
    insights.push({
      batch: analysis.batchId,
      houseNumber: analysis.houseNumber,
      category: 'disease_risk',
      severity,
      title: `Disease Risk Score: ${dr.score}/100 - ${analysis.batchNumber}`,
      summary: `Disease risk is ${severity} for batch ${analysis.batchNumber} (Day ${analysis.dayCount}).`,
      details: `Risk factors: ${dr.factors.join('; ') || 'None significant'}`,
      recommendations: dr.score > 50
        ? ['Schedule veterinary inspection', 'Review environmental conditions', 'Monitor bird behavior closely']
        : ['Continue routine monitoring', 'Maintain optimal environment conditions'],
      confidence: 75,
      inputData: { batchMetrics: dr.breakdown },
      expiresAt,
      generatedBy: 'rule_engine'
    });
  }

  // Mortality prediction insight
  const mp = analysis.mortalityPrediction;
  if (mp.currentTrend === 'above_normal' || mp.totalPredicted > 5) {
    insights.push({
      batch: analysis.batchId,
      houseNumber: analysis.houseNumber,
      category: 'mortality_prediction',
      severity: mp.totalPredicted > 20 ? 'high' : 'medium',
      title: `Predicted ${mp.totalPredicted} mortality in next 7 days - ${analysis.batchNumber}`,
      summary: `Mortality trend is ${mp.currentTrend}. EMA rate: ${mp.currentEMA}% daily.`,
      details: mp.daily.map(d => `Day ${d.day}: ${d.predictedMortality} birds (${d.predictedRate}%)`).join('\n'),
      recommendations: mp.currentTrend === 'above_normal'
        ? ['Investigate cause of elevated mortality', 'Check water and feed quality', 'Review vaccination status']
        : ['Monitor daily mortality counts'],
      confidence: 65,
      inputData: { batchMetrics: { totalPredicted: mp.totalPredicted, trend: mp.currentTrend } },
      expiresAt,
      generatedBy: 'trend_analysis'
    });
  }

  // FCR insight
  const fcr = analysis.fcrOptimization;
  if (fcr && fcr.fcrStatus !== 'good') {
    insights.push({
      batch: analysis.batchId,
      houseNumber: analysis.houseNumber,
      category: 'fcr_optimization',
      severity: fcr.fcrStatus === 'poor' ? 'high' : 'medium',
      title: `FCR ${fcr.currentFCR} vs target ${fcr.targetFCR} - ${analysis.batchNumber}`,
      summary: `Feed conversion ratio is ${fcr.fcrStatus}. Weight is ${fcr.weightStatus}.`,
      details: `Suggested daily feed: ${fcr.suggestedDailyFeedKg} kg total (${fcr.suggestedFeedPerBirdGrams}g/bird). Current weight: ${fcr.currentWeightGrams}g, target: ${fcr.targetWeightGrams}g.`,
      recommendations: fcr.fcrStatus === 'poor'
        ? ['Review feed quality and formulation', 'Check for feed wastage', 'Ensure adequate water supply', 'Verify feeder line height']
        : ['Minor feed adjustment recommended', 'Continue monitoring'],
      confidence: 70,
      inputData: { batchMetrics: fcr },
      expiresAt,
      generatedBy: 'rule_engine'
    });
  }

  // Environment score insight
  if (analysis.environmentScore < 70) {
    insights.push({
      batch: analysis.batchId,
      houseNumber: analysis.houseNumber,
      category: 'environment_optimization',
      severity: analysis.environmentScore < 40 ? 'critical' : analysis.environmentScore < 60 ? 'high' : 'medium',
      title: `Environment Score: ${analysis.environmentScore}/100 - House ${analysis.houseNumber}`,
      summary: `Environmental conditions need attention for ${analysis.batchNumber} (Day ${analysis.dayCount}).`,
      recommendations: ['Review temperature settings for bird age', 'Check ventilation system', 'Monitor ammonia and humidity levels'],
      confidence: 80,
      expiresAt,
      generatedBy: 'rule_engine'
    });
  }

  // Dedup and save
  for (const insightData of insights) {
    const existing = await AIInsight.findOne({
      batch: insightData.batch,
      category: insightData.category,
      isDismissed: false,
      expiresAt: { $gt: new Date() }
    });

    if (existing) {
      // Update existing insight
      Object.assign(existing, insightData);
      await existing.save();
    } else {
      await AIInsight.create(insightData);
    }
  }
}

// ============== ANALYZE ALL BATCHES ==============

async function analyzeAllBatches() {
  try {
    const batches = await Batch.find({ status: 'active' });
    for (const batch of batches) {
      const analysis = await analyzeBatch(batch._id);
      if (analysis) {
        await generateInsights(analysis);

        // Save predictions for accuracy tracking
        if (analysis.mortalityPrediction) {
          for (const pred of analysis.mortalityPrediction.daily) {
            await PredictionLog.findOneAndUpdate(
              { batch: batch._id, type: 'mortality', predictedDate: pred.date },
              { predictedValue: pred.predictedMortality, generatedAt: new Date() },
              { upsert: true }
            );
          }
        }
      }
    }
    console.log(`[AI Engine] Analysis complete for ${batches.length} batches at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[AI Engine] Error:', err.message);
  }
}

function startAIScheduler() {
  const intervalHours = parseInt(process.env.AI_ANALYSIS_INTERVAL_HOURS) || 6;
  // Run first analysis after 1 minute
  setTimeout(() => analyzeAllBatches(), 60 * 1000);
  // Then every N hours
  setInterval(() => analyzeAllBatches(), intervalHours * 60 * 60 * 1000);
  console.log(`[AI Engine] Scheduler started - runs every ${intervalHours} hours`);
}

module.exports = {
  analyzeBatch,
  generateInsights,
  analyzeAllBatches,
  calculateDiseaseRisk,
  predictMortality,
  optimizeFCR,
  calculateEnvironmentScore,
  startAIScheduler
};
