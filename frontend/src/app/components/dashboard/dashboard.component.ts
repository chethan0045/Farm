import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl md:text-2xl font-bold text-gray-800">Dashboard</h2>
        <p class="text-xs text-gray-400">{{ today | date:'mediumDate' }}</p>
      </div>

      <div *ngIf="loading" class="text-center py-10 text-gray-500">Loading...</div>

      <div *ngIf="!loading && data">
        <!-- Key Stats - 2x2 grid on mobile -->
        <div class="grid grid-cols-2 gap-2 md:gap-3 mb-4">
          <div class="bg-white rounded-lg shadow-sm p-3 border-l-4 border-emerald-500">
            <p class="text-[10px] text-gray-400 uppercase">Active Batches</p>
            <p class="text-2xl md:text-3xl font-bold text-gray-800">{{ data.activeBatchCount }}</p>
          </div>
          <div class="bg-white rounded-lg shadow-sm p-3 border-l-4 border-blue-500">
            <p class="text-[10px] text-gray-400 uppercase">Birds Alive</p>
            <p class="text-2xl md:text-3xl font-bold text-gray-800">{{ data.totalBirdsAlive | number }}</p>
          </div>
          <div class="bg-white rounded-lg shadow-sm p-3 border-l-4 border-yellow-500">
            <p class="text-[10px] text-gray-400 uppercase">Total Arrived</p>
            <p class="text-2xl md:text-3xl font-bold text-gray-800">{{ data.totalChicksArrived | number }}</p>
          </div>
          <div class="bg-white rounded-lg shadow-sm p-3 border-l-4 border-red-500">
            <p class="text-[10px] text-gray-400 uppercase">Mortality</p>
            <p class="text-2xl md:text-3xl font-bold text-red-600">{{ data.totalMortality | number }}</p>
          </div>
        </div>

        <!-- Financials - compact on mobile -->
        <div class="grid grid-cols-3 gap-2 mb-4">
          <div class="bg-white rounded-lg shadow-sm p-2.5 text-center">
            <p class="text-[9px] text-gray-400 uppercase">Income</p>
            <p class="text-sm md:text-lg font-bold text-green-600">₹{{ data.financials.totalIncome | number:'1.0-0' }}</p>
          </div>
          <div class="bg-white rounded-lg shadow-sm p-2.5 text-center">
            <p class="text-[9px] text-gray-400 uppercase">Expense</p>
            <p class="text-sm md:text-lg font-bold text-red-600">₹{{ data.financials.totalExpenses | number:'1.0-0' }}</p>
          </div>
          <div class="bg-white rounded-lg shadow-sm p-2.5 text-center">
            <p class="text-[9px] text-gray-400 uppercase">Profit</p>
            <p class="text-sm md:text-lg font-bold" [class.text-green-600]="data.financials.profit >= 0" [class.text-red-600]="data.financials.profit < 0">₹{{ data.financials.profit | number:'1.0-0' }}</p>
          </div>
        </div>

        <!-- Active Batches - Card layout for mobile -->
        <div class="mb-4">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wide">Active Batches</h3>
            <a routerLink="/batches" class="text-xs text-emerald-600 hover:underline">View all</a>
          </div>

          <div *ngIf="data.batchSummaries.length === 0" class="bg-white rounded-lg shadow-sm p-6 text-center text-gray-400 text-sm">No active batches</div>

          <!-- Mobile: Cards / Desktop: Table -->
          <div class="space-y-2 md:hidden">
            <div *ngFor="let b of data.batchSummaries" class="bg-white rounded-lg shadow-sm p-3">
              <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-gray-800">{{ b.batchNumber }}</span>
                  <span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Day {{ b.dayCount }}</span>
                </div>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full capitalize font-medium"
                  [class.bg-yellow-100]="b.phase==='starter'" [class.text-yellow-700]="b.phase==='starter'"
                  [class.bg-blue-100]="b.phase==='grower'" [class.text-blue-700]="b.phase==='grower'"
                  [class.bg-purple-100]="b.phase==='finisher'" [class.text-purple-700]="b.phase==='finisher'"
                  [class.bg-gray-100]="b.phase==='mature'" [class.text-gray-600]="b.phase==='mature'">{{ b.phase }}</span>
              </div>
              <div class="flex justify-between text-xs text-gray-500">
                <span>{{ b.breed || 'Broiler' }}</span>
                <span>House: {{ b.houseNumber || '-' }}</span>
              </div>
              <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                <div class="flex gap-3">
                  <div>
                    <p class="text-[10px] text-gray-400">Birds</p>
                    <p class="text-sm font-bold text-gray-800">{{ b.currentCount }}<span class="text-gray-400 font-normal">/{{ b.chicksArrived }}</span></p>
                  </div>
                  <div>
                    <p class="text-[10px] text-gray-400">Mortality</p>
                    <p class="text-sm font-bold text-red-600">{{ b.mortalityPercent }}%</p>
                  </div>
                </div>
                <div class="w-16 bg-gray-200 rounded-full h-1.5">
                  <div class="h-1.5 rounded-full" [class.bg-green-500]="b.mortalityPercent < 3" [class.bg-yellow-500]="b.mortalityPercent >= 3 && b.mortalityPercent < 5" [class.bg-red-500]="b.mortalityPercent >= 5"
                    [style.width.%]="100 - b.mortalityPercent"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop: Table -->
          <div class="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
            <table class="w-full" *ngIf="data.batchSummaries.length > 0">
              <thead><tr class="text-xs text-gray-400 uppercase border-b bg-gray-50">
                <th class="text-left py-2.5 px-3">Batch</th>
                <th class="text-left py-2.5 px-3">Day</th>
                <th class="text-left py-2.5 px-3">Phase</th>
                <th class="text-left py-2.5 px-3">Birds</th>
                <th class="text-left py-2.5 px-3">Mortality</th>
                <th class="text-left py-2.5 px-3">House</th>
              </tr></thead>
              <tbody>
                <tr *ngFor="let b of data.batchSummaries" class="border-b last:border-0 hover:bg-gray-50">
                  <td class="py-2 px-3"><p class="font-bold text-gray-800 text-sm">{{ b.batchNumber }}</p><p class="text-[10px] text-gray-400">{{ b.breed }}</p></td>
                  <td class="py-2 px-3"><span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-xs font-bold">Day {{ b.dayCount }}</span></td>
                  <td class="py-2 px-3"><span class="text-xs px-2 py-0.5 rounded-full capitalize"
                    [class.bg-yellow-100]="b.phase==='starter'" [class.text-yellow-700]="b.phase==='starter'"
                    [class.bg-blue-100]="b.phase==='grower'" [class.text-blue-700]="b.phase==='grower'"
                    [class.bg-purple-100]="b.phase==='finisher'" [class.text-purple-700]="b.phase==='finisher'"
                    [class.bg-gray-100]="b.phase==='mature'" [class.text-gray-600]="b.phase==='mature'">{{ b.phase }}</span></td>
                  <td class="py-2 px-3 text-sm font-bold">{{ b.currentCount }}/{{ b.chicksArrived }}</td>
                  <td class="py-2 px-3 text-sm text-red-600">{{ b.mortalityPercent }}%</td>
                  <td class="py-2 px-3 text-sm text-gray-500">{{ b.houseNumber || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Bottom Row -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <!-- Feed/Water last 7 days -->
          <div class="bg-white rounded-lg shadow-sm p-3">
            <h3 class="text-xs font-bold text-gray-500 uppercase mb-2">Last 7 Days</h3>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-emerald-50 rounded-lg p-2.5 text-center">
                <p class="text-[10px] text-gray-400">Feed</p>
                <p class="text-lg font-bold text-gray-800">{{ data.recentFeed.totalFeedKg | number:'1.0-0' }} <span class="text-xs font-normal text-gray-400">kg</span></p>
              </div>
              <div class="bg-blue-50 rounded-lg p-2.5 text-center">
                <p class="text-[10px] text-gray-400">Water</p>
                <p class="text-lg font-bold text-gray-800">{{ data.recentFeed.totalWaterLiters | number:'1.0-0' }} <span class="text-xs font-normal text-gray-400">L</span></p>
              </div>
            </div>
          </div>

          <!-- Expenses by Category -->
          <div class="bg-white rounded-lg shadow-sm p-3">
            <h3 class="text-xs font-bold text-gray-500 uppercase mb-2">Batch Expenses</h3>
            <div *ngIf="data.expenseByCategory.length === 0" class="text-gray-400 text-xs py-2">No expenses</div>
            <div class="space-y-1.5">
              <div *ngFor="let cat of data.expenseByCategory" class="flex items-center justify-between">
                <span class="text-xs text-gray-600 capitalize">{{ cat._id }}</span>
                <span class="text-xs font-bold text-gray-800">₹{{ cat.total | number:'1.0-0' }}</span>
              </div>
              <div class="pt-1.5 border-t" *ngIf="data.expenseByCategory.length > 0">
                <div class="flex justify-between">
                  <span class="text-xs font-bold text-gray-700">Total</span>
                  <span class="text-xs font-bold text-red-600">₹{{ data.totalBatchExpenses | number:'1.0-0' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Today's Logs -->
          <div class="bg-white rounded-lg shadow-sm p-3 md:col-span-2">
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-xs font-bold text-gray-500 uppercase">Today's Logs</h3>
              <a routerLink="/daily-logs" class="text-xs text-emerald-600 hover:underline">Log now</a>
            </div>
            <div *ngIf="data.todayLogs.length === 0" class="text-gray-400 text-xs py-3 text-center">No logs recorded today. <a routerLink="/daily-logs" class="text-emerald-600 underline">Add now</a></div>
            <div class="space-y-1.5">
              <div *ngFor="let log of data.todayLogs" class="flex justify-between items-center py-1.5 border-b last:border-0">
                <div>
                  <span class="font-medium text-gray-800 text-sm">{{ log.batch?.batchNumber }}</span>
                  <span class="text-[10px] text-gray-400 ml-1">Day {{ log.dayNumber }}</span>
                </div>
                <div class="flex gap-2 text-[10px] text-gray-500">
                  <span>🌾{{ log.feedGivenKg }}kg</span>
                  <span>💧{{ log.waterGivenLiters }}L</span>
                  <span *ngIf="log.temperature">🌡️{{ log.temperature }}°C</span>
                  <span *ngIf="log.mortalityCount" class="text-red-500">☠️{{ log.mortalityCount }}</span>
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
  today = new Date();

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.api.getDashboard().subscribe({
      next: (data) => { this.data = data; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }
}
