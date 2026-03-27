import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-batch-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Batch Expenses</h2>
        <button (click)="openModal()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ Add Expense</button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3 mb-4">
        <select [(ngModel)]="filterBatch" (ngModelChange)="loadRecords()" class="px-3 py-2 border rounded-lg text-sm outline-none">
          <option value="">All Batches</option>
          <option *ngFor="let b of batches" [value]="b._id">{{ b.batchNumber }}</option>
        </select>
        <select [(ngModel)]="filterCategory" (ngModelChange)="loadRecords()" class="px-3 py-2 border rounded-lg text-sm outline-none">
          <option value="">All Categories</option>
          <option *ngFor="let c of categories" [value]="c">{{ c | titlecase }}</option>
        </select>
      </div>

      <!-- Summary per batch -->
      <div *ngIf="filterBatch && summary" class="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h3 class="font-semibold text-gray-800 mb-3">Expense Summary</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div *ngFor="let cat of summary.categories" class="bg-gray-50 rounded-lg p-3">
            <p class="text-xs text-gray-500 capitalize">{{ cat._id }}</p>
            <p class="font-bold text-gray-800">₹{{ cat.total | number:'1.2-2' }}</p>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t text-right">
          <span class="font-bold text-lg text-red-600">Total: ₹{{ summary.totalExpense | number:'1.2-2' }}</span>
        </div>
      </div>

      <div *ngIf="loading" class="text-center py-10 text-gray-500">Loading...</div>

      <div class="bg-white rounded-xl shadow-sm overflow-x-auto" *ngIf="!loading">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of records" class="border-t hover:bg-gray-50">
              <td class="px-4 py-3 text-sm">{{ r.date | date:'mediumDate' }}</td>
              <td class="px-4 py-3 text-sm font-medium">{{ r.batch?.batchNumber || 'N/A' }}</td>
              <td class="px-4 py-3 text-sm">
                <span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 capitalize">{{ r.category }}</span>
              </td>
              <td class="px-4 py-3 text-sm">{{ r.description }}</td>
              <td class="px-4 py-3 text-sm font-bold text-red-600">₹{{ r.amount | number:'1.2-2' }}</td>
              <td class="px-4 py-3 text-sm">
                <button (click)="openModal(r)" class="text-blue-600 hover:underline mr-2">Edit</button>
                <button (click)="deleteRecord(r._id)" class="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="records.length === 0" class="text-center py-10 text-gray-400">No batch expenses recorded.</div>
      </div>

      <!-- Modal -->
      <div *ngIf="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <h3 class="text-xl font-bold mb-4">{{ editing ? 'Edit' : 'Add' }} Batch Expense</h3>
          <form (ngSubmit)="saveRecord()">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                <select [(ngModel)]="form.batch" name="batch" required class="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="">Select batch</option>
                  <option *ngFor="let b of batches" [value]="b._id">{{ b.batchNumber }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" [(ngModel)]="form.date" name="date" required class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select [(ngModel)]="form.category" name="category" required class="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="">Select category</option>
                  <option *ngFor="let c of categories" [value]="c">{{ c | titlecase }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input [(ngModel)]="form.description" name="description" required class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="e.g., Monthly electricity bill">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input type="number" [(ngModel)]="form.amount" name="amount" required min="0" step="0.01" class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Quantity/Unit</label>
                <input [(ngModel)]="form.quantity" name="quantity" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="e.g., 500 liters, 100 units">
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
export class BatchExpensesComponent implements OnInit {
  records: any[] = [];
  batches: any[] = [];
  summary: any = null;
  loading = true;
  showModal = false;
  editing = false;
  editId = '';
  filterBatch = '';
  filterCategory = '';
  categories = ['electricity', 'diesel', 'medicine', 'water', 'feed', 'labor', 'vaccination', 'equipment', 'transport', 'other'];
  form: any = { batch: '', date: '', category: '', description: '', amount: 0, quantity: '', notes: '' };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getBatches().subscribe({ next: (b) => this.batches = b });
    this.loadRecords();
  }

  loadRecords() {
    this.loading = true;
    const params: any = {};
    if (this.filterBatch) params['batchId'] = this.filterBatch;
    if (this.filterCategory) params['category'] = this.filterCategory;
    this.api.getBatchExpenses(params).subscribe({
      next: (data) => { this.records = data; this.loading = false; },
      error: () => this.loading = false
    });
    if (this.filterBatch) {
      this.api.getBatchExpenseSummary(this.filterBatch).subscribe({ next: (s) => this.summary = s });
    } else {
      this.summary = null;
    }
  }

  openModal(record?: any) {
    if (record) {
      this.editing = true;
      this.editId = record._id;
      this.form = { batch: record.batch?._id || record.batch, date: record.date?.split('T')[0] || '', category: record.category, description: record.description, amount: record.amount, quantity: record.quantity || '', notes: record.notes || '' };
    } else {
      this.editing = false;
      this.form = { batch: this.filterBatch || '', date: '', category: '', description: '', amount: 0, quantity: '', notes: '' };
    }
    this.showModal = true;
  }

  saveRecord() {
    const obs = this.editing ? this.api.updateBatchExpense(this.editId, this.form) : this.api.createBatchExpense(this.form);
    obs.subscribe({ next: () => { this.showModal = false; this.loadRecords(); } });
  }

  deleteRecord(id: string) {
    if (confirm('Delete this expense?')) {
      this.api.deleteBatchExpense(id).subscribe({ next: () => this.loadRecords() });
    }
  }
}
