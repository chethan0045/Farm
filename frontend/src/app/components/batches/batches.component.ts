import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-batches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Batches</h2>
        <button (click)="openModal()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ New Batch</button>
      </div>

      <div *ngIf="loading" class="text-center py-10 text-gray-500">Loading...</div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" *ngIf="!loading">
        <div *ngFor="let b of batches" class="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h3 class="text-lg font-bold text-gray-800">{{ b.batchNumber }}</h3>
              <p class="text-sm text-gray-500">{{ b.breed }}</p>
            </div>
            <span class="px-2 py-1 text-xs rounded-full font-medium"
              [class.bg-green-100]="b.status==='active'" [class.text-green-700]="b.status==='active'"
              [class.bg-blue-100]="b.status==='sold'" [class.text-blue-700]="b.status==='sold'"
              [class.bg-gray-100]="b.status==='completed'" [class.text-gray-600]="b.status==='completed'">
              {{ b.status }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="bg-gray-50 rounded-lg p-2">
              <p class="text-gray-500 text-xs">Arrived</p>
              <p class="font-bold text-gray-800">{{ b.chicksArrived }}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-2">
              <p class="text-gray-500 text-xs">Current</p>
              <p class="font-bold" [class.text-green-600]="b.currentCount > 0" [class.text-red-600]="b.currentCount === 0">{{ b.currentCount }}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-2">
              <p class="text-gray-500 text-xs">House</p>
              <p class="font-bold text-gray-800">{{ b.houseNumber || 'N/A' }}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-2">
              <p class="text-gray-500 text-xs">Arrival Date</p>
              <p class="font-bold text-gray-800 text-xs">{{ b.arrivalDate | date:'mediumDate' }}</p>
            </div>
          </div>
          <div *ngIf="b.supplier" class="mt-2 text-xs text-gray-500">Supplier: {{ b.supplier }}</div>
          <div *ngIf="b.costPerChick" class="text-xs text-gray-500">Cost/chick: ₹{{ b.costPerChick }}</div>
          <div class="mt-3 flex gap-2 border-t pt-3">
            <button (click)="openModal(b)" class="text-sm text-blue-600 hover:underline">Edit</button>
            <button (click)="deleteBatch(b._id)" class="text-sm text-red-600 hover:underline">Delete</button>
          </div>
        </div>
      </div>

      <div *ngIf="!loading && batches.length === 0" class="text-center py-10 text-gray-400">No batches yet. Add your first batch!</div>

      <!-- Modal -->
      <div *ngIf="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <h3 class="text-xl font-bold mb-4">{{ editing ? 'Edit' : 'New' }} Batch</h3>
          <form (ngSubmit)="saveBatch()">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Batch Number *</label>
                <input [(ngModel)]="form.batchNumber" name="batchNumber" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g., B-001">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">No. of Chicks Arrived *</label>
                <input type="number" [(ngModel)]="form.chicksArrived" name="chicksArrived" required min="1" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Arrival Date *</label>
                <input type="date" [(ngModel)]="form.arrivalDate" name="arrivalDate" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                <input [(ngModel)]="form.breed" name="breed" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g., Broiler, Layer">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <input [(ngModel)]="form.supplier" name="supplier" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Cost per Chick (₹)</label>
                <input type="number" [(ngModel)]="form.costPerChick" name="costPerChick" min="0" step="0.5" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">House Number</label>
                <input [(ngModel)]="form.houseNumber" name="houseNumber" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select [(ngModel)]="form.status" name="status" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="active">Active</option>
                  <option value="sold">Sold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea [(ngModel)]="form.notes" name="notes" rows="2" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"></textarea>
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
export class BatchesComponent implements OnInit {
  batches: any[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editId = '';
  form: any = { batchNumber: '', chicksArrived: 0, arrivalDate: '', breed: '', supplier: '', costPerChick: 0, houseNumber: '', status: 'active', notes: '' };

  constructor(private api: ApiService) {}
  ngOnInit() { this.loadBatches(); }

  loadBatches() {
    this.loading = true;
    this.api.getBatches().subscribe({
      next: (data) => { this.batches = data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  openModal(batch?: any) {
    if (batch) {
      this.editing = true;
      this.editId = batch._id;
      this.form = {
        batchNumber: batch.batchNumber, chicksArrived: batch.chicksArrived,
        arrivalDate: batch.arrivalDate?.split('T')[0] || '', breed: batch.breed || '',
        supplier: batch.supplier || '', costPerChick: batch.costPerChick || 0,
        houseNumber: batch.houseNumber || '', status: batch.status, notes: batch.notes || ''
      };
    } else {
      this.editing = false;
      this.editId = '';
      this.form = { batchNumber: '', chicksArrived: 0, arrivalDate: '', breed: '', supplier: '', costPerChick: 0, houseNumber: '', status: 'active', notes: '' };
    }
    this.showModal = true;
  }

  saveBatch() {
    const obs = this.editing ? this.api.updateBatch(this.editId, this.form) : this.api.createBatch(this.form);
    obs.subscribe({ next: () => { this.showModal = false; this.loadBatches(); } });
  }

  deleteBatch(id: string) {
    if (confirm('Delete this batch? All related records will remain.')) {
      this.api.deleteBatch(id).subscribe({ next: () => this.loadBatches() });
    }
  }
}
