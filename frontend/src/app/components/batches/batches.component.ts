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
        <h2 class="text-2xl ctrl-title">Batches</h2>
        <button (click)="openModal()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ New Batch</button>
      </div>

      <!-- Loading skeleton -->
      <div *ngIf="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div *ngFor="let i of [1,2,3]" class="bg-white rounded-2xl shadow-sm h-64 animate-pulse"></div>
      </div>

      <!-- Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" *ngIf="!loading && batches.length > 0">
        <div *ngFor="let b of batches" class="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all">
          <!-- Gradient header (colored by phase) -->
          <div class="p-4 text-white bg-gradient-to-br" [ngClass]="batchHeaderClass(b)">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-lg font-bold leading-tight">{{ b.batchNumber }}</h3>
                <p class="text-xs opacity-90">{{ b.breed || 'Broiler' }} · {{ b.shedType === 'ec' ? 'EC Shed' : b.shedType === 'open' ? 'Open Shed' : 'Semi Shed' }}</p>
              </div>
              <span class="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize">
                <span class="w-1.5 h-1.5 rounded-full bg-white"></span>{{ b.status }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-3">
              <span class="bg-white/25 px-2.5 py-0.5 rounded-full text-xs font-bold">Day {{ b.dayCount }}</span>
              <span class="bg-white/15 px-2 py-0.5 rounded-full text-[10px] capitalize">{{ b.phase }} phase</span>
            </div>
          </div>

          <!-- Body -->
          <div class="p-4">
            <div class="flex items-center gap-4">
              <!-- Survival ring -->
              <div class="relative shrink-0">
                <svg viewBox="0 0 64 64" class="w-16 h-16 -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#eef2f5" stroke-width="6"></circle>
                  <circle cx="32" cy="32" r="28" fill="none" [attr.stroke]="ringColor(b)" stroke-width="6" stroke-linecap="round"
                    [attr.stroke-dasharray]="ringCirc" [attr.stroke-dashoffset]="ringOffset(b)" class="transition-all"></circle>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-sm font-bold text-gray-800">{{ survival(b) | number:'1.0-0' }}%</span>
                  <span class="text-[8px] text-gray-400 uppercase tracking-wide">alive</span>
                </div>
              </div>
              <!-- Counts -->
              <div class="flex-1 grid grid-cols-2 gap-y-2 gap-x-3 text-sm">
                <div>
                  <p class="text-[10px] text-gray-400 uppercase">Arrived</p>
                  <p class="font-bold text-gray-800">{{ b.chicksArrived | number }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 uppercase">Now</p>
                  <p class="font-bold" [class.text-green-600]="b.currentCount > 0" [class.text-red-600]="b.currentCount === 0">{{ b.currentCount | number }}</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 uppercase">Mortality</p>
                  <p class="font-bold text-red-600">{{ b.mortalityPercent }}%</p>
                </div>
                <div>
                  <p class="text-[10px] text-gray-400 uppercase">House</p>
                  <p class="font-bold text-gray-800">🏠 {{ b.houseNumber || 'N/A' }}</p>
                </div>
              </div>
            </div>

            <!-- Grow-cycle progress -->
            <div class="mt-4">
              <div class="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Grow cycle</span><span>Day {{ b.dayCount }} / 42</span>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-1.5">
                <div class="h-1.5 rounded-full bg-emerald-500 transition-all" [style.width.%]="dayProgress(b)"></div>
              </div>
            </div>

            <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
              <span>📅 {{ b.arrivalDate | date:'mediumDate' }}</span>
              <div class="flex gap-3">
                <button (click)="openModal(b)" class="text-blue-600 hover:underline font-medium">Edit</button>
                <button (click)="deleteBatch(b._id)" class="text-red-600 hover:underline font-medium">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="!loading && batches.length === 0" class="bg-white rounded-2xl shadow-sm p-10 text-center">
        <div class="text-4xl mb-2">🐣</div>
        <p class="text-gray-600 font-medium mb-1">No batches yet</p>
        <p class="text-gray-400 text-sm mb-4">Add your first batch to start tracking</p>
        <button (click)="openModal()" class="bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 font-medium">+ New Batch</button>
      </div>

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
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Breed</label>
                  <input [(ngModel)]="form.breed" name="breed" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="e.g., Broiler">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Bird Type</label>
                  <select [(ngModel)]="form.birdType" name="birdType" class="w-full px-3 py-2 border rounded-lg outline-none">
                    <option value="broiler">Broiler</option>
                    <option value="layer">Layer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Shed Type</label>
                  <select [(ngModel)]="form.shedType" name="shedType" class="w-full px-3 py-2 border rounded-lg outline-none">
                    <option value="ec">EC Shed</option>
                    <option value="open">Open Shed</option>
                    <option value="semi">Semi Shed</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">House No.</label>
                  <input [(ngModel)]="form.houseNumber" name="houseNumber" class="w-full px-3 py-2 border rounded-lg outline-none">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <input [(ngModel)]="form.supplier" name="supplier" class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select [(ngModel)]="form.status" name="status" class="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="active">Active</option>
                  <option value="sold">Sold</option>
                  <option value="completed">Completed</option>
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
export class BatchesComponent implements OnInit {
  batches: any[] = [];
  loading = true;
  showModal = false;
  editing = false;
  editId = '';
  form: any = this.getEmptyForm();

  readonly ringCirc = 2 * Math.PI * 28; // survival ring circumference

  constructor(private api: ApiService) {}
  ngOnInit() { this.loadBatches(); }

  survival(b: any): number { return Math.max(0, 100 - (b?.mortalityPercent || 0)); }
  ringOffset(b: any): number { return this.ringCirc * (1 - this.survival(b) / 100); }
  dayProgress(b: any): number { return Math.min(100, Math.round(((b?.dayCount || 0) / 42) * 100)); }
  ringColor(b: any): string {
    const m = b?.mortalityPercent || 0;
    return m < 3 ? '#10b981' : m < 5 ? '#f59e0b' : '#ef4444';
  }
  batchHeaderClass(b: any): string {
    switch (b?.phase) {
      case 'starter': return 'from-amber-400 to-amber-600';
      case 'grower': return 'from-blue-500 to-blue-700';
      case 'finisher': return 'from-purple-500 to-purple-700';
      case 'mature': return 'from-gray-500 to-gray-700';
      default: return 'from-emerald-500 to-emerald-700';
    }
  }

  getEmptyForm() {
    return { batchNumber: '', chicksArrived: 0, arrivalDate: '', breed: '', birdType: 'broiler', supplier: '', shedType: 'ec', houseNumber: '', status: 'active', notes: '' };
  }

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
        birdType: batch.birdType || 'broiler', supplier: batch.supplier || '',
        shedType: batch.shedType || 'ec', houseNumber: batch.houseNumber || '',
        status: batch.status, notes: batch.notes || ''
      };
    } else {
      this.editing = false;
      this.editId = '';
      this.form = this.getEmptyForm();
    }
    this.showModal = true;
  }

  saveBatch() {
    const obs = this.editing ? this.api.updateBatch(this.editId, this.form) : this.api.createBatch(this.form);
    obs.subscribe({ next: () => { this.showModal = false; this.loadBatches(); } });
  }

  deleteBatch(id: string) {
    if (confirm('Delete this batch?')) {
      this.api.deleteBatch(id).subscribe({ next: () => this.loadBatches() });
    }
  }
}
