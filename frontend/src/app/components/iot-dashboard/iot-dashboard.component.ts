import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-iot-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">IoT Dashboard</h1>
          <p class="text-sm text-gray-500">Real-time sensor monitoring across all houses</p>
        </div>
        <div class="flex gap-2">
          <span class="text-xs text-gray-400">Auto-refresh: {{ refreshInterval }}s</span>
          <button (click)="loadData()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">Refresh</button>
        </div>
      </div>

      <!-- House Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div *ngFor="let house of houseOverview"
          class="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition cursor-pointer"
          (click)="selectedHouse = house.houseNumber; loadHistory()">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="font-bold text-gray-800">House {{ house.houseNumber }}</h3>
              <p class="text-xs text-gray-500">{{ house.onlineCount }}/{{ house.totalCount }} devices online</p>
            </div>
            <span class="w-3 h-3 rounded-full" [class.bg-green-500]="house.onlineCount > 0" [class.bg-red-500]="house.onlineCount === 0"></span>
          </div>

          <div *ngIf="house.latestReading" class="grid grid-cols-3 gap-2 text-center">
            <div class="bg-orange-50 rounded-lg p-2">
              <p class="text-lg font-bold" [class.text-red-600]="house.latestReading.temperature > 35" [class.text-orange-600]="house.latestReading.temperature > 30 && house.latestReading.temperature <= 35" [class.text-green-600]="house.latestReading.temperature <= 30">
                {{ house.latestReading.temperature?.toFixed(1) || '--' }}
              </p>
              <p class="text-[10px] text-gray-500">Temp °C</p>
            </div>
            <div class="bg-blue-50 rounded-lg p-2">
              <p class="text-lg font-bold" [class.text-red-600]="house.latestReading.humidity > 80" [class.text-green-600]="house.latestReading.humidity <= 80">
                {{ house.latestReading.humidity?.toFixed(0) || '--' }}
              </p>
              <p class="text-[10px] text-gray-500">Humidity %</p>
            </div>
            <div class="bg-yellow-50 rounded-lg p-2">
              <p class="text-lg font-bold" [class.text-red-600]="house.latestReading.ammoniaPPM > 25" [class.text-green-600]="house.latestReading.ammoniaPPM <= 25">
                {{ house.latestReading.ammoniaPPM?.toFixed(0) || '--' }}
              </p>
              <p class="text-[10px] text-gray-500">NH3 ppm</p>
            </div>
          </div>

          <div *ngIf="house.latestReading" class="mt-2 grid grid-cols-2 gap-2">
            <div class="flex items-center gap-1">
              <div class="flex-1 bg-gray-200 rounded-full h-2">
                <div class="bg-amber-500 h-2 rounded-full" [style.width.%]="house.latestReading.feedLevelPercent || 0"></div>
              </div>
              <span class="text-[10px] text-gray-500">Feed {{ house.latestReading.feedLevelPercent?.toFixed(0) || 0 }}%</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="flex-1 bg-gray-200 rounded-full h-2">
                <div class="bg-blue-500 h-2 rounded-full" [style.width.%]="house.latestReading.waterLevelPercent || 0"></div>
              </div>
              <span class="text-[10px] text-gray-500">Water {{ house.latestReading.waterLevelPercent?.toFixed(0) || 0 }}%</span>
            </div>
          </div>

          <div *ngIf="!house.latestReading" class="text-center py-4 text-gray-400 text-sm">No sensor data yet</div>

          <p *ngIf="house.latestReading" class="text-[10px] text-gray-400 mt-2">
            Updated: {{ house.latestReading.timestamp | date:'short' }}
          </p>
        </div>
      </div>

      <div *ngIf="houseOverview.length === 0" class="bg-white rounded-xl shadow-sm border p-8 text-center">
        <p class="text-gray-500 mb-2">No devices registered yet</p>
        <a routerLink="/devices" class="text-emerald-600 hover:underline text-sm">Register your first device</a>
      </div>

      <!-- Selected House History -->
      <div *ngIf="selectedHouse && historyData.length > 0" class="bg-white rounded-xl shadow-sm border p-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="font-bold text-gray-800">House {{ selectedHouse }} - 24h History</h2>
          <select [(ngModel)]="historyResolution" (change)="loadHistory()" class="border rounded px-2 py-1 text-sm">
            <option value="raw">Raw</option>
            <option value="5min">5 min avg</option>
            <option value="hourly">Hourly avg</option>
          </select>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50">
                <th class="text-left p-2">Time</th>
                <th class="text-right p-2">Temp °C</th>
                <th class="text-right p-2">Humidity %</th>
                <th class="text-right p-2">NH3 ppm</th>
                <th class="text-right p-2">CO2 ppm</th>
                <th class="text-right p-2">Feed %</th>
                <th class="text-right p-2">Water %</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of historyData.slice(0, 50)" class="border-t hover:bg-gray-50">
                <td class="p-2">{{ row.timestamp | date:'short' }}</td>
                <td class="p-2 text-right" [class.text-red-600]="row.temperature > 35">{{ row.temperature?.toFixed(1) ?? '--' }}</td>
                <td class="p-2 text-right">{{ row.humidity?.toFixed(0) ?? '--' }}</td>
                <td class="p-2 text-right" [class.text-red-600]="row.ammoniaPPM > 25">{{ row.ammoniaPPM?.toFixed(0) ?? '--' }}</td>
                <td class="p-2 text-right">{{ row.co2PPM?.toFixed(0) ?? '--' }}</td>
                <td class="p-2 text-right">{{ row.feedLevelPercent?.toFixed(0) ?? '--' }}</td>
                <td class="p-2 text-right">{{ row.waterLevelPercent?.toFixed(0) ?? '--' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Sensor Alerts -->
      <div class="bg-white rounded-xl shadow-sm border p-4">
        <h2 class="font-bold text-gray-800 mb-3">Recent Sensor Alerts</h2>
        <div *ngIf="sensorAlerts.length === 0" class="text-gray-400 text-sm text-center py-4">No recent alerts</div>
        <div *ngFor="let alert of sensorAlerts" class="flex items-start gap-3 p-3 border-b last:border-0">
          <span class="w-2 h-2 rounded-full mt-2 shrink-0"
            [class.bg-blue-500]="alert.severity === 'info'"
            [class.bg-yellow-500]="alert.severity === 'warning'"
            [class.bg-red-500]="alert.severity === 'danger'"
            [class.bg-red-700]="alert.severity === 'critical'"></span>
          <div class="flex-1">
            <p class="text-sm font-medium">{{ alert.title }}</p>
            <p class="text-xs text-gray-500">{{ alert.message }}</p>
            <p class="text-[10px] text-gray-400 mt-1">{{ alert.createdAt | date:'short' }}</p>
          </div>
          <button *ngIf="!alert.isResolved" (click)="resolveAlert(alert._id)" class="text-xs text-emerald-600 hover:underline">Resolve</button>
        </div>
      </div>
    </div>
  `
})
export class IotDashboardComponent implements OnInit, OnDestroy {
  houseOverview: any[] = [];
  sensorAlerts: any[] = [];
  historyData: any[] = [];
  selectedHouse = '';
  historyResolution = 'hourly';
  refreshInterval = 30;
  private timer: any;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadData();
    this.timer = setInterval(() => this.loadData(), this.refreshInterval * 1000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  loadData() {
    this.api.getDeviceOverview().subscribe({
      next: (data) => { this.houseOverview = data; this.cdr.detectChanges(); },
      error: () => {}
    });
    this.api.getSensorAlerts({ isResolved: 'false', limit: '10' }).subscribe({
      next: (data) => { this.sensorAlerts = data; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  loadHistory() {
    if (!this.selectedHouse) return;
    this.api.getSensorHistory(this.selectedHouse, { resolution: this.historyResolution }).subscribe({
      next: (data) => { this.historyData = data; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  resolveAlert(id: string) {
    this.api.resolveSensorAlert(id).subscribe({ next: () => this.loadData() });
  }
}
