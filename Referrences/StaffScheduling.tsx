import React, { useState } from 'react';
import { Calendar, Clock, UserCheck, UserX, Plus, Edit2, Coffee } from 'lucide-react';
import { mockUsers } from '../data/mockData';

interface Shift {
  id: string;
  artistId: string;
  artistName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'off' | 'sick';
  breakTime?: string;
}

const mockShifts: Shift[] = [
  {
    id: 'sh1',
    artistId: 'u3',
    artistName: 'Alex Rivera',
    date: '2026-02-08',
    startTime: '09:00',
    endTime: '18:00',
    status: 'scheduled',
    breakTime: '12:00-13:00'
  },
  {
    id: 'sh2',
    artistId: 'u4',
    artistName: 'Jamie Chen',
    date: '2026-02-08',
    startTime: '10:00',
    endTime: '19:00',
    status: 'scheduled',
    breakTime: '13:00-14:00'
  },
  {
    id: 'sh3',
    artistId: 'u5',
    artistName: 'Taylor Brooks',
    date: '2026-02-08',
    startTime: '11:00',
    endTime: '20:00',
    status: 'scheduled',
    breakTime: '14:00-15:00'
  },
  {
    id: 'sh4',
    artistId: 'u3',
    artistName: 'Alex Rivera',
    date: '2026-02-09',
    startTime: '09:00',
    endTime: '18:00',
    status: 'scheduled',
    breakTime: '12:00-13:00'
  },
  {
    id: 'sh5',
    artistId: 'u4',
    artistName: 'Jamie Chen',
    date: '2026-02-09',
    startTime: '10:00',
    endTime: '19:00',
    status: 'off'
  },
  {
    id: 'sh6',
    artistId: 'u5',
    artistName: 'Taylor Brooks',
    date: '2026-02-09',
    startTime: '11:00',
    endTime: '20:00',
    status: 'scheduled',
    breakTime: '14:00-15:00'
  }
];

export function StaffScheduling() {
  const [selectedDate, setSelectedDate] = useState('2026-02-08');
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  
  const artists = mockUsers.filter(u => u.role === 'artist');
  const todaysShifts = mockShifts.filter(s => s.date === selectedDate);

  // Calculate week dates
  const getWeekDates = () => {
    const dates = [];
    const startDate = new Date('2026-02-08');
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Scheduling</h1>
          <p className="text-gray-500 mt-1">Manage staff shifts and availability</p>
        </div>
        <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Shift
        </button>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex">
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              viewMode === 'day'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Day View
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              viewMode === 'week'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Week View
          </button>
        </div>
        
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {viewMode === 'day' ? (
        /* Day View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Staff on Duty */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-green-600" />
              Staff on Duty
            </h2>
            
            <div className="space-y-3">
              {todaysShifts.filter(s => s.status === 'scheduled').map((shift) => {
                const artist = artists.find(a => a.id === shift.artistId);
                return (
                  <div key={shift.id} className="p-4 border-2 border-green-200 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={artist?.avatar}
                        alt={shift.artistName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{shift.artistName}</p>
                        <p className="text-sm text-gray-600">{artist?.specialty}</p>
                      </div>
                      <button className="p-2 hover:bg-white rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="w-4 h-4" />
                        <span>{shift.startTime} - {shift.endTime}</span>
                      </div>
                      {shift.breakTime && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Coffee className="w-4 h-4" />
                          <span>Break: {shift.breakTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Staff Off/Unavailable */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserX className="w-6 h-6 text-red-600" />
              Off Duty / Unavailable
            </h2>
            
            <div className="space-y-3">
              {todaysShifts.filter(s => s.status !== 'scheduled').map((shift) => {
                const artist = artists.find(a => a.id === shift.artistId);
                return (
                  <div key={shift.id} className="p-4 border-2 border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img
                        src={artist?.avatar}
                        alt={shift.artistName}
                        className="w-12 h-12 rounded-full object-cover grayscale"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{shift.artistName}</p>
                        <p className="text-sm text-gray-600 capitalize">{shift.status}</p>
                      </div>
                      <span className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-full">
                        {shift.status === 'off' ? 'Day Off' : 'Sick Leave'}
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {todaysShifts.filter(s => s.status !== 'scheduled').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <UserCheck className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>All staff available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Week View */
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Artist</th>
                {weekDates.map((date) => (
                  <th key={date} className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    <div>{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-xs text-gray-500 font-normal">
                      {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {artists.map((artist) => (
                <tr key={artist.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={artist.avatar}
                        alt={artist.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{artist.name}</p>
                        <p className="text-xs text-gray-500">{artist.specialty}</p>
                      </div>
                    </div>
                  </td>
                  {weekDates.map((date) => {
                    const shift = mockShifts.find(s => s.artistId === artist.id && s.date === date);
                    return (
                      <td key={date} className="px-6 py-4 text-center">
                        {shift ? (
                          <div className={`p-2 rounded-lg text-xs font-medium ${
                            shift.status === 'scheduled'
                              ? 'bg-green-100 text-green-700'
                              : shift.status === 'off'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {shift.status === 'scheduled' ? (
                              <div>
                                <div>{shift.startTime} - {shift.endTime}</div>
                                {shift.breakTime && (
                                  <div className="text-xs opacity-75 mt-1">Break: {shift.breakTime}</div>
                                )}
                              </div>
                            ) : (
                              <div className="capitalize">{shift.status}</div>
                            )}
                          </div>
                        ) : (
                          <button className="text-gray-400 hover:text-purple-600 transition-colors">
                            <Plus className="w-5 h-5 mx-auto" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Coverage Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Coverage Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Hours Scheduled</p>
            <p className="text-2xl font-bold text-green-600">24h</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Artists on Duty</p>
            <p className="text-2xl font-bold text-blue-600">
              {todaysShifts.filter(s => s.status === 'scheduled').length}
            </p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Breaks Scheduled</p>
            <p className="text-2xl font-bold text-yellow-600">
              {todaysShifts.filter(s => s.breakTime).length}
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Coverage Rate</p>
            <p className="text-2xl font-bold text-purple-600">100%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
