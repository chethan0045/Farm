import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-ai-insights',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">AI Insights</h1>
          <p class="text-sm text-gray-500">AI-powered predictions, analysis, and recommendations</p>
        </div>
        <div class="flex gap-2">
          <select [(ngModel)]="selectedBatch" (change)="loadData()" class="border rounded-lg px-3 py-2 text-sm">
            <option value="">All Batches</option>
            <option *ngFor="let b of batches" [value]="b._id">{{ b.batchNumber }}</option>
          </select>
          <button (click)="runAnalysis()" [disabled]="analyzing" class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
            {{ analyzing ? 'Analyzing...' : 'Run Analysis' }}
          </button>
        </div>
      </div>

      <!-- AI Dashboard Summary -->
      <div *ngIf="dashboard" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p class="text-3xl font-bold text-gray-800">{{ dashboard.systemHealth?.analyzedBatches || 0 }}</p>
          <p class="text-sm text-gray-500">Batches Analyzed</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p class="text-3xl font-bold" [class.text-red-600]="dashboard.systemHealth?.highRiskBatches > 0"
            [class.text-green-600]="dashboard.systemHealth?.highRiskBatches === 0">
            {{ dashboard.systemHealth?.highRiskBatches || 0 }}
          </p>
          <p class="text-sm text-gray-500">High Risk Batches</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p class="text-3xl font-bold text-amber-600">{{ dashboard.systemHealth?.totalRecommendations || 0 }}</p>
          <p class="text-sm text-gray-500">Active Recommendations</p>
        </div>
      </div>

      <!-- Batch Metrics -->
      <div *ngIf="dashboard?.batchMetrics?.length" class="bg-white rounded-xl shadow-sm border p-4">
        <h2 class="font-bold text-gray-800 mb-3">Batch Health Overview</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50">
                <th class="text-left p-2">Batch</th>
                <th class="text-center p-2">Day</th>
                <th class="text-center p-2">Disease Risk</th>
                <th class="text-center p-2">Env Score</th>
                <th class="text-center p-2">FCR</th>
                <th class="text-center p-2">Mortality (7d)</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let bm of dashboard.batchMetrics" class="border-t hover:bg-gray-50">
                <td class="p-2 font-medium">{{ bm.batchNumber }}</td>
                <td class="p-2 text-center">{{ bm.dayCount }}</td>
                <td class="p-2 text-center">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                    [class.bg-green-100]="bm.diseaseRiskScore < 30" [class.text-green-700]="bm.diseaseRiskScore < 30"
                    [class.bg-yellow-100]="bm.diseaseRiskScore >= 30 && bm.diseaseRiskScore < 60" [class.text-yellow-700]="bm.diseaseRiskScore >= 30 && bm.diseaseRiskScore < 60"
                    [class.bg-red-100]="bm.diseaseRiskScore >= 60" [class.text-red-700]="bm.diseaseRiskScore >= 60">
                    {{ bm.diseaseRiskScore }}/100
                  </span>
                </td>
                <td class="p-2 text-center">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                    [class.bg-green-100]="bm.environmentScore >= 70" [class.text-green-700]="bm.environmentScore >= 70"
                    [class.bg-yellow-100]="bm.environmentScore >= 40 && bm.environmentScore < 70" [class.text-yellow-700]="bm.environmentScore >= 40 && bm.environmentScore < 70"
                    [class.bg-red-100]="bm.environmentScore < 40" [class.text-red-700]="bm.environmentScore < 40">
                    {{ bm.environmentScore }}/100
                  </span>
                </td>
                <td class="p-2 text-center">
                  <span *ngIf="bm.fcrCurrent" class="text-xs"
                    [class.text-green-600]="bm.fcrStatus === 'good'"
                    [class.text-yellow-600]="bm.fcrStatus === 'acceptable'"
                    [class.text-red-600]="bm.fcrStatus === 'poor'">
                    {{ bm.fcrCurrent }} ({{ bm.fcrStatus }})
                  </span>
                  <span *ngIf="!bm.fcrCurrent" class="text-xs text-gray-400">N/A</span>
                </td>
                <td class="p-2 text-center">{{ bm.mortalityPredicted7Day }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Category Tabs -->
      <div class="flex gap-1 overflow-x-auto">
        <button *ngFor="let tab of tabs" (click)="activeTab = tab.value; loadData()"
          class="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition"
          [class.bg-emerald-600]="activeTab === tab.value" [class.text-white]="activeTab === tab.value"
          [class.bg-gray-100]="activeTab !== tab.value">
          {{ tab.label }}
        </button>
      </div>

      <!-- Insights List -->
      <div class="space-y-3">
        <div *ngFor="let insight of insights" class="bg-white rounded-xl shadow-sm border p-4">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2 h-2 rounded-full"
                  [class.bg-green-500]="insight.severity === 'low'"
                  [class.bg-yellow-500]="insight.severity === 'medium'"
                  [class.bg-red-500]="insight.severity === 'high'"
                  [class.bg-red-700]="insight.severity === 'critical'"></span>
                <h3 class="font-bold text-gray-800 text-sm">{{ insight.title }}</h3>
                <span *ngIf="insight.confidence" class="text-[10px] text-gray-400">{{ insight.confidence }}% confidence</span>
              </div>
              <p class="text-sm text-gray-600">{{ insight.summary }}</p>
              <p *ngIf="insight.details && expandedInsight === insight._id" class="text-xs text-gray-500 mt-2 whitespace-pre-line">{{ insight.details }}</p>

              <div *ngIf="insight.recommendations?.length" class="mt-2">
                <p class="text-xs font-medium text-gray-700">Recommendations:</p>
                <ul class="list-disc list-inside text-xs text-gray-600 mt-1">
                  <li *ngFor="let rec of insight.recommendations">{{ rec }}</li>
                </ul>
              </div>

              <div class="flex gap-3 mt-2">
                <button (click)="expandedInsight = expandedInsight === insight._id ? '' : insight._id"
                  class="text-xs text-blue-600 hover:underline">
                  {{ expandedInsight === insight._id ? 'Less' : 'More' }}
                </button>
                <span class="text-[10px] text-gray-400">{{ insight.createdAt | date:'short' }}</span>
                <span class="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded">{{ insight.category }}</span>
              </div>
            </div>
            <button (click)="dismissInsight(insight._id)" class="text-xs text-gray-400 hover:text-red-500 ml-2">Dismiss</button>
          </div>
        </div>
      </div>

      <div *ngIf="insights.length === 0 && !analyzing" class="bg-white rounded-xl shadow-sm border p-8 text-center">
        <p class="text-gray-500 mb-2">No insights available</p>
        <p class="text-gray-400 text-sm">Click "Run Analysis" to generate AI insights for your active batches</p>
      </div>

      <!-- Recommendations -->
      <div *ngIf="recommendations.length > 0" class="bg-white rounded-xl shadow-sm border p-4">
        <h2 class="font-bold text-gray-800 mb-3">Top Recommendations</h2>
        <div class="space-y-2">
          <div *ngFor="let rec of recommendations" class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <span class="w-2 h-2 rounded-full mt-1.5 shrink-0"
              [class.bg-red-600]="rec.priority === 'critical'"
              [class.bg-red-400]="rec.priority === 'high'"
              [class.bg-yellow-500]="rec.priority === 'medium'"
              [class.bg-blue-400]="rec.priority === 'low'"></span>
            <div>
              <p class="text-sm font-medium text-gray-800">{{ rec.title }}</p>
              <p class="text-xs text-gray-600">{{ rec.message }}</p>
              <span *ngIf="rec.batchNumber" class="text-[10px] text-gray-400">Batch: {{ rec.batchNumber }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AiInsightsComponent implements OnInit {
  batches: any[] = [];
  insights: any[] = [];
  recommendations: any[] = [];
  dashboard: any = null;
  selectedBatch = '';
  activeTab = '';
  analyzing = false;
  expandedInsight = '';

  tabs = [
    { label: 'All', value: '' },
    { label: 'Disease Risk', value: 'disease_risk' },
    { label: 'Mortality', value: 'mortality_prediction' },
    { label: 'FCR', value: 'fcr_optimization' },
    { label: 'Environment', value: 'environment_optimization' }
  ];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.api.getBatches({ status: 'active' }).subscribe({ next: (data) => { this.batches = data; this.cdr.detectChanges(); } });
    this.loadData();
    this.loadDashboard();
  }

  loadData() {
    const params: any = {};
    if (this.selectedBatch) params.batchId = this.selectedBatch;
    if (this.activeTab) params.category = this.activeTab;

    this.api.getAIInsights(params).subscribe({
      next: (data) => { this.insights = data; this.cdr.detectChanges(); }
    });
  }

  loadDashboard() {
    this.api.getAIDashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.recommendations = data.recommendations || [];
        this.cdr.detectChanges();
      }
    });
  }

  runAnalysis() {
    this.analyzing = true;
    const body = this.selectedBatch ? { batchId: this.selectedBatch } : {};
    this.api.triggerAnalysis(body).subscribe({
      next: () => {
        this.analyzing = false;
        this.loadData();
        this.loadDashboard();
      },
      error: () => { this.analyzing = false; this.cdr.detectChanges(); }
    });
  }

  dismissInsight(id: string) {
    this.api.dismissInsight(id).subscribe({ next: () => this.loadData() });
  }
}
