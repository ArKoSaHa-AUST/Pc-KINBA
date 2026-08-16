import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useToast } from './ui';

/** Signed-in avatar button with a themed Profile / Logout dropdown. */
export default function UserMenu() {
  const { t } = useTranslation('auth');
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAvatarBroken(false);
  }, [user?.avatarUrl]);

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

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    toast({ message: t('profile.loggedOut'), variant: 'info' });
    navigate('/');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 hover:bg-border transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user.avatarUrl && !avatarBroken ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            onError={() => setAvatarBroken(true)}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-text-muted" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 mt-2 w-56 rounded-2xl bg-bg-surface border border-border shadow-[0_16px_48px_rgba(0,0,0,0.3)] p-2 z-50"
            role="menu"
          >
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-sm font-semibold text-text-primary truncate">{user.name}</p>
              <p className="text-xs text-text-muted truncate">{user.email}</p>
            </div>
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-border transition-colors"
              role="menuitem"
            >
              <UserIcon className="w-4 h-4" /> {t('menu.profile')}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors"
              role="menuitem"
            >
              <LogOut className="w-4 h-4" /> {t('menu.logout')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
