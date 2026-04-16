const Batch = require('../models/Batch');
const DailyLog = require('../models/DailyLog');
const SensorData = require('../models/SensorData');
const Vaccination = require('../models/Vaccination');
const HealthLog = require('../models/HealthLog');
const { getOptimalRanges, ammoniaEnumToApprox } = require('./breedStandards');
const { optimizeFCR } = require('./aiEngine');

function calculateTrend(values) {
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += values[i]; sumXY += i * values[i]; sumXX += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return -slope; // negative index means increasing values
}

async function generateRecommendations(batchId) {
  const batch = await Batch.findById(batchId);
  if (!batch) return [];

  const logs = await DailyLog.find({ batch: batchId }).sort({ date: -1 }).limit(7);
  const latestLog = logs[0];
  const ageDays = batch.dayCount || 1;
  const optimal = getOptimalRanges(ageDays);
  const phase = batch.phase || 'unknown';

  const recommendations = [];

  // --- Temperature ---
  const temp = latestLog?.temperature;
  if (temp != null) {
    if (temp > optimal.temp.max) {
      const diff = +(temp - optimal.temp.max).toFixed(1);
      recommendations.push({
        category: 'environment',
        priority: diff > 5 ? 'critical' : diff > 2 ? 'high' : 'medium',
        title: `Reduce temperature by ${diff}°C`,
        message: `Current: ${temp}°C. Birds in ${phase} phase (Day ${ageDays}), optimal: ${optimal.temp.min}-${optimal.temp.max}°C. ${diff > 5 ? 'Heat stress imminent - activate cooling immediately.' : 'Increase ventilation or activate foggers.'}`,
        actionable: true,
        suggestedAction: diff > 5 ? 'turn_on fan + fogger' : 'increase ventilation'
      });
    } else if (temp < optimal.temp.min) {
      const diff = +(optimal.temp.min - temp).toFixed(1);
      recommendations.push({
        category: 'environment',
        priority: diff > 5 ? 'high' : 'medium',
        title: `Increase temperature by ${diff}°C`,
        message: `Current: ${temp}°C. For ${phase} phase (Day ${ageDays}), minimum: ${optimal.temp.min}°C. Cold stress reduces feed conversion and increases mortality.`,
        actionable: true,
        suggestedAction: 'turn_on heater'
      });
    }
  }

  // --- Ammonia trend ---
  const ammoniaValues = logs
    .filter(l => l.ammoniaPPM != null || l.ammonia)
    .map(l => l.ammoniaPPM ?? ammoniaEnumToApprox(l.ammonia));

  if (ammoniaValues.length >= 3) {
    const trend = calculateTrend(ammoniaValues);
    const current = ammoniaValues[0];
    if (trend > 0 && current > 15) {
      recommendations.push({
        category: 'environment',
        priority: current > 40 ? 'critical' : 'high',
        title: 'Ammonia trending up over recent days',
        message: `Current: ~${current} ppm, increasing trend. ${current > 25 ? 'Above the 25 ppm safe limit.' : 'Approaching 25 ppm warning.'} Increase ventilation and check litter moisture.`,
        actionable: true,
        suggestedAction: 'increase ventilation'
      });
    }
  }

  // --- Humidity ---
  const humidity = latestLog?.humidity;
  if (humidity != null) {
    if (humidity > optimal.humidity.max + 10) {
      recommendations.push({
        category: 'environment',
        priority: 'high',
        title: `High humidity: ${humidity}%`,
        message: `Optimal: ${optimal.humidity.min}-${optimal.humidity.max}%. High humidity promotes bacterial growth and litter caking.`,
        actionable: true,
        suggestedAction: 'increase ventilation'
      });
    } else if (humidity < optimal.humidity.min - 10) {
      recommendations.push({
        category: 'environment',
        priority: 'medium',
        title: `Low humidity: ${humidity}%`,
        message: `Optimal: ${optimal.humidity.min}-${optimal.humidity.max}%. Low humidity causes dust and respiratory stress.`,
        actionable: true,
        suggestedAction: 'activate fogger'
      });
    }
  }

  // --- FCR ---
  try {
    const fcrData = await optimizeFCR(batch);
    if (fcrData && fcrData.fcrStatus === 'poor') {
      recommendations.push({
        category: 'feed',
        priority: 'high',
        title: `FCR above target for day ${ageDays} ${batch.birdType || 'broiler'}s`,
        message: `Current FCR: ${fcrData.currentFCR} vs target ${fcrData.targetFCR}. Review feed quality, check for wastage. Suggested daily feed: ${fcrData.suggestedDailyFeedKg} kg total.`,
        actionable: true,
        suggestedAction: 'review feed quality and quantity'
      });
    }
  } catch (e) { /* skip FCR if insufficient data */ }

  // --- Mortality trend ---
  const recentMortality = logs.slice(0, 3).map(l => l.mortalityCount || 0);
  if (recentMortality.length > 0) {
    const avgMortality = recentMortality.reduce((a, b) => a + b, 0) / recentMortality.length;
    const dailyRate = (avgMortality / (batch.currentCount || 1)) * 100;
    if (dailyRate > 0.15) {
      recommendations.push({
        category: 'health',
        priority: dailyRate > 0.5 ? 'critical' : 'high',
        title: 'Elevated mortality rate',
        message: `Average daily mortality: ${avgMortality.toFixed(1)} birds (${dailyRate.toFixed(2)}%). Normal: below 0.10% daily. Investigate disease, water quality, or environmental stress.`,
        actionable: true,
        suggestedAction: 'veterinary inspection'
      });
    }
  }

  // --- Water:Feed ratio ---
  if (latestLog?.waterGivenLiters > 0 && latestLog?.feedGivenKg > 0) {
    const ratio = latestLog.waterGivenLiters / latestLog.feedGivenKg;
    if (ratio < 1.6) {
      recommendations.push({
        category: 'feed',
        priority: ratio < 1.2 ? 'high' : 'medium',
        title: `Low water-to-feed ratio: ${ratio.toFixed(2)}`,
        message: `Optimal: 1.8-2.0. Low water intake may indicate illness, blocked drinkers, or water quality issues.`,
        actionable: true,
        suggestedAction: 'check drinker lines and water quality'
      });
    }
  }

  // --- Vaccination reminders ---
  const upcomingVax = await Vaccination.find({
    batch: batchId,
    status: 'scheduled',
    scheduledDate: { $lte: new Date(Date.now() + 2 * 86400000) }
  });
  for (const vax of upcomingVax) {
    recommendations.push({
      category: 'health',
      priority: 'medium',
      title: `Vaccination due: ${vax.vaccineName}`,
      message: `Scheduled for ${vax.scheduledDate.toDateString()} via ${vax.method || 'standard'}. Ensure birds are not stressed before vaccination.`,
      actionable: true,
      suggestedAction: 'administer vaccination'
    });
  }

  // --- Unresolved health issues ---
  const unresolvedHealth = await HealthLog.find({ batch: batchId, resolved: false });
  if (unresolvedHealth.length > 0) {
    const critical = unresolvedHealth.filter(h => h.severity === 'critical' || h.severity === 'high');
    if (critical.length > 0) {
      recommendations.push({
        category: 'health',
        priority: 'high',
        title: `${critical.length} unresolved health issue(s)`,
        message: `Active issues: ${critical.map(h => h.disease || h.type).join(', ')}. Follow up on treatment and monitor affected birds.`,
        actionable: true,
        suggestedAction: 'follow up on treatment'
      });
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return recommendations.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
}

module.exports = { generateRecommendations };
