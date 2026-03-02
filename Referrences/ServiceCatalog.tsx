import React, { useState } from 'react';
import { Clock, DollarSign, Edit, Trash2, Plus } from 'lucide-react';
import { mockServices } from '../data/mockData';

export function ServiceCatalog() {
  const [filter, setFilter] = useState<'all' | 'tattoo' | 'piercing'>('all');

  const filteredServices = filter === 'all' 
    ? mockServices 
    : mockServices.filter(s => s.category === filter);

  const tattooServices = mockServices.filter(s => s.category === 'tattoo');
  const piercingServices = mockServices.filter(s => s.category === 'piercing');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Catalog</h1>
          <p className="text-gray-500 mt-1">Manage services and pricing</p>
        </div>
        <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Service
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-500 text-sm mb-2">Total Services</p>
          <p className="text-3xl font-bold text-gray-900">{mockServices.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-500 text-sm mb-2">Tattoo Services</p>
          <p className="text-3xl font-bold text-purple-600">{tattooServices.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-gray-500 text-sm mb-2">Piercing Services</p>
          <p className="text-3xl font-bold text-blue-600">{piercingServices.length}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2 inline-flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All Services
        </button>
        <button
          onClick={() => setFilter('tattoo')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            filter === 'tattoo'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Tattoos
        </button>
        <button
          onClick={() => setFilter('piercing')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            filter === 'piercing'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Piercings
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                service.category === 'tattoo'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {service.category}
              </span>
              <div className="flex gap-1">
                <button className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-1.5 border border-red-300 rounded-lg hover:bg-red-50 text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="font-semibold text-lg text-gray-900 mb-2">{service.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{service.description}</p>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  Duration
                </span>
                <span className="font-semibold text-gray-900">{service.duration} min</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  Price
                </span>
                <span className="font-semibold text-gray-900">
                  {service.price === 0 ? 'Free' : `$${service.price}`}
                </span>
              </div>
            </div>

            <button className="w-full py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 font-medium transition-colors">
              Edit Service
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
