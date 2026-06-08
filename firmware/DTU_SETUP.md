# Connect the NL-X16 via the FJ2412 DTU → our backend

The FJ2412 4G DTU already streams the controller's Modbus data over cellular. We
point it at **our own TCP listener** (`backend/src/services/dtuListener.js`) instead
of (or alongside) the vendor cloud, decode the Modbus frames, and save them — so
the live values land on the dashboard ABIS screen.

```
NL-X16 --RS485--> FJ2412 DTU --4G/TCP--> [our TCP listener] --> Mongo --> dashboard
                                          (public IP : port)
```

## 1. Where the listener runs
The listener is a **raw TCP server**, which **cannot** run on Render's web service
(HTTP-only). Run it where the DTU can reach it on a fixed IP + open port:
- a small **VPS** (DigitalOcean/EC2/Lightsail, ~₹400/mo) running the backend, **or**
- your own machine/router with a **static IP or DDNS + port-forward**.

It uses the same `MONGODB_URI`, so the Render-hosted app and dashboard see the data.

## 2. Configure & run
Set env vars (`.env`) then start the backend:
```
DTU_LISTENER_PORT=6000        # the TCP port the DTU will dial
DTU_DEVICE_ID=NLX16-H1        # must match a device registered in the app
DTU_SLAVE_ID=1               # NL-X16 Modbus address (screen showed 0 = broadcast; real is usually 1)
DTU_FUNCTION=3               # 3 = holding registers, 4 = input registers
DTU_BLOCK_START=0            # first register to read
DTU_BLOCK_COUNT=40           # how many to read each cycle
DTU_POLL_SECONDS=30
DTU_DISCOVERY=true           # log every register so we can map them
```
Register the device first in the app → **Devices** (Device ID = `NLX16-H1`, set the House).

## 3. Point the DTU at us
Using the **FJ2412 config tool** (needs the DTU config software/password from the
supplier), set:
- **Work mode:** transparent / TCP client
- **Server IP / domain:** your VPS public IP (or DDNS)
- **Server port:** `6000` (match `DTU_LISTENER_PORT`)
- Keep the existing APN (`airtelgprs.com`).

## 4. Discover the register map (no manual needed)
With `DTU_DISCOVERY=true`, the backend logs lines like:
```
[DTU] reg[0] = 267  (/10=26.7)   ← matches Av.T 26.7 on the controller
[DTU] reg[2] = 71               ← matches indoor RH 71
[DTU] reg[6] = 71               ← matches NH3 71
```
Match the logged numbers to the values on the controller screen, then fill
`backend/src/config/dtuConfig.js` → `map`:
```js
{ offset: 0, scale: 0.1, field: 'temperature' },
{ offset: 2, scale: 1,   field: 'humidity' },
{ offset: 6, scale: 1,   field: 'ammoniaPPM' },
...
```
Set `DTU_DISCOVERY=false`, restart — readings now save and the dashboard ABIS
screen fills with live values (Av.T, RH, CO2, NH3, S.PRESS, air volume, vent level…).

## What I (Claude) wire once you send details
- the exact `map` (addresses + scaling) — from the register table **or** your discovery logs
- confirmed slave ID / function / baud
- field mapping to the backend (already supports temperature, targetTemperature,
  humidity, ammoniaPPM, co2PPM, airVelocity, airVolume, staticPressure, outdoorTemp, ventLevel)
Just paste the ABIS register table or the `[DTU] reg[..]` discovery log and I'll finish the map.
