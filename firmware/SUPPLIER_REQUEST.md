# Supplier request — NL-X16 / FJ2412 integration

Send this to your ABIS / IB Group dealer or installer. It asks for everything
needed to connect the controller to your own web app.

---

**Subject:** NL-X16 Modbus register map + FJ2412 DTU configuration

Hello,

I want to read live data from my poultry climate controller into my own software.
Please provide the following for my unit:

- **Controller:** ABIS / IB Group NL-X16  (Controller ID: `IBBC16-0896`)
- **DTU:** FJ2412 4G LTE  (Device SN: `00100224110600173398`)

1. **NL-X16 Modbus / RS485 register map** (the table showing which register holds
   temperature, humidity, NH3, CO2, fan %, alarms, etc., with data type & scaling).
2. **RS485 communication settings**: confirmed baud rate, parity, stop bits, and the
   controller's **Modbus slave ID** (the screen shows Address 0 — please confirm the
   actual slave ID).
3. **FJ2412 DTU configuration**: the server **IP/domain + port + protocol (TCP/UDP)**
   it currently sends data to, plus the **DTU configuration software** and password.
4. **Remote monitoring** details: is there a **mobile app / web portal / cloud platform**
   for this controller, and is there an **API** to pull my data from it?

Thank you.

---

## If they give you the register map
Send it to me and I'll fill in `firmware/poultry_modbus_gateway/` (the `REGISTERS[]`
table) and/or the Python service so your web app reads live data.

## If they give you the DTU server/config
We can either point the DTU at a small TCP listener on your backend (zero extra
hardware), or read its cloud API — tell me which they provide.
