import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, Clock, CheckCircle, Image, 
  User, Phone, Mail, MapPin, Star
} from 'lucide-react';
import { mockAppointments, mockServices, mockUsers, mockPortfolio } from '../data/mockData';

export function CustomerDashboard() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'appointments' | 'book' | 'gallery'>('appointments');
  
  // Filter data for current customer
  const myAppointments = mockAppointments.filter(a => a.clientId === currentUser?.id);
  const upcomingAppointments = myAppointments.filter(a => a.status === 'scheduled');
  const pastAppointments = myAppointments.filter(a => a.status === 'completed');
  const artists = mockUsers.filter(u => u.role === 'artist');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-8 text-white">
        <div className="flex items-center gap-4">
          <img
            src={currentUser?.avatar}
            alt={currentUser?.name}
            className="w-20 h-20 rounded-full border-4 border-white object-cover"
          />
          <div>
            <h1 className="text-3xl font-bold">Welcome, {currentUser?.name}!</h1>
            <p className="text-purple-100 mt-1">Member since {new Date(currentUser?.joinDate || '').toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/20 backdrop-blur rounded-lg p-4">
            <p className="text-purple-100 text-sm">Total Visits</p>
            <p className="text-2xl font-bold mt-1">{myAppointments.length}</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-lg p-4">
            <p className="text-purple-100 text-sm">Upcoming</p>
            <p className="text-2xl font-bold mt-1">{upcomingAppointments.length}</p>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-lg p-4">
            <p className="text-purple-100 text-sm">Completed</p>
            <p className="text-2xl font-bold mt-1">{pastAppointments.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'appointments'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-5 h-5 inline-block mr-2" />
            My Appointments
          </button>
          <button
            onClick={() => setActiveTab('book')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'book'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="w-5 h-5 inline-block mr-2" />
            Book Appointment
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'gallery'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Image className="w-5 h-5 inline-block mr-2" />
            Artist Gallery
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              {/* Upcoming Appointments */}
              {upcomingAppointments.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Appointments</h2>
                  <div className="space-y-3">
                    {upcomingAppointments.map((appointment) => (
                      <div key={appointment.id} className="p-5 border-2 border-purple-200 bg-purple-50 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-lg text-gray-900">{appointment.serviceName}</p>
                            <p className="text-gray-600">with {appointment.artistName}</p>
                          </div>
                          <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
                            Confirmed
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {appointment.date}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {appointment.time}
                          </div>
                        </div>
                        
                        {appointment.notes && (
                          <div className="p-3 bg-white rounded text-sm text-gray-700 mb-3">
                            <span className="font-medium">Notes:</span> {appointment.notes}
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                            View Details
                          </button>
                          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                            Reschedule
                          </button>
                          <button className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 text-sm font-medium">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Past Appointments */}
              {pastAppointments.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Past Appointments</h2>
                  <div className="space-y-3">
                    {pastAppointments.map((appointment) => (
                      <div key={appointment.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{appointment.serviceName}</p>
                            <p className="text-sm text-gray-600">with {appointment.artistName}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                              <span>{appointment.date}</span>
                              <span>{appointment.time}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="w-4 h-4 fill-yellow-500" />
                            <Star className="w-4 h-4 fill-yellow-500" />
                            <Star className="w-4 h-4 fill-yellow-500" />
                            <Star className="w-4 h-4 fill-yellow-500" />
                            <Star className="w-4 h-4 fill-yellow-500" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {myAppointments.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg">No appointments yet</p>
                  <button
                    onClick={() => setActiveTab('book')}
                    className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                  >
                    Book Your First Appointment
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'book' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Book an Appointment</h2>
              
              {/* Services */}
              <div className="mb-8">
                <h3 className="font-semibold text-gray-900 mb-4">Select a Service</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockServices.filter(s => s.id !== 's9').map((service) => (
                    <button
                      key={service.id}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 group-hover:text-purple-700">{service.name}</h4>
                        <span className="text-lg font-bold text-purple-600">${service.price}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {service.duration} min
                        </span>
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium capitalize">
                          {service.category}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Artists */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Choose Your Artist</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {artists.map((artist) => (
                    <button
                      key={artist.id}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                    >
                      <img
                        src={artist.avatar}
                        alt={artist.name}
                        className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
                      />
                      <h4 className="font-semibold text-gray-900 text-center group-hover:text-purple-700">{artist.name}</h4>
                      <p className="text-sm text-gray-600 text-center mt-1">{artist.specialty}</p>
                      <div className="flex items-center justify-center gap-1 mt-2 text-yellow-500">
                        <Star className="w-4 h-4 fill-yellow-500" />
                        <span className="text-sm font-medium text-gray-700">4.9</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gallery' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Artist Portfolio Gallery</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockPortfolio.map((item) => {
                  const artist = artists.find(a => a.id === item.artistId);
                  return (
                    <div key={item.id} className="group relative overflow-hidden rounded-lg border border-gray-200 hover:shadow-xl transition-all">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-64 object-cover group-hover:scale-110 transition-transform"
                      />
                      <div className="p-4 bg-white">
                        <h3 className="font-semibold text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={artist?.avatar}
                              alt={artist?.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <span className="text-sm text-gray-700">{artist?.name}</span>
                          </div>
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium capitalize">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
