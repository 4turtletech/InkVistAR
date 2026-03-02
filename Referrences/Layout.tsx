import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, Menu, X, Home, Calendar, Users, 
  Image, Briefcase, BarChart3, Settings, UserCircle,
  Bell, ListTodo, DollarSign, Clock, FileText, Package
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { currentUser, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const getNavigationItems = () => {
    const role = currentUser?.role;
    
    const commonItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
    ];

    if (role === 'owner' || role === 'manager') {
      return [
        ...commonItems,
        { id: 'clients', label: 'Clients', icon: Users },
        { id: 'services', label: 'Services', icon: Briefcase },
        { id: 'staff-scheduling', label: 'Staff Scheduling', icon: Clock },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'tasks', label: 'Tasks', icon: ListTodo },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
    }

    if (role === 'artist') {
      return [
        ...commonItems,
        { id: 'consultations', label: 'Consultations', icon: FileText },
        { id: 'availability', label: 'Availability', icon: Clock },
        { id: 'earnings', label: 'Earnings', icon: DollarSign },
        { id: 'portfolio', label: 'Portfolio', icon: Image },
        { id: 'notifications', label: 'Notifications', icon: Bell },
      ];
    }

    // Customer
    return [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'book', label: 'Book Appointment', icon: Calendar },
    ];
  };

  const navigationItems = getNavigationItems();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
                <Image className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Ink & Steel</h1>
                <p className="text-xs text-gray-500">Studio Management</p>
              </div>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <img
                src={currentUser?.avatar}
                alt={currentUser?.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{currentUser?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{currentUser?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    if (window.innerWidth < 1024) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <h1 className="font-bold text-gray-900">Ink & Steel Studio</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}