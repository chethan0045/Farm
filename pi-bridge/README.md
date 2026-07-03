# ABIS NL-X16 → KVS Farm bridge (Raspberry Pi)

Runs on the farm Raspberry Pi. The FJ2412 DTU connects to the Pi over the
**local network** (no public IP needed), the Pi polls the NL-X16 over Modbus
through the DTU, and uploads readings to the cloud API like an ESP32 device.

```
NL-X16 ──RS485── FJ2412 DTU ──TCP (LAN)── Raspberry Pi ──HTTPS── Render API
```

## 1. Register the device in the app

Devices page → **Add Device** → give it a device ID (e.g. `NLX16-H1`), assign
the house number, and copy the generated **API key**.

## 2. Install on the Pi

```bash
# Node 20 (Raspberry Pi OS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Copy this folder to the Pi
scp -r pi-bridge pi@<pi-ip>:/home/pi/abis-bridge
```

Edit `/home/pi/abis-bridge/config.json`:
- `apiUrl` — your Render app URL
- `apiKey` — the API key from step 1
- leave `discovery: true` for now

## 3. Point the DTU at the Pi

In the FJ2412 configuration:
- Work mode: **transparent TCP client**
- Server address: the **Pi's LAN IP** (give the Pi a static IP / DHCP reservation)
- Server port: `9000` (must match `listenPort`)
- Serial side: match the NL-X16 RS485 settings (115200 baud, 8N1)

## 4. Run in discovery mode

```bash
cd /home/pi/abis-bridge && node abis-bridge.js
```

When the DTU connects you'll see `reg[N] = value` lines every poll. Compare
them with the numbers on the ABIS screen (Av.T, RH, S.PRESS, CO2, NH3…) —
temperatures are usually value/10. Then fill `map` in `config.json`, e.g.:

```json
"map": [
  { "offset": 0, "scale": 0.1, "field": "temperature" },
  { "offset": 1, "scale": 0.1, "field": "targetTemperature" },
  { "offset": 2, "scale": 1,   "field": "humidity" },
  { "offset": 4, "scale": 1,   "field": "staticPressure" },
  { "offset": 5, "scale": 1,   "field": "co2PPM" },
  { "offset": 6, "scale": 1,   "field": "ammoniaPPM" },
  { "offset": 8, "scale": 0.1, "field": "outdoorTemp", "signed": true }
]
```

Set `discovery: false` and restart. Readings now appear on the dashboard,
and alerts/automation react to them like any other sensor.

Supported fields: `temperature`, `targetTemperature`, `humidity`,
`ammoniaPPM`, `co2PPM`, `lightIntensity`, `feedLevelPercent`,
`waterLevelPercent`, `staticPressure`, `outdoorTemp`, `airVolume`,
`ventLevel`, `airVelocity`.

## 5. Run at boot (systemd)

```bash
sudo cp abis-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now abis-bridge
journalctl -u abis-bridge -f     # follow logs
```

## Notes

- If no register-map slave ID is known, try `slaveId: 1`; if the controller
  doesn't answer, try other IDs (the NL-X16 screen shows its Modbus address).
- Uploads that fail (internet down) are buffered in memory (up to 500) and
  flushed through `/api/sensor-data/bulk` when the connection returns.
- The old in-backend listener (`DTU_LISTENER_PORT`) still exists but is not
  needed with this bridge — leave that env var unset on Render.
