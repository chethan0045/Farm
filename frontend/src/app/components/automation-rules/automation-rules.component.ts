import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-automation-rules',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Automation Rules</h1>
          <p class="text-sm text-gray-500">Configure sensor-based automation triggers</p>
        </div>
        <div class="flex gap-2">
          <button (click)="showPresets = true" class="border border-emerald-600 text-emerald-600 px-4 py-2 rounded-lg text-sm hover:bg-emerald-50">
            Load Presets
          </button>
          <button (click)="showForm = true; resetForm()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">
            + New Rule
          </button>
        </div>
      </div>

      <!-- Presets Modal -->
      <div *ngIf="showPresets" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
          <h2 class="text-lg font-bold mb-4">Rule Presets</h2>
          <div class="space-y-2">
            <div *ngFor="let preset of presets" class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p class="text-sm font-medium">{{ preset.name }}</p>
                <p class="text-xs text-gray-500">{{ preset.description }}</p>
              </div>
              <button (click)="createFromPreset(preset)" class="text-xs bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700">Add</button>
            </div>
          </div>
          <button (click)="showPresets = false" class="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700">Close</button>
        </div>
      </div>

      <!-- Create/Edit Modal -->
      <div *ngIf="showForm" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
          <h2 class="text-lg font-bold mb-4">{{ editId ? 'Edit' : 'Create' }} Rule</h2>
          <div class="space-y-3">
            <div>
              <label class="text-sm text-gray-600">Name *</label>
              <input [(ngModel)]="form.name" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-sm text-gray-600">House (leave empty for all houses)</label>
              <input [(ngModel)]="form.houseNumber" placeholder="e.g. H1" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
              <label class="text-sm text-gray-600">Condition Logic</label>
              <select [(ngModel)]="form.conditionLogic" class="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="AND">ALL conditions must match (AND)</option>
                <option value="OR">ANY condition must match (OR)</option>
              </select>
            </div>

            <!-- Conditions -->
            <div class="border rounded-lg p-3 space-y-2">
              <label class="text-sm font-medium text-gray-700">Conditions</label>
              <div *ngFor="let cond of form.conditions; let i = index" class="flex gap-2 items-center">
                <select [(ngModel)]="cond.sensor" class="border rounded px-2 py-1 text-xs flex-1">
                  <option *ngFor="let s of sensorOptions" [value]="s">{{ s }}</option>
                </select>
                <select [(ngModel)]="cond.operator" class="border rounded px-2 py-1 text-xs w-16">
                  <option value="gt">></option>
                  <option value="gte">>=</option>
                  <option value="lt"><</option>
                  <option value="lte"><=</option>
                  <option value="eq">=</option>
                </select>
                <input [(ngModel)]="cond.value" type="number" class="border rounded px-2 py-1 text-xs w-20">
                <button (click)="form.conditions.splice(i, 1)" class="text-red-500 text-xs">X</button>
              </div>
              <button (click)="form.conditions.push({sensor: 'temperature', operator: 'gt', value: 30})"
                class="text-xs text-emerald-600 hover:underline">+ Add Condition</button>
            </div>

            <!-- Action -->
            <div class="border rounded-lg p-3 space-y-2">
              <label class="text-sm font-medium text-gray-700">Action</label>
              <select [(ngModel)]="form.action.type" class="w-full border rounded px-2 py-1 text-sm">
                <option value="controlRelay">Control Relay</option>
                <option value="sendAlert">Send Alert</option>
                <option value="both">Both</option>
              </select>
              <div *ngIf="form.action.type !== 'sendAlert'" class="flex gap-2">
                <select [(ngModel)]="form.action.relay" class="border rounded px-2 py-1 text-xs flex-1">
                  <option value="fan">Fan</option>
                  <option value="light">Light</option>
                  <option value="heater">Heater</option>
                  <option value="feeder">Feeder</option>
                  <option value="waterPump">Water Pump</option>
                </select>
                <select [(ngModel)]="form.action.relayState" class="border rounded px-2 py-1 text-xs">
                  <option [ngValue]="true">Turn ON</option>
                  <option [ngValue]="false">Turn OFF</option>
                </select>
              </div>
              <div *ngIf="form.action.type !== 'controlRelay'">
                <select [(ngModel)]="form.action.alertSeverity" class="border rounded px-2 py-1 text-xs w-full">
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                  <option value="critical">Critical</option>
                </select>
                <input [(ngModel)]="form.action.alertMessage" placeholder="Alert message" class="w-full border rounded px-2 py-1 text-xs mt-1">
              </div>
            </div>

            <div>
              <label class="text-sm text-gray-600">Cooldown (minutes)</label>
              <input [(ngModel)]="form.cooldownMinutes" type="number" class="w-full border rounded-lg px-3 py-2 text-sm">
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button (click)="showForm = false" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button (click)="saveRule()" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">Save</button>
          </div>
        </div>
      </div>

      <!-- Rules List -->
      <div class="space-y-3">
        <div *ngFor="let rule of rules" class="bg-white rounded-xl shadow-sm border p-4">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-gray-800">{{ rule.name }}</h3>
                <span class="px-2 py-0.5 rounded-full text-[10px]"
                  [class.bg-green-100]="rule.enabled" [class.text-green-700]="rule.enabled"
                  [class.bg-gray-100]="!rule.enabled" [class.text-gray-500]="!rule.enabled">
                  {{ rule.enabled ? 'Active' : 'Disabled' }}
                </span>
                <span *ngIf="rule.overrideActive" class="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px]">Override</span>
              </div>
              <p *ngIf="rule.houseNumber" class="text-xs text-gray-500">House: {{ rule.houseNumber }}</p>
              <div class="mt-2 flex flex-wrap gap-1">
                <span *ngFor="let c of rule.conditions" class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px]">
                  {{ c.sensor }} {{ c.operator }} {{ c.value }}
                </span>
                <span class="text-gray-400 text-[10px]">→</span>
                <span class="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px]">
                  {{ rule.action?.type }}<span *ngIf="rule.action?.relay">: {{ rule.action.relay }}</span>
                </span>
              </div>
              <p class="text-[10px] text-gray-400 mt-1">
                Triggered {{ rule.triggerCount || 0 }} times
                <span *ngIf="rule.lastTriggeredAt"> | Last: {{ rule.lastTriggeredAt | date:'short' }}</span>
                | Cooldown: {{ rule.cooldownMinutes }}min
              </p>
            </div>
            <div class="flex gap-2">
              <button (click)="toggleRule(rule)" class="text-xs px-2 py-1 rounded"
                [class.text-green-600]="!rule.enabled" [class.text-gray-500]="rule.enabled">
                {{ rule.enabled ? 'Disable' : 'Enable' }}
              </button>
              <button (click)="editRule(rule)" class="text-xs text-blue-600">Edit</button>
              <button (click)="deleteRule(rule._id)" class="text-xs text-red-600">Delete</button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="rules.length === 0" class="bg-white rounded-xl shadow-sm border p-8 text-center">
        <p class="text-gray-500 mb-2">No automation rules configured</p>
        <p class="text-gray-400 text-sm">Create rules or load presets to automate your farm</p>
      </div>
    </div>
  `
})
export class AutomationRulesComponent implements OnInit {
  rules: any[] = [];
  presets: any[] = [];
  showForm = false;
  showPresets = false;
  editId = '';
  form: any = {};
  sensorOptions = ['temperature', 'humidity', 'ammoniaPPM', 'co2PPM', 'lightIntensity', 'feedLevelPercent', 'waterLevelPercent'];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadRules();
    this.api.getAutomationPresets().subscribe({ next: (data) => { this.presets = data; } });
  }

  loadRules() {
    this.api.getAutomationRules().subscribe({
      next: (data) => { this.rules = data; this.cdr.detectChanges(); }
    });
  }

  resetForm() {
    this.editId = '';
    this.form = {
      name: '', houseNumber: '', conditionLogic: 'AND',
      conditions: [{ sensor: 'temperature', operator: 'gt', value: 30 }],
      action: { type: 'sendAlert', relay: 'fan', relayState: true, alertSeverity: 'warning', alertMessage: '' },
      cooldownMinutes: 15
    };
  }

  saveRule() {
    if (this.editId) {
      this.api.updateAutomationRule(this.editId, this.form).subscribe({ next: () => { this.showForm = false; this.loadRules(); } });
    } else {
      this.api.createAutomationRule(this.form).subscribe({ next: () => { this.showForm = false; this.loadRules(); } });
    }
  }

  editRule(rule: any) {
    this.editId = rule._id;
    this.form = { ...rule, action: { ...rule.action }, conditions: rule.conditions.map((c: any) => ({ ...c })) };
    this.showForm = true;
  }

  deleteRule(id: string) {
    if (confirm('Delete this rule?')) {
      this.api.deleteAutomationRule(id).subscribe({ next: () => this.loadRules() });
    }
  }

  toggleRule(rule: any) {
    this.api.toggleAutomationRule(rule._id).subscribe({ next: () => this.loadRules() });
  }

  createFromPreset(preset: any) {
    this.api.createAutomationRule(preset).subscribe({
      next: () => { this.showPresets = false; this.loadRules(); }
    });
  }
}
