import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, Users, Clock, CheckCircle, 
  AlertCircle, UserPlus, Settings, TrendingUp
} from 'lucide-react';
import { mockAppointments, mockClients, mockUsers } from '../data/mockData';

export function ManagerDashboard() {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState('2026-02-08');
  
  const artists = mockUsers.filter(u => u.role === 'artist');
  const todaysAppointments = mockAppointments.filter(a => a.date === selectedDate);
  const scheduledToday = todaysAppointments.filter(a => a.status === 'scheduled').length;
  const completedToday = todaysAppointments.filter(a => a.status === 'completed').length;

  const stats = [
    {
      label: "Today's Appointments",
      value: todaysAppointments.length,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Active Artists',
      value: artists.length,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: 'Completed Today',
      value: completedToday,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Total Clients',
      value: mockClients.length,
      icon: UserPlus,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage daily operations and staff</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg inline-flex mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <p className="text-gray-500 text-sm">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Today's Schedule</h2>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {todaysAppointments.length > 0 ? (
              todaysAppointments.map((appointment) => (
                <div key={appointment.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                      appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      appointment.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {appointment.status}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{appointment.time}</span>
                  </div>
                  <p className="font-semibold text-gray-900">{appointment.clientName}</p>
                  <p className="text-sm text-gray-600">{appointment.serviceName}</p>
                  <p className="text-sm text-gray-500 mt-1">with {appointment.artistName}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No appointments scheduled for this date</p>
              </div>
            )}
          </div>
        </div>

        {/* Staff Overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Staff Overview</h2>
            <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
              Manage Staff
            </button>
          </div>
          
          <div className="space-y-4">
            {artists.map((artist) => {
              const artistAppointments = mockAppointments.filter(a => a.artistId === artist.id);
              const todayAppointments = artistAppointments.filter(a => a.date === selectedDate);
              
              return (
                <div key={artist.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <img
                    src={artist.avatar}
                    alt={artist.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{artist.name}</p>
                    <p className="text-sm text-gray-500">{artist.specialty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {todayAppointments.length} appointments
                    </p>
                    <p className="text-xs text-gray-500">today</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group">
            <UserPlus className="w-8 h-8 text-gray-600 group-hover:text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 group-hover:text-purple-700">Add Client</p>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group">
            <Calendar className="w-8 h-8 text-gray-600 group-hover:text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 group-hover:text-purple-700">New Booking</p>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group">
            <Settings className="w-8 h-8 text-gray-600 group-hover:text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 group-hover:text-purple-700">Settings</p>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group">
            <TrendingUp className="w-8 h-8 text-gray-600 group-hover:text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 group-hover:text-purple-700">Reports</p>
          </button>
        </div>
      </div>
    </div>
  );
}
