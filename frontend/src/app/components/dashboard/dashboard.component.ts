import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { HouseVizComponent } from '../climate-live/house-viz.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, HouseVizComponent],
  template: `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 class="text-2xl md:text-[28px] ctrl-title">Dashboard</h2>
          <p class="text-sm ctrl-sub mt-0.5">Overview of your farm</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="hidden sm:inline-flex items-center gap-2 ctrl-btn-ghost cursor-default">
            <span>📅</span> {{ today | date:'MMM d, y' }}
          </span>
          <button (click)="loadDashboard()" [disabled]="loading" class="ctrl-btn-ghost disabled:opacity-50">
            <span [class.animate-spin]="loading">↻</span> Refresh
          </button>
        </div>
      </div>

      <!-- KPI stat cards -->
      <div *ngIf="data" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div class="ctrl-card kpi-tile p-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-[17px]">🐔</div>
            <span class="text-[13px] font-medium text-slate-500">Active Batches</span>
          </div>
          <p class="text-[26px] font-extrabold text-slate-900 mt-2 ctrl-readout">{{ data.activeBatchCount }}</p>
          <p class="text-[11.5px] text-slate-400 mt-0.5">running now</p>
        </div>
        <div class="ctrl-card kpi-tile p-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-[17px]">🐥</div>
            <span class="text-[13px] font-medium text-slate-500">Birds Alive</span>
          </div>
          <p class="text-[26px] font-extrabold text-slate-900 mt-2 ctrl-readout">{{ data.totalBirdsAlive | number }}</p>
          <p class="text-[11.5px] text-emerald-600 mt-0.5 font-medium">↗ of {{ data.totalChicksArrived | number }} arrived</p>
        </div>
        <div class="ctrl-card kpi-tile p-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-[17px]">🥚</div>
            <span class="text-[13px] font-medium text-slate-500">Total Arrived</span>
          </div>
          <p class="text-[26px] font-extrabold text-slate-900 mt-2 ctrl-readout">{{ data.totalChicksArrived | number }}</p>
          <p class="text-[11.5px] text-slate-400 mt-0.5">all batches</p>
        </div>
        <div class="ctrl-card kpi-tile p-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-[17px]">📉</div>
            <span class="text-[13px] font-medium text-slate-500">Mortality</span>
          </div>
          <p class="text-[26px] font-extrabold text-slate-900 mt-2 ctrl-readout">{{ data.totalMortality | number }}</p>
          <p class="text-[11.5px] mt-0.5 font-medium" [ngClass]="data.totalMortality > 0 ? 'text-red-500' : 'text-emerald-600'">
            {{ data.totalMortality > 0 ? '↘ total deaths' : 'no losses' }}</p>
        </div>
        <div class="ctrl-card kpi-tile p-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-lg bg-lime-50 flex items-center justify-center text-[17px]">🌾</div>
            <span class="text-[13px] font-medium text-slate-500">Feed (7d)</span>
          </div>
          <p class="text-[26px] font-extrabold text-slate-900 mt-2 ctrl-readout">{{ data.recentFeed.totalFeedKg | number:'1.0-0' }}<span class="text-sm font-semibold text-slate-400"> kg</span></p>
          <p class="text-[11.5px] text-slate-400 mt-0.5">this week</p>
        </div>
        <div class="ctrl-card kpi-tile p-4">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center text-[17px]">💧</div>
            <span class="text-[13px] font-medium text-slate-500">Water (7d)</span>
          </div>
          <p class="text-[26px] font-extrabold text-slate-900 mt-2 ctrl-readout">{{ data.recentFeed.totalWaterLiters | number:'1.0-0' }}<span class="text-sm font-semibold text-slate-400"> L</span></p>
          <p class="text-[11.5px] text-slate-400 mt-0.5">this week</p>
        </div>
      </div>

      <!-- LIVE HOUSE CLIMATE (controller replica, loads independently) -->
      <section class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-md tracking-widest">◉ LIVE</span>
          <h3 class="text-[15px] font-bold text-slate-800">Live House — 3D Climate View</h3>
        </div>
        <app-house-viz [refreshInterval]="15"></app-house-viz>
      </section>

      <!-- Loading skeleton (farm stats only; climate panel handles itself) -->
      <div *ngIf="loading" class="animate-pulse space-y-3">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <div *ngFor="let i of [1,2,3,4]" class="ctrl-card p-4 h-24"></div>
        </div>
        <div class="ctrl-card p-4 h-24"></div>
      </div>

      <!-- Error state -->
      <div *ngIf="!loading && error" class="ctrl-card p-8 text-center">
        <div class="text-4xl mb-3">⚠️</div>
        <h3 class="text-lg font-bold text-gray-800 mb-1">Couldn't load farm stats</h3>
        <p class="text-sm text-gray-500 mb-4">{{ error }}</p>
        <button (click)="loadDashboard()" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition">↻ Try again</button>
      </div>

      <!-- Farm data -->
      <div *ngIf="!loading && !error && data" class="space-y-5">
        <!-- Financials + 7-day quick stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="ctrl-card p-5 md:col-span-2">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-[15px] font-bold text-slate-800">Financials</h3>
              <a routerLink="/finance" class="text-xs font-semibold text-blue-600 hover:underline bg-blue-50 px-2.5 py-1 rounded-lg">View all</a>
            </div>
            <div class="grid grid-cols-3 gap-3 mb-3">
              <div><p class="text-[10px] text-gray-400 uppercase">Income</p><p class="text-base md:text-xl font-bold text-green-600">₹{{ data.financials.totalIncome | number:'1.0-0' }}</p></div>
              <div><p class="text-[10px] text-gray-400 uppercase">Expense</p><p class="text-base md:text-xl font-bold text-red-600">₹{{ data.financials.totalExpenses | number:'1.0-0' }}</p></div>
              <div><p class="text-[10px] text-gray-400 uppercase">Profit</p><p class="text-base md:text-xl font-bold" [class.text-green-600]="data.financials.profit >= 0" [class.text-red-600]="data.financials.profit < 0">₹{{ data.financials.profit | number:'1.0-0' }}</p></div>
            </div>
            <div class="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
              <div class="bg-green-500" [style.width.%]="incomeBarWidth()"></div>
              <div class="bg-red-500" [style.width.%]="100 - incomeBarWidth()"></div>
            </div>
          </div>
          <div class="ctrl-card p-5">
            <h3 class="text-[15px] font-bold text-slate-800 mb-4">Last 7 days</h3>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-emerald-50 rounded-xl p-3 text-center">
                <div class="text-xl mb-1">🌾</div>
                <p class="text-lg font-bold text-gray-800">{{ data.recentFeed.totalFeedKg | number:'1.0-0' }}<span class="text-xs font-normal text-gray-400"> kg</span></p>
                <p class="text-[10px] text-gray-400 uppercase">Feed</p>
              </div>
              <div class="bg-blue-50 rounded-xl p-3 text-center">
                <div class="text-xl mb-1">💧</div>
                <p class="text-lg font-bold text-gray-800">{{ data.recentFeed.totalWaterLiters | number:'1.0-0' }}<span class="text-xs font-normal text-gray-400"> L</span></p>
                <p class="text-[10px] text-gray-400 uppercase">Water</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Active batches -->
        <div>
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-[15px] font-bold text-slate-800">Active batches</h3>
            <a routerLink="/batches" class="text-xs font-semibold text-blue-600 hover:underline bg-blue-50 px-2.5 py-1 rounded-lg">View all</a>
          </div>

          <div *ngIf="data.batchSummaries.length === 0" class="ctrl-card p-8 text-center">
            <div class="text-3xl mb-2">🐣</div>
            <p class="text-gray-500 text-sm mb-3">No active batches yet</p>
            <a routerLink="/batches" class="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl">Add a batch</a>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <div *ngFor="let b of data.batchSummaries" class="ctrl-card p-4">
              <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">🐔</div>
                  <div>
                    <p class="font-bold text-gray-800 leading-tight">{{ b.batchNumber }}</p>
                    <p class="text-[11px] text-gray-400">{{ b.breed || 'Broiler' }} · House {{ b.houseNumber || '-' }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Day {{ b.dayCount }}</span>
                  <span class="text-[10px] px-2 py-0.5 rounded-full capitalize font-medium"
                    [class.bg-yellow-100]="b.phase==='starter'" [class.text-yellow-700]="b.phase==='starter'"
                    [class.bg-blue-100]="b.phase==='grower'" [class.text-blue-700]="b.phase==='grower'"
                    [class.bg-purple-100]="b.phase==='finisher'" [class.text-purple-700]="b.phase==='finisher'"
                    [class.bg-gray-100]="b.phase==='mature'" [class.text-gray-600]="b.phase==='mature'">{{ b.phase }}</span>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex gap-5">
                  <div><p class="text-[10px] text-gray-400 uppercase">Birds</p><p class="text-sm font-bold text-gray-800">{{ b.currentCount | number }}<span class="text-gray-400 font-normal text-xs">/{{ b.chicksArrived | number }}</span></p></div>
                  <div><p class="text-[10px] text-gray-400 uppercase">Mortality</p><p class="text-sm font-bold" [class.text-green-600]="b.mortalityPercent < 3" [class.text-yellow-600]="b.mortalityPercent >= 3 && b.mortalityPercent < 5" [class.text-red-600]="b.mortalityPercent >= 5">{{ b.mortalityPercent }}%</p></div>
                </div>
                <div class="flex-1 max-w-[40%] ml-4">
                  <div class="w-full bg-gray-100 rounded-full h-2">
                    <div class="h-2 rounded-full transition-all" [class.bg-green-500]="b.mortalityPercent < 3" [class.bg-yellow-500]="b.mortalityPercent >= 3 && b.mortalityPercent < 5" [class.bg-red-500]="b.mortalityPercent >= 5" [style.width.%]="100 - b.mortalityPercent"></div>
                  </div>
                  <p class="text-[9px] text-gray-400 text-right mt-1">{{ 100 - b.mortalityPercent | number:'1.0-1' }}% survival</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom grid: expenses + today's logs -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="ctrl-card p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-[15px] font-bold text-slate-800">Batch expenses</h3>
              <a routerLink="/batch-expenses" class="text-xs font-semibold text-blue-600 hover:underline bg-blue-50 px-2.5 py-1 rounded-lg">View all</a>
            </div>
            <div *ngIf="data.expenseByCategory.length === 0" class="text-gray-400 text-xs py-2">No expenses recorded</div>
            <div class="space-y-2">
              <div *ngFor="let cat of data.expenseByCategory" class="flex items-center justify-between">
                <span class="text-xs text-gray-600 capitalize">{{ cat._id }}</span>
                <span class="text-xs font-bold text-gray-800">₹{{ cat.total | number:'1.0-0' }}</span>
              </div>
              <div class="pt-2 border-t border-gray-100 flex justify-between" *ngIf="data.expenseByCategory.length > 0">
                <span class="text-xs font-bold text-gray-700">Total</span>
                <span class="text-xs font-bold text-red-600">₹{{ data.totalBatchExpenses | number:'1.0-0' }}</span>
              </div>
            </div>
          </div>

          <div class="ctrl-card p-5">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-[15px] font-bold text-slate-800">Today's logs</h3>
              <a routerLink="/daily-logs" class="text-xs font-semibold text-blue-600 hover:underline bg-blue-50 px-2.5 py-1 rounded-lg">Log now</a>
            </div>
            <div *ngIf="data.todayLogs.length === 0" class="text-gray-400 text-xs py-4 text-center">
              No logs recorded today. <a routerLink="/daily-logs" class="text-blue-600 underline">Add now</a>
            </div>
            <div class="space-y-1">
              <div *ngFor="let log of data.todayLogs" class="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <div class="flex items-center gap-2">
                  <span class="text-base">🐔</span>
                  <div><span class="font-medium text-gray-800 text-sm">{{ log.batch?.batchNumber }}</span><span class="text-[10px] text-gray-400 ml-1">Day {{ log.dayNumber }}</span></div>
                </div>
                <div class="flex gap-3 text-[11px] text-gray-500">
                  <span>🌾 {{ log.feedGivenKg }}kg</span>
                  <span>💧 {{ log.waterGivenLiters }}L</span>
                  <span *ngIf="log.temperature">🌡️ {{ log.temperature }}°C</span>
                  <span *ngIf="log.mortalityCount" class="text-red-500">☠️ {{ log.mortalityCount }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  data: any = null;
  loading = true;
  error: string | null = null;
  today = new Date();

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.loadDashboard(); }

  loadDashboard() {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();
    this.api.getDashboard().subscribe({
      next: (data) => { this.data = data; this.loading = false; this.cdr.detectChanges(); },
      error: (err) => {
        this.error = err?.status === 401
          ? 'Your session has expired. Please log in again.'
          : (err?.error?.error || err?.message || 'Something went wrong while loading data.');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  incomeBarWidth(): number {
    const income = this.data?.financials?.totalIncome || 0;
    const expense = this.data?.financials?.totalExpenses || 0;
    const total = income + expense;
    return total === 0 ? 50 : Math.round((income / total) * 100);
  }
}
