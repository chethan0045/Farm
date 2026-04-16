import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-device-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Control Panel</h1>
          <p class="text-sm text-gray-500">Manual device control and relay management</p>
        </div>
        <select [(ngModel)]="selectedHouse" (change)="loadControlStatus()" class="border rounded-lg px-3 py-2 text-sm">
          <option value="">Select House</option>
          <option *ngFor="let house of houses" [value]="house">{{ house }}</option>
        </select>
      </div>

      <div *ngIf="!selectedHouse" class="bg-white rounded-xl shadow-sm border p-8 text-center">
        <p class="text-gray-500">Select a house to view and control devices</p>
      </div>

      <div *ngIf="selectedHouse" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div *ngFor="let control of controls" class="bg-white rounded-xl shadow-sm border p-4">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="font-bold text-gray-800">{{ control.device?.name || 'Device' }}</h3>
              <p class="text-xs text-gray-500">{{ control.device?.deviceId }}</p>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full"
              [class.bg-green-100]="control.device?.status === 'online'" [class.text-green-700]="control.device?.status === 'online'"
              [class.bg-red-100]="control.device?.status !== 'online'" [class.text-red-700]="control.device?.status !== 'online'">
              {{ control.device?.status }}
            </span>
          </div>

          <!-- Relay Controls -->
          <div class="space-y-3">
            <!-- Fan -->
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div class="flex items-center gap-2">
                <span>🌀</span>
                <span class="text-sm font-medium">Fan</span>
              </div>
              <div class="flex items-center gap-3">
                <input *ngIf="control.relays?.fan?.state" type="range" min="0" max="100"
                  [value]="control.relays?.fan?.speed || 0"
                  (change)="sendCommand(control.device?._id, 'fan', true, $any($event.target).value)"
                  class="w-20 h-1">
                <span *ngIf="control.relays?.fan?.state" class="text-xs text-gray-500 w-8">{{ control.relays?.fan?.speed || 0 }}%</span>
                <button (click)="sendCommand(control.device?._id, 'fan', !control.relays?.fan?.state)"
                  class="px-3 py-1 rounded-full text-xs font-medium transition"
                  [class.bg-green-500]="control.relays?.fan?.state" [class.text-white]="control.relays?.fan?.state"
                  [class.bg-gray-200]="!control.relays?.fan?.state">
                  {{ control.relays?.fan?.state ? 'ON' : 'OFF' }}
                </button>
              </div>
            </div>

            <!-- Light -->
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div class="flex items-center gap-2">
                <span>💡</span>
                <span class="text-sm font-medium">Light</span>
              </div>
              <div class="flex items-center gap-3">
                <input *ngIf="control.relays?.light?.state" type="range" min="0" max="100"
                  [value]="control.relays?.light?.brightness || 0"
                  (change)="sendCommand(control.device?._id, 'light', true, $any($event.target).value)"
                  class="w-20 h-1">
                <button (click)="sendCommand(control.device?._id, 'light', !control.relays?.light?.state)"
                  class="px-3 py-1 rounded-full text-xs font-medium transition"
                  [class.bg-green-500]="control.relays?.light?.state" [class.text-white]="control.relays?.light?.state"
                  [class.bg-gray-200]="!control.relays?.light?.state">
                  {{ control.relays?.light?.state ? 'ON' : 'OFF' }}
                </button>
              </div>
            </div>

            <!-- Heater -->
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div class="flex items-center gap-2">
                <span>🔥</span>
                <span class="text-sm font-medium">Heater</span>
              </div>
              <button (click)="sendCommand(control.device?._id, 'heater', !control.relays?.heater?.state)"
                class="px-3 py-1 rounded-full text-xs font-medium transition"
                [class.bg-green-500]="control.relays?.heater?.state" [class.text-white]="control.relays?.heater?.state"
                [class.bg-gray-200]="!control.relays?.heater?.state">
                {{ control.relays?.heater?.state ? 'ON' : 'OFF' }}
              </button>
            </div>

            <!-- Feeder -->
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div class="flex items-center gap-2">
                <span>🌾</span>
                <span class="text-sm font-medium">Feeder</span>
              </div>
              <button (click)="sendCommand(control.device?._id, 'feeder', !control.relays?.feeder?.state)"
                class="px-3 py-1 rounded-full text-xs font-medium transition"
                [class.bg-green-500]="control.relays?.feeder?.state" [class.text-white]="control.relays?.feeder?.state"
                [class.bg-gray-200]="!control.relays?.feeder?.state">
                {{ control.relays?.feeder?.state ? 'ON' : 'OFF' }}
              </button>
            </div>

            <!-- Water Pump -->
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div class="flex items-center gap-2">
                <span>💧</span>
                <span class="text-sm font-medium">Water Pump</span>
              </div>
              <button (click)="sendCommand(control.device?._id, 'waterPump', !control.relays?.waterPump?.state)"
                class="px-3 py-1 rounded-full text-xs font-medium transition"
                [class.bg-green-500]="control.relays?.waterPump?.state" [class.text-white]="control.relays?.waterPump?.state"
                [class.bg-gray-200]="!control.relays?.waterPump?.state">
                {{ control.relays?.waterPump?.state ? 'ON' : 'OFF' }}
              </button>
            </div>
          </div>

          <!-- Status -->
          <div class="mt-3 pt-2 border-t text-xs text-gray-400">
            <p>Last changed by: {{ control.lastChangedBy || 'N/A' }}</p>
            <p *ngIf="control.pendingCommand?.relay && !control.pendingCommand?.acknowledged" class="text-orange-500 font-medium mt-1">
              Pending: {{ control.pendingCommand.relay }} {{ control.pendingCommand.action ? 'ON' : 'OFF' }}
            </p>
          </div>
        </div>
      </div>

      <div *ngIf="selectedHouse && controls.length === 0" class="bg-white rounded-xl shadow-sm border p-8 text-center">
        <p class="text-gray-500">No control devices found for this house</p>
      </div>
    </div>
  `
})
export class DeviceControlComponent implements OnInit {
  houses: string[] = [];
  selectedHouse = '';
  controls: any[] = [];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.api.getDevices().subscribe({
      next: (devices) => {
        this.houses = [...new Set(devices.map((d: any) => d.houseNumber))];
        this.cdr.detectChanges();
      }
    });
  }

  loadControlStatus() {
    if (!this.selectedHouse) { this.controls = []; return; }
    this.api.getDeviceControlStatus(this.selectedHouse).subscribe({
      next: (data) => { this.controls = data; this.cdr.detectChanges(); },
      error: () => { this.controls = []; }
    });
  }

  sendCommand(deviceId: string, relay: string, action: boolean, value?: any) {
    this.api.sendDeviceCommand({
      deviceId,
      relay,
      action,
      value: value ? parseInt(value) : undefined
    }).subscribe({
      next: () => {
        setTimeout(() => this.loadControlStatus(), 500);
      }
    });
  }
}
