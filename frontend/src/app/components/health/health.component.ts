import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl ctrl-title">Health & Vaccination</h2>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button (click)="activeTab='vaccinations'" [class]="activeTab==='vaccinations' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-800'" class="px-4 py-2 rounded-lg text-sm font-medium transition">Vaccinations</button>
        <button (click)="activeTab='healthLogs'" [class]="activeTab==='healthLogs' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-800'" class="px-4 py-2 rounded-lg text-sm font-medium transition">Health Logs</button>
      </div>

      <!-- ==================== VACCINATIONS TAB ==================== -->
      <div *ngIf="activeTab === 'vaccinations'">
        <div class="flex justify-between items-center mb-4">
          <div class="flex flex-wrap gap-3">
            <select [(ngModel)]="vacFilterBatch" (ngModelChange)="loadVaccinations()" class="px-3 py-2 border rounded-lg text-sm outline-none">
              <option value="">All Batches</option>
              <option *ngFor="let b of batches" [value]="b._id">{{ b.batchNumber }}</option>
            </select>
            <select [(ngModel)]="vacFilterStatus" (ngModelChange)="loadVaccinations()" class="px-3 py-2 border rounded-lg text-sm outline-none">
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
            </select>
          </div>
          <button (click)="openVacModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">+ Add Vaccination</button>
        </div>

        <!-- Loading skeletons -->
        <div *ngIf="vacLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let s of [1,2,3,4,5,6]" class="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
            <div class="h-1.5 bg-gray-200"></div>
            <div class="p-4 space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gray-200"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div class="h-2 bg-gray-100 rounded w-1/3"></div>
                </div>
              </div>
              <div class="flex gap-2">
                <div class="h-5 bg-gray-100 rounded-lg w-16"></div>
                <div class="h-5 bg-gray-100 rounded-lg w-20"></div>
              </div>
              <div class="h-8 bg-gray-100 rounded-lg"></div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="!vacLoading && vaccinations.length === 0" class="bg-white rounded-2xl shadow-sm py-16 text-center">
          <div class="text-5xl mb-3">💉</div>
          <p class="text-gray-500 font-medium mb-1">No vaccinations recorded</p>
          <p class="text-gray-400 text-sm mb-5">Schedule your first vaccination to keep your flock protected.</p>
          <button (click)="openVacModal()" class="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">+ Add Vaccination</button>
        </div>

        <!-- Vaccination cards -->
        <div *ngIf="!vacLoading && vaccinations.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let v of vaccinations" class="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all">
            <div [class]="vacAccentClass(v.status)"></div>
            <div class="p-4">
              <div class="flex items-start justify-between gap-2 mb-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-lg shrink-0">💉</div>
                  <div class="min-w-0">
                    <p class="font-semibold text-gray-800 truncate">{{ v.vaccineName }}</p>
                    <p class="text-xs text-gray-500 flex items-center gap-1">🐔 {{ v.batch?.batchNumber || 'N/A' }}</p>
                  </div>
                </div>
                <span class="px-2 py-1 text-[11px] rounded-full font-medium whitespace-nowrap" [class]="vacBadgeClass(v.status)">{{ v.status | titlecase }}</span>
              </div>

              <div class="flex flex-wrap gap-1.5 mb-3">
                <span class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px]">📅 {{ v.scheduledDate | date:'mediumDate' }}</span>
                <span *ngIf="v.administeredDate" class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px]">✅ {{ v.administeredDate | date:'mediumDate' }}</span>
                <span *ngIf="v.method" class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px] capitalize">💊 {{ v.method?.replace('_', ' ') }}</span>
                <span *ngIf="v.dosage" class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px]">{{ v.dosage }}</span>
                <span *ngIf="v.cost" class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px] font-semibold">₹{{ v.cost | number:'1.2-2' }}</span>
              </div>

              <div class="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button (click)="openVacModal(v)" class="flex-1 text-blue-600 hover:bg-blue-50 rounded-lg py-1.5 text-sm font-medium transition">Edit</button>
                <button (click)="deleteVaccination(v._id)" class="flex-1 text-red-600 hover:bg-red-50 rounded-lg py-1.5 text-sm font-medium transition">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== HEALTH LOGS TAB ==================== -->
      <div *ngIf="activeTab === 'healthLogs'">
        <div class="flex justify-between items-center mb-4">
          <div class="flex flex-wrap gap-3">
            <select [(ngModel)]="hlFilterBatch" (ngModelChange)="loadHealthLogs()" class="px-3 py-2 border rounded-lg text-sm outline-none">
              <option value="">All Batches</option>
              <option *ngFor="let b of batches" [value]="b._id">{{ b.batchNumber }}</option>
            </select>
            <select [(ngModel)]="hlFilterType" (ngModelChange)="loadHealthLogs()" class="px-3 py-2 border rounded-lg text-sm outline-none">
              <option value="">All Types</option>
              <option value="disease">Disease</option>
              <option value="treatment">Treatment</option>
              <option value="observation">Observation</option>
              <option value="checkup">Checkup</option>
            </select>
            <select [(ngModel)]="hlFilterSeverity" (ngModelChange)="loadHealthLogs()" class="px-3 py-2 border rounded-lg text-sm outline-none">
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <button (click)="openHlModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">+ Add Health Log</button>
        </div>

        <!-- Loading skeletons -->
        <div *ngIf="hlLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let s of [1,2,3,4,5,6]" class="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
            <div class="h-1.5 bg-gray-200"></div>
            <div class="p-4 space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gray-200"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div class="h-2 bg-gray-100 rounded w-1/3"></div>
                </div>
              </div>
              <div class="flex gap-2">
                <div class="h-5 bg-gray-100 rounded-lg w-16"></div>
                <div class="h-5 bg-gray-100 rounded-lg w-20"></div>
              </div>
              <div class="h-8 bg-gray-100 rounded-lg"></div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="!hlLoading && healthLogs.length === 0" class="bg-white rounded-2xl shadow-sm py-16 text-center">
          <div class="text-5xl mb-3">🦠</div>
          <p class="text-gray-500 font-medium mb-1">No health logs recorded</p>
          <p class="text-gray-400 text-sm mb-5">Log diseases, treatments and observations to track flock health.</p>
          <button (click)="openHlModal()" class="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">+ Add Health Log</button>
        </div>

        <!-- Health log cards -->
        <div *ngIf="!hlLoading && healthLogs.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let h of healthLogs" class="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all">
            <div [class]="hlAccentClass(h.severity)"></div>
            <div class="p-4">
              <div class="flex items-start justify-between gap-2 mb-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-lg shrink-0">{{ hlIcon(h.type) }}</div>
                  <div class="min-w-0">
                    <p class="font-semibold text-gray-800 truncate">{{ h.disease || (h.type | titlecase) || 'Health Log' }}</p>
                    <p class="text-xs text-gray-500 flex items-center gap-1">🐔 {{ h.batch?.batchNumber || 'N/A' }}</p>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-1">
                  <span *ngIf="h.severity" class="px-2 py-1 text-[11px] rounded-full font-medium whitespace-nowrap" [class]="hlBadgeClass(h.severity)">{{ h.severity | titlecase }}</span>
                  <span *ngIf="h.resolved" class="px-2 py-0.5 text-[10px] rounded-full font-medium bg-green-100 text-green-700">Resolved</span>
                  <span *ngIf="!h.resolved" class="px-2 py-0.5 text-[10px] rounded-full font-medium bg-red-100 text-red-700">Open</span>
                </div>
              </div>

              <div class="flex flex-wrap gap-1.5 mb-3">
                <span class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px]">📅 {{ h.date | date:'mediumDate' }}</span>
                <span class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px] capitalize">{{ h.type }}</span>
                <span *ngIf="h.medicine" class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px]">💊 {{ h.medicine }}</span>
                <span *ngIf="h.cost" class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px] font-semibold">₹{{ h.cost | number:'1.2-2' }}</span>
              </div>

              <p *ngIf="h.symptoms" class="text-xs text-gray-500 mb-3 line-clamp-2">{{ h.symptoms }}</p>

              <div class="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button (click)="openHlModal(h)" class="flex-1 text-blue-600 hover:bg-blue-50 rounded-lg py-1.5 text-sm font-medium transition">Edit</button>
                <button (click)="deleteHealthLog(h._id)" class="flex-1 text-red-600 hover:bg-red-50 rounded-lg py-1.5 text-sm font-medium transition">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== VACCINATION MODAL ==================== -->
      <div *ngIf="showVacModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h3 class="text-xl font-bold mb-4">{{ vacEditing ? 'Edit' : 'Add' }} Vaccination</h3>
          <form (ngSubmit)="saveVaccination()">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                <select [(ngModel)]="vacForm.batch" name="batch" required class="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="">Select batch</option>
                  <option *ngFor="let b of batches" [value]="b._id">{{ b.batchNumber }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vaccine Name *</label>
                <input [(ngModel)]="vacForm.vaccineName" name="vaccineName" required class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="e.g., Newcastle Disease">
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Scheduled Date *</label>
                  <input type="date" [(ngModel)]="vacForm.scheduledDate" name="scheduledDate" required class="w-full px-3 py-2 border rounded-lg outline-none">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Administered Date</label>
                  <input type="date" [(ngModel)]="vacForm.administeredDate" name="administeredDate" class="w-full px-3 py-2 border rounded-lg outline-none">
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Day Number</label>
                  <input type="number" [(ngModel)]="vacForm.dayNumber" name="dayNumber" min="0" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="e.g., 7">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                  <input [(ngModel)]="vacForm.dosage" name="dosage" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="e.g., 0.5ml per bird">
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select [(ngModel)]="vacForm.method" name="method" class="w-full px-3 py-2 border rounded-lg outline-none">
                    <option value="">Select method</option>
                    <option value="drinking_water">Drinking Water</option>
                    <option value="eye_drop">Eye Drop</option>
                    <option value="injection">Injection</option>
                    <option value="spray">Spray</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select [(ngModel)]="vacForm.status" name="status" required class="w-full px-3 py-2 border rounded-lg outline-none">
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Administered By</label>
                  <input [(ngModel)]="vacForm.administeredBy" name="administeredBy" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="e.g., Dr. Vet">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Cost (₹)</label>
                  <input type="number" [(ngModel)]="vacForm.cost" name="cost" min="0" step="0.01" class="w-full px-3 py-2 border rounded-lg outline-none">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea [(ngModel)]="vacForm.notes" name="notes" rows="2" class="w-full px-3 py-2 border rounded-lg outline-none"></textarea>
              </div>
            </div>
            <div class="flex gap-3 mt-6">
              <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">Save</button>
              <button type="button" (click)="showVacModal=false" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ==================== HEALTH LOG MODAL ==================== -->
      <div *ngIf="showHlModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h3 class="text-xl font-bold mb-4">{{ hlEditing ? 'Edit' : 'Add' }} Health Log</h3>
          <form (ngSubmit)="saveHealthLog()">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                <select [(ngModel)]="hlForm.batch" name="batch" required class="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="">Select batch</option>
                  <option *ngFor="let b of batches" [value]="b._id">{{ b.batchNumber }}</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" [(ngModel)]="hlForm.date" name="date" required class="w-full px-3 py-2 border rounded-lg outline-none">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select [(ngModel)]="hlForm.type" name="type" required class="w-full px-3 py-2 border rounded-lg outline-none">
                    <option value="">Select type</option>
                    <option value="disease">Disease</option>
                    <option value="treatment">Treatment</option>
                    <option value="observation">Observation</option>
                    <option value="checkup">Checkup</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Disease</label>
                <input [(ngModel)]="hlForm.disease" name="disease" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="e.g., Coccidiosis">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Symptoms</label>
                <textarea [(ngModel)]="hlForm.symptoms" name="symptoms" rows="2" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Describe symptoms observed"></textarea>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Medicine</label>
                  <input [(ngModel)]="hlForm.medicine" name="medicine" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="e.g., Amprolium">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                  <input [(ngModel)]="hlForm.dosage" name="dosage" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="e.g., 1g per liter">
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select [(ngModel)]="hlForm.severity" name="severity" class="w-full px-3 py-2 border rounded-lg outline-none">
                    <option value="">Select severity</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Cost (₹)</label>
                  <input type="number" [(ngModel)]="hlForm.cost" name="cost" min="0" step="0.01" class="w-full px-3 py-2 border rounded-lg outline-none">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Affected Count</label>
                <input type="number" [(ngModel)]="hlForm.affectedCount" name="affectedCount" min="0" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Number of birds affected">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Treatment Duration (days)</label>
                <input type="number" [(ngModel)]="hlForm.treatmentDuration" name="treatmentDuration" min="0" class="w-full px-3 py-2 border rounded-lg outline-none">
              </div>
              <div class="flex items-center gap-2">
                <input type="checkbox" [(ngModel)]="hlForm.resolved" name="resolved" id="resolved" class="h-4 w-4 text-emerald-600 rounded">
                <label for="resolved" class="text-sm font-medium text-gray-700">Resolved</label>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea [(ngModel)]="hlForm.notes" name="notes" rows="2" class="w-full px-3 py-2 border rounded-lg outline-none"></textarea>
              </div>
            </div>
            <div class="flex gap-3 mt-6">
              <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">Save</button>
              <button type="button" (click)="showHlModal=false" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class HealthComponent implements OnInit {
  activeTab: 'vaccinations' | 'healthLogs' = 'vaccinations';
  batches: any[] = [];

  // Vaccinations
  vaccinations: any[] = [];
  vacLoading = true;
  showVacModal = false;
  vacEditing = false;
  vacEditId = '';
  vacFilterBatch = '';
  vacFilterStatus = '';
  vacForm: any = this.getEmptyVacForm();

  // Health Logs
  healthLogs: any[] = [];
  hlLoading = true;
  showHlModal = false;
  hlEditing = false;
  hlEditId = '';
  hlFilterBatch = '';
  hlFilterType = '';
  hlFilterSeverity = '';
  hlForm: any = this.getEmptyHlForm();

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getBatches().subscribe({ next: (b) => this.batches = b });
    this.loadVaccinations();
    this.loadHealthLogs();
  }

  // ==================== UI HELPERS (full class strings for Tailwind v4) ====================

  vacBadgeClass(status: string): string {
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'missed') return 'bg-red-100 text-red-700';
    return 'bg-blue-100 text-blue-700';
  }

  vacAccentClass(status: string): string {
    if (status === 'completed') return 'h-1.5 bg-green-500';
    if (status === 'missed') return 'h-1.5 bg-red-500';
    return 'h-1.5 bg-blue-500';
  }

  hlBadgeClass(severity: string): string {
    if (severity === 'low') return 'bg-blue-100 text-blue-700';
    if (severity === 'medium') return 'bg-yellow-100 text-yellow-700';
    if (severity === 'high') return 'bg-orange-100 text-orange-700';
    if (severity === 'critical') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  }

  hlAccentClass(severity: string): string {
    if (severity === 'low') return 'h-1.5 bg-blue-500';
    if (severity === 'medium') return 'h-1.5 bg-yellow-500';
    if (severity === 'high') return 'h-1.5 bg-orange-500';
    if (severity === 'critical') return 'h-1.5 bg-red-500';
    return 'h-1.5 bg-gray-300';
  }

  hlIcon(type: string): string {
    if (type === 'disease') return '🦠';
    if (type === 'treatment') return '💊';
    return '🐔';
  }

  // ==================== VACCINATION METHODS ====================

  getEmptyVacForm() {
    return {
      batch: '', vaccineName: '', scheduledDate: '', administeredDate: '',
      dayNumber: null, dosage: '', method: '', status: 'scheduled',
      administeredBy: '', cost: null, notes: ''
    };
  }

  loadVaccinations() {
    this.vacLoading = true;
    const params: any = {};
    if (this.vacFilterBatch) params['batchId'] = this.vacFilterBatch;
    if (this.vacFilterStatus) params['status'] = this.vacFilterStatus;
    this.api.getVaccinations(params).subscribe({
      next: (data) => { this.vaccinations = data; this.vacLoading = false; },
      error: () => this.vacLoading = false
    });
  }

  openVacModal(record?: any) {
    if (record) {
      this.vacEditing = true;
      this.vacEditId = record._id;
      this.vacForm = {
        batch: record.batch?._id || record.batch,
        vaccineName: record.vaccineName || '',
        scheduledDate: record.scheduledDate?.split('T')[0] || '',
        administeredDate: record.administeredDate?.split('T')[0] || '',
        dayNumber: record.dayNumber ?? null,
        dosage: record.dosage || '',
        method: record.method || '',
        status: record.status || 'scheduled',
        administeredBy: record.administeredBy || '',
        cost: record.cost ?? null,
        notes: record.notes || ''
      };
    } else {
      this.vacEditing = false;
      this.vacForm = { ...this.getEmptyVacForm(), batch: this.vacFilterBatch || '' };
    }
    this.showVacModal = true;
  }

  saveVaccination() {
    const obs = this.vacEditing
      ? this.api.updateVaccination(this.vacEditId, this.vacForm)
      : this.api.createVaccination(this.vacForm);
    obs.subscribe({ next: () => { this.showVacModal = false; this.loadVaccinations(); } });
  }

  deleteVaccination(id: string) {
    if (confirm('Delete this vaccination record?')) {
      this.api.deleteVaccination(id).subscribe({ next: () => this.loadVaccinations() });
    }
  }

  // ==================== HEALTH LOG METHODS ====================

  getEmptyHlForm() {
    return {
      batch: '', date: '', type: '', disease: '', symptoms: '',
      medicine: '', dosage: '', severity: '', cost: null,
      affectedCount: null, treatmentDuration: null, resolved: false, notes: ''
    };
  }

  loadHealthLogs() {
    this.hlLoading = true;
    const params: any = {};
    if (this.hlFilterBatch) params['batchId'] = this.hlFilterBatch;
    if (this.hlFilterType) params['type'] = this.hlFilterType;
    if (this.hlFilterSeverity) params['severity'] = this.hlFilterSeverity;
    this.api.getHealthLogs(params).subscribe({
      next: (data) => { this.healthLogs = data; this.hlLoading = false; },
      error: () => this.hlLoading = false
    });
  }

  openHlModal(record?: any) {
    if (record) {
      this.hlEditing = true;
      this.hlEditId = record._id;
      this.hlForm = {
        batch: record.batch?._id || record.batch,
        date: record.date?.split('T')[0] || '',
        type: record.type || '',
        disease: record.disease || '',
        symptoms: record.symptoms || '',
        medicine: record.medicine || '',
        dosage: record.dosage || '',
        severity: record.severity || '',
        cost: record.cost ?? null,
        affectedCount: record.affectedCount ?? null,
        treatmentDuration: record.treatmentDuration ?? null,
        resolved: record.resolved || false,
        notes: record.notes || ''
      };
    } else {
      this.hlEditing = false;
      this.hlForm = { ...this.getEmptyHlForm(), batch: this.hlFilterBatch || '' };
    }
    this.showHlModal = true;
  }

  saveHealthLog() {
    const obs = this.hlEditing
      ? this.api.updateHealthLog(this.hlEditId, this.hlForm)
      : this.api.createHealthLog(this.hlForm);
    obs.subscribe({ next: () => { this.showHlModal = false; this.loadHealthLogs(); } });
  }

  deleteHealthLog(id: string) {
    if (confirm('Delete this health log?')) {
      this.api.deleteHealthLog(id).subscribe({ next: () => this.loadHealthLogs() });
    }
  }
}
