import React, { useState } from 'react';
import { Clock, Calendar, Save, X, Plus, Trash2 } from 'lucide-react';

interface TimeSlot {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

interface TimeOffRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
}

const initialSchedule: TimeSlot[] = [
  { day: 'Monday', enabled: true, startTime: '09:00', endTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { day: 'Tuesday', enabled: true, startTime: '09:00', endTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { day: 'Wednesday', enabled: true, startTime: '09:00', endTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { day: 'Thursday', enabled: true, startTime: '09:00', endTime: '18:00', breakStart: '12:00', breakEnd: '13:00' },
  { day: 'Friday', enabled: true, startTime: '10:00', endTime: '19:00', breakStart: '13:00', breakEnd: '14:00' },
  { day: 'Saturday', enabled: true, startTime: '10:00', endTime: '16:00' },
  { day: 'Sunday', enabled: false, startTime: '09:00', endTime: '17:00' }
];

const mockTimeOffRequests: TimeOffRequest[] = [
  {
    id: 'to1',
    startDate: '2026-02-15',
    endDate: '2026-02-16',
    reason: 'Personal appointment',
    status: 'approved'
  },
  {
    id: 'to2',
    startDate: '2026-03-01',
    endDate: '2026-03-05',
    reason: 'Vacation',
    status: 'pending'
  }
];

export function ArtistAvailability() {
  const [schedule, setSchedule] = useState<TimeSlot[]>(initialSchedule);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>(mockTimeOffRequests);
  const [showTimeOffForm, setShowTimeOffForm] = useState(false);
  const [newTimeOff, setNewTimeOff] = useState({ startDate: '', endDate: '', reason: '' });

  const handleScheduleChange = (index: number, field: keyof TimeSlot, value: any) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setSchedule(newSchedule);
  };

  const handleSaveSchedule = () => {
    alert('Schedule saved successfully!');
  };

  const handleSubmitTimeOff = (e: React.FormEvent) => {
    e.preventDefault();
    const newRequest: TimeOffRequest = {
      id: `to${timeOffRequests.length + 1}`,
      ...newTimeOff,
      status: 'pending'
    };
    setTimeOffRequests([...timeOffRequests, newRequest]);
    setNewTimeOff({ startDate: '', endDate: '', reason: '' });
    setShowTimeOffForm(false);
    alert('Time off request submitted!');
  };

  const totalHoursPerWeek = schedule
    .filter(slot => slot.enabled)
    .reduce((total, slot) => {
      const start = parseInt(slot.startTime.split(':')[0]);
      const end = parseInt(slot.endTime.split(':')[0]);
      let hours = end - start;
      
      if (slot.breakStart && slot.breakEnd) {
        const breakStart = parseInt(slot.breakStart.split(':')[0]);
        const breakEnd = parseInt(slot.breakEnd.split(':')[0]);
        hours -= (breakEnd - breakStart);
      }
      
      return total + hours;
    }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Availability Settings</h1>
          <p className="text-gray-500 mt-1">Manage your working hours and time off</p>
        </div>
        <button
          onClick={handleSaveSchedule}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          Save Changes
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Weekly Hours</p>
              <p className="text-2xl font-bold text-gray-900">{totalHoursPerWeek}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Working Days</p>
              <p className="text-2xl font-bold text-gray-900">
                {schedule.filter(s => s.enabled).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Time Off Requests</p>
              <p className="text-2xl font-bold text-gray-900">{timeOffRequests.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Weekly Schedule</h2>
        
        <div className="space-y-4">
          {schedule.map((slot, index) => (
            <div
              key={slot.day}
              className={`p-4 border-2 rounded-lg transition-colors ${
                slot.enabled ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 min-w-[140px]">
                  <input
                    type="checkbox"
                    checked={slot.enabled}
                    onChange={(e) => handleScheduleChange(index, 'enabled', e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="font-semibold text-gray-900">{slot.day}</span>
                </label>

                {slot.enabled ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 min-w-[80px]">
                        Working Hours:
                      </label>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 min-w-[80px]">
                        Break Time:
                      </label>
                      <input
                        type="time"
                        value={slot.breakStart || ''}
                        onChange={(e) => handleScheduleChange(index, 'breakStart', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={slot.breakEnd || ''}
                        onChange={(e) => handleScheduleChange(index, 'breakEnd', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-500 italic">Day off</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Off Requests */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Time Off Requests</h2>
          <button
            onClick={() => setShowTimeOffForm(!showTimeOffForm)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
          >
            {showTimeOffForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {showTimeOffForm ? 'Cancel' : 'Request Time Off'}
          </button>
        </div>

        {showTimeOffForm && (
          <form onSubmit={handleSubmitTimeOff} className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={newTimeOff.startDate}
                  onChange={(e) => setNewTimeOff({ ...newTimeOff, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={newTimeOff.endDate}
                  onChange={(e) => setNewTimeOff({ ...newTimeOff, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason *
              </label>
              <textarea
                value={newTimeOff.reason}
                onChange={(e) => setNewTimeOff({ ...newTimeOff, reason: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Vacation, medical, personal, etc."
                required
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              Submit Request
            </button>
          </form>
        )}

        <div className="space-y-3">
          {timeOffRequests.map((request) => (
            <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-900">
                      {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      request.status === 'approved' ? 'bg-green-100 text-green-700' :
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">{request.reason}</p>
                </div>
                {request.status === 'pending' && (
                  <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {timeOffRequests.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No time off requests</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
