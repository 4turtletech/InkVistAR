import React, { useState } from 'react';
import { Search, Mail, Phone, Calendar, DollarSign, User, Edit, Trash2 } from 'lucide-react';
import { mockClients } from '../data/mockData';

export function ClientManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'visits' | 'spent'>('name');

  const filteredClients = mockClients
    .filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm)
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'visits') return b.totalVisits - a.totalVisits;
      if (sortBy === 'spent') return b.totalSpent - a.totalSpent;
      return 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
          <p className="text-gray-500 mt-1">Manage your client database</p>
        </div>
        <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2">
          <User className="w-5 h-5" />
          Add New Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{mockClients.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Visits</p>
              <p className="text-2xl font-bold text-gray-900">
                {mockClients.reduce((sum, c) => sum + c.totalVisits, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${mockClients.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-teal-100 text-teal-600 p-3 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Avg. Per Client</p>
              <p className="text-2xl font-bold text-gray-900">
                ${Math.round(mockClients.reduce((sum, c) => sum + c.totalSpent, 0) / mockClients.length)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'visits' | 'spent')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="name">Sort by Name</option>
            <option value="visits">Sort by Visits</option>
            <option value="spent">Sort by Spent</option>
          </select>
        </div>

        {/* Client List */}
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="p-5 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {client.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{client.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {client.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {client.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Total Visits</p>
                      <p className="text-xl font-bold text-blue-600">{client.totalVisits}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Total Spent</p>
                      <p className="text-xl font-bold text-green-600">${client.totalSpent}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Last Visit</p>
                      <p className="text-sm font-semibold text-purple-600">
                        {client.lastVisit ? new Date(client.lastVisit).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>

                  {client.notes && (
                    <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                      <span className="font-medium">Notes:</span> {client.notes}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button className="p-2 border border-red-300 rounded-lg hover:bg-red-50 text-red-600">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>No clients found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
