import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { mockAppointments } from '../data/mockData';
import { Appointment } from '../types';

interface AppointmentCalendarProps {
  onSelectDate?: (date: string) => void;
  selectedArtistId?: string;
}

export function AppointmentCalendar({ onSelectDate, selectedArtistId }: AppointmentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 6)); // Feb 6, 2026
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const formatDate = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const getAppointmentsForDate = (day: number): Appointment[] => {
    const dateStr = formatDate(day);
    let appointments = mockAppointments.filter(a => a.date === dateStr);
    if (selectedArtistId) {
      appointments = appointments.filter(a => a.artistId === selectedArtistId);
    }
    return appointments;
  };

  const handleDateClick = (day: number) => {
    const dateStr = formatDate(day);
    setSelectedDate(dateStr);
    onSelectDate?.(dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date(2026, 1, 6); // Current date in mock
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
  };

  const days = [];
  
  // Empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50" />);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(day);
    const appointments = getAppointmentsForDate(day);
    const isSelected = selectedDate === dateStr;
    const isTodayDate = isToday(day);
    
    days.push(
      <button
        key={day}
        onClick={() => handleDateClick(day)}
        className={`h-24 p-2 border border-gray-200 hover:bg-purple-50 transition-colors text-left ${
          isSelected ? 'bg-purple-100 border-purple-500' : ''
        } ${isTodayDate ? 'border-2 border-blue-500' : ''}`}
      >
        <div className={`font-semibold mb-1 ${isTodayDate ? 'text-blue-600' : 'text-gray-900'}`}>
          {day}
        </div>
        <div className="space-y-1">
          {appointments.slice(0, 2).map((apt, idx) => (
            <div
              key={idx}
              className={`text-xs px-1 py-0.5 rounded truncate ${
                apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                apt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}
            >
              {apt.time} {apt.clientName}
            </div>
          ))}
          {appointments.length > 2 && (
            <div className="text-xs text-gray-500">+{appointments.length - 2} more</div>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-purple-600" />
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={prevMonth}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-0 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0 border-t border-l border-gray-200">
        {days}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span className="text-gray-600">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-gray-600">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          <span className="text-gray-600">In Progress</span>
        </div>
      </div>
    </div>
  );
}
