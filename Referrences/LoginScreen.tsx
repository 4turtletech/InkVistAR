import React from 'react';
import { useAuth } from '../context/AuthContext';
import { mockUsers } from '../data/mockData';
import { UserCircle, Crown, Shield, Palette, User } from 'lucide-react';

const roleIcons = {
  owner: Crown,
  manager: Shield,
  artist: Palette,
  customer: User
};

const roleColors = {
  owner: 'bg-purple-500',
  manager: 'bg-blue-500',
  artist: 'bg-green-500',
  customer: 'bg-gray-500'
};

export function LoginScreen() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4">
            <Palette className="w-10 h-10 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Ink & Steel Studio</h1>
          <p className="text-purple-200">Studio Management System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-semibold text-center mb-8">Select Your Role</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockUsers.map((user) => {
              const Icon = roleIcons[user.role];
              const colorClass = roleColors[user.role];
              
              return (
                <button
                  key={user.id}
                  onClick={() => login(user.id)}
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all group"
                >
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className={`absolute -bottom-1 -right-1 ${colorClass} rounded-full p-1.5`}>
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                    {user.specialty && (
                      <p className="text-xs text-gray-400 mt-1">{user.specialty}</p>
                    )}
                  </div>
                  
                  <div className="text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              <span className="font-semibold">Demo Mode:</span> Select any user to explore their dashboard and features
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
