import React, { useState } from 'react';
import { Bell, CheckCircle, AlertCircle, Info, Calendar, User, X, Check } from 'lucide-react';

interface Notification {
  id: string;
  type: 'appointment' | 'request' | 'alert' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionRequired?: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'appointment',
    title: 'New Appointment Booked',
    message: 'Emma Wilson has booked a Medium Tattoo for Feb 15 at 2:00 PM',
    timestamp: '2026-02-07T10:30:00',
    read: false,
    actionRequired: true
  },
  {
    id: 'n2',
    type: 'request',
    title: 'Time Off Request',
    message: 'Jamie Chen has requested time off from March 1-5',
    timestamp: '2026-02-07T09:15:00',
    read: false,
    actionRequired: true
  },
  {
    id: 'n3',
    type: 'alert',
    title: 'Low Inventory Alert',
    message: 'Color Ink Set is running low. Current stock: 8 sets (min: 15)',
    timestamp: '2026-02-07T08:00:00',
    read: false,
    actionRequired: true
  },
  {
    id: 'n4',
    type: 'appointment',
    title: 'Appointment Rescheduled',
    message: 'Chris Anderson rescheduled appointment to Feb 10 at 3:00 PM',
    timestamp: '2026-02-06T16:45:00',
    read: false
  },
  {
    id: 'n5',
    type: 'info',
    title: 'Payment Received',
    message: 'Deposit payment of $50 received from Alex Thompson',
    timestamp: '2026-02-06T14:20:00',
    read: true
  },
  {
    id: 'n6',
    type: 'appointment',
    title: 'Upcoming Appointment Reminder',
    message: 'You have an appointment with Morgan Lee tomorrow at 11:00 AM',
    timestamp: '2026-02-06T10:00:00',
    read: true
  },
  {
    id: 'n7',
    type: 'info',
    title: 'New Review',
    message: 'Jordan Smith left a 5-star review for your service',
    timestamp: '2026-02-05T18:30:00',
    read: true
  }
];

export function NotificationCenter() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'actionRequired'>('all');

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'actionRequired') return n.actionRequired;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const actionRequiredCount = notifications.filter(n => n.actionRequired).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="w-5 h-5" />;
      case 'request':
        return <User className="w-5 h-5" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-100 text-blue-600';
      case 'request':
        return 'bg-purple-100 text-purple-600';
      case 'alert':
        return 'bg-red-100 text-red-600';
      case 'info':
        return 'bg-green-100 text-green-600';
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date('2026-02-07T12:00:00');
    const then = new Date(timestamp);
    const diffInMs = now.getTime() - then.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Stay updated with your studio activities</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg font-medium flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            Mark All as Read
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Notifications</p>
              <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Unread</p>
              <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 text-red-600 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Action Required</p>
              <p className="text-2xl font-bold text-gray-900">{actionRequiredCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-2 inline-flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'all'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('actionRequired')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            filter === 'actionRequired'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Action Required ({actionRequiredCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-6 hover:bg-gray-50 transition-colors ${
                !notification.read ? 'bg-purple-50' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`${getNotificationColor(notification.type)} p-3 rounded-lg flex-shrink-0`}>
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-purple-600 rounded-full" />
                        )}
                        {notification.actionRequired && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            Action Required
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm">{notification.message}</p>
                      <p className="text-gray-400 text-xs mt-2">{getTimeAgo(notification.timestamp)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {notification.actionRequired && (
                    <div className="flex gap-2 mt-3">
                      <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                        Take Action
                      </button>
                      <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                        View Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">No notifications</p>
            <p className="text-sm mt-1">You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}
