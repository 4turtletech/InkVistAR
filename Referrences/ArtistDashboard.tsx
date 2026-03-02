import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, Image, Clock, CheckCircle, 
  Users, DollarSign, Star, Upload
} from 'lucide-react';
import { mockAppointments, mockPortfolio } from '../data/mockData';

export function ArtistDashboard() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'schedule' | 'portfolio'>('schedule');
  
  // Filter data for current artist
  const myAppointments = mockAppointments.filter(a => a.artistId === currentUser?.id);
  const myPortfolio = mockPortfolio.filter(p => p.artistId === currentUser?.id);
  const upcomingAppointments = myAppointments.filter(a => a.status === 'scheduled');
  const completedAppointments = myAppointments.filter(a => a.status === 'completed');
  
  const monthlyEarnings = myAppointments
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + 150, 0); // Simplified calculation

  const stats = [
    {
      label: 'Upcoming Appointments',
      value: upcomingAppointments.length,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Completed This Month',
      value: completedAppointments.length,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Monthly Earnings',
      value: `$${monthlyEarnings}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: 'Portfolio Items',
      value: myPortfolio.length,
      icon: Image,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Artist Dashboard</h1>
        <p className="text-gray-500 mt-1">{currentUser?.specialty}</p>
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

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'schedule'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-5 h-5 inline-block mr-2" />
            My Schedule
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'portfolio'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Image className="w-5 h-5 inline-block mr-2" />
            My Portfolio
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'schedule' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Upcoming Appointments</h2>
              </div>
              
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-5 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-lg text-gray-900">{appointment.clientName}</p>
                          <p className="text-gray-600">{appointment.serviceName}</p>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {appointment.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {appointment.date}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {appointment.time} ({appointment.duration} min)
                        </div>
                        {appointment.deposit && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Deposit: ${appointment.deposit}
                          </div>
                        )}
                      </div>
                      
                      {appointment.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                          <span className="font-medium">Notes:</span> {appointment.notes}
                        </div>
                      )}
                      
                      <div className="mt-4 flex gap-2">
                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                          Start Session
                        </button>
                        <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                          Reschedule
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p>No upcoming appointments</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">My Portfolio</h2>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Work
                </button>
              </div>
              
              {myPortfolio.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myPortfolio.map((item) => (
                    <div key={item.id} className="group relative overflow-hidden rounded-lg border border-gray-200 hover:shadow-lg transition-all">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="p-4 bg-white">
                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium capitalize">
                            {item.category}
                          </span>
                          <span className="text-xs text-gray-400">{item.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Image className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p>No portfolio items yet</p>
                  <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    Add Your First Work
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
