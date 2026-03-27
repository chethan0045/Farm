import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-mortality',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Mortality Records</h2>
        <button (click)="openModal()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ Record Mortality</button>
      </div>

      <!-- Filter -->
      <div class="mb-4">
        <select [(ngModel)]="filterBatch" (ngModelChange)="loadRecords()" class="px-3 py-2 border rounded-lg text-sm outline-none">
          <option value="">All Batches</option>
          <option *ngFor="let b of batches" [value]="b._id">{{ b.batchNumber }}</option>
        </select>
      </div>

      <div *ngIf="loading" class="text-center py-10 text-gray-500">Loading...</div>

      <div class="bg-white rounded-xl shadow-sm overflow-x-auto" *ngIf="!loading">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cause</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of records" class="border-t hover:bg-gray-50">
              <td class="px-4 py-3 text-sm">{{ r.date | date:'mediumDate' }}</td>
              <td class="px-4 py-3 text-sm font-medium">{{ r.batch?.batchNumber || 'N/A' }}</td>
              <td class="px-4 py-3 text-sm font-bold text-red-600">{{ r.count }}</td>
              <td class="px-4 py-3 text-sm">{{ r.cause || 'Unknown' }}</td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ r.notes || '-' }}</td>
              <td class="px-4 py-3 text-sm">
                <button (click)="deleteRecord(r._id)" class="text-red-600 hover:underline text-sm">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="records.length === 0" class="text-center py-10 text-gray-400">No mortality records.</div>
      </div>

      <!-- Modal -->
      <div *ngIf="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-md">
          <h3 class="text-xl font-bold mb-4">Record Mortality</h3>
          <form (ngSubmit)="saveRecord()">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                <select [(ngModel)]="form.batch" name="batch" required class="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="">Select batch</option>
                  <option *ngFor="let b of batches" [value]="b._id">{{ b.batchNumber }} ({{ b.currentCount }} birds)</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" [(ngModel)]="form.date" name="date" required class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Count *</label>
                <input type="number" [(ngModel)]="form.count" name="count" required min="1" class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Cause</label>
                <input [(ngModel)]="form.cause" name="cause" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="e.g., Disease, Heat stress, Predator">
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
export class MortalityComponent implements OnInit {
  records: any[] = [];
  batches: any[] = [];
  loading = true;
  showModal = false;
  filterBatch = '';
  form = { batch: '', date: '', count: 1, cause: '', notes: '' };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getBatches().subscribe({ next: (b) => this.batches = b });
    this.loadRecords();
  }

  loadRecords() {
    this.loading = true;
    const params = this.filterBatch ? { batchId: this.filterBatch } : {};
    this.api.getMortality(params).subscribe({
      next: (data) => { this.records = data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  openModal() {
    this.form = { batch: '', date: '', count: 1, cause: '', notes: '' };
    this.showModal = true;
  }

  saveRecord() {
    this.api.createMortality(this.form).subscribe({
      next: () => {
        this.showModal = false;
        this.loadRecords();
        this.api.getBatches().subscribe({ next: (b) => this.batches = b });
      }
    });
  }

  deleteRecord(id: string) {
    if (confirm('Delete this mortality record? Bird count will be restored.')) {
      this.api.deleteMortality(id).subscribe({
        next: () => {
          this.loadRecords();
          this.api.getBatches().subscribe({ next: (b) => this.batches = b });
        }
      });
    }
  }
}
