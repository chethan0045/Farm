import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Finance</h2>
        <button (click)="openModal()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ Add Record</button>
      </div>

      <!-- Summary -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" *ngIf="summary">
        <div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
          <p class="text-xs text-gray-500 uppercase tracking-wide">Total Income</p>
          <p class="text-2xl font-bold text-green-600 mt-1">₹{{ summary.totalIncome | number:'1.2-2' }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-red-500">
          <p class="text-xs text-gray-500 uppercase tracking-wide">Total Expenses</p>
          <p class="text-2xl font-bold text-red-600 mt-1">₹{{ summary.totalExpenses | number:'1.2-2' }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
          <p class="text-xs text-gray-500 uppercase tracking-wide">Net Profit</p>
          <p class="text-2xl font-bold mt-1" [class.text-green-600]="summary.profit >= 0" [class.text-red-600]="summary.profit < 0">
            ₹{{ summary.profit | number:'1.2-2' }}
          </p>
        </div>
      </div>

      <!-- Filter -->
      <div class="mb-4 flex gap-2">
        <button (click)="filterType=''; loadRecords()" [class.bg-emerald-600]="filterType===''" [class.text-white]="filterType===''"
          class="px-4 py-1.5 rounded-lg text-sm border font-medium">All</button>
        <button (click)="filterType='income'; loadRecords()" [class.bg-green-600]="filterType==='income'" [class.text-white]="filterType==='income'"
          class="px-4 py-1.5 rounded-lg text-sm border font-medium">Income</button>
        <button (click)="filterType='expense'; loadRecords()" [class.bg-red-600]="filterType==='expense'" [class.text-white]="filterType==='expense'"
          class="px-4 py-1.5 rounded-lg text-sm border font-medium">Expenses</button>
      </div>

      <div *ngIf="loading" class="text-center py-10 text-gray-500">Loading...</div>

      <div class="bg-white rounded-xl shadow-sm overflow-x-auto" *ngIf="!loading">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of records" class="border-t hover:bg-gray-50">
              <td class="px-4 py-3 text-sm">{{ r.date | date:'mediumDate' }}</td>
              <td class="px-4 py-3 text-sm">
                <span class="px-2 py-1 text-xs rounded-full font-medium"
                  [class.bg-green-100]="r.type==='income'" [class.text-green-700]="r.type==='income'"
                  [class.bg-red-100]="r.type==='expense'" [class.text-red-700]="r.type==='expense'">
                  {{ r.type }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm">{{ r.category }}</td>
              <td class="px-4 py-3 text-sm">{{ r.description }}</td>
              <td class="px-4 py-3 text-sm">{{ r.batch?.batchNumber || '-' }}</td>
              <td class="px-4 py-3 text-sm font-bold" [class.text-green-600]="r.type==='income'" [class.text-red-600]="r.type==='expense'">
                ₹{{ r.amount | number:'1.2-2' }}
              </td>
              <td class="px-4 py-3 text-sm">
                <button (click)="openModal(r)" class="text-blue-600 hover:underline mr-2">Edit</button>
                <button (click)="deleteRecord(r._id)" class="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="records.length === 0" class="text-center py-10 text-gray-400">No finance records.</div>
      </div>

      <!-- Modal -->
      <div *ngIf="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-md">
          <h3 class="text-xl font-bold mb-4">{{ editing ? 'Edit' : 'Add' }} Finance Record</h3>
          <form (ngSubmit)="saveRecord()">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select [(ngModel)]="form.type" name="type" required class="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <input [(ngModel)]="form.category" name="category" required class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="e.g., Bird Sales, Feed Purchase">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input [(ngModel)]="form.description" name="description" required class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input type="number" [(ngModel)]="form.amount" name="amount" required min="0" step="0.01" class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" [(ngModel)]="form.date" name="date" required class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Batch (optional)</label>
                <select [(ngModel)]="form.batch" name="batch" class="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="">None</option>
                  <option *ngFor="let b of batches" [value]="b._id">{{ b.batchNumber }}</option>
                </select>
              </div>
              <div>
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
export class FinanceComponent implements OnInit {
  records: any[] = [];
  batches: any[] = [];
  summary: any = null;
  loading = true;
  showModal = false;
  editing = false;
  editId = '';
  filterType = '';
  form: any = { type: 'income', category: '', description: '', amount: 0, date: '', batch: '', notes: '' };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getBatches().subscribe({ next: (b) => this.batches = b });
    this.api.getFinanceSummary().subscribe({ next: (s) => this.summary = s });
    this.loadRecords();
  }

  loadRecords() {
    this.loading = true;
    const params = this.filterType ? { type: this.filterType } : {};
    this.api.getFinance(params).subscribe({
      next: (data) => { this.records = data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  openModal(record?: any) {
    if (record) {
      this.editing = true;
      this.editId = record._id;
      this.form = { type: record.type, category: record.category, description: record.description, amount: record.amount, date: record.date?.split('T')[0] || '', batch: record.batch?._id || '', notes: record.notes || '' };
    } else {
      this.editing = false;
      this.form = { type: 'income', category: '', description: '', amount: 0, date: '', batch: '', notes: '' };
    }
    this.showModal = true;
  }

  saveRecord() {
    const data = { ...this.form };
    if (!data.batch) delete data.batch;
    const obs = this.editing ? this.api.updateFinance(this.editId, data) : this.api.createFinance(data);
    obs.subscribe({
      next: () => {
        this.showModal = false;
        this.loadRecords();
        this.api.getFinanceSummary().subscribe({ next: (s) => this.summary = s });
      }
    });
  }

  deleteRecord(id: string) {
    if (confirm('Delete this record?')) {
      this.api.deleteFinance(id).subscribe({
        next: () => {
          this.loadRecords();
          this.api.getFinanceSummary().subscribe({ next: (s) => this.summary = s });
        }
      });
    }
  }
}
