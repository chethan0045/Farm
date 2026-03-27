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
        <h2 class="text-2xl font-bold text-gray-800">Health & Vaccination</h2>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button (click)="activeTab='vaccinations'" [class]="activeTab==='vaccinations' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:text-gray-800'" class="px-4 py-2 rounded-lg text-sm font-medium transition">Vaccinations</button>
        <button (click)="activeTab='healthLogs'" [class]="activeTab==='healthLogs' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:text-gray-800'" class="px-4 py-2 rounded-lg text-sm font-medium transition">Health Logs</button>
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
          <button (click)="openVacModal()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ Add Vaccination</button>
        </div>

        <div *ngIf="vacLoading" class="text-center py-10 text-gray-500">Loading...</div>

        <div class="bg-white rounded-xl shadow-sm overflow-x-auto" *ngIf="!vacLoading">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vaccine Name</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled Date</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let v of vaccinations" class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium">{{ v.batch?.batchNumber || 'N/A' }}</td>
                <td class="px-4 py-3 text-sm">{{ v.vaccineName }}</td>
                <td class="px-4 py-3 text-sm">{{ v.scheduledDate | date:'mediumDate' }}</td>
                <td class="px-4 py-3 text-sm">
                  <span class="px-2 py-1 text-xs rounded-full font-medium"
                    [ngClass]="{
                      'bg-yellow-100 text-yellow-700': v.status === 'scheduled',
                      'bg-green-100 text-green-700': v.status === 'completed',
                      'bg-red-100 text-red-700': v.status === 'missed'
                    }">{{ v.status | titlecase }}</span>
                </td>
                <td class="px-4 py-3 text-sm capitalize">{{ v.method?.replace('_', ' ') || '-' }}</td>
                <td class="px-4 py-3 text-sm font-bold text-gray-700">{{ v.cost ? '₹' + (v.cost | number:'1.2-2') : '-' }}</td>
                <td class="px-4 py-3 text-sm">
                  <button (click)="openVacModal(v)" class="text-blue-600 hover:underline mr-2">Edit</button>
                  <button (click)="deleteVaccination(v._id)" class="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="vaccinations.length === 0" class="text-center py-10 text-gray-400">No vaccinations recorded.</div>
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
          <button (click)="openHlModal()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ Add Health Log</button>
        </div>

        <div *ngIf="hlLoading" class="text-center py-10 text-gray-500">Loading...</div>

        <div class="bg-white rounded-xl shadow-sm overflow-x-auto" *ngIf="!hlLoading">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disease</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symptoms</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medicine</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resolved</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let h of healthLogs" class="border-t hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium">{{ h.batch?.batchNumber || 'N/A' }}</td>
                <td class="px-4 py-3 text-sm">{{ h.date | date:'mediumDate' }}</td>
                <td class="px-4 py-3 text-sm">
                  <span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 capitalize">{{ h.type }}</span>
                </td>
                <td class="px-4 py-3 text-sm">{{ h.disease || '-' }}</td>
                <td class="px-4 py-3 text-sm max-w-[150px] truncate">{{ h.symptoms || '-' }}</td>
                <td class="px-4 py-3 text-sm">{{ h.medicine || '-' }}</td>
                <td class="px-4 py-3 text-sm">
                  <span *ngIf="h.severity" class="px-2 py-1 text-xs rounded-full font-medium"
                    [ngClass]="{
                      'bg-blue-100 text-blue-700': h.severity === 'low',
                      'bg-yellow-100 text-yellow-700': h.severity === 'medium',
                      'bg-orange-100 text-orange-700': h.severity === 'high',
                      'bg-red-100 text-red-700': h.severity === 'critical'
                    }">{{ h.severity | titlecase }}</span>
                  <span *ngIf="!h.severity">-</span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <span *ngIf="h.resolved" class="text-green-600 font-medium">Yes</span>
                  <span *ngIf="!h.resolved" class="text-red-500">No</span>
                </td>
                <td class="px-4 py-3 text-sm font-bold text-gray-700">{{ h.cost ? '₹' + (h.cost | number:'1.2-2') : '-' }}</td>
                <td class="px-4 py-3 text-sm">
                  <button (click)="openHlModal(h)" class="text-blue-600 hover:underline mr-2">Edit</button>
                  <button (click)="deleteHealthLog(h._id)" class="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div *ngIf="healthLogs.length === 0" class="text-center py-10 text-gray-400">No health logs recorded.</div>
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
              <button type="submit" class="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-medium">Save</button>
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
              <button type="submit" class="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-medium">Save</button>
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
