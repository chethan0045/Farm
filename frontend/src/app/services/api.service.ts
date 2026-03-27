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
}
