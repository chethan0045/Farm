import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Dashboard
  getDashboard(): Observable<any> {
    return this.http.get(`${this.apiUrl}/dashboard`);
  }

  // Batches
  getBatches(params?: any): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/batches`, { params: httpParams });
  }

  getBatch(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/batches/${id}`);
  }

  createBatch(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/batches`, data);
  }

  updateBatch(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/batches/${id}`, data);
  }

  deleteBatch(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/batches/${id}`);
  }

  // Mortality
  getMortality(params?: any): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/mortality`, { params: httpParams });
  }

  createMortality(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/mortality`, data);
  }

  deleteMortality(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/mortality/${id}`);
  }

  // Batch Expenses
  getBatchExpenses(params?: any): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/batch-expenses`, { params: httpParams });
  }

  getBatchExpenseSummary(batchId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/batch-expenses/summary/${batchId}`);
  }

  createBatchExpense(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/batch-expenses`, data);
  }

  updateBatchExpense(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/batch-expenses/${id}`, data);
  }

  deleteBatchExpense(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/batch-expenses/${id}`);
  }

  // Finance
  getFinance(params?: any): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/finance`, { params: httpParams });
  }

  getFinanceSummary(): Observable<any> {
    return this.http.get(`${this.apiUrl}/finance/summary`);
  }

  createFinance(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/finance`, data);
  }

  updateFinance(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/finance/${id}`, data);
  }

  deleteFinance(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/finance/${id}`);
  }

  // Daily Logs
  getDailyLogs(params?: any): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/daily-logs`, { params: httpParams });
  }

  getDailyLogAnalytics(batchId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/daily-logs/analytics/${batchId}`);
  }

  createDailyLog(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/daily-logs`, data);
  }

  updateDailyLog(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/daily-logs/${id}`, data);
  }

  deleteDailyLog(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/daily-logs/${id}`);
  }

  // Vaccinations
  getVaccinations(params?: any): Observable<any[]> {
    let p = new HttpParams(); if (params) Object.keys(params).forEach(k => { if (params[k]) p = p.set(k, params[k]); });
    return this.http.get<any[]>(`${this.apiUrl}/vaccinations`, { params: p });
  }
  getUpcomingVaccinations(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/vaccinations/upcoming`); }
  createVaccination(data: any): Observable<any> { return this.http.post(`${this.apiUrl}/vaccinations`, data); }
  updateVaccination(id: string, data: any): Observable<any> { return this.http.put(`${this.apiUrl}/vaccinations/${id}`, data); }
  deleteVaccination(id: string): Observable<any> { return this.http.delete(`${this.apiUrl}/vaccinations/${id}`); }

  // Health Logs
  getHealthLogs(params?: any): Observable<any[]> {
    let p = new HttpParams(); if (params) Object.keys(params).forEach(k => { if (params[k]) p = p.set(k, params[k]); });
    return this.http.get<any[]>(`${this.apiUrl}/health-logs`, { params: p });
  }
  createHealthLog(data: any): Observable<any> { return this.http.post(`${this.apiUrl}/health-logs`, data); }
  updateHealthLog(id: string, data: any): Observable<any> { return this.http.put(`${this.apiUrl}/health-logs/${id}`, data); }
  deleteHealthLog(id: string): Observable<any> { return this.http.delete(`${this.apiUrl}/health-logs/${id}`); }

  // Alerts
  getAlerts(params?: any): Observable<any[]> {
    let p = new HttpParams(); if (params) Object.keys(params).forEach(k => { if (params[k]) p = p.set(k, params[k]); });
    return this.http.get<any[]>(`${this.apiUrl}/alerts`, { params: p });
  }
  getUnreadAlertCount(): Observable<any> { return this.http.get(`${this.apiUrl}/alerts/unread-count`); }
  generateAlerts(): Observable<any> { return this.http.post(`${this.apiUrl}/alerts/generate`, {}); }
  markAlertRead(id: string): Observable<any> { return this.http.put(`${this.apiUrl}/alerts/${id}/read`, {}); }
  resolveAlert(id: string): Observable<any> { return this.http.put(`${this.apiUrl}/alerts/${id}/resolve`, {}); }
  markAllAlertsRead(): Observable<any> { return this.http.put(`${this.apiUrl}/alerts/read-all`, {}); }

  // Inventory
  getInventory(params?: any): Observable<any[]> {
    let p = new HttpParams(); if (params) Object.keys(params).forEach(k => { if (params[k]) p = p.set(k, params[k]); });
    return this.http.get<any[]>(`${this.apiUrl}/inventory`, { params: p });
  }
  getLowStock(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/inventory/low-stock`); }
  createInventory(data: any): Observable<any> { return this.http.post(`${this.apiUrl}/inventory`, data); }
  updateInventory(id: string, data: any): Observable<any> { return this.http.put(`${this.apiUrl}/inventory/${id}`, data); }
  deleteInventory(id: string): Observable<any> { return this.http.delete(`${this.apiUrl}/inventory/${id}`); }
  getInventoryTransactions(params?: any): Observable<any[]> {
    let p = new HttpParams(); if (params) Object.keys(params).forEach(k => { if (params[k]) p = p.set(k, params[k]); });
    return this.http.get<any[]>(`${this.apiUrl}/inventory/transactions`, { params: p });
  }
  createInventoryTransaction(data: any): Observable<any> { return this.http.post(`${this.apiUrl}/inventory/transactions`, data); }

  // Customers
  getCustomers(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/customers`); }
  createCustomer(data: any): Observable<any> { return this.http.post(`${this.apiUrl}/customers`, data); }
  updateCustomer(id: string, data: any): Observable<any> { return this.http.put(`${this.apiUrl}/customers/${id}`, data); }
  deleteCustomer(id: string): Observable<any> { return this.http.delete(`${this.apiUrl}/customers/${id}`); }

  // Sales
  getSales(params?: any): Observable<any[]> {
    let p = new HttpParams(); if (params) Object.keys(params).forEach(k => { if (params[k]) p = p.set(k, params[k]); });
    return this.http.get<any[]>(`${this.apiUrl}/sales`, { params: p });
  }
  getSalesSummary(): Observable<any> { return this.http.get(`${this.apiUrl}/sales/summary`); }
  getSale(id: string): Observable<any> { return this.http.get(`${this.apiUrl}/sales/${id}`); }
  createSale(data: any): Observable<any> { return this.http.post(`${this.apiUrl}/sales`, data); }
  updateSale(id: string, data: any): Observable<any> { return this.http.put(`${this.apiUrl}/sales/${id}`, data); }
  deleteSale(id: string): Observable<any> { return this.http.delete(`${this.apiUrl}/sales/${id}`); }
}
