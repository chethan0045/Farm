#!/usr/bin/env python3
"""
NL-X16 Modbus register scanner.
Run this on a Windows/Linux laptop once you have a USB-RS485 (CH340) adapter wired
to the controller's RS485 A/B lines (you can leave the FJ2412 DTU connected too).

It auto-discovers the working baud rate + slave ID, then dumps the first registers
so we can map which one is temperature / humidity / NH3 / CO2, etc.

Setup:
    pip install pymodbus pyserial
Find your COM port: Windows Device Manager -> Ports (COM & LPT), e.g. COM3
Run:
    python scan_nlx16.py COM3
"""
import sys
from pymodbus.client import ModbusSerialClient

PORT = sys.argv[1] if len(sys.argv) > 1 else "COM3"

# NL-X16 screen showed Baud 115200, Address 0. We try 115200 first, then common
# fallbacks; slave IDs 1..3 first (0 is broadcast and usually not readable).
BAUDS = [115200, 9600, 19200, 38400, 57600]
SLAVE_IDS = [1, 2, 3, 0, 4, 5]
COUNT = 30  # how many registers to dump


def try_read(client, slave):
    """Return ('holding'|'input', [regs]) on first successful read, else None."""
    rr = client.read_holding_registers(address=0, count=COUNT, slave=slave)
    if not rr.isError():
        return ("holding", rr.registers)
    ri = client.read_input_registers(address=0, count=COUNT, slave=slave)
    if not ri.isError():
        return ("input", ri.registers)
    return None


def main():
    print(f"Scanning {PORT} ...")
    for baud in BAUDS:
        client = ModbusSerialClient(port=PORT, baudrate=baud, parity="N",
                                    stopbits=1, bytesize=8, timeout=1)
        if not client.connect():
            print(f"  baud {baud}: cannot open port")
            continue
        for slave in SLAVE_IDS:
            res = try_read(client, slave)
            if res:
                kind, regs = res
                print(f"\n  FOUND  baud={baud}  slave={slave}  ({kind} registers)\n")
                for i, v in enumerate(regs):
                    # raw, plus common /10 scaling guess to spot temp/humidity
                    print(f"    reg[{i:>2}] = {v:>6}   (/10 = {v/10:.1f})")
                print("\nSend this table back so we can map registers to sensors.")
                client.close()
                return
        client.close()
        print(f"  baud {baud}: no response from slave IDs {SLAVE_IDS}")

    print("\nNo Modbus response found. Check A/B wiring (try swapping A<->B), "
          "ground, and that the adapter shares ground with the controller.")


if __name__ == "__main__":
    main()
