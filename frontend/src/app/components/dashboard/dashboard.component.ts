import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div>
      <h2 class="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
      <div *ngIf="loading" class="text-center py-10 text-gray-500">Loading dashboard...</div>

      <div *ngIf="!loading && data">
        <!-- Key Stats -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-emerald-500">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Active Batches</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">{{ data.activeBatchCount }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Birds Alive</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">{{ data.totalBirdsAlive | number }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Total Arrived</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">{{ data.totalChicksArrived | number }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Total Mortality</p>
            <p class="text-3xl font-bold text-red-600 mt-1">{{ data.totalMortality | number }}</p>
          </div>
        </div>

        <!-- Financial Summary -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div class="bg-white rounded-xl shadow-sm p-4">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Total Income</p>
            <p class="text-xl font-bold text-green-600 mt-1">₹{{ data.financials.totalIncome | number:'1.2-2' }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-4">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Total Expenses</p>
            <p class="text-xl font-bold text-red-600 mt-1">₹{{ data.financials.totalExpenses | number:'1.2-2' }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-4">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Net Profit</p>
            <p class="text-xl font-bold mt-1" [class.text-green-600]="data.financials.profit >= 0" [class.text-red-600]="data.financials.profit < 0">
              ₹{{ data.financials.profit | number:'1.2-2' }}
            </p>
          </div>
        </div>

        <!-- Last 7 Days Feed/Water -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6" *ngIf="data.recentFeed">
          <div class="bg-white rounded-xl shadow-sm p-4">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Feed (Last 7 Days)</p>
            <p class="text-xl font-bold text-gray-800 mt-1">{{ data.recentFeed.totalFeedKg | number:'1.1-1' }} kg</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-4">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Water (Last 7 Days)</p>
            <p class="text-xl font-bold text-blue-600 mt-1">{{ data.recentFeed.totalWaterLiters | number:'1.1-1' }} L</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Active Batches with Day Count -->
          <div class="bg-white rounded-xl shadow-sm p-5 lg:col-span-2">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-800">Active Batches</h3>
              <a routerLink="/batches" class="text-sm text-emerald-600 hover:underline">View all</a>
            </div>
            <div *ngIf="data.batchSummaries.length === 0" class="text-gray-400 text-sm py-4 text-center">No active batches</div>
            <div class="overflow-x-auto">
              <table class="w-full" *ngIf="data.batchSummaries.length > 0">
                <thead>
                  <tr class="text-xs text-gray-500 uppercase border-b">
                    <th class="text-left py-2 px-2">Batch</th>
                    <th class="text-left py-2 px-2">Day</th>
                    <th class="text-left py-2 px-2">Phase</th>
                    <th class="text-left py-2 px-2">Birds</th>
                    <th class="text-left py-2 px-2">Mortality</th>
                    <th class="text-left py-2 px-2">House</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let b of data.batchSummaries" class="border-b last:border-0 hover:bg-gray-50">
                    <td class="py-2 px-2">
                      <p class="font-bold text-gray-800">{{ b.batchNumber }}</p>
                      <p class="text-xs text-gray-500">{{ b.breed }}</p>
                    </td>
                    <td class="py-2 px-2">
                      <span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-sm font-bold">Day {{ b.dayCount }}</span>
                    </td>
                    <td class="py-2 px-2">
                      <span class="text-xs px-2 py-0.5 rounded-full capitalize"
                        [class.bg-yellow-100]="b.phase==='starter'" [class.text-yellow-700]="b.phase==='starter'"
                        [class.bg-blue-100]="b.phase==='grower'" [class.text-blue-700]="b.phase==='grower'"
                        [class.bg-purple-100]="b.phase==='finisher'" [class.text-purple-700]="b.phase==='finisher'"
                        [class.bg-gray-100]="b.phase==='mature'" [class.text-gray-700]="b.phase==='mature'">
                        {{ b.phase }}
                      </span>
                    </td>
                    <td class="py-2 px-2 text-sm font-bold">{{ b.currentCount }}/{{ b.chicksArrived }}</td>
                    <td class="py-2 px-2 text-sm text-red-600">{{ b.mortalityPercent }}%</td>
                    <td class="py-2 px-2 text-sm text-gray-600">{{ b.houseNumber || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Expenses by Category -->
          <div class="bg-white rounded-xl shadow-sm p-5">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Batch Expenses</h3>
            <div *ngIf="data.expenseByCategory.length === 0" class="text-gray-400 text-sm">No expenses yet</div>
            <div class="space-y-2">
              <div *ngFor="let cat of data.expenseByCategory" class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full" [style.background-color]="getCategoryColor(cat._id)"></span>
                  <span class="text-sm text-gray-700 capitalize">{{ cat._id }}</span>
                </div>
                <span class="text-sm font-bold text-gray-800">₹{{ cat.total | number:'1.0-0' }}</span>
              </div>
              <div class="pt-2 border-t mt-2" *ngIf="data.expenseByCategory.length > 0">
                <div class="flex justify-between font-bold">
                  <span class="text-gray-700">Total</span>
                  <span class="text-red-600">₹{{ data.totalBatchExpenses | number:'1.0-0' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Today's Logs -->
          <div class="bg-white rounded-xl shadow-sm p-5">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-800">Today's Logs</h3>
              <a routerLink="/daily-logs" class="text-sm text-emerald-600 hover:underline">Log now</a>
            </div>
            <div *ngIf="data.todayLogs.length === 0" class="text-gray-400 text-sm py-4 text-center">No logs recorded today</div>
            <div *ngFor="let log of data.todayLogs" class="py-2 border-b last:border-0">
              <div class="flex justify-between items-center">
                <span class="font-medium text-gray-800 text-sm">{{ log.batch?.batchNumber }}</span>
                <span class="text-xs text-gray-500">Day {{ log.dayNumber }}</span>
              </div>
              <div class="flex gap-3 text-xs text-gray-500 mt-1">
                <span>Feed: {{ log.feedGivenKg }}kg</span>
                <span>Water: {{ log.waterGivenLiters }}L</span>
                <span *ngIf="log.temperature">{{ log.temperature }}°C</span>
                <span *ngIf="log.mortalityCount" class="text-red-500">Dead: {{ log.mortalityCount }}</span>
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

  private categoryColors: Record<string, string> = {
    electricity: '#f59e0b', diesel: '#ef4444', medicine: '#8b5cf6', water: '#3b82f6',
    feed: '#10b981', labor: '#f97316', vaccination: '#06b6d4', equipment: '#6b7280',
    transport: '#ec4899', other: '#a3a3a3'
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getDashboard().subscribe({
      next: (data) => { this.data = data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  getCategoryColor(category: string): string {
    return this.categoryColors[category] || '#a3a3a3';
  }
}
