/**
 * NotificationBell — nav bar component showing unread count badge
 * and dropdown list of recent notifications.
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, FileText, Receipt, Clock, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/toast-context';

const typeConfig: Record<string, { icon: typeof Bell; color: string }> = {
  EXPENSE_CREATED: { icon: Receipt, color: 'text-blue-500' },
  INVOICE_PAID: { icon: CheckCircle, color: 'text-green-500' },
  INVOICE_OVERDUE: { icon: AlertTriangle, color: 'text-red-500' },
  REMINDER_SENT: { icon: Clock, color: 'text-amber-500' },
  RECURRING_GENERATED: { icon: FileText, color: 'text-indigo-500' },
  OCR_COMPLETE: { icon: Zap, color: 'text-purple-500' },
  SYSTEM: { icon: Bell, color: 'text-gray-500' },
};

export default function NotificationBell({ dark }: { dark: boolean }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadNotifications = async () => {
    try {
      const client = generateClient<Schema>();
      const { data } = await client.models.Notification.list();
      const sorted = (data || []).sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNotifications(sorted.slice(0, 20));
      setUnreadCount(sorted.filter((n: any) => !n.read).length);
    } catch {
      toast.error('Failed to load notifications');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const client = generateClient<Schema>();
      await client.models.Notification.update({ id, read: true });
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllRead = async () => {
    try {
      const client = generateClient<Schema>();
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => client.models.Notification.update({ id: n.id, read: true })));
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleClick = (n: any) => {
    if (!n.read) markAsRead(n.id);
    if (n.link) { router.push(n.link); setOpen(false); }
  };

  const timeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        className={`relative p-2 rounded-lg transition-colors ${dark ? 'hover:bg-purple-500/20 text-slate-300' : 'hover:bg-gray-100 text-gray-600'}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl shadow-lg border z-50 ${dark ? 'bg-gray-900 border-purple-500/30' : 'bg-white border-gray-200'}`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${dark ? 'border-purple-500/20' : 'border-gray-100'}`}>
            <span className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className={`text-xs ${dark ? 'text-purple-400 hover:text-purple-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className={`px-4 py-8 text-center text-sm ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
              No notifications yet
            </div>
          ) : (
            notifications.map(n => {
              const config = typeConfig[n.type] || typeConfig.SYSTEM;
              const Icon = config.icon;
              return (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                    !n.read
                      ? dark ? 'bg-purple-500/5 hover:bg-purple-500/10' : 'bg-indigo-50/50 hover:bg-indigo-50'
                      : dark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                  } ${dark ? 'border-b border-purple-500/10' : 'border-b border-gray-50'}`}>
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${dark ? 'text-white' : 'text-gray-900'} ${n.read ? 'opacity-60' : ''}`}>
                      {n.title}
                    </p>
                    <p className={`text-xs mt-0.5 line-clamp-2 ${dark ? 'text-slate-400' : 'text-gray-500'} ${n.read ? 'opacity-60' : ''}`}>
                      {n.message}
                    </p>
                    <p className={`text-xs mt-1 ${dark ? 'text-slate-600' : 'text-gray-400'}`}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && <span className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
