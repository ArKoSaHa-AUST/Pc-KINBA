import { useState, useRef, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import {
  User as UserIcon,
  Mail,
  Upload,
  Sparkles,
  Gamepad2,
  Palette,
  BrainCircuit,
  Briefcase,
  Check,
  Loader2,
  Cloud,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { use3DTilt } from '../ai/use3DTilt';
import { sanitizeImageUrl } from '../../utils/image';
import { uploadUserAvatar } from '../../services/imageUpload';
import type { UserProfile } from '../../api/auth';

interface ProfileInfoCardProps {
  user: UserProfile;
  onSave: (payload: { name: string; avatarUrl: string | null; purpose: string }) => Promise<void>;
  saving: boolean;
}

const PURPOSE_OPTIONS = [
  { id: 'gaming', label: 'Gaming', icon: Gamepad2, desc: 'High FPS & Ray Tracing' },
  { id: 'creation', label: 'Content Creation', icon: Palette, desc: '4K Editing & 3D Render' },
  { id: 'ai', label: 'AI & Data Science', icon: BrainCircuit, desc: 'LLMs, PyTorch & CUDA' },
  { id: 'work', label: 'Office & Workstation', icon: Briefcase, desc: 'Multitasking & Stability' },
];

export function ProfileInfoCard({ user, onSave, saving }: ProfileInfoCardProps) {
  const { t } = useTranslation('auth');
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [purpose, setPurpose] = useState(user.purpose || 'gaming');
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [storageProvider, setStorageProvider] = useState<'supabase' | 'imagekit' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    cardRef,
    isHovered,
    rotateX,
    rotateY,
    scale,
    glossPos,
    handleMouseMove,
    handleMouseEnter,
    handleMouseLeave,
  } = use3DTilt({ maxTilt: 5, scaleOnHover: 1.01 });

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const result = await uploadUserAvatar(file, user.id);
      setAvatarUrl(result.url);
      setStorageProvider(result.provider);
      setAvatarBroken(false);
      // Automatically save new avatar URL to user profile
      await onSave({
        name: name.trim(),
        avatarUrl: result.url,
        purpose,
      });
    } catch (err) {
      console.error('Avatar cloud upload failed', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name: name.trim(),
      avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
      purpose,
    });
  };

  const initials =
    user.name
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, scale }}
      className="relative rounded-2xl overflow-hidden transition-all duration-300"
    >
      <Card className="relative overflow-hidden backdrop-blur-xl border border-border p-6 md:p-8 flex flex-col gap-6 shadow-2xl">
        {/* Gloss highlight */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 320px at ${glossPos.x}% ${glossPos.y}%, rgba(255, 255, 255, 0.06), transparent 80%)`,
            opacity: isHovered ? 1 : 0,
          }}
        />

        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5 text-text-primary font-bold text-lg">
            <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-accent">
              <UserIcon className="w-5 h-5" />
            </div>
            <span>Personal Information</span>
          </div>
          <span className="text-xs text-text-muted">Direct Supabase Sync</span>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              id="profile-name-input"
              label={t('fullName') || 'Full Name'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              required
            />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="profile-email-input"
                className="text-xs font-semibold text-text-primary uppercase tracking-wider"
              >
                {t('email') || 'Email Address'}
              </label>
              <div className="relative">
                <Input
                  id="profile-email-input"
                  value={user.email}
                  disabled
                  readOnly
                  className="opacity-75 cursor-not-allowed pr-10 bg-fill-subtle border-border"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Avatar Upload / URL Section */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-fill-subtle border border-border">
            <span className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple" /> Profile Avatar
            </span>

            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
              {/* Left Side: Avatar Preview + Upload / Remove Button */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border border-border bg-fill-muted flex items-center justify-center shrink-0 shadow-inner">
                  {(() => {
                    const safeAvatarUrl = sanitizeImageUrl(avatarUrl);
                    return safeAvatarUrl && !avatarBroken ? (
                      <img
                        src={safeAvatarUrl}
                        alt="Avatar preview"
                        onError={() => setAvatarBroken(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-text-muted font-bold text-sm">{initials}</span>
                    );
                  })()}

                  {/* Uploading Overlay */}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-xs">
                      <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="profile-avatar-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                  <Button
                    id="profile-upload-avatar-btn"
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={uploadingAvatar}
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                  </Button>
                  {avatarUrl && (
                    <Button
                      id="profile-remove-avatar-btn"
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={uploadingAvatar}
                      onClick={() => {
                        setAvatarUrl('');
                        setStorageProvider(null);
                        setAvatarBroken(false);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              {/* Middle Divider on desktop */}
              <div className="hidden md:block w-px h-9 bg-border/60 shrink-0" />

              {/* Right Side: Image URL Input */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <label
                  htmlFor="profile-avatar-url-input"
                  className="text-xs font-medium text-text-muted mb-1 block"
                >
                  Or specify an Image URL
                </label>
                <div className="relative">
                  <input
                    id="profile-avatar-url-input"
                    type="url"
                    placeholder="https://ik.imagekit.io/... or https://example.com/avatar.jpg"
                    value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setAvatarBroken(false);
                    }}
                    className="w-full rounded-xl bg-glass border border-border text-text-primary placeholder:text-text-muted px-3.5 py-2 text-xs sm:text-sm transition-colors focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Helper / Cloud Storage Status Text */}
            {avatarUrl && (
              <div className="pt-2 border-t border-border/40 flex items-center gap-2 text-xs text-text-muted">
                {avatarUrl.includes('imagekit.io') || storageProvider === 'imagekit' ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="text-accent font-medium">Stored in ImageKit Cloud CDN</span>
                    <span className="text-text-muted">• Synced to Supabase Profile</span>
                  </>
                ) : avatarUrl.includes('supabase.co') || storageProvider === 'supabase' ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="text-success font-medium">Stored in Supabase Storage</span>
                    <span className="text-text-muted">• Direct Cloud Sync</span>
                  </>
                ) : avatarUrl.startsWith('data:') ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
                    <span>Optimized compressed image active</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    <span>Connected via custom image URL</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* PC Purpose Selector */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Primary PC Purpose
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PURPOSE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = purpose === opt.id;
                return (
                  <button
                    key={opt.id}
                    id={`profile-purpose-${opt.id}`}
                    type="button"
                    onClick={() => setPurpose(opt.id)}
                    className={`relative p-3.5 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent/15 border-accent shadow-[0_0_15px_rgba(0,229,255,0.15)] text-text-primary'
                        : 'bg-fill-subtle border-border hover:border-accent/40 hover:bg-fill-muted text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon
                        className={`w-5 h-5 ${isSelected ? 'text-accent' : 'text-text-muted'}`}
                      />
                      {isSelected && <Check className="w-4 h-4 text-accent" />}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-text-primary">{opt.label}</div>
                      <div className="text-[11px] text-text-muted mt-0.5">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border">
            <Button id="profile-save-btn" type="submit" loading={saving} className="px-6 py-2.5">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
