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
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-emerald-500">
            <p class="text-xs text-gray-500 uppercase tracking-wide">Active Batches</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">{{ data.activeBatches }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
            <p class="text-xs text-gray-500 uppercase tracking-wide">Birds Alive</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">{{ data.totalBirdsAlive | number }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-yellow-500">
            <p class="text-xs text-gray-500 uppercase tracking-wide">Total Arrived</p>
            <p class="text-3xl font-bold text-gray-800 mt-1">{{ data.totalChicksArrived | number }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-red-500">
            <p class="text-xs text-gray-500 uppercase tracking-wide">Total Mortality</p>
            <p class="text-3xl font-bold text-red-600 mt-1">{{ data.totalMortality | number }}</p>
          </div>
        </div>

        <!-- Financial Summary -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div class="bg-white rounded-xl shadow-sm p-5">
            <p class="text-xs text-gray-500 uppercase tracking-wide">Total Income</p>
            <p class="text-2xl font-bold text-green-600 mt-1">₹{{ data.financials.totalIncome | number:'1.2-2' }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-5">
            <p class="text-xs text-gray-500 uppercase tracking-wide">Total Expenses</p>
            <p class="text-2xl font-bold text-red-600 mt-1">₹{{ data.financials.totalExpenses | number:'1.2-2' }}</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-5">
            <p class="text-xs text-gray-500 uppercase tracking-wide">Net Profit</p>
            <p class="text-2xl font-bold mt-1" [class.text-green-600]="data.financials.profit >= 0" [class.text-red-600]="data.financials.profit < 0">
              ₹{{ data.financials.profit | number:'1.2-2' }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Expenses by Category -->
          <div class="bg-white rounded-xl shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Batch Expenses by Category</h3>
            <div *ngIf="data.expenseByCategory.length === 0" class="text-gray-400 text-sm">No expenses yet</div>
            <div class="space-y-3">
              <div *ngFor="let cat of data.expenseByCategory" class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full" [style.background-color]="getCategoryColor(cat._id)"></span>
                  <span class="text-sm text-gray-700 capitalize">{{ cat._id }}</span>
                </div>
                <span class="text-sm font-bold text-gray-800">₹{{ cat.total | number:'1.2-2' }}</span>
              </div>
              <div class="pt-3 border-t">
                <div class="flex justify-between font-bold">
                  <span class="text-gray-700">Total</span>
                  <span class="text-red-600">₹{{ data.totalBatchExpenses | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Batches -->
          <div class="bg-white rounded-xl shadow-sm p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-800">Recent Batches</h3>
              <a routerLink="/batches" class="text-sm text-emerald-600 hover:underline">View all</a>
            </div>
            <div *ngIf="data.recentBatches.length === 0" class="text-gray-400 text-sm">No batches yet</div>
            <div class="space-y-3">
              <div *ngFor="let b of data.recentBatches" class="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p class="font-medium text-gray-800">{{ b.batchNumber }}</p>
                  <p class="text-xs text-gray-500">{{ b.breed }} &middot; {{ b.arrivalDate | date:'mediumDate' }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold">{{ b.currentCount }}/{{ b.chicksArrived }}</p>
                  <span class="text-xs px-2 py-0.5 rounded-full"
                    [class.bg-green-100]="b.status==='active'" [class.text-green-700]="b.status==='active'"
                    [class.bg-gray-100]="b.status!=='active'" [class.text-gray-600]="b.status!=='active'">
                    {{ b.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Mortality by Batch -->
          <div class="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Mortality by Batch</h3>
            <div *ngIf="data.mortalityByBatch.length === 0" class="text-gray-400 text-sm">No mortality recorded</div>
            <div class="flex items-end gap-2 h-40" *ngIf="data.mortalityByBatch.length > 0">
              <div *ngFor="let m of data.mortalityByBatch" class="flex-1 flex flex-col items-center justify-end">
                <div class="bg-red-400 rounded-t w-full min-h-[4px] transition-all"
                  [style.height.%]="getBarHeight(m.total)"></div>
                <span class="text-[10px] text-gray-500 mt-1 text-center truncate w-full">{{ m.batchNumber }}</span>
                <span class="text-[10px] font-bold text-red-600">{{ m.total }}</span>
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
  maxMortality = 1;

  private categoryColors: Record<string, string> = {
    electricity: '#f59e0b', diesel: '#ef4444', medicine: '#8b5cf6', water: '#3b82f6',
    feed: '#10b981', labor: '#f97316', vaccination: '#06b6d4', equipment: '#6b7280',
    transport: '#ec4899', other: '#a3a3a3'
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getDashboard().subscribe({
      next: (data) => {
        this.data = data;
        this.maxMortality = Math.max(...(data.mortalityByBatch?.map((m: any) => m.total) || [1]), 1);
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  getCategoryColor(category: string): string {
    return this.categoryColors[category] || '#a3a3a3';
  }

  getBarHeight(total: number): number {
    return (total / this.maxMortality) * 100;
  }
}
