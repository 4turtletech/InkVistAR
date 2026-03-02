import React from 'react';
import { TrendingUp, DollarSign, Users, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { mockAppointments, mockClients, mockUsers } from '../data/mockData';

export function Analytics() {
  const artists = mockUsers.filter(u => u.role === 'artist');
  
  // Calculate metrics
  const totalRevenue = mockClients.reduce((sum, client) => sum + client.totalSpent, 0);
  const monthlyRevenue = 12450;
  const lastMonthRevenue = 11100;
  const revenueGrowth = ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1);
  
  const completedAppointments = mockAppointments.filter(a => a.status === 'completed').length;
  const scheduledAppointments = mockAppointments.filter(a => a.status === 'scheduled').length;
  const totalAppointments = mockAppointments.length;
  const completionRate = ((completedAppointments / totalAppointments) * 100).toFixed(0);

  // Monthly revenue data
  const monthlyData = [
    { month: 'Aug', revenue: 9800, appointments: 42 },
    { month: 'Sep', revenue: 10500, appointments: 48 },
    { month: 'Oct', revenue: 11200, appointments: 51 },
    { month: 'Nov', revenue: 11100, appointments: 49 },
    { month: 'Dec', revenue: 10800, appointments: 47 },
    { month: 'Jan', revenue: 11800, appointments: 53 },
    { month: 'Feb', revenue: 12450, appointments: 56 },
  ];

  // Artist performance
  const artistStats = [
    { name: 'Alex Rivera', revenue: 8500, appointments: 24, avgRating: 4.9, growth: 15 },
    { name: 'Jamie Chen', revenue: 6200, appointments: 31, avgRating: 4.8, growth: 8 },
    { name: 'Taylor Brooks', revenue: 3800, appointments: 42, avgRating: 4.7, growth: 12 }
  ];

  // Service popularity
  const serviceStats = [
    { name: 'Medium Tattoo', bookings: 18, revenue: 4500, percentage: 32 },
    { name: 'Small Tattoo', bookings: 15, revenue: 1500, percentage: 27 },
    { name: 'Large Tattoo', bookings: 12, revenue: 4800, percentage: 21 },
    { name: 'Body Piercing', bookings: 8, revenue: 480, percentage: 14 },
    { name: 'Nose Piercing', bookings: 3, revenue: 150, percentage: 6 }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="text-gray-500 mt-1">Business performance insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <span className="flex items-center text-green-600 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +{revenueGrowth}%
            </span>
          </div>
          <p className="text-gray-500 text-sm">Monthly Revenue</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">${monthlyRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-2">Last month: ${lastMonthRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="flex items-center text-blue-600 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +8.3%
            </span>
          </div>
          <p className="text-gray-500 text-sm">Total Appointments</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalAppointments}</p>
          <p className="text-xs text-gray-400 mt-2">Scheduled: {scheduledAppointments}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <span className="flex items-center text-purple-600 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +12.1%
            </span>
          </div>
          <p className="text-gray-500 text-sm">Active Clients</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{mockClients.length}</p>
          <p className="text-xs text-gray-400 mt-2">New this month: 8</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-teal-100 text-teal-600 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="flex items-center text-teal-600 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +3.2%
            </span>
          </div>
          <p className="text-gray-500 text-sm">Completion Rate</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{completionRate}%</p>
          <p className="text-xs text-gray-400 mt-2">Above industry avg</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Revenue Trend</h2>
            <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
              <option>Last 7 months</option>
              <option>Last 6 months</option>
              <option>Last year</option>
            </select>
          </div>
          
          <div className="relative h-64">
            {/* Simple bar chart visualization */}
            <div className="h-full flex items-end justify-between gap-2">
              {monthlyData.map((data, index) => {
                const maxRevenue = Math.max(...monthlyData.map(d => d.revenue));
                const heightPercentage = (data.revenue / maxRevenue) * 100;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center">
                      <span className="text-xs font-medium text-gray-900 mb-1">
                        ${(data.revenue / 1000).toFixed(1)}k
                      </span>
                      <div
                        className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg transition-all hover:from-purple-700 hover:to-purple-500 cursor-pointer"
                        style={{ height: `${heightPercentage}%` }}
                        title={`$${data.revenue.toLocaleString()}`}
                      />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{data.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Artist Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Artist Performance</h2>
          
          <div className="space-y-4">
            {artistStats.map((artist, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 text-purple-600 w-10 h-10 rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{artist.name}</p>
                      <p className="text-sm text-gray-500">{artist.appointments} appointments</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${artist.revenue.toLocaleString()}</p>
                    <span className="text-green-600 text-sm font-medium flex items-center justify-end">
                      <ArrowUpRight className="w-3 h-3" />
                      {artist.growth}%
                    </span>
                  </div>
                </div>
                
                {/* Rating */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${(artist.avgRating / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-gray-700 font-medium">{artist.avgRating}/5</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Service Popularity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Popular Services</h2>
        
        <div className="space-y-4">
          {serviceStats.map((service, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900">{service.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">{service.bookings} bookings</span>
                  <span className="font-semibold text-gray-900">${service.revenue}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${service.percentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-right">
                  {service.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Export Reports</h2>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
            Export PDF
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
            Export CSV
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
            Email Report
          </button>
        </div>
      </div>
    </div>
  );
}
