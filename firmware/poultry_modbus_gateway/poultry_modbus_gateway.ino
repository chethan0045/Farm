/*
 * Smart Poultry Farm - ESP32 Modbus Gateway (for ABIS NL-X16 Climate Controller)
 * ------------------------------------------------------------------------------
 * Reads sensor values that the ABIS NL-X16 already measures (temp, humidity,
 * ammonia, CO2, ...) over RS485/Modbus RTU, and forwards them to the backend
 * at POST /api/sensor-data. No extra sensors needed.
 *
 *   ABIS NL-X16 --RS485--> [MAX485] --UART--> ESP32 --WiFi--> 4G router --> backend
 *
 *  >>> YOU MUST FILL IN THE REGISTER MAP BELOW from the controller's Modbus /
 *  >>> RS485 protocol document (get it from your ABIS dealer). The addresses,
 *  >>> scaling, slave ID, and baud rate are vendor-specific GUESSES until then.
 *
 * Wiring (ESP32 <-> MAX485 module):
 *   ESP32 GPIO16 (RX2) <- RO   |  ESP32 GPIO17 (TX2) -> DI
 *   ESP32 GPIO4        -> DE+RE (tie together for direction control)
 *   MAX485 A/B  <-> controller RS485 A(+)/B(-)   |  GND common  |  5V to MAX485 VCC
 *
 * Libraries: ModbusMaster (by Doc Walker), ArduinoJson
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ModbusMaster.h>

// ======================= CONFIG =======================
const char* WIFI_SSID      = "FARM_4G_ROUTER";
const char* WIFI_PASS      = "changeme";
const char* SERVER_URL     = "https://your-app.onrender.com";
const char* DEVICE_API_KEY = "PASTE_THE_64_CHAR_KEY_FROM_THE_APP";
const unsigned long REPORT_INTERVAL_MS = 30000;

// --- RS485 / Modbus link settings (NL-X16 screen showed: Baud 115200, Address 0) ---
// NOTE: Modbus address 0 = broadcast (write-only). The controller's real slave ID is
// almost certainly 1 — verify with a bus scan. The FJ2412 4G DTU also sits on this bus.
const uint8_t  MODBUS_SLAVE_ID = 1;
const uint32_t MODBUS_BAUD      = 115200;   // confirmed from controller screen
const int RS485_RX = 16, RS485_TX = 17, RS485_DE_RE = 4;

/* ============================================================================
 *  REGISTER MAP  ---  *** FILL THESE IN FROM THE ABIS NL-X16 PROTOCOL DOC ***
 *  Each entry: { holding-register address, scale, jsonKey }
 *  value sent = rawRegister * scale   (e.g. temp stored as 258 => 0.1 => 25.8)
 *  Set address to 0xFFFF to skip a field. Many controllers use INPUT registers
 *  (readInputRegisters) instead of HOLDING - switch the call below if so.
 * ==========================================================================*/
struct Reg { uint16_t addr; float scale; const char* key; };
Reg REGISTERS[] = {
  { 0x0000, 0.1f, "temperature"      },   // TODO confirm addr & scale
  { 0x0001, 0.1f, "humidity"         },   // TODO
  { 0x0002, 1.0f, "ammoniaPPM"       },   // TODO
  { 0x0003, 1.0f, "co2PPM"           },   // TODO
  // { 0x0004, 1.0f, "lightIntensity" },
  // { 0x0005, 1.0f, "waterLevelPercent" },
};
const int REG_COUNT = sizeof(REGISTERS) / sizeof(REGISTERS[0]);
// ======================================================

ModbusMaster node;
HardwareSerial rs485(2);

void preTx()  { digitalWrite(RS485_DE_RE, HIGH); }
void postTx() { digitalWrite(RS485_DE_RE, LOW);  }

// Offline buffer (RAM)
const int BUFFER_MAX = 200;
String buffer[BUFFER_MAX];
int bufCount = 0;
unsigned long lastReport = 0;

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) delay(500);
}

void setup() {
  Serial.begin(115200);
  pinMode(RS485_DE_RE, OUTPUT); digitalWrite(RS485_DE_RE, LOW);
  rs485.begin(MODBUS_BAUD, SERIAL_8N1, RS485_RX, RS485_TX);
  node.begin(MODBUS_SLAVE_ID, rs485);
  node.preTransmission(preTx);
  node.postTransmission(postTx);
  connectWiFi();
}

// Poll all configured registers into a JSON string. Returns "" on total failure.
String readControllerJson() {
  JsonDocument doc;
  bool any = false;
  for (int i = 0; i < REG_COUNT; i++) {
    if (REGISTERS[i].addr == 0xFFFF) continue;
    uint8_t rc = node.readHoldingRegisters(REGISTERS[i].addr, 1); // switch to readInputRegisters if needed
    if (rc == node.ku8MBSuccess) {
      uint16_t raw = node.getResponseBuffer(0);
      doc[REGISTERS[i].key] = (double)raw * REGISTERS[i].scale;
      any = true;
    } else {
      Serial.printf("Modbus read failed @0x%04X rc=%d\n", REGISTERS[i].addr, rc);
    }
    delay(20);
  }
  if (!any) return "";
  doc["rssi"] = WiFi.RSSI();
  doc["freeHeapBytes"] = ESP.getFreeHeap();
  String out; serializeJson(doc, out);
  return out;
}

bool postJson(const String& path, const String& body) {
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClientSecure client; client.setInsecure(); // TODO pin cert in production
  HTTPClient http;
  if (!http.begin(client, String(SERVER_URL) + path)) return false;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", DEVICE_API_KEY);
  int code = http.POST(body);
  http.end();
  Serial.printf("POST %s -> %d\n", path.c_str(), code);
  return code >= 200 && code < 300;
}

void flushBuffer() {
  while (bufCount > 0 && WiFi.status() == WL_CONNECTED) {
    if (postJson("/api/sensor-data", buffer[0])) {
      for (int i = 1; i < bufCount; i++) buffer[i - 1] = buffer[i];
      bufCount--;
    } else break;
  }
}

void bufferJson(const String& json) {
  if (bufCount < BUFFER_MAX) buffer[bufCount++] = json;
  else { for (int i = 1; i < BUFFER_MAX; i++) buffer[i-1] = buffer[i]; buffer[BUFFER_MAX-1] = json; }
}

void loop() {
  if (millis() - lastReport < REPORT_INTERVAL_MS) { delay(50); return; }
  lastReport = millis();

  connectWiFi();
  String json = readControllerJson();
  if (json == "") { Serial.println("No data read from controller"); return; }
  Serial.println(json);

  if (WiFi.status() == WL_CONNECTED) {
    flushBuffer();
    if (!postJson("/api/sensor-data", json)) bufferJson(json);
  } else {
    bufferJson(json);
  }
}
