# Poultry Farm – ESP32 Sensor Node

Connects real sensors in each poultry house to the Smart Poultry Farm app.
One ESP32 node **per house** reads the environment and pushes readings to the
backend (`POST /api/sensor-data`). The node is **independent of the existing
3-phase contactor control panel** — it has its own low-voltage power and
enclosure. Do **not** wire it into motor/contactor circuits.

```
[Sensors] → [ESP32 node] → WiFi → [4G LTE router] → Internet → [Backend /api/sensor-data] → App
                 (one box per house, own 5V supply)
```

---

## 1. Bill of materials (per house)

| Part | Recommended | Notes |
|------|-------------|-------|
| Controller | **ESP32 DevKit v1** | WiFi built in |
| Temp + Humidity | **SHT31** (I2C) | Accurate, robust in humid/dusty air (better than DHT22) |
| CO₂ | **MH-Z19B** (NDIR, UART) | True CO₂, self-calibrating |
| Ammonia (NH₃) | **Electrochemical** (Winsen ZE03-NH3 / DGS-NH3) preferred; MQ-137 budget | Electrochemical = far more accurate & stable |
| Light (optional) | **BH1750** (I2C) | Lux |
| Feed/Water level (optional) | Ultrasonic or float → 0–100% | Map to `feedLevelPercent` / `waterLevelPercent` |
| Power | **230V→5V SMPS** (e.g. Hi-Link HLK-5M05) | Separate from the contactor panel |
| Enclosure | IP54+ box | Dust/moisture protection |

**Connectivity (you have no reliable internet):** add a **4G LTE WiFi router with a
data SIM** at the farm — simplest option. One router can cover nearby houses; use one
per house if they're far apart. (Alternative: a SIM7600/A7670 4G module per node, more
wiring/firmware — only if WiFi coverage is impossible.) The firmware **buffers readings
offline and flushes them** when the link returns, so brief drops are fine.

---

## 2. Wiring (ESP32 DevKit v1)

| Sensor | Signal | ESP32 pin |
|--------|--------|-----------|
| SHT31 / BH1750 | SDA | GPIO21 |
| SHT31 / BH1750 | SCL | GPIO22 |
| MH-Z19B | TX→ESP RX | GPIO16 |
| MH-Z19B | RX←ESP TX | GPIO17 |
| MQ-137 NH₃ | AOUT | GPIO34 (ADC) |
| Feed level (opt) | analog | GPIO35 |
| Water level (opt) | analog | GPIO32 |
| All | VCC / GND | 3V3 or 5V per sensor / GND |

> ADC pins 34/35/32 are input-only — correct for analog sensors. MH-Z19B needs 5V.

---

## 3. Register the device in the app (get the API key)

1. Open the app → **Devices** → **+ Register Device**.
2. Set **House Number** to match the house (e.g. `H1`) — the backend tags every
   reading with this house automatically.
3. Pick capabilities (temperature, humidity, ammonia, co2, …).
4. Save → **copy the 64-char API key shown once**. Paste it into the firmware.

---

## 4. Flash the firmware

1. Arduino IDE → install **ESP32 boards** (Boards Manager).
2. Library Manager → install: **Adafruit SHT31**, **MH-Z19**, **BH1750**, **ArduinoJson**.
3. Open `poultry_sensor_node/poultry_sensor_node.ino`, edit the **CONFIG** block:
   - `WIFI_SSID` / `WIFI_PASS` → your 4G router
   - `SERVER_URL` → your deployed URL (e.g. `https://your-app.onrender.com`) or LAN `http://<pc-ip>:5000`
   - `DEVICE_API_KEY` → the key from step 3
   - Toggle `HAS_LIGHT_SENSOR` / `HAS_FEED_LEVEL` / `HAS_WATER_LEVEL` to match what you fit.
4. Select board **ESP32 Dev Module**, the right COM port, **Upload**.
5. Open Serial Monitor @115200 → you should see `POST -> 200`.
6. In the app, **IoT Dashboard** / device status should show the house going **online** with live values.

---

## 5. Notes & next steps

- **NH₃ accuracy:** MQ-137 is a rough estimate; calibrate it or use an electrochemical
  sensor for real ppm. Adjust `NH3_PPM_MAX` / the curve in the sketch.
- **Offline buffer** is in RAM (cleared on reboot). For power-cut resilience, upgrade
  to a LittleFS-backed queue (see the comment in the sketch).
- **TLS:** the sketch uses `setInsecure()` for simplicity. For production, pin the
  server certificate.
- **Relay control (phase 2):** the POST response already returns `pendingCommand`
  (relay/action/value). To let the app switch fans/foggers, drive opto-isolated relays
  from spare GPIOs and act on that command — but interfacing to the existing contactor
  panel must be done by a qualified electrician using isolated control voltages.
