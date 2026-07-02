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
      <div class="flex items-center justify-between">
        <div>
          <p class="ctrl-eyebrow">ABIS Control · Overview</p>
          <h2 class="text-xl md:text-2xl ctrl-title">Dashboard</h2>
          <p class="text-xs ctrl-sub font-mono">{{ today | date:'EEEE, MMM d, y' }}</p>
        </div>
        <button (click)="loadDashboard()" [disabled]="loading" class="ctrl-btn-ghost disabled:opacity-50">
          <span [class.animate-spin]="loading">↻</span> Refresh
        </button>
      </div>

      <!-- LIVE HOUSE CLIMATE (controller replica, loads independently) -->
      <section class="space-y-2">
        <h3 class="text-sm ctrl-title uppercase tracking-wide flex items-center gap-2">
          <span class="inline-flex items-center gap-1 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-md font-mono tracking-widest">◉ LIVE</span>
          Live House — 3D Climate View
        </h3>
        <app-house-viz [refreshInterval]="15"></app-house-viz>
      </section>

      <!-- KPI cards (always show once data loaded) -->
      <div *ngIf="data" class="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        <div class="kpi-tile rounded-2xl shadow-sm p-4 text-white bg-gradient-to-br from-emerald-500 to-emerald-600">
          <div class="flex items-center justify-between"><span class="text-2xl">🐔</span><span class="text-[10px] font-medium uppercase tracking-wide opacity-90">Active Batches</span></div>
          <p class="text-3xl font-bold mt-2 ctrl-readout">{{ data.activeBatchCount }}</p>
        </div>
        <div class="kpi-tile rounded-2xl shadow-sm p-4 text-white bg-gradient-to-br from-blue-500 to-blue-600">
          <div class="flex items-center justify-between"><span class="text-2xl">🐥</span><span class="text-[10px] font-medium uppercase tracking-wide opacity-90">Birds Alive</span></div>
          <p class="text-3xl font-bold mt-2 ctrl-readout">{{ data.totalBirdsAlive | number }}</p>
        </div>
        <div class="kpi-tile rounded-2xl shadow-sm p-4 text-white bg-gradient-to-br from-amber-500 to-amber-600">
          <div class="flex items-center justify-between"><span class="text-2xl">🥚</span><span class="text-[10px] font-medium uppercase tracking-wide opacity-90">Total Arrived</span></div>
          <p class="text-3xl font-bold mt-2 ctrl-readout">{{ data.totalChicksArrived | number }}</p>
        </div>
        <div class="kpi-tile rounded-2xl shadow-sm p-4 text-white bg-gradient-to-br from-rose-500 to-red-600">
          <div class="flex items-center justify-between"><span class="text-2xl">☠️</span><span class="text-[10px] font-medium uppercase tracking-wide opacity-90">Mortality</span></div>
          <p class="text-3xl font-bold mt-2 ctrl-readout">{{ data.totalMortality | number }}</p>
        </div>
      </div>

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
        <button (click)="loadDashboard()" class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition">↻ Try again</button>
      </div>

      <!-- Farm data -->
      <div *ngIf="!loading && !error && data" class="space-y-5">
        <!-- Financials + 7-day quick stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="ctrl-card p-4 md:col-span-2">
            <div class="flex items-center gap-2 mb-3"><span class="text-lg">💰</span><h3 class="text-sm font-bold text-gray-700 uppercase tracking-wide">Financials</h3></div>
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
          <div class="ctrl-card p-4">
            <h3 class="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><span>📅</span> Last 7 Days</h3>
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
            <h3 class="text-sm ctrl-title uppercase tracking-wide flex items-center gap-2"><span>📊</span> Active Batches</h3>
            <a routerLink="/batches" class="text-xs text-emerald-600 hover:underline font-medium">View all →</a>
          </div>

          <div *ngIf="data.batchSummaries.length === 0" class="ctrl-card p-8 text-center">
            <div class="text-3xl mb-2">🐣</div>
            <p class="text-gray-500 text-sm mb-3">No active batches yet</p>
            <a routerLink="/batches" class="inline-block bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl">Add a batch</a>
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
          <div class="ctrl-card p-4">
            <h3 class="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><span>🧾</span> Batch Expenses</h3>
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

          <div class="ctrl-card p-4">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><span>📝</span> Today's Logs</h3>
              <a routerLink="/daily-logs" class="text-xs text-emerald-600 hover:underline font-medium">Log now →</a>
            </div>
            <div *ngIf="data.todayLogs.length === 0" class="text-gray-400 text-xs py-4 text-center">
              No logs recorded today. <a routerLink="/daily-logs" class="text-emerald-600 underline">Add now</a>
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
