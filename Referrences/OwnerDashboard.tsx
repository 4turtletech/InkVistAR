import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, Users, TrendingUp, DollarSign, 
  Clock, CheckCircle, AlertCircle, Star,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { mockAppointments, mockClients, mockServices } from '../data/mockData';

export function OwnerDashboard() {
  const { currentUser } = useAuth();
  
  // Calculate metrics
  const totalRevenue = mockClients.reduce((sum, client) => sum + client.totalSpent, 0);
  const monthlyRevenue = 12450; // Mock current month
  const totalClients = mockClients.length;
  const totalAppointments = mockAppointments.length;
  const completedAppointments = mockAppointments.filter(a => a.status === 'completed').length;
  const scheduledAppointments = mockAppointments.filter(a => a.status === 'scheduled').length;

  const stats = [
    {
      label: 'Monthly Revenue',
      value: `$${monthlyRevenue.toLocaleString()}`,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Total Clients',
      value: totalClients,
      change: '+8 this month',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Scheduled Appointments',
      value: scheduledAppointments,
      change: '5 today',
      trend: 'neutral',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: 'Completion Rate',
      value: `${Math.round((completedAppointments / totalAppointments) * 100)}%`,
      change: '+3.2%',
      trend: 'up',
      icon: CheckCircle,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100'
    }
  ];

  // Top performing artists
  const artistPerformance = [
    { name: 'Alex Rivera', revenue: 8500, appointments: 24, rating: 4.9 },
    { name: 'Jamie Chen', revenue: 6200, appointments: 31, rating: 4.8 },
    { name: 'Taylor Brooks', revenue: 3800, appointments: 42, rating: 4.7 }
  ];

  // Recent activity
  const recentActivity = mockAppointments.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {currentUser?.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          
          return (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
                {stat.trend !== 'neutral' && (
                  <span className={`flex items-center text-sm ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendIcon className="w-4 h-4 mr-1" />
                    {stat.change}
                  </span>
                )}
              </div>
              <div>
                <p className="text-gray-500 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Artist Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Artist Performance</h2>
            <button className="text-sm text-purple-600 hover:text-purple-700">View All</button>
          </div>
          
          <div className="space-y-4">
            {artistPerformance.map((artist, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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
                  <p className="font-semibold text-gray-900">${artist.revenue.toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {artist.rating}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Appointments</h2>
            <button className="text-sm text-purple-600 hover:text-purple-700">View All</button>
          </div>
          
          <div className="space-y-3">
            {recentActivity.map((appointment) => (
              <div key={appointment.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`w-2 h-2 rounded-full ${
                  appointment.status === 'completed' ? 'bg-green-500' :
                  appointment.status === 'scheduled' ? 'bg-blue-500' :
                  appointment.status === 'in-progress' ? 'bg-yellow-500' :
                  'bg-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{appointment.clientName}</p>
                  <p className="text-sm text-gray-500">{appointment.serviceName} • {appointment.artistName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{appointment.date}</p>
                  <p className="text-sm text-gray-500">{appointment.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Chart Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Revenue Overview</h2>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Revenue chart visualization</p>
            <p className="text-sm text-gray-400 mt-1">Total revenue: ${totalRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
