"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  href?: string;
  isRead: boolean;
  createdAt: string;
  type: string;
}

interface NotificationResponse {
  items: NotificationItem[];
  unreadCount: number;
}

export default function NotificationBell() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await apiFetch<NotificationResponse>('/notifications?limit=8');
      setItems(Array.isArray(response.items) ? response.items : []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 60000);

    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      setItems((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
        })),
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, []);

  const handleItemClick = useCallback(
    async (item: NotificationItem) => {
      if (!item.isRead) {
        try {
          await apiFetch(`/notifications/${item.id}/read`, { method: 'PATCH' });
          setItems((current) =>
            current.map((entry) =>
              entry.id === item.id ? { ...entry, isRead: true } : entry,
            ),
          );
          setUnreadCount((current) => Math.max(0, current - 1));
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      }

      setIsOpen(false);

      if (item.href) {
        router.push(item.href);
      }
    },
    [router],
  );

  const summaryText = useMemo(() => {
    if (unreadCount === 0) return 'All caught up';
    if (unreadCount === 1) return '1 unread update';
    return `${unreadCount} unread updates`;
  }, [unreadCount]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Open notifications"
        onClick={() => {
          setIsOpen((current) => !current);
          if (!isOpen) {
            void loadNotifications();
          }
        }}
        className="relative w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 text-primary flex items-center justify-center hover:border-secondary hover:text-secondary transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-secondary text-white text-[11px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[360px] max-w-[calc(100vw-2rem)] bg-white border border-gray-100 rounded-[28px] shadow-xl shadow-black/5 overflow-hidden z-50">
          <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-primary">Notifications</p>
              <p className="text-xs text-gray-500 mt-1">{summaryText}</p>
            </div>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-2 text-xs font-bold text-secondary hover:text-primary transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          </div>

          <div className="max-h-[420px] overflow-auto">
            {isLoading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 rounded-2xl bg-gray-50 animate-pulse" />
                ))}
              </div>
            ) : items.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleItemClick(item)}
                    className={`w-full text-left px-5 py-4 transition-colors ${
                      item.isRead ? 'bg-white hover:bg-gray-50' : 'bg-secondary/5 hover:bg-secondary/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-2 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          item.isRead ? 'bg-gray-300' : 'bg-secondary'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-primary truncate">{item.title}</p>
                          <span className="text-[11px] text-gray-400 whitespace-nowrap">
                            {(() => {
                              try {
                                const d = new Date(item.createdAt);
                                return isNaN(d.getTime()) ? '' : formatDistanceToNow(d, { addSuffix: true });
                              } catch {
                                return '';
                              }
                            })()}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.message}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-bold text-primary">No notifications yet</p>
                <p className="text-xs text-gray-500 mt-2">
                  New payments, court dates, users, and inquiries will show up here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
