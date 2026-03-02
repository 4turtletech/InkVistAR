import React, { useState } from 'react';
import { Package, AlertTriangle, TrendingDown, Search, Plus, Edit2, ShoppingCart } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  category: 'ink' | 'needles' | 'jewelry' | 'supplies' | 'aftercare';
  currentStock: number;
  minStock: number;
  unit: string;
  lastRestocked: string;
  supplier: string;
  cost: number;
}

const mockInventory: InventoryItem[] = [
  {
    id: 'inv1',
    name: 'Black Ink - Premium Grade',
    category: 'ink',
    currentStock: 45,
    minStock: 20,
    unit: 'bottles',
    lastRestocked: '2026-01-28',
    supplier: 'Ink Masters Supply',
    cost: 25
  },
  {
    id: 'inv2',
    name: 'Color Ink Set (12 colors)',
    category: 'ink',
    currentStock: 8,
    minStock: 15,
    unit: 'sets',
    lastRestocked: '2026-01-15',
    supplier: 'Ink Masters Supply',
    cost: 120
  },
  {
    id: 'inv3',
    name: 'Tattoo Needles - Round Liner',
    category: 'needles',
    currentStock: 120,
    minStock: 50,
    unit: 'pcs',
    lastRestocked: '2026-02-01',
    supplier: 'Pro Needle Co.',
    cost: 2.5
  },
  {
    id: 'inv4',
    name: 'Tattoo Needles - Magnum',
    category: 'needles',
    currentStock: 30,
    minStock: 50,
    unit: 'pcs',
    lastRestocked: '2026-01-20',
    supplier: 'Pro Needle Co.',
    cost: 2.5
  },
  {
    id: 'inv5',
    name: 'Surgical Steel Studs',
    category: 'jewelry',
    currentStock: 85,
    minStock: 40,
    unit: 'pcs',
    lastRestocked: '2026-02-03',
    supplier: 'Body Jewelry Pro',
    cost: 3.5
  },
  {
    id: 'inv6',
    name: 'Titanium Hoops',
    category: 'jewelry',
    currentStock: 12,
    minStock: 20,
    unit: 'pcs',
    lastRestocked: '2026-01-10',
    supplier: 'Body Jewelry Pro',
    cost: 8
  },
  {
    id: 'inv7',
    name: 'Disposable Gloves (Box)',
    category: 'supplies',
    currentStock: 15,
    minStock: 10,
    unit: 'boxes',
    lastRestocked: '2026-02-05',
    supplier: 'Medical Supplies Inc',
    cost: 18
  },
  {
    id: 'inv8',
    name: 'Sterilization Pouches',
    category: 'supplies',
    currentStock: 200,
    minStock: 100,
    unit: 'pcs',
    lastRestocked: '2026-02-01',
    supplier: 'Medical Supplies Inc',
    cost: 0.5
  },
  {
    id: 'inv9',
    name: 'Aftercare Cream',
    category: 'aftercare',
    currentStock: 5,
    minStock: 15,
    unit: 'tubes',
    lastRestocked: '2026-01-12',
    supplier: 'Healing Touch',
    cost: 12
  },
  {
    id: 'inv10',
    name: 'Antibacterial Soap',
    category: 'aftercare',
    currentStock: 22,
    minStock: 15,
    unit: 'bottles',
    lastRestocked: '2026-01-30',
    supplier: 'Healing Touch',
    cost: 8
  }
];

export function InventoryManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | InventoryItem['category']>('all');

  const filteredInventory = mockInventory
    .filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterCategory === 'all' || item.category === filterCategory)
    );

  const lowStockItems = mockInventory.filter(item => item.currentStock <= item.minStock);
  const totalValue = mockInventory.reduce((sum, item) => sum + (item.currentStock * item.cost), 0);

  const getStockStatus = (item: InventoryItem) => {
    const percentage = (item.currentStock / item.minStock) * 100;
    if (percentage <= 50) return { label: 'Critical', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' };
    if (percentage <= 100) return { label: 'Low', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' };
    return { label: 'Good', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 mt-1">Track supplies and materials</p>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-3 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 font-medium flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Create Order
          </button>
          <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{mockInventory.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 text-red-600 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">Low Stock Alert</h3>
              <p className="text-red-700 text-sm mb-3">
                {lowStockItems.length} item{lowStockItems.length > 1 ? 's are' : ' is'} running low and need to be restocked soon.
              </p>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.map(item => (
                  <span key={item.id} className="px-3 py-1 bg-white text-red-700 rounded-full text-sm font-medium">
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium whitespace-nowrap">
              Reorder All
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search inventory items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Categories</option>
            <option value="ink">Ink</option>
            <option value="needles">Needles</option>
            <option value="jewelry">Jewelry</option>
            <option value="supplies">Supplies</option>
            <option value="aftercare">Aftercare</option>
          </select>
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Item</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Stock</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Last Restocked</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Supplier</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Value</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInventory.map((item) => {
                const status = getStockStatus(item);
                const stockPercentage = (item.currentStock / item.minStock) * 100;
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">${item.cost} per {item.unit}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium capitalize">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-900">
                          {item.currentStock} {item.unit}
                        </p>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`${status.color} h-2 rounded-full transition-all`}
                            style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 ${status.bgColor} ${status.textColor} rounded-full text-xs font-medium`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(item.lastRestocked).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.supplier}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      ${(item.currentStock * item.cost).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                          Restock
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
