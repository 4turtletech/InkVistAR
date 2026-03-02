import React, { useState } from 'react';
import { FileText, Plus, Search, Image as ImageIcon, Calendar, User, Edit2, Save, X } from 'lucide-react';

interface Consultation {
  id: string;
  clientName: string;
  clientId: string;
  date: string;
  designType: 'tattoo' | 'piercing';
  placement: string;
  size: string;
  style?: string;
  colorPreference?: string;
  budget?: number;
  notes: string;
  sketchUrls?: string[];
  referenceImages?: string[];
  status: 'pending' | 'sketching' | 'approved' | 'scheduled';
  nextSteps: string;
}

const mockConsultations: Consultation[] = [
  {
    id: 'c1',
    clientName: 'Emma Wilson',
    clientId: 'cl1',
    date: '2026-02-06',
    designType: 'tattoo',
    placement: 'Forearm (inner)',
    size: 'Medium (4-5 inches)',
    style: 'Traditional',
    colorPreference: 'Full color - reds, greens, black',
    budget: 300,
    notes: 'Client wants a traditional rose design with thorns. Prefers vibrant colors. Has sensitive skin - use hypoallergenic ink. Previous tattoos healed well.',
    referenceImages: [
      'https://images.unsplash.com/photo-1590246814883-57c511a6f1fc?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1611501275019-9b5cda504f1b?w=300&h=300&fit=crop'
    ],
    status: 'sketching',
    nextSteps: 'Complete sketch by Feb 12, send for approval'
  },
  {
    id: 'c2',
    clientName: 'Chris Anderson',
    clientId: 'cl2',
    date: '2026-02-05',
    designType: 'tattoo',
    placement: 'Upper arm',
    size: 'Small (2 inches)',
    style: 'Minimalist / Fine Line',
    colorPreference: 'Black only',
    budget: 150,
    notes: 'Simple mountain silhouette design. Client is first-timer, nervous about pain. Keep session under 1 hour.',
    status: 'approved',
    nextSteps: 'Scheduled for Feb 14 at 2:00 PM'
  },
  {
    id: 'c3',
    clientName: 'Alex Thompson',
    clientId: 'cl3',
    date: '2026-02-04',
    designType: 'tattoo',
    placement: 'Full sleeve (left arm)',
    size: 'Large (full sleeve)',
    style: 'Japanese / Irezumi',
    colorPreference: 'Full color',
    budget: 3000,
    notes: 'Continuing sleeve project - Session 4. Focus on koi fish and cherry blossoms. Client has 3-hour pain tolerance. Bring extra water and snacks.',
    sketchUrls: [
      'https://images.unsplash.com/photo-1565058381374-93c98c7e0b3e?w=300&h=300&fit=crop'
    ],
    status: 'scheduled',
    nextSteps: 'Next session Feb 20, 9:00 AM - 4 hours'
  },
  {
    id: 'c4',
    clientName: 'Morgan Lee',
    clientId: 'cl4',
    date: '2026-02-03',
    designType: 'piercing',
    placement: 'Daith piercing (right ear)',
    size: 'Standard',
    notes: 'Client wants daith piercing to help with migraines. Prefers surgical steel. Has multiple existing piercings, no complications. Discuss aftercare thoroughly.',
    status: 'pending',
    nextSteps: 'Schedule appointment'
  },
  {
    id: 'c5',
    clientName: 'Riley Martinez',
    clientId: 'cl5',
    date: '2026-01-30',
    designType: 'tattoo',
    placement: 'Ankle',
    size: 'Small (1-2 inches)',
    style: 'Delicate / Fine Line',
    colorPreference: 'Black only',
    budget: 100,
    notes: 'Infinity symbol with initials. Client has low pain tolerance - recommend numbing cream.',
    referenceImages: [
      'https://images.unsplash.com/photo-1598371611686-216a3f42e4cd?w=300&h=300&fit=crop'
    ],
    status: 'sketching',
    nextSteps: 'Send sketch options by Feb 8'
  }
];

export function ClientConsultations() {
  const [consultations, setConsultations] = useState(mockConsultations);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Consultation['status']>('all');
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const filteredConsultations = consultations.filter(c => {
    const matchesSearch = c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.placement.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    pending: consultations.filter(c => c.status === 'pending').length,
    sketching: consultations.filter(c => c.status === 'sketching').length,
    approved: consultations.filter(c => c.status === 'approved').length,
    scheduled: consultations.filter(c => c.status === 'scheduled').length
  };

  const getStatusColor = (status: Consultation['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'sketching':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Consultations</h1>
          <p className="text-gray-500 mt-1">Manage design consultations and notes</p>
        </div>
        <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Consultation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 text-gray-600 p-3 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 text-yellow-600 p-3 rounded-lg">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Sketching</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.sketching}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.approved}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.scheduled}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consultations List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-6">
          <div className="space-y-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search consultations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="sketching">Sketching</option>
              <option value="approved">Approved</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredConsultations.map((consultation) => (
              <button
                key={consultation.id}
                onClick={() => {
                  setSelectedConsultation(consultation);
                  setIsEditing(false);
                }}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  selectedConsultation?.id === consultation.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{consultation.clientName}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(consultation.status)}`}>
                    {consultation.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{consultation.placement}</p>
                <p className="text-xs text-gray-500">{new Date(consultation.date).toLocaleDateString()}</p>
              </button>
            ))}

            {filteredConsultations.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No consultations found</p>
              </div>
            )}
          </div>
        </div>

        {/* Consultation Details */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          {selectedConsultation ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedConsultation.clientName}</h2>
                  <p className="text-gray-500">Consultation from {new Date(selectedConsultation.date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          alert('Changes saved!');
                        }}
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Design Type</p>
                  <p className="font-semibold text-gray-900 capitalize">{selectedConsultation.designType}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Placement</p>
                  <p className="font-semibold text-gray-900">{selectedConsultation.placement}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Size</p>
                  <p className="font-semibold text-gray-900">{selectedConsultation.size}</p>
                </div>
                {selectedConsultation.style && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Style</p>
                    <p className="font-semibold text-gray-900">{selectedConsultation.style}</p>
                  </div>
                )}
                {selectedConsultation.colorPreference && (
                  <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Color Preference</p>
                    <p className="font-semibold text-gray-900">{selectedConsultation.colorPreference}</p>
                  </div>
                )}
                {selectedConsultation.budget && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Budget</p>
                    <p className="font-semibold text-gray-900">${selectedConsultation.budget}</p>
                  </div>
                )}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  {isEditing ? (
                    <select className="w-full px-3 py-1 border border-gray-300 rounded font-semibold">
                      <option value="pending">Pending</option>
                      <option value="sketching">Sketching</option>
                      <option value="approved">Approved</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  ) : (
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedConsultation.status)}`}>
                      {selectedConsultation.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Consultation Notes</label>
                {isEditing ? (
                  <textarea
                    defaultValue={selectedConsultation.notes}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                ) : (
                  <p className="text-gray-700 p-4 bg-gray-50 rounded-lg">{selectedConsultation.notes}</p>
                )}
              </div>

              {/* Reference Images */}
              {selectedConsultation.referenceImages && selectedConsultation.referenceImages.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Reference Images</label>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedConsultation.referenceImages.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Reference ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                    ))}
                    {isEditing && (
                      <button className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:text-purple-600 hover:border-purple-400 transition-colors">
                        <Plus className="w-8 h-8" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Sketch Uploads */}
              {selectedConsultation.sketchUrls && selectedConsultation.sketchUrls.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Design Sketches</label>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedConsultation.sketchUrls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Sketch ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-purple-300"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Next Steps</label>
                {isEditing ? (
                  <textarea
                    defaultValue={selectedConsultation.nextSteps}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                ) : (
                  <p className="text-gray-700 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg font-medium">
                    {selectedConsultation.nextSteps}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg">Select a consultation to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
