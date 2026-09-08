import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, TrendingDown } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import {
  getNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from '../api/notifications';

const timeAgo = (iso: string) => {
  const mins = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

/** In-app notification feed for signed-in users (price drops on wishlisted products). */
export default function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAuth = !!user?.id && !user.id.startsWith('demo_') && !user.id.startsWith('user_');

  const { data: items = [] } = useQuery<AppNotification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: () => getNotifications(user!.id),
    enabled: isAuth,
    refetchInterval: 60_000,
  });
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (!open || !unread || !user?.id) return;
    markAllNotificationsRead(user.id)
      .then(() => queryClient.invalidateQueries({ queryKey: ['notifications', user.id] }))
      .catch(() => {});
  }, [open, unread, user?.id, queryClient]);

  if (!isAuth) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-border transition-colors cursor-pointer"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            role="menu"
            className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-border bg-bg-surface shadow-2xl z-50 p-2"
          >
            <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-muted">
              Price drop alerts
            </p>
            {items.length === 0 ? (
              <p className="px-3 pb-3 text-sm text-text-muted">
                No notifications yet. Track a product to get alerted when its price falls.
              </p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  to={n.link || '/profile'}
                  onClick={() => setOpen(false)}
                  className={`flex gap-3 px-3 py-2.5 rounded-xl hover:bg-border transition-colors ${
                    n.read_at ? 'opacity-70' : ''
                  }`}
                >
                  <TrendingDown className="w-4 h-4 mt-0.5 shrink-0 text-success" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-text-primary truncate">
                      {n.title}
                    </span>
                    <span className="block text-xs text-text-muted">{n.body}</span>
                    <span className="block text-[11px] text-text-muted mt-1">
                      {timeAgo(n.created_at)}
                    </span>
                  </span>
                </Link>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
