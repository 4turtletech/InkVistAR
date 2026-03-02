import React, { useState } from 'react';
import { X, Calendar, Clock, User, DollarSign } from 'lucide-react';
import { mockServices, mockUsers } from '../data/mockData';
import { Service } from '../types';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedDate?: string;
  preselectedArtistId?: string;
}

export function BookingModal({ isOpen, onClose, preselectedDate, preselectedArtistId }: BookingModalProps) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState(preselectedArtistId || '');
  const [selectedDate, setSelectedDate] = useState(preselectedDate || '');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');

  const artists = mockUsers.filter(u => u.role === 'artist');
  const availableTimes = [
    '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would save to database
    alert('Appointment booked successfully!');
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedArtistId(preselectedArtistId || '');
    setSelectedDate(preselectedDate || '');
    setSelectedTime('');
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Book Appointment</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    step >= num ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {num}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    step >= num ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {num === 1 ? 'Service' : num === 2 ? 'Time & Artist' : 'Details'}
                  </span>
                </div>
                {num < 3 && (
                  <div className={`flex-1 h-1 mx-4 ${
                    step > num ? 'bg-purple-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Step 1: Select Service */}
            {step === 1 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 mb-4">Select a Service</h3>
                {mockServices.filter(s => s.id !== 's9').map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      setSelectedService(service);
                      setStep(2);
                    }}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      selectedService?.id === service.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{service.name}</h4>
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
            )}

            {/* Step 2: Select Time & Artist */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Select Artist</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {artists.map((artist) => (
                      <button
                        key={artist.id}
                        type="button"
                        onClick={() => setSelectedArtistId(artist.id)}
                        className={`flex items-center gap-4 p-4 border-2 rounded-lg transition-all ${
                          selectedArtistId === artist.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <img
                          src={artist.avatar}
                          alt={artist.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-gray-900">{artist.name}</p>
                          <p className="text-sm text-gray-600">{artist.specialty}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Select Date</h3>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min="2026-02-07"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Select Time</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {availableTimes.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`px-4 py-2 border-2 rounded-lg font-medium transition-all ${
                          selectedTime === time
                            ? 'border-purple-500 bg-purple-600 text-white'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Client Details */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 mb-4">Your Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Design ideas, placement, size, etc."
                  />
                </div>

                {/* Booking Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">Booking Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-medium text-gray-900">{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Artist:</span>
                      <span className="font-medium text-gray-900">
                        {artists.find(a => a.id === selectedArtistId)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date & Time:</span>
                      <span className="font-medium text-gray-900">{selectedDate} at {selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium text-gray-900">{selectedService?.duration} minutes</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-gray-900 font-semibold">Total:</span>
                      <span className="text-purple-600 font-bold text-lg">${selectedService?.price}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
            )}
            
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && selectedService) {
                    setStep(2);
                  } else if (step === 2 && selectedArtistId && selectedDate && selectedTime) {
                    setStep(3);
                  }
                }}
                disabled={
                  (step === 1 && !selectedService) ||
                  (step === 2 && (!selectedArtistId || !selectedDate || !selectedTime))
                }
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                Confirm Booking
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}