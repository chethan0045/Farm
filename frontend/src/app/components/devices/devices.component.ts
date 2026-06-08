import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p class="ctrl-eyebrow">ABIS Control · Control</p>
          <h1 class="text-2xl ctrl-title">Device Management</h1>
          <p class="text-sm ctrl-sub">Register and manage ESP32 IoT devices</p>
        </div>
        <button (click)="showForm = true; resetForm()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">
          + Register Device
        </button>
      </div>

      <!-- Registration Modal -->
      <div *ngIf="showForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
          <h2 class="text-lg font-bold mb-4">{{ editId ? 'Edit' : 'Register' }} Device</h2>
          <div class="space-y-3">
            <div>
              <label class="text-sm text-gray-600">Device ID *</label>
              <input [(ngModel)]="form.deviceId" placeholder="ESP32-HOUSE1-01" class="w-full border rounded-lg px-3 py-2 text-sm" [disabled]="!!editId">
            </div>
            <div>
              <label class="text-sm text-gray-600">Name *</label>
              <input [(ngModel)]="form.name" placeholder="House 1 Sensor" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-sm text-gray-600">House Number *</label>
              <input [(ngModel)]="form.houseNumber" placeholder="H1" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-sm text-gray-600">Device Type *</label>
              <select [(ngModel)]="form.deviceType" class="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="sensor">Sensor</option>
                <option value="controller">Controller</option>
                <option value="combo">Combo (Sensor + Controller)</option>
              </select>
            </div>
            <div>
              <label class="text-sm text-gray-600">Capabilities</label>
              <div class="grid grid-cols-2 gap-1 mt-1">
                <label *ngFor="let cap of allCapabilities" class="flex items-center gap-1 text-xs">
                  <input type="checkbox" [checked]="form.capabilities.includes(cap)" (change)="toggleCapability(cap)">
                  {{ cap }}
                </label>
              </div>
            </div>
            <div>
              <label class="text-sm text-gray-600">Firmware Version</label>
              <input [(ngModel)]="form.firmwareVersion" placeholder="1.0.0" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button (click)="showForm = false" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button (click)="saveDevice()" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
              {{ editId ? 'Update' : 'Register' }}
            </button>
          </div>
        </div>
      </div>

      <!-- API Key Display Modal -->
      <div *ngIf="newApiKey" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl w-full max-w-lg p-6">
          <h2 class="text-lg font-bold text-green-700 mb-2">Device Registered Successfully!</h2>
          <p class="text-sm text-red-600 font-medium mb-3">Save this API key now. It will NOT be shown again.</p>
          <div class="bg-gray-100 rounded-lg p-3 font-mono text-xs break-all">{{ newApiKey }}</div>
          <div class="flex justify-end gap-2 mt-4">
            <button (click)="copyApiKey()" class="px-4 py-2 border rounded-lg text-sm">Copy to Clipboard</button>
            <button (click)="newApiKey = ''" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">I've Saved It</button>
          </div>
        </div>
      </div>

      <!-- Devices List -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" *ngIf="devices.length > 0">
        <div *ngFor="let device of devices" class="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all">
          <!-- Status accent bar -->
          <div class="h-1.5" [ngClass]="deviceAccent(device)"></div>
          <div class="p-4">
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg" [ngClass]="deviceIconBg(device)">{{ deviceIcon(device) }}</div>
                <div>
                  <h3 class="font-bold text-gray-800 leading-tight">{{ device.name }}</h3>
                  <p class="text-[11px] text-gray-400 font-mono">{{ device.deviceId }}</p>
                </div>
              </div>
              <span class="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize" [ngClass]="deviceStatusPill(device)">
                <span class="w-1.5 h-1.5 rounded-full" [ngClass]="deviceDot(device)" [class.animate-pulse]="device.status === 'online'"></span>
                {{ device.status }}
              </span>
            </div>

            <!-- Meta chips -->
            <div class="flex flex-wrap gap-1.5 mb-3">
              <span class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px]">🏠 House {{ device.houseNumber }}</span>
              <span class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px] capitalize">🔌 {{ device.deviceType }}</span>
              <span *ngIf="device.firmwareVersion" class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px]">⚙️ v{{ device.firmwareVersion }}</span>
            </div>

            <!-- Last seen -->
            <p class="text-[11px] mb-3 flex items-center gap-1.5" [class.text-emerald-600]="device.status === 'online'" [class.text-gray-400]="device.status !== 'online'">
              <span>🕓</span> {{ device.lastSeen ? (lastSeen(device.lastSeen) + ' ago') : 'never connected' }}
            </p>

            <!-- Capability pills -->
            <div class="flex flex-wrap gap-1" *ngIf="device.capabilities?.length">
              <span *ngFor="let cap of device.capabilities" class="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                [ngClass]="cap.startsWith('relay_') ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'">
                {{ capIcon(cap) }} {{ capLabel(cap) }}
              </span>
            </div>

            <div class="flex gap-3 mt-3 pt-3 border-t border-gray-100 text-xs">
              <button (click)="editDevice(device)" class="text-blue-600 hover:underline font-medium">Edit</button>
              <button (click)="deleteDevice(device._id)" class="text-red-600 hover:underline font-medium">Deactivate</button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="devices.length === 0" class="bg-white rounded-2xl shadow-sm p-10 text-center">
        <div class="text-4xl mb-2">📡</div>
        <p class="text-gray-600 font-medium mb-1">No devices registered</p>
        <p class="text-gray-400 text-sm mb-4">Add your first ESP32 sensor to start monitoring</p>
        <button (click)="showForm = true; resetForm()" class="bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 font-medium">+ Register Device</button>
      </div>
    </div>
  `
})
export class DevicesComponent implements OnInit {
  devices: any[] = [];
  showForm = false;
  editId = '';
  newApiKey = '';
  form: any = {};
  allCapabilities = [
    'temperature', 'humidity', 'ammonia', 'co2', 'light', 'feedLevel', 'waterLevel',
    'relay_fan', 'relay_light', 'relay_heater', 'relay_feeder', 'relay_waterPump'
  ];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.loadDevices(); }

  loadDevices() {
    this.api.getDevices().subscribe({
      next: (data) => { this.devices = data; this.cdr.detectChanges(); }
    });
  }

  resetForm() {
    this.editId = '';
    this.form = { deviceId: '', name: '', houseNumber: '', deviceType: 'sensor', capabilities: [], firmwareVersion: '' };
  }

  toggleCapability(cap: string) {
    const idx = this.form.capabilities.indexOf(cap);
    if (idx >= 0) this.form.capabilities.splice(idx, 1);
    else this.form.capabilities.push(cap);
  }

  saveDevice() {
    if (this.editId) {
      this.api.updateDevice(this.editId, this.form).subscribe({
        next: () => { this.showForm = false; this.loadDevices(); }
      });
    } else {
      this.api.createDevice(this.form).subscribe({
        next: (res) => {
          this.newApiKey = res.apiKey;
          this.showForm = false;
          this.loadDevices();
          this.cdr.detectChanges();
        }
      });
    }
  }

  editDevice(device: any) {
    this.editId = device._id;
    this.form = { ...device };
    this.showForm = true;
  }

  deleteDevice(id: string) {
    if (confirm('Deactivate this device?')) {
      this.api.deleteDevice(id).subscribe({ next: () => this.loadDevices() });
    }
  }

  copyApiKey() {
    navigator.clipboard.writeText(this.newApiKey);
  }

  // --- Card UI helpers ---
  deviceAccent(d: any): string {
    return d.status === 'online' ? 'bg-emerald-500' : d.status === 'maintenance' ? 'bg-yellow-400' : 'bg-gray-300';
  }
  deviceStatusPill(d: any): string {
    return d.status === 'online' ? 'bg-emerald-100 text-emerald-700'
      : d.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700'
      : 'bg-gray-100 text-gray-500';
  }
  deviceDot(d: any): string {
    return d.status === 'online' ? 'bg-emerald-500' : d.status === 'maintenance' ? 'bg-yellow-500' : 'bg-gray-400';
  }
  deviceIcon(d: any): string {
    return d.deviceType === 'controller' ? '🎛️' : d.deviceType === 'combo' ? '🛰️' : '📡';
  }
  deviceIconBg(d: any): string {
    return d.status === 'online' ? 'bg-emerald-100' : 'bg-gray-100';
  }
  capLabel(cap: string): string { return cap.replace('relay_', ''); }
  capIcon(cap: string): string {
    const map: any = {
      temperature: '🌡️', humidity: '💧', ammonia: '🫧', co2: '🟢', light: '💡',
      feedLevel: '🌾', waterLevel: '🚰', relay_fan: '🌀', relay_light: '💡',
      relay_heater: '🔥', relay_feeder: '🍽️', relay_waterPump: '🚰'
    };
    return map[cap] || '•';
  }
  lastSeen(date: string): string {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60); if (m < 60) return m + 'm';
    const h = Math.floor(m / 60); if (h < 24) return h + 'h';
    return Math.floor(h / 24) + 'd';
  }
}
