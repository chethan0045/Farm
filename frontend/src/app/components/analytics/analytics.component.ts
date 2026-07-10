import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { TrendChartComponent } from '../shared/trend-chart.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TrendChartComponent],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p class="ctrl-eyebrow">ABIS Control · Insights</p>
          <h1 class="text-2xl ctrl-title">Analytics</h1>
          <p class="text-sm ctrl-sub">Sensor trends over time, per house</p>
        </div>
        <div class="flex flex-wrap gap-2 items-center">
          <select [(ngModel)]="selectedHouse" (ngModelChange)="loadHistory()" class="border rounded-lg px-3 py-2 text-sm">
            <option value="">Select house</option>
            <option *ngFor="let h of houses" [value]="h.houseNumber">House {{ h.houseNumber }}</option>
          </select>
          <select [(ngModel)]="resolution" (ngModelChange)="loadHistory()" class="border rounded-lg px-3 py-2 text-sm">
            <option value="raw">Raw</option>
            <option value="5min">5 min avg</option>
            <option value="hourly">Hourly avg</option>
            <option value="daily">Daily avg</option>
          </select>
          <button (click)="loadHistory()" class="ctrl-btn-ghost">↻ Refresh</button>
        </div>
      </div>

      <!-- No houses -->
      <div *ngIf="houses.length === 0" class="ctrl-card p-10 text-center">
        <div class="text-4xl mb-2">📈</div>
        <p class="text-gray-600 font-medium mb-1">No sensor data yet</p>
        <p class="text-gray-400 text-sm mb-3">Register a device and start sending readings to see trends</p>
        <a routerLink="/devices" class="text-blue-600 hover:underline text-sm">Register a device →</a>
      </div>

      <!-- No data for selected house -->
      <div *ngIf="houses.length > 0 && selectedHouse && history.length === 0" class="ctrl-card p-8 text-center">
        <p class="text-gray-500 text-sm">No readings for House {{ selectedHouse }} in this period.</p>
      </div>

      <!-- Charts -->
      <div *ngIf="selectedHouse && history.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <app-trend-chart [data]="series.temperature" label="Temperature" unit="°C" color="#fb923c" [dp]="1"></app-trend-chart>
        <app-trend-chart [data]="series.humidity" label="Humidity" unit="%" color="#38bdf8" [dp]="0"></app-trend-chart>
        <app-trend-chart [data]="series.ammoniaPPM" label="Ammonia" unit="ppm" color="#a3e635" [dp]="0"></app-trend-chart>
        <app-trend-chart [data]="series.co2PPM" label="CO₂" unit="ppm" color="#34d399" [dp]="0"></app-trend-chart>
        <app-trend-chart [data]="series.feedLevelPercent" label="Feed level" unit="%" color="#fbbf24" [dp]="0"></app-trend-chart>
        <app-trend-chart [data]="series.waterLevelPercent" label="Water level" unit="%" color="#22d3ee" [dp]="0"></app-trend-chart>
      </div>

      <p *ngIf="selectedHouse && history.length > 0" class="text-[11px] ctrl-sub text-center">
        {{ history.length }} points · auto-refresh {{ refreshInterval }}s
      </p>
    </div>
  `
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  houses: any[] = [];
  selectedHouse = '';
  resolution = 'hourly';
  refreshInterval = 30;
  history: any[] = [];
  series: any = { temperature: [], humidity: [], ammoniaPPM: [], co2PPM: [], feedLevelPercent: [], waterLevelPercent: [] };
  private timer: any;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadHouses();
    this.timer = setInterval(() => this.loadHistory(), this.refreshInterval * 1000);
  }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); }

  loadHouses() {
    this.api.getDeviceOverview().subscribe({
      next: (data) => {
        this.houses = data || [];
        if (!this.selectedHouse && this.houses.length) this.selectedHouse = this.houses[0].houseNumber;
        this.cdr.detectChanges();
        if (this.selectedHouse) this.loadHistory();
      }, error: () => {}
    });
  }

  loadHistory() {
    if (!this.selectedHouse) return;
    this.api.getSensorHistory(this.selectedHouse, { resolution: this.resolution }).subscribe({
      next: (data) => {
        this.history = data || [];
        const chrono = [...this.history].reverse(); // history is newest-first
        const fields = ['temperature', 'humidity', 'ammoniaPPM', 'co2PPM', 'feedLevelPercent', 'waterLevelPercent'];
        const next: any = {};
        for (const f of fields) next[f] = chrono.map(d => d[f]).filter((v: any) => v != null && !isNaN(v));
        this.series = next;
        this.cdr.detectChanges();
      }, error: () => {}
    });
  }
}
