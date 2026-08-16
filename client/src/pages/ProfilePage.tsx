import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { LogOut, ShieldCheck, User as UserIcon, Bell, KeyRound, Upload } from 'lucide-react';
import { Badge, Button, Card, Input, useToast } from '../components/ui';
import { useAuth } from '../auth/useAuth';
import { authErrorMessage } from '../auth/errorMessage';
import { resizeImageToDataUrl } from '../utils/image';
import { formatDate } from '../i18n/format';
import type { NotificationPreferences } from '../api/auth';

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-text-primary">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary ${
          checked ? 'bg-accent' : 'bg-border'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation('auth');
  const { user, updateProfile, logout, forgotPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    user?.notificationPreferences ?? {
      emailPriceDrops: true,
      emailNewsletter: false,
      emailProductUpdates: true,
      pushEnabled: false,
    },
  );
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
        notificationPreferences: prefs,
      });
      toast({ message: t('profile.saved'), variant: 'success' });
    } catch (error) {
      toast({ message: authErrorMessage(t, error), variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setAvatarUrl(dataUrl);
      setAvatarBroken(false);
    } catch {
      toast({ message: t('profile.uploadError'), variant: 'danger' });
    }
  };

  const handleResetPassword = async () => {
    setResetting(true);
    try {
      await forgotPassword(user.email);
      toast({ message: t('profile.resetSent'), variant: 'success', duration: 6000 });
    } catch (error) {
      toast({ message: authErrorMessage(t, error), variant: 'danger' });
    } finally {
      setResetting(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast({ message: t('profile.loggedOut'), variant: 'info' });
      navigate('/');
    } finally {
      setLoggingOut(false);
    }
  };

  const setPref = (key: keyof NotificationPreferences) => (value: boolean) =>
    setPrefs((current) => ({ ...current, [key]: value }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-3xl mx-auto px-6 py-12 flex flex-col gap-6"
    >
      <header className="flex items-center gap-4">
        {avatarUrl && !avatarBroken ? (
          <img
            src={avatarUrl}
            alt={user.name}
            onError={() => setAvatarBroken(true)}
            className="w-16 h-16 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white font-bold text-lg">
            {initials}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('profile.title')}</h1>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <Badge variant="accent">{t(`profile.roleLabel`)}: {user.role}</Badge>
            {user.emailVerified ? (
              <Badge variant="success">
                <ShieldCheck className="w-3 h-3" /> {t('profile.verifiedBadge')}
              </Badge>
            ) : (
              <Badge variant="warning">{t('profile.unverifiedBadge')}</Badge>
            )}
          </div>
        </div>
      </header>

      {/* Personal information */}
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-text-primary font-semibold">
          <UserIcon className="w-4 h-4 text-accent" /> {t('profile.personal')}
        </div>
        <Input label={t('fullName')} value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label={t('email')}
          value={user.email}
          disabled
          readOnly
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-text-primary">{t('profile.photo')}</span>
          <div className="flex items-center gap-3 flex-wrap">
            {avatarUrl && !avatarBroken ? (
              <img
                src={avatarUrl}
                alt=""
                onError={() => setAvatarBroken(true)}
                className="w-12 h-12 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-border flex items-center justify-center text-text-muted text-xs font-bold">
                {initials}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelected}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => fileInputRef.current?.click()}
            >
              {t('profile.uploadPhoto')}
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAvatarUrl('');
                  setAvatarBroken(false);
                }}
              >
                {t('profile.removePhoto')}
              </Button>
            )}
          </div>
        </div>

        <Input
          label={t('profile.avatarUrlOptional')}
          placeholder={t('profile.avatarPlaceholder')}
          value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
          onChange={(e) => {
            setAvatarUrl(e.target.value);
            setAvatarBroken(false);
          }}
          hint={avatarUrl.startsWith('data:') ? t('profile.usingUploaded') : undefined}
          error={avatarUrl && !avatarUrl.startsWith('data:') && avatarBroken ? t('profile.avatarError') : undefined}
        />
        <p className="text-xs text-text-muted">
          {t('profile.memberSince')}: {formatDate(user.createdAt, i18n.language)}
        </p>
      </Card>

      {/* Notifications */}
      <Card className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-text-primary font-semibold">
          <Bell className="w-4 h-4 text-accent" /> {t('profile.notifications')}
        </div>
        <p className="text-xs text-text-muted mb-2">{t('profile.notificationsDesc')}</p>
        <ToggleRow
          label={t('notifications.emailPriceDrops')}
          checked={prefs.emailPriceDrops}
          onChange={setPref('emailPriceDrops')}
        />
        <ToggleRow
          label={t('notifications.emailNewsletter')}
          checked={prefs.emailNewsletter}
          onChange={setPref('emailNewsletter')}
        />
        <ToggleRow
          label={t('notifications.emailProductUpdates')}
          checked={prefs.emailProductUpdates}
          onChange={setPref('emailProductUpdates')}
        />
        <ToggleRow
          label={t('notifications.pushEnabled')}
          checked={prefs.pushEnabled}
          onChange={setPref('pushEnabled')}
        />
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          {t('profile.save')}
        </Button>
      </div>

      {/* Security */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-text-primary font-semibold">
          <KeyRound className="w-4 h-4 text-accent" /> {t('profile.security')}
        </div>
        <p className="text-sm text-text-muted">{t('profile.securityDesc')}</p>
        <div>
          <Button variant="secondary" onClick={handleResetPassword} loading={resetting}>
            {t('profile.resetPasswordCta')}
          </Button>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="flex flex-col gap-3 border-danger/30">
        <div className="flex items-center gap-2 text-danger font-semibold">
          <LogOut className="w-4 h-4" /> {t('profile.dangerZone')}
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-text-muted">{t('profile.logoutDesc')}</p>
          <Button variant="danger" onClick={handleLogout} loading={loggingOut} leftIcon={<LogOut className="w-4 h-4" />}>
            {t('profile.logout')}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
