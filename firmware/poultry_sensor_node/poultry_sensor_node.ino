/*
 * Smart Poultry Farm - ESP32 Sensor Node
 * --------------------------------------
 * One node per house. Reads environment sensors and pushes them to the
 * backend at POST /api/sensor-data (header X-API-Key). When the internet
 * is down it buffers readings in RAM and flushes them via /bulk on reconnect.
 *
 * IMPORTANT: This node is electrically SEPARATE from the 3-phase contactor
 * panel. Power it from its own 230V->5V supply. Do NOT wire it into motor
 * or contactor coil circuits.
 *
 * Sensors used (swap freely - see README):
 *   - SHT31      temperature + humidity   (I2C: SDA=21, SCL=22)
 *   - MH-Z19B    CO2 ppm                   (UART2: RX=16, TX=17)
 *   - MQ-137     ammonia (analog ppm est.) (ADC: GPIO34)   * electrochemical is more accurate
 *   - BH1750     light (lux)               (I2C, optional)
 *   - feed/water level: optional analog 0-100% (ADC: GPIO35 / GPIO32)
 *
 * Libraries (Arduino Library Manager):
 *   Adafruit SHT31, MH-Z19 (by Jonathan Dempsey), BH1750 (by claws), ArduinoJson
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <MHZ19.h>
#include <BH1750.h>

// ======================= CONFIG =======================
const char* WIFI_SSID     = "FARM_4G_ROUTER";          // your 4G/WiFi router SSID
const char* WIFI_PASS     = "changeme";

// Backend base URL. Use your deployed HTTPS URL (Render) or LAN http://IP:5000
const char* SERVER_URL    = "https://your-app.onrender.com";
const char* DEVICE_API_KEY = "PASTE_THE_64_CHAR_KEY_FROM_THE_APP";

const unsigned long REPORT_INTERVAL_MS = 30000;        // 30s, match device config
const bool  HAS_LIGHT_SENSOR = false;                  // set true if BH1750 fitted
const bool  HAS_FEED_LEVEL   = false;                  // set true if feed level sensor fitted
const bool  HAS_WATER_LEVEL  = false;                  // set true if water level sensor fitted

// MQ-137 calibration (rough). Replace with a calibrated curve or an
// electrochemical NH3 sensor for accurate ppm. See README.
const int   NH3_ADC_PIN   = 34;
const float NH3_PPM_MAX   = 100.0;                     // ppm at full-scale ADC

const int   FEED_ADC_PIN  = 35;
const int   WATER_ADC_PIN = 32;
// ======================================================

Adafruit_SHT31 sht31 = Adafruit_SHT31();
MHZ19 mhz19;
BH1750 lightMeter;
HardwareSerial co2Serial(2); // UART2

// Offline buffer (RAM). Lost on reboot - upgrade to LittleFS for persistence.
struct Reading {
  float temperature, humidity, ammoniaPPM, co2PPM, lightIntensity, feed, water;
  int rssi; uint32_t freeHeap;
};
const int BUFFER_MAX = 200;
Reading buffer[BUFFER_MAX];
int bufCount = 0;

unsigned long lastReport = 0;
bool shtOk = false, co2Ok = false, lightOk = false;

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi connecting");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500); Serial.print(".");
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " connected" : " FAILED");
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);

  shtOk = sht31.begin(0x44);
  Serial.println(shtOk ? "SHT31 ok" : "SHT31 NOT found");

  co2Serial.begin(9600, SERIAL_8N1, 16, 17);
  mhz19.begin(co2Serial);
  mhz19.autoCalibration(true);
  co2Ok = true;

  if (HAS_LIGHT_SENSOR) lightOk = lightMeter.begin();

  analogReadResolution(12); // 0..4095

  connectWiFi();
}

// Read all sensors into a Reading struct
Reading readSensors() {
  Reading r = {};
  r.temperature  = shtOk ? sht31.readTemperature() : NAN;
  r.humidity     = shtOk ? sht31.readHumidity()    : NAN;
  r.co2PPM       = co2Ok ? mhz19.getCO2()          : NAN;
  r.ammoniaPPM   = (analogRead(NH3_ADC_PIN) / 4095.0) * NH3_PPM_MAX;
  r.lightIntensity = (HAS_LIGHT_SENSOR && lightOk) ? lightMeter.readLightLevel() : NAN;
  r.feed  = HAS_FEED_LEVEL  ? (analogRead(FEED_ADC_PIN)  / 4095.0) * 100.0 : NAN;
  r.water = HAS_WATER_LEVEL ? (analogRead(WATER_ADC_PIN) / 4095.0) * 100.0 : NAN;
  r.rssi = WiFi.RSSI();
  r.freeHeap = ESP.getFreeHeap();
  return r;
}

// Add only the present fields to a JSON object (skip NaN)
void readingToJson(const Reading& r, JsonObject o) {
  if (!isnan(r.temperature))    o["temperature"]      = round(r.temperature * 10) / 10.0;
  if (!isnan(r.humidity))       o["humidity"]         = round(r.humidity * 10) / 10.0;
  if (!isnan(r.ammoniaPPM))     o["ammoniaPPM"]       = round(r.ammoniaPPM * 10) / 10.0;
  if (!isnan(r.co2PPM))         o["co2PPM"]           = (int)r.co2PPM;
  if (!isnan(r.lightIntensity)) o["lightIntensity"]   = (int)r.lightIntensity;
  if (!isnan(r.feed))           o["feedLevelPercent"] = (int)r.feed;
  if (!isnan(r.water))          o["waterLevelPercent"]= (int)r.water;
  o["rssi"] = r.rssi;
  o["freeHeapBytes"] = r.freeHeap;
}

// POST a single reading. Returns true on HTTP 2xx.
bool postReading(const Reading& r) {
  WiFiClientSecure client; client.setInsecure(); // TODO: pin cert in production
  HTTPClient http;
  String url = String(SERVER_URL) + "/api/sensor-data";
  if (!http.begin(client, url)) return false;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", DEVICE_API_KEY);

  JsonDocument doc;
  readingToJson(r, doc.to<JsonObject>());
  String body; serializeJson(doc, body);

  int code = http.POST(body);
  if (code == 200) {
    // Parse piggybacked relay command (optional)
    JsonDocument res;
    if (!deserializeJson(res, http.getString()) && !res["pendingCommand"].isNull()) {
      const char* cmdId  = res["pendingCommand"]["commandId"];
      const char* relay  = res["pendingCommand"]["relay"];
      const char* action = res["pendingCommand"]["action"];
      Serial.printf("Pending command: id=%s relay=%s action=%s\n", cmdId ? cmdId : "?", relay ? relay : "?", action ? action : "?");
      // handleRelayCommand(relay, action, res["pendingCommand"]["value"]);
      // After executing, POST /api/device-control/ack with {"commandId": cmdId, "success": true}
      // — the commandId echo is required so a newer command can't be acked by mistake.
    }
  }
  http.end();
  Serial.printf("POST -> %d\n", code);
  return code >= 200 && code < 300;
}

// Flush buffered readings via /bulk (up to 100 at a time)
void flushBuffer() {
  if (bufCount == 0 || WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  String url = String(SERVER_URL) + "/api/sensor-data/bulk";
  if (!http.begin(client, url)) return;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", DEVICE_API_KEY);

  JsonDocument doc;
  JsonArray arr = doc["readings"].to<JsonArray>();
  int n = min(bufCount, 100);
  for (int i = 0; i < n; i++) readingToJson(buffer[i], arr.add<JsonObject>());
  String body; serializeJson(doc, body);

  int code = http.POST(body);
  http.end();
  if (code >= 200 && code < 300) {
    // Drop the flushed readings, keep the remainder
    for (int i = n; i < bufCount; i++) buffer[i - n] = buffer[i];
    bufCount -= n;
    Serial.printf("Flushed %d buffered readings\n", n);
  }
}

void bufferReading(const Reading& r) {
  if (bufCount < BUFFER_MAX) buffer[bufCount++] = r;
  else { // drop oldest
    for (int i = 1; i < BUFFER_MAX; i++) buffer[i - 1] = buffer[i];
    buffer[BUFFER_MAX - 1] = r;
  }
  Serial.printf("Buffered (offline). count=%d\n", bufCount);
}

void loop() {
  if (millis() - lastReport < REPORT_INTERVAL_MS) { delay(50); return; }
  lastReport = millis();

  connectWiFi();
  Reading r = readSensors();
  Serial.printf("T=%.1f H=%.1f NH3=%.1f CO2=%.0f\n", r.temperature, r.humidity, r.ammoniaPPM, r.co2PPM);

  if (WiFi.status() == WL_CONNECTED) {
    flushBuffer();              // send anything we missed first
    if (!postReading(r)) bufferReading(r);
  } else {
    bufferReading(r);           // offline: keep it for later
  }
}
