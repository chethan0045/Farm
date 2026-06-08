import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <!-- Tab Navigation -->
      <div class="flex items-center gap-4 mb-6">
        <button (click)="activeTab='sales'" class="px-5 py-2 rounded-lg text-sm font-semibold transition"
          [class.bg-emerald-600]="activeTab==='sales'" [class.text-white]="activeTab==='sales'"
          [class.bg-gray-200]="activeTab!=='sales'" [class.text-gray-700]="activeTab!=='sales'">
          Sales
        </button>
        <button (click)="activeTab='customers'" class="px-5 py-2 rounded-lg text-sm font-semibold transition"
          [class.bg-emerald-600]="activeTab==='customers'" [class.text-white]="activeTab==='customers'"
          [class.bg-gray-200]="activeTab!=='customers'" [class.text-gray-700]="activeTab!=='customers'">
          Customers
        </button>
      </div>

      <!-- ==================== SALES TAB ==================== -->
      <div *ngIf="activeTab==='sales'">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl ctrl-title">Sales</h2>
          <button (click)="openSaleModal()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ Add Sale</button>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" *ngIf="summary">
          <div class="bg-white rounded-2xl shadow-sm p-5 hover:shadow-lg transition-all">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-xl">🛒</div>
              <div>
                <p class="text-xs text-gray-500 uppercase tracking-wide">Total Sales</p>
                <p class="text-2xl font-bold text-emerald-600 mt-0.5">&#8377;{{ summary.totalSales | number:'1.2-2' }}</p>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-2xl shadow-sm p-5 hover:shadow-lg transition-all">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-xl">💰</div>
              <div>
                <p class="text-xs text-gray-500 uppercase tracking-wide">Total Paid</p>
                <p class="text-2xl font-bold text-green-600 mt-0.5">&#8377;{{ summary.totalPaid | number:'1.2-2' }}</p>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-2xl shadow-sm p-5 hover:shadow-lg transition-all">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center text-xl">⏳</div>
              <div>
                <p class="text-xs text-gray-500 uppercase tracking-wide">Total Due</p>
                <p class="text-2xl font-bold text-red-600 mt-0.5">&#8377;{{ summary.totalDue | number:'1.2-2' }}</p>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-2xl shadow-sm p-5 hover:shadow-lg transition-all">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl bg-yellow-50 flex items-center justify-center text-xl">📦</div>
              <div>
                <p class="text-xs text-gray-500 uppercase tracking-wide">Pending Orders</p>
                <p class="text-2xl font-bold text-yellow-600 mt-0.5">{{ summary.pendingOrders }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading Skeletons -->
        <div *ngIf="loadingSales" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let i of [1,2,3,4,5,6]" class="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-11 h-11 rounded-xl bg-gray-200"></div>
              <div class="flex-1 space-y-2">
                <div class="h-3 bg-gray-200 rounded w-2/3"></div>
                <div class="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div class="flex gap-2 mb-4">
              <div class="h-5 bg-gray-200 rounded-lg w-16"></div>
              <div class="h-5 bg-gray-200 rounded-lg w-16"></div>
              <div class="h-5 bg-gray-200 rounded-lg w-12"></div>
            </div>
            <div class="h-8 bg-gray-100 rounded-lg"></div>
          </div>
        </div>

        <!-- Sales Cards -->
        <div *ngIf="!loadingSales">
          <div *ngIf="sales.length === 0" class="bg-white rounded-2xl shadow-sm py-16 text-center">
            <div class="text-5xl mb-3">🛒</div>
            <p class="text-gray-500 mb-4">No sales records found.</p>
            <button (click)="openSaleModal()" class="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ Add Sale</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" *ngIf="sales.length > 0">
            <div *ngFor="let s of sales" class="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all">
              <!-- Header -->
              <div class="p-5 pb-4 border-b border-gray-100">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-xl shrink-0">🛒</div>
                    <div class="min-w-0">
                      <p class="font-bold text-gray-800 truncate">{{ s.customer?.name || 'Walk-in Customer' }}</p>
                      <p class="text-xs text-gray-400 truncate">{{ s.invoiceNumber || 'No invoice' }}</p>
                    </div>
                  </div>
                  <span class="px-2.5 py-1 text-[11px] rounded-full font-semibold capitalize shrink-0" [ngClass]="paymentStatusClass(s.paymentStatus)">
                    {{ s.paymentStatus }}
                  </span>
                </div>
                <p class="text-2xl font-bold text-gray-900 mt-3">&#8377;{{ s.totalAmount | number:'1.0-0' }}</p>
                <p class="text-xs text-green-600 font-medium mt-0.5">Paid &#8377;{{ s.paidAmount | number:'1.0-0' }}</p>
              </div>

              <!-- Meta chips -->
              <div class="px-5 py-4 flex flex-wrap gap-2">
                <span class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px]">📅 {{ s.date | date:'mediumDate' }}</span>
                <span class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px]">📋 {{ getItemsSummary(s.items) }}</span>
                <span *ngIf="totalQuantity(s.items)" class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px]">🔢 Qty {{ totalQuantity(s.items) }}</span>
                <span *ngIf="s.batch?.batchNumber" class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px]">🐔 {{ s.batch?.batchNumber }}</span>
                <span *ngIf="s.paymentMethod" class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px] capitalize">💳 {{ s.paymentMethod }}</span>
              </div>

              <!-- Footer -->
              <div class="px-5 py-3 bg-gray-50 flex items-center justify-end gap-2 border-t border-gray-100">
                <button (click)="openSaleModal(s)" class="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium transition">Edit</button>
                <button (click)="deleteSale(s._id)" class="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== CUSTOMERS TAB ==================== -->
      <div *ngIf="activeTab==='customers'">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl ctrl-title">Customers</h2>
          <button (click)="openCustomerModal()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ Add Customer</button>
        </div>

        <!-- Loading Skeletons -->
        <div *ngIf="loadingCustomers" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let i of [1,2,3,4,5,6]" class="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-11 h-11 rounded-xl bg-gray-200"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 bg-gray-200 rounded w-2/3"></div>
                <div class="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
            <div class="flex gap-2">
              <div class="h-5 bg-gray-200 rounded-lg w-20"></div>
              <div class="h-5 bg-gray-200 rounded-lg w-24"></div>
            </div>
          </div>
        </div>

        <!-- Customer Cards -->
        <div *ngIf="!loadingCustomers">
          <div *ngIf="customers.length === 0" class="bg-white rounded-2xl shadow-sm py-16 text-center">
            <div class="text-5xl mb-3">👤</div>
            <p class="text-gray-500 mb-4">No customers found.</p>
            <button (click)="openCustomerModal()" class="bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ Add Customer</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" *ngIf="customers.length > 0">
            <div *ngFor="let c of customers" class="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all">
              <!-- Header -->
              <div class="p-5 pb-4 border-b border-gray-100">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-xl shrink-0">👤</div>
                    <div class="min-w-0">
                      <p class="font-bold text-gray-800 truncate">{{ c.name }}</p>
                      <p class="text-xs text-gray-400 truncate">{{ c.email || 'No email' }}</p>
                    </div>
                  </div>
                  <span class="px-2.5 py-1 text-[11px] rounded-full font-semibold capitalize shrink-0" [ngClass]="customerTypeClass(c.type)">
                    {{ c.type }}
                  </span>
                </div>
              </div>

              <!-- Meta chips -->
              <div class="px-5 py-4 flex flex-wrap gap-2">
                <span class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px]">📞 {{ c.phone || '-' }}</span>
                <span *ngIf="c.address" class="bg-gray-50 text-gray-600 px-2 py-1 rounded-lg text-[11px]">📍 {{ c.address }}</span>
              </div>

              <!-- Footer -->
              <div class="px-5 py-3 bg-gray-50 flex items-center justify-end gap-2 border-t border-gray-100">
                <button (click)="openCustomerModal(c)" class="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium transition">Edit</button>
                <button (click)="deleteCustomer(c._id)" class="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== SALE MODAL ==================== -->
      <div *ngIf="showSaleModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="text-xl font-bold mb-4">{{ editingSale ? 'Edit' : 'Add' }} Sale</h3>
          <form (ngSubmit)="saveSale()">
            <div class="space-y-4">
              <!-- Row: Customer + Batch -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                  <select [(ngModel)]="saleForm.customer" name="customer" required class="w-full px-3 py-2 border rounded-lg outline-none">
                    <option value="">Select Customer</option>
                    <option *ngFor="let c of customers" [value]="c._id">{{ c.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                  <select [(ngModel)]="saleForm.batch" name="batch" class="w-full px-3 py-2 border rounded-lg outline-none">
                    <option value="">Select Batch</option>
                    <option *ngFor="let b of batches" [value]="b._id">{{ b.batchNumber }}</option>
                  </select>
                </div>
              </div>

              <!-- Row: Date + Invoice -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" [(ngModel)]="saleForm.date" name="date" required class="w-full px-3 py-2 border rounded-lg outline-none">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                  <input [(ngModel)]="saleForm.invoiceNumber" name="invoiceNumber" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Auto-generated if blank">
                </div>
              </div>

              <!-- Items Section -->
              <div>
                <div class="flex justify-between items-center mb-2">
                  <label class="block text-sm font-medium text-gray-700">Items *</label>
                  <button type="button" (click)="addItem()" class="text-emerald-600 hover:text-emerald-700 text-sm font-medium">+ Add Item</button>
                </div>
                <div class="space-y-3">
                  <div *ngFor="let item of saleForm.items; let i = index" class="border rounded-lg p-3 bg-gray-50 relative">
                    <button *ngIf="saleForm.items.length > 1" type="button" (click)="removeItem(i)"
                      class="absolute top-2 right-2 text-red-400 hover:text-red-600 text-lg font-bold leading-none">&times;</button>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div class="col-span-2 md:col-span-3">
                        <input [(ngModel)]="item.description" [name]="'desc_'+i" placeholder="Description (e.g., Broiler Birds)" class="w-full px-3 py-2 border rounded-lg outline-none text-sm">
                      </div>
                      <div>
                        <label class="block text-xs text-gray-500 mb-1">Quantity</label>
                        <input type="number" [(ngModel)]="item.quantity" [name]="'qty_'+i" min="0" step="1" (ngModelChange)="calcItemTotal(i)" class="w-full px-3 py-2 border rounded-lg outline-none text-sm">
                      </div>
                      <div>
                        <label class="block text-xs text-gray-500 mb-1">Unit</label>
                        <select [(ngModel)]="item.unit" [name]="'unit_'+i" class="w-full px-3 py-2 border rounded-lg outline-none text-sm">
                          <option value="birds">Birds</option>
                          <option value="kg">Kg</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-xs text-gray-500 mb-1">Price / Unit (&#8377;)</label>
                        <input type="number" [(ngModel)]="item.pricePerUnit" [name]="'ppu_'+i" min="0" step="0.01" (ngModelChange)="calcItemTotal(i)" class="w-full px-3 py-2 border rounded-lg outline-none text-sm">
                      </div>
                      <div>
                        <label class="block text-xs text-gray-500 mb-1">Weight (kg)</label>
                        <input type="number" [(ngModel)]="item.weight" [name]="'wt_'+i" min="0" step="0.01" class="w-full px-3 py-2 border rounded-lg outline-none text-sm">
                      </div>
                      <div class="flex items-end">
                        <div class="w-full">
                          <label class="block text-xs text-gray-500 mb-1">Total (&#8377;)</label>
                          <input type="number" [(ngModel)]="item.total" [name]="'total_'+i" class="w-full px-3 py-2 border rounded-lg outline-none text-sm bg-gray-100" readonly>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Totals Row -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Total Amount (&#8377;)</label>
                  <input type="number" [(ngModel)]="saleForm.totalAmount" name="totalAmount" class="w-full px-3 py-2 border rounded-lg outline-none bg-gray-100" readonly>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Paid Amount (&#8377;)</label>
                  <input type="number" [(ngModel)]="saleForm.paidAmount" name="paidAmount" min="0" step="0.01" class="w-full px-3 py-2 border rounded-lg outline-none">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Payment Status *</label>
                  <select [(ngModel)]="saleForm.paymentStatus" name="paymentStatus" required class="w-full px-3 py-2 border rounded-lg outline-none">
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <!-- Payment Method + Notes -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select [(ngModel)]="saleForm.paymentMethod" name="paymentMethod" class="w-full px-3 py-2 border rounded-lg outline-none">
                    <option value="">Select</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input [(ngModel)]="saleForm.notes" name="notes" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Optional notes">
                </div>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button type="submit" class="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-medium">Save</button>
              <button type="button" (click)="showSaleModal=false" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      <!-- ==================== CUSTOMER MODAL ==================== -->
      <div *ngIf="showCustomerModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-md">
          <h3 class="text-xl font-bold mb-4">{{ editingCustomer ? 'Edit' : 'Add' }} Customer</h3>
          <form (ngSubmit)="saveCustomer()">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input [(ngModel)]="customerForm.name" name="name" required class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Customer name">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input [(ngModel)]="customerForm.phone" name="phone" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Phone number">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" [(ngModel)]="customerForm.email" name="email" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Email address">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea [(ngModel)]="customerForm.address" name="address" rows="2" class="w-full px-3 py-2 border rounded-lg outline-none" placeholder="Address"></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select [(ngModel)]="customerForm.type" name="type" required class="w-full px-3 py-2 border rounded-lg outline-none">
                  <option value="wholesaler">Wholesaler</option>
                  <option value="retailer">Retailer</option>
                  <option value="individual">Individual</option>
                </select>
              </div>
            </div>
            <div class="flex gap-3 mt-6">
              <button type="submit" class="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-medium">Save</button>
              <button type="button" (click)="showCustomerModal=false" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class SalesComponent implements OnInit {
  activeTab: 'sales' | 'customers' = 'sales';

  // Sales data
  sales: any[] = [];
  summary: any = null;
  loadingSales = true;
  showSaleModal = false;
  editingSale = false;
  editSaleId = '';
  saleForm: any = this.getEmptySaleForm();

  // Customers data
  customers: any[] = [];
  loadingCustomers = true;
  showCustomerModal = false;
  editingCustomer = false;
  editCustomerId = '';
  customerForm: any = this.getEmptyCustomerForm();

  // Shared
  batches: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getBatches().subscribe({ next: (b) => this.batches = b });
    this.loadCustomers();
    this.loadSales();
    this.loadSummary();
  }

  // ==================== SALES ====================

  loadSales() {
    this.loadingSales = true;
    this.api.getSales().subscribe({
      next: (data) => { this.sales = data; this.loadingSales = false; },
      error: () => this.loadingSales = false
    });
  }

  loadSummary() {
    this.api.getSalesSummary().subscribe({ next: (s) => this.summary = s });
  }

  getEmptySaleForm() {
    return {
      customer: '',
      batch: '',
      date: '',
      invoiceNumber: '',
      items: [{ description: '', quantity: 0, unit: 'birds', pricePerUnit: 0, weight: 0, total: 0 }],
      totalAmount: 0,
      paidAmount: 0,
      paymentStatus: 'pending',
      paymentMethod: '',
      notes: ''
    };
  }

  openSaleModal(sale?: any) {
    if (sale) {
      this.editingSale = true;
      this.editSaleId = sale._id;
      this.saleForm = {
        customer: sale.customer?._id || '',
        batch: sale.batch?._id || '',
        date: sale.date?.split('T')[0] || '',
        invoiceNumber: sale.invoiceNumber || '',
        items: sale.items && sale.items.length > 0
          ? sale.items.map((it: any) => ({ description: it.description || '', quantity: it.quantity || 0, unit: it.unit || 'birds', pricePerUnit: it.pricePerUnit || 0, weight: it.weight || 0, total: it.total || 0 }))
          : [{ description: '', quantity: 0, unit: 'birds', pricePerUnit: 0, weight: 0, total: 0 }],
        totalAmount: sale.totalAmount || 0,
        paidAmount: sale.paidAmount || 0,
        paymentStatus: sale.paymentStatus || 'pending',
        paymentMethod: sale.paymentMethod || '',
        notes: sale.notes || ''
      };
    } else {
      this.editingSale = false;
      this.saleForm = this.getEmptySaleForm();
    }
    this.showSaleModal = true;
  }

  addItem() {
    this.saleForm.items.push({ description: '', quantity: 0, unit: 'birds', pricePerUnit: 0, weight: 0, total: 0 });
  }

  removeItem(index: number) {
    this.saleForm.items.splice(index, 1);
    this.calcTotalAmount();
  }

  calcItemTotal(index: number) {
    const item = this.saleForm.items[index];
    item.total = (item.quantity || 0) * (item.pricePerUnit || 0);
    this.calcTotalAmount();
  }

  calcTotalAmount() {
    this.saleForm.totalAmount = this.saleForm.items.reduce((sum: number, it: any) => sum + (it.total || 0), 0);
  }

  getItemsSummary(items: any[]): string {
    if (!items || items.length === 0) return '-';
    if (items.length === 1) return items[0].description || '1 item';
    return items.length + ' items';
  }

  paymentStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'partial': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'overdue':
      case 'unpaid': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  customerTypeClass(type: string): string {
    switch (type) {
      case 'wholesaler': return 'bg-purple-100 text-purple-700';
      case 'retailer': return 'bg-blue-100 text-blue-700';
      case 'individual': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  totalQuantity(items: any[]): number {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0);
  }

  saveSale() {
    const data = { ...this.saleForm };
    if (!data.batch) delete data.batch;
    if (!data.invoiceNumber) delete data.invoiceNumber;
    const obs = this.editingSale ? this.api.updateSale(this.editSaleId, data) : this.api.createSale(data);
    obs.subscribe({
      next: () => {
        this.showSaleModal = false;
        this.loadSales();
        this.loadSummary();
      }
    });
  }

  deleteSale(id: string) {
    if (confirm('Delete this sale?')) {
      this.api.deleteSale(id).subscribe({
        next: () => {
          this.loadSales();
          this.loadSummary();
        }
      });
    }
  }

  // ==================== CUSTOMERS ====================

  loadCustomers() {
    this.loadingCustomers = true;
    this.api.getCustomers().subscribe({
      next: (data) => { this.customers = data; this.loadingCustomers = false; },
      error: () => this.loadingCustomers = false
    });
  }

  getEmptyCustomerForm() {
    return { name: '', phone: '', email: '', address: '', type: 'individual' };
  }

  openCustomerModal(customer?: any) {
    if (customer) {
      this.editingCustomer = true;
      this.editCustomerId = customer._id;
      this.customerForm = { name: customer.name, phone: customer.phone || '', email: customer.email || '', address: customer.address || '', type: customer.type || 'individual' };
    } else {
      this.editingCustomer = false;
      this.customerForm = this.getEmptyCustomerForm();
    }
    this.showCustomerModal = true;
  }

  saveCustomer() {
    const obs = this.editingCustomer ? this.api.updateCustomer(this.editCustomerId, this.customerForm) : this.api.createCustomer(this.customerForm);
    obs.subscribe({
      next: () => {
        this.showCustomerModal = false;
        this.loadCustomers();
      }
    });
  }

  deleteCustomer(id: string) {
    if (confirm('Delete this customer?')) {
      this.api.deleteCustomer(id).subscribe({
        next: () => this.loadCustomers()
      });
    }
  }
}
