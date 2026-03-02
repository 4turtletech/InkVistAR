import React, { useState } from 'react';
import { DollarSign, TrendingUp, Calendar, Gift, CreditCard, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mockAppointments } from '../data/mockData';

interface EarningEntry {
  id: string;
  date: string;
  clientName: string;
  service: string;
  basePrice: number;
  tips: number;
  total: number;
  paymentMethod: 'cash' | 'card';
}

const mockEarnings: EarningEntry[] = [
  {
    id: 'e1',
    date: '2026-02-06',
    clientName: 'Jordan Smith',
    service: 'Small Tattoo',
    basePrice: 100,
    tips: 20,
    total: 120,
    paymentMethod: 'card'
  },
  {
    id: 'e2',
    date: '2026-02-05',
    clientName: 'Emma Wilson',
    service: 'Medium Tattoo',
    basePrice: 250,
    tips: 50,
    total: 300,
    paymentMethod: 'cash'
  },
  {
    id: 'e3',
    date: '2026-02-04',
    clientName: 'Chris Anderson',
    service: 'Small Tattoo',
    basePrice: 100,
    tips: 15,
    total: 115,
    paymentMethod: 'card'
  },
  {
    id: 'e4',
    date: '2026-02-03',
    clientName: 'Alex Thompson',
    service: 'Full Sleeve Session',
    basePrice: 600,
    tips: 100,
    total: 700,
    paymentMethod: 'card'
  },
  {
    id: 'e5',
    date: '2026-02-01',
    clientName: 'Morgan Lee',
    service: 'Medium Tattoo',
    basePrice: 250,
    tips: 40,
    total: 290,
    paymentMethod: 'cash'
  },
  {
    id: 'e6',
    date: '2026-01-30',
    clientName: 'Sam Parker',
    service: 'Large Tattoo',
    basePrice: 400,
    tips: 80,
    total: 480,
    paymentMethod: 'card'
  },
  {
    id: 'e7',
    date: '2026-01-28',
    clientName: 'Riley Martinez',
    service: 'Small Tattoo',
    basePrice: 100,
    tips: 25,
    total: 125,
    paymentMethod: 'cash'
  },
  {
    id: 'e8',
    date: '2026-01-25',
    clientName: 'Casey Brown',
    service: 'Medium Tattoo',
    basePrice: 250,
    tips: 35,
    total: 285,
    paymentMethod: 'card'
  }
];

export function ArtistEarnings() {
  const { currentUser } = useAuth();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState('2026-02');

  // Calculate totals
  const totalEarnings = mockEarnings.reduce((sum, e) => sum + e.total, 0);
  const totalTips = mockEarnings.reduce((sum, e) => sum + e.tips, 0);
  const totalBase = mockEarnings.reduce((sum, e) => sum + e.basePrice, 0);
  const avgTipPercentage = ((totalTips / totalBase) * 100).toFixed(1);

  // Monthly breakdown
  const monthlyData = [
    { month: 'Aug', earnings: 3200, tips: 580 },
    { month: 'Sep', earnings: 3800, tips: 680 },
    { month: 'Oct', earnings: 4100, tips: 750 },
    { month: 'Nov', earnings: 3900, tips: 720 },
    { month: 'Dec', earnings: 3600, tips: 650 },
    { month: 'Jan', earnings: 4500, tips: 820 },
    { month: 'Feb', earnings: 2005, tips: 365 }
  ];

  const commissionRate = 60; // Artist gets 60% of base price
  const totalCommission = (totalBase * commissionRate) / 100;
  const totalPayout = totalCommission + totalTips;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Earnings Tracker</h1>
          <p className="text-gray-500 mt-1">Track your income and tips</p>
        </div>
        <button className="px-6 py-3 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 font-medium flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-6 h-6" />
            <p className="text-purple-100 text-sm">Total Payout</p>
          </div>
          <p className="text-4xl font-bold mb-1">${totalPayout.toLocaleString()}</p>
          <p className="text-purple-100 text-sm">This month</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <p className="text-gray-500 text-sm">Commission ({commissionRate}%)</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">${totalCommission.toLocaleString()}</p>
          <p className="text-gray-500 text-sm">From ${totalBase.toLocaleString()} base</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-6 h-6 text-green-600" />
            <p className="text-gray-500 text-sm">Total Tips</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">${totalTips.toLocaleString()}</p>
          <p className="text-green-600 text-sm">Avg {avgTipPercentage}% tip rate</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-6 h-6 text-purple-600" />
            <p className="text-gray-500 text-sm">Appointments</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{mockEarnings.length}</p>
          <p className="text-gray-500 text-sm">Avg ${(totalEarnings / mockEarnings.length).toFixed(0)} per session</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Monthly Earnings</h2>
            <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
              <option>Last 7 months</option>
              <option>Last 6 months</option>
              <option>This year</option>
            </select>
          </div>
          
          <div className="relative h-64">
            <div className="h-full flex items-end justify-between gap-1">
              {monthlyData.map((data, index) => {
                const maxEarnings = Math.max(...monthlyData.map(d => d.earnings));
                const heightPercentage = (data.earnings / maxEarnings) * 100;
                const tipsHeight = (data.tips / data.earnings) * heightPercentage;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center">
                      <span className="text-xs font-medium text-gray-900 mb-1">
                        ${(data.earnings / 1000).toFixed(1)}k
                      </span>
                      <div
                        className="w-full relative rounded-t-lg overflow-hidden"
                        style={{ height: `${heightPercentage}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-600 to-purple-400" />
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 to-green-400"
                          style={{ height: `${(tipsHeight / heightPercentage) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{data.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded" />
              <span className="text-gray-600">Commission</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-gray-600">Tips</span>
            </div>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Methods</h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">Card Payments</span>
                <span className="font-semibold text-gray-900">
                  ${mockEarnings.filter(e => e.paymentMethod === 'card').reduce((s, e) => s + e.total, 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{
                    width: `${(mockEarnings.filter(e => e.paymentMethod === 'card').reduce((s, e) => s + e.total, 0) / totalEarnings) * 100}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">Cash Payments</span>
                <span className="font-semibold text-gray-900">
                  ${mockEarnings.filter(e => e.paymentMethod === 'cash').reduce((s, e) => s + e.total, 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full"
                  style={{
                    width: `${(mockEarnings.filter(e => e.paymentMethod === 'cash').reduce((s, e) => s + e.total, 0) / totalEarnings) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Top Earners</h3>
            <div className="space-y-2">
              {mockEarnings
                .sort((a, b) => b.total - a.total)
                .slice(0, 5)
                .map((entry, index) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-700">{entry.service}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">${entry.total}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Client</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Service</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Base Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tips</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Payment</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockEarnings.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(entry.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{entry.clientName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{entry.service}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">${entry.basePrice}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-green-600">+${entry.tips}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      entry.paymentMethod === 'card'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {entry.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    ${entry.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
