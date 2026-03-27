import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Smart Alerts</h2>
          <p class="text-sm text-gray-500 mt-1">KVS Poultry Farms - Automated Issue Detection</p>
        </div>
        <div class="flex gap-2">
          <button
            (click)="generateAlerts()"
            [disabled]="generating"
            class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors">
            <span *ngIf="!generating">Generate Alerts</span>
            <span *ngIf="generating">Generating...</span>
          </button>
          <button
            (click)="markAllRead()"
            [disabled]="unreadCount === 0"
            class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors">
            Mark All Read
          </button>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-emerald-500">
          <p class="text-[10px] text-gray-500 uppercase tracking-wide">Total Alerts</p>
          <p class="text-2xl font-bold text-gray-800 mt-1">{{ alerts.length }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
          <p class="text-[10px] text-gray-500 uppercase tracking-wide">Unread</p>
          <p class="text-2xl font-bold text-blue-600 mt-1">{{ unreadCount }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
          <p class="text-[10px] text-gray-500 uppercase tracking-wide">Critical</p>
          <p class="text-2xl font-bold text-red-600 mt-1">{{ criticalCount }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
          <p class="text-[10px] text-gray-500 uppercase tracking-wide">Warnings</p>
          <p class="text-2xl font-bold text-yellow-600 mt-1">{{ warningCount }}</p>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div class="flex flex-wrap gap-2">
          <button
            *ngFor="let f of filterOptions"
            (click)="selectedFilter = f.value; applyFilter()"
            [class]="selectedFilter === f.value
              ? 'px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white'
              : 'px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200'"
            class="transition-colors">
            {{ f.label }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="text-center py-10 text-gray-500">Loading alerts...</div>

      <!-- Empty State -->
      <div *ngIf="!loading && filteredAlerts.length === 0" class="bg-white rounded-xl shadow-sm p-10 text-center">
        <p class="text-4xl mb-3">🔔</p>
        <p class="text-gray-500 text-lg">No alerts found</p>
        <p class="text-gray-400 text-sm mt-1">Click "Generate Alerts" to scan for issues</p>
      </div>

      <!-- Unread Alerts -->
      <div *ngIf="!loading && unreadAlerts.length > 0" class="mb-6">
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Unread ({{ unreadAlerts.length }})</h3>
        <div class="space-y-3">
          <div
            *ngFor="let alert of unreadAlerts"
            [class]="getCardClass(alert)"
            class="rounded-xl shadow-sm p-4 border-l-4 transition-all">

            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <span class="text-2xl flex-shrink-0">{{ getTypeIcon(alert.type) }}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h4 class="font-semibold text-gray-800">{{ alert.title }}</h4>
                    <span [class]="getSeverityBadgeClass(alert.severity)" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                      {{ alert.severity }}
                    </span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 uppercase">
                      {{ alert.type }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">{{ alert.message }}</p>
                  <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span *ngIf="alert.batchName">Batch: <strong class="text-gray-600">{{ alert.batchName }}</strong></span>
                    <span>{{ alert.createdAt | date:'medium' }}</span>
                  </div>
                </div>
              </div>
              <div class="flex gap-1 flex-shrink-0">
                <button
                  (click)="markRead(alert)"
                  class="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                  Mark Read
                </button>
                <button
                  (click)="resolve(alert)"
                  *ngIf="!alert.resolved"
                  class="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                  Resolve
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Read Alerts -->
      <div *ngIf="!loading && readAlerts.length > 0">
        <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Read ({{ readAlerts.length }})</h3>
        <div class="space-y-3">
          <div
            *ngFor="let alert of readAlerts"
            class="bg-gray-50 rounded-xl shadow-sm p-4 border-l-4 border-gray-300 opacity-70 transition-all">

            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <span class="text-2xl flex-shrink-0">{{ getTypeIcon(alert.type) }}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h4 class="font-semibold text-gray-600">{{ alert.title }}</h4>
                    <span [class]="getSeverityBadgeClass(alert.severity)" class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase opacity-60">
                      {{ alert.severity }}
                    </span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 uppercase">
                      {{ alert.type }}
                    </span>
                    <span *ngIf="alert.resolved" class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-600 uppercase">
                      Resolved
                    </span>
                  </div>
                  <p class="text-sm text-gray-500 mt-1">{{ alert.message }}</p>
                  <div class="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span *ngIf="alert.batchName">Batch: <strong class="text-gray-500">{{ alert.batchName }}</strong></span>
                    <span>{{ alert.createdAt | date:'medium' }}</span>
                  </div>
                </div>
              </div>
              <div class="flex gap-1 flex-shrink-0">
                <button
                  (click)="resolve(alert)"
                  *ngIf="!alert.resolved"
                  class="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                  Resolve
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes pulse-red {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .animate-pulse-red {
      animation: pulse-red 1.5s ease-in-out infinite;
    }
  `]
})
export class AlertsComponent implements OnInit {
  alerts: any[] = [];
  filteredAlerts: any[] = [];
  unreadAlerts: any[] = [];
  readAlerts: any[] = [];
  loading = true;
  generating = false;
  selectedFilter = 'all';

  filterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Temperature', value: 'temperature' },
    { label: 'Water', value: 'water' },
    { label: 'Mortality', value: 'mortality' },
    { label: 'Feed', value: 'feed' },
    { label: 'Vaccination', value: 'vaccination' },
    { label: 'Inventory', value: 'inventory' }
  ];

  get unreadCount(): number {
    return this.alerts.filter(a => !a.read).length;
  }

  get criticalCount(): number {
    return this.alerts.filter(a => a.severity === 'critical' && !a.resolved).length;
  }

  get warningCount(): number {
    return this.alerts.filter(a => a.severity === 'warning' && !a.resolved).length;
  }

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.loading = true;
    this.api.getAlerts().subscribe({
      next: (data) => {
        this.alerts = data || [];
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.alerts = [];
        this.filteredAlerts = [];
        this.unreadAlerts = [];
        this.readAlerts = [];
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    this.filteredAlerts = this.selectedFilter === 'all'
      ? [...this.alerts]
      : this.alerts.filter(a => a.type === this.selectedFilter);

    this.unreadAlerts = this.filteredAlerts.filter(a => !a.read);
    this.readAlerts = this.filteredAlerts.filter(a => a.read);
  }

  generateAlerts(): void {
    this.generating = true;
    this.api.generateAlerts().subscribe({
      next: () => {
        this.generating = false;
        this.loadAlerts();
      },
      error: () => {
        this.generating = false;
      }
    });
  }

  markRead(alert: any): void {
    this.api.markAlertRead(alert._id).subscribe({
      next: () => {
        alert.read = true;
        this.applyFilter();
      }
    });
  }

  resolve(alert: any): void {
    this.api.resolveAlert(alert._id).subscribe({
      next: () => {
        alert.resolved = true;
        this.applyFilter();
      }
    });
  }

  markAllRead(): void {
    this.api.markAllAlertsRead().subscribe({
      next: () => {
        this.alerts.forEach(a => a.read = true);
        this.applyFilter();
      }
    });
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      temperature: '\uD83C\uDF21\uFE0F',
      water: '\uD83D\uDCA7',
      mortality: '\u2620\uFE0F',
      feed: '\uD83C\uDF7D\uFE0F',
      vaccination: '\uD83D\uDC89',
      inventory: '\uD83D\uDCE6'
    };
    return icons[type] || '\u26A0\uFE0F';
  }

  getCardClass(alert: any): string {
    const base = 'rounded-xl shadow-sm p-4 border-l-4 transition-all';
    switch (alert.severity) {
      case 'info':
        return `bg-blue-50 border-blue-400 ${base}`;
      case 'warning':
        return `bg-yellow-50 border-yellow-400 ${base}`;
      case 'danger':
        return `bg-red-50 border-red-400 ${base}`;
      case 'critical':
        return `bg-red-100 border-red-600 animate-pulse-red ${base}`;
      default:
        return `bg-white border-gray-300 ${base}`;
    }
  }

  getSeverityBadgeClass(severity: string): string {
    switch (severity) {
      case 'info':
        return 'bg-blue-100 text-blue-700';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700';
      case 'danger':
        return 'bg-red-100 text-red-700';
      case 'critical':
        return 'bg-red-200 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }
}
