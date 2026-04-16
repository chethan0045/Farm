const crypto = require('crypto');
const Device = require('../models/Device');
const SensorData = require('../models/SensorData');
const SensorAlert = require('../models/SensorAlert');
const Batch = require('../models/Batch');

function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

async function checkDeviceHealth() {
  try {
    const devices = await Device.find({ isActive: true, status: { $ne: 'maintenance' } });
    const now = new Date();

    for (const device of devices) {
      if (!device.lastSeen) continue;

      const offlineThreshold = (device.config.offlineThresholdMinutes || 5) * 60 * 1000;
      const timeSinceLastSeen = now - device.lastSeen;

      if (timeSinceLastSeen > offlineThreshold && device.status !== 'offline') {
        device.status = 'offline';
        await device.save();

        // Dedup: check for existing unresolved offline alert for this device
        const existing = await SensorAlert.findOne({
          device: device._id,
          type: 'deviceOffline',
          isResolved: false
        });

        if (!existing) {
          // Auto-link batch if house has an active batch
          const batch = await Batch.findOne({ houseNumber: device.houseNumber, status: 'active' });

          await SensorAlert.create({
            houseNumber: device.houseNumber,
            device: device._id,
            batch: batch?._id,
            type: 'deviceOffline',
            severity: 'warning',
            title: `Device Offline - ${device.name}`,
            message: `Device ${device.deviceId} in house ${device.houseNumber} has been offline since ${device.lastSeen.toISOString()}.`,
            sensorValue: Math.round(timeSinceLastSeen / 60000),
            threshold: device.config.offlineThresholdMinutes
          });
        }
      }

      // Auto-resolve offline alerts when device comes back
      if (device.status === 'online') {
        await SensorAlert.updateMany(
          { device: device._id, type: 'deviceOffline', isResolved: false },
          { isResolved: true, resolvedAt: now }
        );
      }
    }

    console.log(`[Device Manager] Health check complete at ${now.toISOString()}`);
  } catch (err) {
    console.error('[Device Manager] Error:', err.message);
  }
}

async function getHouseOverview() {
  const devices = await Device.find({ isActive: true });
  const houseMap = {};

  for (const device of devices) {
    if (!houseMap[device.houseNumber]) {
      houseMap[device.houseNumber] = {
        houseNumber: device.houseNumber,
        devices: [],
        onlineCount: 0,
        totalCount: 0,
        latestReading: null
      };
    }

    const house = houseMap[device.houseNumber];
    house.devices.push({
      deviceId: device.deviceId,
      name: device.name,
      status: device.status,
      lastSeen: device.lastSeen,
      deviceType: device.deviceType
    });
    house.totalCount++;
    if (device.status === 'online') house.onlineCount++;
  }

  // Get latest reading per house
  for (const houseNumber of Object.keys(houseMap)) {
    const latest = await SensorData.findOne({ houseNumber }).sort({ timestamp: -1 });
    if (latest) {
      houseMap[houseNumber].latestReading = {
        temperature: latest.temperature,
        humidity: latest.humidity,
        ammoniaPPM: latest.ammoniaPPM,
        co2PPM: latest.co2PPM,
        feedLevelPercent: latest.feedLevelPercent,
        waterLevelPercent: latest.waterLevelPercent,
        timestamp: latest.timestamp
      };
    }
  }

  return Object.values(houseMap);
}

function startDeviceHealthChecker() {
  // Check every 2 minutes
  setInterval(() => checkDeviceHealth(), 2 * 60 * 1000);
  console.log('[Device Manager] Health checker started - runs every 2 minutes');
}

module.exports = {
  generateApiKey,
  checkDeviceHealth,
  getHouseOverview,
  startDeviceHealthChecker
};
