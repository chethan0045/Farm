import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-daily-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex flex-wrap justify-between items-center mb-6 gap-3">
        <h2 class="text-2xl font-bold text-gray-800">Daily Monitoring</h2>
        <button (click)="openModal()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ Add Daily Log</button>
      </div>

      <!-- Batch selector + Analytics -->
      <div class="flex flex-wrap gap-3 mb-4">
        <select [(ngModel)]="selectedBatch" (ngModelChange)="onBatchChange()" class="px-3 py-2 border rounded-lg text-sm outline-none">
          <option value="">Select Batch</option>
          <option *ngFor="let b of batches" [value]="b._id">{{ b.batchNumber }} (Day {{ b.dayCount }} - {{ b.phase | titlecase }})</option>
        </select>
      </div>

      <!-- Analytics Cards -->
      <div *ngIf="analytics" class="mb-6">
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
          <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-emerald-500">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Day</p>
            <p class="text-2xl font-bold text-emerald-700">{{ analytics.dayCount }}</p>
            <p class="text-xs text-emerald-600 capitalize">{{ analytics.phase }} phase</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">FCR</p>
            <p class="text-2xl font-bold" [class.text-green-600]="analytics.fcr > 0 && analytics.fcr <= 1.8" [class.text-yellow-600]="analytics.fcr > 1.8 && analytics.fcr <= 2.2" [class.text-red-600]="analytics.fcr > 2.2" [class.text-gray-400]="analytics.fcr === 0">
              {{ analytics.fcr || '-' }}
            </p>
            <p class="text-[10px] text-gray-400">Target: 1.5-1.8</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Feed/Bird/Day</p>
            <p class="text-xl font-bold text-gray-800">{{ analytics.feedPerBirdPerDay }}g</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-cyan-500">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Water/Bird/Day</p>
            <p class="text-xl font-bold text-gray-800">{{ analytics.waterPerBirdPerDay }}ml</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Avg Weight</p>
            <p class="text-xl font-bold text-gray-800">{{ analytics.latestWeightGrams }}g</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">Mortality</p>
            <p class="text-xl font-bold text-red-600">{{ analytics.mortalityPercent }}%</p>
            <p class="text-[10px] text-gray-400">{{ analytics.totalMortality }} birds</p>
          </div>
        </div>

        <!-- Water:Feed Ratio Alert -->
        <div *ngIf="analytics.waterFeedRatio > 0 && analytics.waterFeedRatio < 1.8" class="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-sm mb-4">
          ⚠️ Water:Feed ratio is {{ analytics.waterFeedRatio }}. Should be ~2.0 (water = 2x feed). Low water may indicate health issues.
        </div>

        <!-- Phase Guide -->
        <div class="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h3 class="font-semibold text-gray-800 mb-2 text-sm">Phase Guide (Day {{ analytics.dayCount }})</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div class="p-3 rounded-lg" [class.bg-emerald-50]="analytics.phase==='starter'" [class.border-emerald-300]="analytics.phase==='starter'" [class.border]="analytics.phase==='starter'" [class.bg-gray-50]="analytics.phase!=='starter'">
              <p class="font-bold text-gray-700">🐥 Starter (Day 1-10)</p>
              <p class="text-gray-500">Feed: 15-25g/bird | Water: 30-50ml | Temp: 32-34°C</p>
            </div>
            <div class="p-3 rounded-lg" [class.bg-emerald-50]="analytics.phase==='grower'" [class.border-emerald-300]="analytics.phase==='grower'" [class.border]="analytics.phase==='grower'" [class.bg-gray-50]="analytics.phase!=='grower'">
              <p class="font-bold text-gray-700">🐔 Grower (Day 11-24)</p>
              <p class="text-gray-500">Feed: 50-90g/bird | Water: 100-200ml | Temp: 28-30°C</p>
            </div>
            <div class="p-3 rounded-lg" [class.bg-emerald-50]="analytics.phase==='finisher'" [class.border-emerald-300]="analytics.phase==='finisher'" [class.border]="analytics.phase==='finisher'" [class.bg-gray-50]="analytics.phase!=='finisher'">
              <p class="font-bold text-gray-700">🍗 Finisher (Day 25-42)</p>
              <p class="text-gray-500">Feed: 100-160g/bird | Water: 200-400ml | Temp: 24-26°C</p>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="loading" class="text-center py-10 text-gray-500">Loading...</div>

      <!-- Logs Table -->
      <div class="bg-white rounded-xl shadow-sm overflow-x-auto" *ngIf="!loading && selectedBatch">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feed (kg)</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Water (L)</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight (g)</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temp °C</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Humidity</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dead</th>
              <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let l of logs" class="border-t hover:bg-gray-50">
              <td class="px-3 py-2 text-sm font-bold text-emerald-700">Day {{ l.dayNumber }}</td>
              <td class="px-3 py-2 text-sm">{{ l.date | date:'shortDate' }}</td>
              <td class="px-3 py-2 text-sm">{{ l.feedGivenKg }}</td>
              <td class="px-3 py-2 text-sm">{{ l.waterGivenLiters }}</td>
              <td class="px-3 py-2 text-sm">{{ l.avgBodyWeightGrams || '-' }}</td>
              <td class="px-3 py-2 text-sm">{{ l.temperature || '-' }}</td>
              <td class="px-3 py-2 text-sm">{{ l.humidity ? l.humidity + '%' : '-' }}</td>
              <td class="px-3 py-2 text-sm text-red-600">{{ l.mortalityCount || 0 }}</td>
              <td class="px-3 py-2 text-sm">
                <button (click)="openModal(l)" class="text-blue-600 hover:underline mr-1">Edit</button>
                <button (click)="deleteLog(l._id)" class="text-red-600 hover:underline">Del</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="logs.length === 0" class="text-center py-10 text-gray-400">No daily logs for this batch. Start logging today!</div>
      </div>

      <div *ngIf="!selectedBatch && !loading" class="text-center py-16 text-gray-400">
        <div class="text-4xl mb-2">📋</div>
        Select a batch above to view and add daily logs
      </div>

      <!-- Modal -->
      <div *ngIf="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h3 class="text-xl font-bold mb-4">{{ editing ? 'Edit' : 'Add' }} Daily Log</h3>
          <form (ngSubmit)="saveLog()">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                <select [(ngModel)]="form.batch" name="batch" required class="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="">Select batch</option>
                  <option *ngFor="let b of batches" [value]="b._id">{{ b.batchNumber }} (Day {{ b.dayCount }})</option>
                </select>
              </div>
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" [(ngModel)]="form.date" name="date" required class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>

              <div class="col-span-2 border-t pt-3 mt-1">
                <p class="text-xs font-bold text-gray-500 uppercase">Feed & Water</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Feed Given (kg)</label>
                <input type="number" [(ngModel)]="form.feedGivenKg" name="feedGivenKg" min="0" step="0.1" class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Water Given (Liters)</label>
                <input type="number" [(ngModel)]="form.waterGivenLiters" name="waterGivenLiters" min="0" step="0.1" class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>

              <div class="col-span-2 border-t pt-3 mt-1">
                <p class="text-xs font-bold text-gray-500 uppercase">Body Weight</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Avg Weight (grams)</label>
                <input type="number" [(ngModel)]="form.avgBodyWeightGrams" name="avgBodyWeightGrams" min="0" class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Sample Size</label>
                <input type="number" [(ngModel)]="form.sampleSize" name="sampleSize" min="0" class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>

              <div class="col-span-2 border-t pt-3 mt-1">
                <p class="text-xs font-bold text-gray-500 uppercase">EC Shed Environment</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Temperature (°C)</label>
                <input type="number" [(ngModel)]="form.temperature" name="temperature" step="0.5" class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Humidity (%)</label>
                <input type="number" [(ngModel)]="form.humidity" name="humidity" min="0" max="100" class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Ammonia Level</label>
                <select [(ngModel)]="form.ammonia" name="ammonia" class="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="low">Low (Good)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (Bad)</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Ventilation</label>
                <select [(ngModel)]="form.ventilation" name="ventilation" class="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="good">Good</option>
                  <option value="moderate">Moderate</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Light Hours</label>
                <input type="number" [(ngModel)]="form.lightHours" name="lightHours" min="0" max="24" class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>

              <div class="col-span-2 border-t pt-3 mt-1">
                <p class="text-xs font-bold text-gray-500 uppercase">Mortality</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Dead Birds</label>
                <input type="number" [(ngModel)]="form.mortalityCount" name="mortalityCount" min="0" class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Cause</label>
                <input [(ngModel)]="form.mortalityCause" name="mortalityCause" class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>

              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea [(ngModel)]="form.notes" name="notes" rows="2" class="w-full px-3 py-2 border rounded-lg outline-none"></textarea>
              </div>
            </div>
            <div class="flex gap-3 mt-6">
              <button type="submit" class="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-medium">Save</button>
              <button type="button" (click)="showModal=false" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class DailyLogsComponent implements OnInit {
  batches: any[] = [];
  logs: any[] = [];
  analytics: any = null;
  selectedBatch = '';
  loading = false;
  showModal = false;
  editing = false;
  editId = '';
  form: any = this.getEmptyForm();

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getBatches({ status: 'active' }).subscribe({ next: (b) => this.batches = b });
  }

  getEmptyForm() {
    return {
      batch: '', date: new Date().toISOString().split('T')[0],
      feedGivenKg: 0, waterGivenLiters: 0,
      avgBodyWeightGrams: null, sampleSize: null,
      temperature: null, humidity: null, ammonia: 'low', ventilation: 'good', lightHours: null,
      mortalityCount: 0, mortalityCause: '', notes: ''
    };
  }

  onBatchChange() {
    if (this.selectedBatch) {
      this.loadLogs();
      this.loadAnalytics();
    } else {
      this.logs = [];
      this.analytics = null;
    }
  }

  loadLogs() {
    this.loading = true;
    this.api.getDailyLogs({ batchId: this.selectedBatch }).subscribe({
      next: (data) => { this.logs = data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  loadAnalytics() {
    this.api.getDailyLogAnalytics(this.selectedBatch).subscribe({
      next: (data) => this.analytics = data
    });
  }

  openModal(log?: any) {
    if (log) {
      this.editing = true;
      this.editId = log._id;
      this.form = {
        batch: log.batch?._id || log.batch, date: log.date?.split('T')[0] || '',
        feedGivenKg: log.feedGivenKg, waterGivenLiters: log.waterGivenLiters,
        avgBodyWeightGrams: log.avgBodyWeightGrams, sampleSize: log.sampleSize,
        temperature: log.temperature, humidity: log.humidity, ammonia: log.ammonia || 'low',
        ventilation: log.ventilation || 'good', lightHours: log.lightHours,
        mortalityCount: log.mortalityCount || 0, mortalityCause: log.mortalityCause || '', notes: log.notes || ''
      };
    } else {
      this.editing = false;
      this.form = { ...this.getEmptyForm(), batch: this.selectedBatch };
    }
    this.showModal = true;
  }

  saveLog() {
    const obs = this.editing ? this.api.updateDailyLog(this.editId, this.form) : this.api.createDailyLog(this.form);
    obs.subscribe({
      next: () => { this.showModal = false; this.loadLogs(); this.loadAnalytics(); this.api.getBatches({ status: 'active' }).subscribe({ next: (b) => this.batches = b }); },
      error: (err) => alert(err.error?.error || 'Error saving log')
    });
  }

  deleteLog(id: string) {
    if (confirm('Delete this log?')) {
      this.api.deleteDailyLog(id).subscribe({
        next: () => { this.loadLogs(); this.loadAnalytics(); this.api.getBatches({ status: 'active' }).subscribe({ next: (b) => this.batches = b }); }
      });
    }
  }
}
