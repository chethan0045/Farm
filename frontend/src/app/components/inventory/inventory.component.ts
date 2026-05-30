import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Inventory Management</h2>
          <p class="text-sm text-gray-500 mt-1">Track feed, medicine, vaccines, equipment & supplies</p>
        </div>
        <button (click)="openItemModal()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ Add Item</button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg">📦</div>
          <div>
            <p class="text-xs text-gray-500">Total Items</p>
            <p class="text-2xl font-bold text-gray-800">{{ items.length }}</p>
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center text-lg">⚠️</div>
          <div>
            <p class="text-xs text-gray-500">Low Stock</p>
            <p class="text-2xl font-bold text-red-600">{{ lowStockCount }}</p>
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">🏷️</div>
          <div>
            <p class="text-xs text-gray-500">Categories</p>
            <p class="text-2xl font-bold text-emerald-600">{{ uniqueCategories }}</p>
          </div>
        </div>
        <div class="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg">💰</div>
          <div>
            <p class="text-xs text-gray-500">Total Value</p>
            <p class="text-2xl font-bold text-gray-800">{{ totalValue | number:'1.2-2' }}</p>
          </div>
        </div>
      </div>

      <!-- Category Filter -->
      <div class="flex flex-wrap gap-2 mb-4">
        <button (click)="filterCategory = ''; loadItems()"
          class="px-3 py-1.5 rounded-full text-sm font-medium transition"
          [class.bg-emerald-600]="!filterCategory" [class.text-white]="!filterCategory"
          [class.bg-gray-100]="filterCategory" [class.text-gray-600]="filterCategory"
          [class.hover:bg-gray-200]="filterCategory">
          All
        </button>
        <button *ngFor="let cat of categories" (click)="filterCategory = cat; loadItems()"
          class="px-3 py-1.5 rounded-full text-sm font-medium transition capitalize"
          [class.bg-emerald-600]="filterCategory === cat" [class.text-white]="filterCategory === cat"
          [class.bg-gray-100]="filterCategory !== cat" [class.text-gray-600]="filterCategory !== cat"
          [class.hover:bg-gray-200]="filterCategory !== cat">
          {{ cat }}
        </button>
      </div>

      <!-- Loading Skeleton -->
      <div *ngIf="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div *ngFor="let s of [1,2,3,4,5,6]" class="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
          <div class="h-1.5 bg-gray-200"></div>
          <div class="p-4 space-y-4">
            <div class="flex justify-between items-center">
              <div class="h-4 w-1/2 bg-gray-200 rounded"></div>
              <div class="h-5 w-16 bg-gray-200 rounded-full"></div>
            </div>
            <div class="h-2 w-full bg-gray-100 rounded-full"></div>
            <div class="h-7 w-1/3 bg-gray-200 rounded"></div>
            <div class="grid grid-cols-2 gap-2">
              <div class="h-6 bg-gray-100 rounded"></div>
              <div class="h-6 bg-gray-100 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Items Card Grid -->
      <div *ngIf="!loading && filteredItems.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div *ngFor="let item of filteredItems"
          (click)="selectItem(item)"
          class="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all cursor-pointer">
          <!-- Accent bar -->
          <div class="h-1.5" [ngClass]="isLowStock(item) ? 'bg-red-500' : 'bg-emerald-500'"></div>

          <div class="p-4">
            <!-- Header -->
            <div class="flex justify-between items-start gap-2 mb-3">
              <h4 class="font-bold text-gray-800 leading-tight">{{ item.name }}</h4>
              <span *ngIf="isLowStock(item)" class="shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">LOW</span>
            </div>
            <div class="mb-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                [ngClass]="getCategoryClass(item.category)">
                {{ item.category }}
              </span>
            </div>

            <!-- Stock bar -->
            <div class="w-full bg-gray-100 rounded-full h-2 mb-3">
              <div class="h-2 rounded-full transition-all" [ngClass]="stockBarColor(item)" [style.width]="stockBarWidth(item)"></div>
            </div>

            <!-- Stock figure -->
            <p class="text-2xl font-bold mb-3" [ngClass]="isLowStock(item) ? 'text-red-600' : 'text-gray-800'">
              {{ item.currentStock | number }} <span class="text-sm font-medium text-gray-400">{{ item.unit }}</span>
            </p>

            <!-- Meta chips -->
            <div class="flex flex-wrap gap-2 text-xs">
              <span class="px-2 py-1 rounded-lg bg-gray-50 text-gray-600">Min: {{ item.minStockLevel | number }}</span>
              <span class="px-2 py-1 rounded-lg bg-gray-50 text-gray-600">Cost: {{ item.costPerUnit | number:'1.2-2' }}</span>
              <span *ngIf="item.supplier" class="px-2 py-1 rounded-lg bg-gray-50 text-gray-600 truncate max-w-[140px]">{{ item.supplier }}</span>
              <span *ngIf="item.expiryDate" class="px-2 py-1 rounded-lg bg-gray-50"
                [ngClass]="isExpired(item) ? 'text-red-600 font-semibold' : 'text-gray-600'">
                Exp: {{ item.expiryDate | date:'mediumDate' }}
              </span>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50/50" (click)="$event.stopPropagation()">
            <button (click)="openItemModal(item)" class="flex-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 py-1.5 rounded-lg transition">Edit</button>
            <button (click)="deleteItem(item._id)" class="flex-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 py-1.5 rounded-lg transition">Delete</button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && filteredItems.length === 0" class="bg-white rounded-2xl shadow-sm text-center py-14 px-4 mb-6">
        <div class="text-5xl mb-3">📦</div>
        <p class="text-gray-500 mb-4">{{ filterCategory ? 'No items in this category.' : 'No inventory items yet. Add your first item!' }}</p>
        <button (click)="openItemModal()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ Add Item</button>
      </div>

      <!-- Transaction Panel -->
      <div *ngIf="selectedItem" class="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h3 class="text-lg font-bold text-gray-800">{{ selectedItem.name }} - Transactions</h3>
            <p class="text-sm text-gray-500">Current stock: <span class="font-semibold" [class.text-red-600]="isLowStock(selectedItem)">{{ selectedItem.currentStock }} {{ selectedItem.unit }}</span></p>
          </div>
          <div class="flex gap-2">
            <button (click)="openTransactionModal()" class="bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition text-sm font-medium">+ Add Transaction</button>
            <button (click)="selectedItem = null; transactions = []" class="bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-300 transition text-sm font-medium">Close</button>
          </div>
        </div>

        <div *ngIf="loadingTransactions" class="text-center py-6 text-gray-500 text-sm">Loading transactions...</div>

        <div *ngIf="!loadingTransactions && transactions.length > 0" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th class="text-left px-3 py-2">Date</th>
                <th class="text-left px-3 py-2">Type</th>
                <th class="text-right px-3 py-2">Quantity</th>
                <th class="text-left px-3 py-2">Batch</th>
                <th class="text-right px-3 py-2">Cost</th>
                <th class="text-left px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr *ngFor="let txn of transactions" class="hover:bg-gray-50">
                <td class="px-3 py-2 text-gray-700">{{ txn.date | date:'mediumDate' }}</td>
                <td class="px-3 py-2">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                    [ngClass]="getTransactionTypeClass(txn.type)">
                    {{ txn.type }}
                  </span>
                </td>
                <td class="px-3 py-2 text-right font-semibold"
                  [class.text-green-600]="txn.type === 'purchase'"
                  [class.text-red-600]="txn.type === 'usage' || txn.type === 'waste'"
                  [class.text-blue-600]="txn.type === 'adjustment'">
                  {{ txn.type === 'purchase' ? '+' : (txn.type === 'usage' || txn.type === 'waste') ? '-' : '' }}{{ txn.quantity }}
                </td>
                <td class="px-3 py-2 text-gray-500">{{ txn.batch?.batchNumber || '-' }}</td>
                <td class="px-3 py-2 text-right text-gray-700">{{ txn.cost ? (txn.cost | number:'1.2-2') : '-' }}</td>
                <td class="px-3 py-2 text-gray-500 max-w-[200px] truncate">{{ txn.notes || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="!loadingTransactions && transactions.length === 0" class="text-center py-6 text-gray-400 text-sm">
          No transactions recorded for this item.
        </div>
      </div>

      <!-- Add/Edit Item Modal -->
      <div *ngIf="showItemModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h3 class="text-xl font-bold mb-4">{{ editingItem ? 'Edit' : 'New' }} Inventory Item</h3>
          <form (ngSubmit)="saveItem()">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input [(ngModel)]="itemForm.name" name="name" required
                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g., Starter Feed">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select [(ngModel)]="itemForm.category" name="category" required
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="">Select</option>
                    <option *ngFor="let cat of categories" [value]="cat">{{ cat | titlecase }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                  <input [(ngModel)]="itemForm.unit" name="unit" required
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g., kg, liters, pcs">
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Current Stock *</label>
                  <input type="number" [(ngModel)]="itemForm.currentStock" name="currentStock" required min="0"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Min Stock Level *</label>
                  <input type="number" [(ngModel)]="itemForm.minStockLevel" name="minStockLevel" required min="0"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Cost Per Unit</label>
                  <input type="number" [(ngModel)]="itemForm.costPerUnit" name="costPerUnit" min="0" step="0.01"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="date" [(ngModel)]="itemForm.expiryDate" name="expiryDate"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <input [(ngModel)]="itemForm.supplier" name="supplier"
                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Supplier name">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input [(ngModel)]="itemForm.location" name="location"
                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="e.g., Warehouse A, Shelf 3">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea [(ngModel)]="itemForm.notes" name="notes" rows="2"
                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Additional notes..."></textarea>
              </div>
            </div>
            <div class="flex gap-3 mt-6">
              <button type="submit" class="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-medium">Save</button>
              <button type="button" (click)="showItemModal = false" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add Transaction Modal -->
      <div *ngIf="showTransactionModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <h3 class="text-xl font-bold mb-4">Add Transaction - {{ selectedItem?.name }}</h3>
          <form (ngSubmit)="saveTransaction()">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select [(ngModel)]="txnForm.type" name="type" required
                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="purchase">Purchase (adds stock)</option>
                  <option value="usage">Usage (reduces stock)</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="waste">Waste (reduces stock)</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input type="number" [(ngModel)]="txnForm.quantity" name="quantity" required min="0.01" step="0.01"
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" [(ngModel)]="txnForm.date" name="date" required
                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Batch (optional)</label>
                <select [(ngModel)]="txnForm.batch" name="batch"
                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="">No batch</option>
                  <option *ngFor="let b of batches" [value]="b._id">{{ b.batchNumber }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                <input type="number" [(ngModel)]="txnForm.cost" name="cost" min="0" step="0.01"
                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Total cost for this transaction">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea [(ngModel)]="txnForm.notes" name="notes" rows="2"
                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Additional details..."></textarea>
              </div>
            </div>
            <div class="flex gap-3 mt-6">
              <button type="submit" class="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-medium">Save</button>
              <button type="button" (click)="showTransactionModal = false" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class InventoryComponent implements OnInit {
  items: any[] = [];
  filteredItems: any[] = [];
  transactions: any[] = [];
  batches: any[] = [];
  loading = true;
  loadingTransactions = false;

  categories = ['feed', 'medicine', 'vaccine', 'equipment', 'supplement', 'other'];
  filterCategory = '';

  selectedItem: any = null;

  showItemModal = false;
  editingItem = false;
  editItemId = '';
  itemForm: any = this.getEmptyItemForm();

  showTransactionModal = false;
  txnForm: any = this.getEmptyTxnForm();

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadItems();
    this.loadBatches();
  }

  get lowStockCount(): number {
    return this.items.filter(i => i.currentStock <= i.minStockLevel).length;
  }

  get uniqueCategories(): number {
    return new Set(this.items.map(i => i.category)).size;
  }

  get totalValue(): number {
    return this.items.reduce((sum, i) => sum + (i.currentStock * (i.costPerUnit || 0)), 0);
  }

  getEmptyItemForm() {
    return {
      name: '', category: '', currentStock: 0, unit: '', minStockLevel: 0,
      costPerUnit: 0, supplier: '', expiryDate: '', location: '', notes: ''
    };
  }

  getEmptyTxnForm() {
    return {
      type: 'purchase', quantity: 0, date: new Date().toISOString().split('T')[0],
      batch: '', cost: 0, notes: ''
    };
  }

  loadItems() {
    this.loading = true;
    const params = this.filterCategory ? { category: this.filterCategory } : {};
    this.api.getInventory(params).subscribe({
      next: (data) => {
        this.items = data;
        this.applyFilter();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadBatches() {
    this.api.getBatches().subscribe({
      next: (data) => this.batches = data
    });
  }

  applyFilter() {
    this.filteredItems = this.filterCategory
      ? this.items.filter(i => i.category === this.filterCategory)
      : [...this.items];
  }

  isLowStock(item: any): boolean {
    return item.currentStock <= item.minStockLevel;
  }

  isExpired(item: any): boolean {
    if (!item.expiryDate) return false;
    return new Date(item.expiryDate) < new Date();
  }

  stockBarWidth(item: any): string {
    const denom = (item.minStockLevel * 2) || 1;
    const pct = Math.min(100, (item.currentStock / denom) * 100);
    return `${Math.max(0, pct)}%`;
  }

  stockBarColor(item: any): string {
    return this.isLowStock(item) ? 'bg-red-500' : 'bg-emerald-500';
  }

  getCategoryClass(category: string): Record<string, boolean> {
    const classes: Record<string, Record<string, boolean>> = {
      feed: { 'bg-amber-100': true, 'text-amber-700': true },
      medicine: { 'bg-rose-100': true, 'text-rose-700': true },
      vaccine: { 'bg-blue-100': true, 'text-blue-700': true },
      equipment: { 'bg-gray-200': true, 'text-gray-700': true },
      supplement: { 'bg-purple-100': true, 'text-purple-700': true },
      other: { 'bg-slate-100': true, 'text-slate-600': true }
    };
    return classes[category] || classes['other'];
  }

  getTransactionTypeClass(type: string): Record<string, boolean> {
    const classes: Record<string, Record<string, boolean>> = {
      purchase: { 'bg-green-100': true, 'text-green-700': true },
      usage: { 'bg-orange-100': true, 'text-orange-700': true },
      adjustment: { 'bg-blue-100': true, 'text-blue-700': true },
      waste: { 'bg-red-100': true, 'text-red-700': true }
    };
    return classes[type] || {};
  }

  selectItem(item: any) {
    this.selectedItem = item;
    this.loadTransactions(item._id);
  }

  loadTransactions(itemId: string) {
    this.loadingTransactions = true;
    this.api.getInventoryTransactions({ inventoryItem: itemId }).subscribe({
      next: (data) => {
        this.transactions = data;
        this.loadingTransactions = false;
      },
      error: () => this.loadingTransactions = false
    });
  }

  openItemModal(item?: any) {
    if (item) {
      this.editingItem = true;
      this.editItemId = item._id;
      this.itemForm = {
        name: item.name,
        category: item.category,
        currentStock: item.currentStock,
        unit: item.unit,
        minStockLevel: item.minStockLevel,
        costPerUnit: item.costPerUnit || 0,
        supplier: item.supplier || '',
        expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
        location: item.location || '',
        notes: item.notes || ''
      };
    } else {
      this.editingItem = false;
      this.editItemId = '';
      this.itemForm = this.getEmptyItemForm();
    }
    this.showItemModal = true;
  }

  saveItem() {
    const obs = this.editingItem
      ? this.api.updateInventory(this.editItemId, this.itemForm)
      : this.api.createInventory(this.itemForm);
    obs.subscribe({
      next: () => {
        this.showItemModal = false;
        this.loadItems();
        if (this.selectedItem && this.editItemId === this.selectedItem._id) {
          Object.assign(this.selectedItem, this.itemForm);
        }
      }
    });
  }

  deleteItem(id: string) {
    if (confirm('Delete this inventory item? This cannot be undone.')) {
      this.api.deleteInventory(id).subscribe({
        next: () => {
          if (this.selectedItem?._id === id) {
            this.selectedItem = null;
            this.transactions = [];
          }
          this.loadItems();
        }
      });
    }
  }

  openTransactionModal() {
    this.txnForm = this.getEmptyTxnForm();
    this.showTransactionModal = true;
  }

  saveTransaction() {
    const data = {
      ...this.txnForm,
      inventoryItem: this.selectedItem._id,
      batch: this.txnForm.batch || undefined
    };
    this.api.createInventoryTransaction(data).subscribe({
      next: () => {
        this.showTransactionModal = false;
        this.loadTransactions(this.selectedItem._id);
        this.loadItems();
      }
    });
  }
}
