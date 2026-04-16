const SensorData = require('../models/SensorData');
const SensorAlert = require('../models/SensorAlert');
const Batch = require('../models/Batch');
const { getOptimalRanges } = require('./breedStandards');
const { evaluate: evaluateAutomation } = require('./automationEngine');

async function processSensorData(device, reading) {
  // Save sensor data
  const sensorData = await SensorData.create({
    device: device._id,
    houseNumber: device.houseNumber,
    timestamp: reading.timestamp || new Date(),
    temperature: reading.temperature,
    humidity: reading.humidity,
    ammoniaPPM: reading.ammoniaPPM,
    co2PPM: reading.co2PPM,
    lightIntensity: reading.lightIntensity,
    feedLevelPercent: reading.feedLevelPercent,
    waterLevelPercent: reading.waterLevelPercent,
    rssi: reading.rssi,
    freeHeapBytes: reading.freeHeapBytes
  });

  // Find active batch for this house
  const batch = await Batch.findOne({ houseNumber: device.houseNumber, status: 'active' });
  const birdAgeDays = batch ? batch.dayCount || 1 : 21; // default mid-range if no batch
  const optimal = getOptimalRanges(birdAgeDays);

  // Check thresholds and create alerts
  await checkThresholds(device, reading, batch, optimal);

  // Evaluate automation rules
  await evaluateAutomation(device.houseNumber, reading);

  return sensorData;
}

async function checkThresholds(device, reading, batch, optimal) {
  const alerts = [];
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

  // Temperature checks
  if (reading.temperature != null) {
    if (reading.temperature > optimal.temp.max + 5) {
      alerts.push({
        type: 'temperature', severity: 'critical',
        title: `Critical Temperature - House ${device.houseNumber}`,
        message: `Temperature is ${reading.temperature}°C. Maximum for current bird age: ${optimal.temp.max}°C. Heat stress imminent - activate cooling immediately.`,
        sensorValue: reading.temperature, threshold: optimal.temp.max
      });
    } else if (reading.temperature > optimal.temp.max) {
      alerts.push({
        type: 'temperature', severity: 'warning',
        title: `High Temperature - House ${device.houseNumber}`,
        message: `Temperature is ${reading.temperature}°C. Optimal range: ${optimal.temp.min}-${optimal.temp.max}°C. Consider increasing ventilation.`,
        sensorValue: reading.temperature, threshold: optimal.temp.max
      });
    } else if (reading.temperature < optimal.temp.min - 5) {
      alerts.push({
        type: 'temperature', severity: 'danger',
        title: `Low Temperature - House ${device.houseNumber}`,
        message: `Temperature is ${reading.temperature}°C. Minimum for current bird age: ${optimal.temp.min}°C. Cold stress risk - activate heating.`,
        sensorValue: reading.temperature, threshold: optimal.temp.min
      });
    }
  }

  // Humidity checks
  if (reading.humidity != null) {
    if (reading.humidity > 85) {
      alerts.push({
        type: 'humidity', severity: 'danger',
        title: `High Humidity - House ${device.houseNumber}`,
        message: `Humidity is ${reading.humidity}%. Maximum recommended: ${optimal.humidity.max}%. Increase ventilation.`,
        sensorValue: reading.humidity, threshold: optimal.humidity.max
      });
    } else if (reading.humidity > optimal.humidity.max) {
      alerts.push({
        type: 'humidity', severity: 'warning',
        title: `High Humidity - House ${device.houseNumber}`,
        message: `Humidity is ${reading.humidity}%. Optimal range: ${optimal.humidity.min}-${optimal.humidity.max}%.`,
        sensorValue: reading.humidity, threshold: optimal.humidity.max
      });
    } else if (reading.humidity < optimal.humidity.min - 15) {
      alerts.push({
        type: 'humidity', severity: 'warning',
        title: `Low Humidity - House ${device.houseNumber}`,
        message: `Humidity is ${reading.humidity}%. Minimum recommended: ${optimal.humidity.min}%.`,
        sensorValue: reading.humidity, threshold: optimal.humidity.min
      });
    }
  }

  // Ammonia checks
  if (reading.ammoniaPPM != null) {
    if (reading.ammoniaPPM > optimal.ammonia.danger) {
      alerts.push({
        type: 'ammonia', severity: 'critical',
        title: `Dangerous Ammonia - House ${device.houseNumber}`,
        message: `Ammonia is ${reading.ammoniaPPM} ppm. DANGER level (>${optimal.ammonia.danger} ppm). Evacuate or increase ventilation immediately.`,
        sensorValue: reading.ammoniaPPM, threshold: optimal.ammonia.danger
      });
    } else if (reading.ammoniaPPM > optimal.ammonia.warn) {
      alerts.push({
        type: 'ammonia', severity: 'warning',
        title: `High Ammonia - House ${device.houseNumber}`,
        message: `Ammonia is ${reading.ammoniaPPM} ppm. Warning threshold: ${optimal.ammonia.warn} ppm. Improve ventilation.`,
        sensorValue: reading.ammoniaPPM, threshold: optimal.ammonia.warn
      });
    }
  }

  // CO2 checks
  if (reading.co2PPM != null) {
    if (reading.co2PPM > optimal.co2.danger) {
      alerts.push({
        type: 'co2', severity: 'critical',
        title: `Dangerous CO2 - House ${device.houseNumber}`,
        message: `CO2 is ${reading.co2PPM} ppm. DANGER level (>${optimal.co2.danger} ppm). Increase ventilation immediately.`,
        sensorValue: reading.co2PPM, threshold: optimal.co2.danger
      });
    } else if (reading.co2PPM > optimal.co2.warn) {
      alerts.push({
        type: 'co2', severity: 'warning',
        title: `High CO2 - House ${device.houseNumber}`,
        message: `CO2 is ${reading.co2PPM} ppm. Warning threshold: ${optimal.co2.warn} ppm.`,
        sensorValue: reading.co2PPM, threshold: optimal.co2.warn
      });
    }
  }

  // Feed level check
  if (reading.feedLevelPercent != null) {
    if (reading.feedLevelPercent < 5) {
      alerts.push({
        type: 'feedLevel', severity: 'critical',
        title: `Feed Empty - House ${device.houseNumber}`,
        message: `Feed level is ${reading.feedLevelPercent}%. Refill immediately.`,
        sensorValue: reading.feedLevelPercent, threshold: 5
      });
    } else if (reading.feedLevelPercent < 20) {
      alerts.push({
        type: 'feedLevel', severity: 'warning',
        title: `Low Feed - House ${device.houseNumber}`,
        message: `Feed level is ${reading.feedLevelPercent}%. Schedule refill soon.`,
        sensorValue: reading.feedLevelPercent, threshold: 20
      });
    }
  }

  // Water level check
  if (reading.waterLevelPercent != null) {
    if (reading.waterLevelPercent < 5) {
      alerts.push({
        type: 'waterLevel', severity: 'critical',
        title: `Water Empty - House ${device.houseNumber}`,
        message: `Water level is ${reading.waterLevelPercent}%. Refill immediately.`,
        sensorValue: reading.waterLevelPercent, threshold: 5
      });
    } else if (reading.waterLevelPercent < 20) {
      alerts.push({
        type: 'waterLevel', severity: 'warning',
        title: `Low Water - House ${device.houseNumber}`,
        message: `Water level is ${reading.waterLevelPercent}%. Schedule refill soon.`,
        sensorValue: reading.waterLevelPercent, threshold: 20
      });
    }
  }

  // Create alerts with deduplication (no duplicate unresolved alert of same type for same house in 30 min)
  for (const alertData of alerts) {
    const existing = await SensorAlert.findOne({
      houseNumber: device.houseNumber,
      type: alertData.type,
      isResolved: false,
      createdAt: { $gte: thirtyMinAgo }
    });

    if (!existing) {
      await SensorAlert.create({
        houseNumber: device.houseNumber,
        device: device._id,
        batch: batch?._id,
        ...alertData
      });
    }
  }
}

module.exports = { processSensorData };
