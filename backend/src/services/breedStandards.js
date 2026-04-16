// Optimal environment ranges by bird age (broiler standards)
const BROILER_OPTIMAL_RANGES = {
  week1:     { dayRange: [1, 7],      temp: { min: 32, max: 35 }, humidity: { min: 60, max: 70 }, ammonia: { warn: 20, danger: 50 }, co2: { warn: 2500, danger: 3000 } },
  week2:     { dayRange: [8, 14],     temp: { min: 29, max: 32 }, humidity: { min: 60, max: 70 }, ammonia: { warn: 20, danger: 50 }, co2: { warn: 2500, danger: 3000 } },
  week3:     { dayRange: [15, 21],    temp: { min: 27, max: 29 }, humidity: { min: 50, max: 60 }, ammonia: { warn: 20, danger: 50 }, co2: { warn: 2500, danger: 3000 } },
  week4:     { dayRange: [22, 28],    temp: { min: 21, max: 27 }, humidity: { min: 50, max: 60 }, ammonia: { warn: 20, danger: 50 }, co2: { warn: 2500, danger: 3000 } },
  week5:     { dayRange: [29, 35],    temp: { min: 21, max: 27 }, humidity: { min: 50, max: 60 }, ammonia: { warn: 20, danger: 50 }, co2: { warn: 2500, danger: 3000 } },
  week6plus: { dayRange: [36, Infinity], temp: { min: 21, max: 27 }, humidity: { min: 50, max: 60 }, ammonia: { warn: 20, danger: 50 }, co2: { warn: 2500, danger: 3000 } }
};

// Broiler weight standards (Cobb 500 reference, grams)
const BROILER_WEIGHT_STANDARDS = {
  1: 42, 2: 57, 3: 76, 4: 98, 5: 124, 6: 155, 7: 187,
  8: 225, 9: 266, 10: 310, 11: 358, 12: 410, 13: 465, 14: 500,
  15: 576, 16: 639, 17: 705, 18: 774, 19: 846, 20: 921, 21: 925,
  22: 1052, 23: 1115, 24: 1180, 25: 1248, 26: 1318, 27: 1390, 28: 1450,
  29: 1540, 30: 1616, 31: 1694, 32: 1774, 33: 1856, 34: 1940, 35: 2050,
  36: 2114, 37: 2202, 38: 2292, 39: 2384, 40: 2478, 41: 2574, 42: 2700
};

// Daily feed per bird (grams) at key days
const BROILER_FEED_STANDARDS = {
  1: 13, 7: 29, 14: 63, 21: 104, 28: 152, 35: 180, 42: 195
};

// Target FCR at key days
const BROILER_FCR_STANDARDS = {
  7: 0.82, 14: 1.08, 21: 1.30, 28: 1.48, 35: 1.64, 42: 1.78
};

// Season risk for Indian climate (monthly disease risk 0-100)
const SEASON_RISK = {
  1: 20, 2: 15, 3: 25, 4: 40, 5: 60, 6: 70,
  7: 65, 8: 60, 9: 50, 10: 30, 11: 20, 12: 20
};

// Expected cumulative mortality by age (percent)
const EXPECTED_MORTALITY = {
  7: 1.0, 14: 1.5, 21: 2.0, 28: 2.5, 35: 3.0, 42: 3.5
};

// Baseline daily mortality rate per bird
const BASELINE_DAILY_MORTALITY = {
  1: 0.0015, 2: 0.0008, 3: 0.0006, 4: 0.0005, 5: 0.0005, 6: 0.0006
};

function getOptimalRanges(birdAgeDays) {
  for (const key of Object.keys(BROILER_OPTIMAL_RANGES)) {
    const range = BROILER_OPTIMAL_RANGES[key];
    if (birdAgeDays >= range.dayRange[0] && birdAgeDays <= range.dayRange[1]) {
      return range;
    }
  }
  return BROILER_OPTIMAL_RANGES.week6plus;
}

function interpolate(standards, day) {
  const days = Object.keys(standards).map(Number).sort((a, b) => a - b);
  if (day <= days[0]) return standards[days[0]];
  if (day >= days[days.length - 1]) return standards[days[days.length - 1]];

  for (let i = 0; i < days.length - 1; i++) {
    if (day >= days[i] && day <= days[i + 1]) {
      const ratio = (day - days[i]) / (days[i + 1] - days[i]);
      return standards[days[i]] + ratio * (standards[days[i + 1]] - standards[days[i]]);
    }
  }
  return standards[days[days.length - 1]];
}

function getStandardWeight(day) {
  if (BROILER_WEIGHT_STANDARDS[day]) return BROILER_WEIGHT_STANDARDS[day];
  return interpolate(BROILER_WEIGHT_STANDARDS, day);
}

function getStandardDailyFeed(day) {
  return interpolate(BROILER_FEED_STANDARDS, day);
}

function getStandardFCR(day) {
  return interpolate(BROILER_FCR_STANDARDS, day);
}

function getExpectedMortality(day) {
  return interpolate(EXPECTED_MORTALITY, day);
}

function getBaselineDailyMortality(day) {
  const week = Math.min(Math.ceil(day / 7), 6);
  return BASELINE_DAILY_MORTALITY[week] || 0.0006;
}

function getSeasonRisk(month) {
  return SEASON_RISK[month] || 30;
}

function ammoniaEnumToApprox(level) {
  return { low: 10, medium: 30, high: 60 }[level] || 0;
}

module.exports = {
  BROILER_OPTIMAL_RANGES,
  BROILER_WEIGHT_STANDARDS,
  BROILER_FEED_STANDARDS,
  BROILER_FCR_STANDARDS,
  SEASON_RISK,
  EXPECTED_MORTALITY,
  BASELINE_DAILY_MORTALITY,
  getOptimalRanges,
  interpolate,
  getStandardWeight,
  getStandardDailyFeed,
  getStandardFCR,
  getExpectedMortality,
  getBaselineDailyMortality,
  getSeasonRisk,
  ammoniaEnumToApprox
};
