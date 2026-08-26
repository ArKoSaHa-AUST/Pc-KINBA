import { useState, useRef, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Mail, Upload, Sparkles, Gamepad2, Palette, BrainCircuit, Briefcase, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { use3DTilt } from '../ai/use3DTilt';
import { resizeImageToDataUrl } from '../../utils/image';
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
    try {
      const dataUrl = await resizeImageToDataUrl(file, 256, 0.82);
      setAvatarUrl(dataUrl);
      setAvatarBroken(false);
    } catch (err) {
      console.error('Avatar resize failed', err);
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

  const initials = user.name
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
      <Card className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 flex flex-col gap-6 shadow-2xl">
        {/* Gloss highlight */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 320px at ${glossPos.x}% ${glossPos.y}%, rgba(255, 255, 255, 0.06), transparent 80%)`,
            opacity: isHovered ? 1 : 0,
          }}
        />

        <div className="flex items-center justify-between border-b border-white/10 pb-4">
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
              label={t('fullName') || 'Full Name'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                {t('email') || 'Email Address'}
              </label>
              <div className="relative">
                <Input
                  value={user.email}
                  disabled
                  readOnly
                  className="opacity-75 cursor-not-allowed pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Avatar Upload / URL Section */}
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple" /> Profile Avatar
            </span>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden border border-border/80 bg-slate-800 flex items-center justify-center shrink-0">
                {avatarUrl && !avatarBroken ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar preview"
                    onError={() => setAvatarBroken(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-text-muted font-bold text-sm">{initials}</span>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
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
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Photo
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
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <Input
              label="Or specify an Image URL"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value);
                setAvatarBroken(false);
              }}
              hint={avatarUrl.startsWith('data:') ? 'Custom compressed image active (≤256px)' : undefined}
            />
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
                    type="button"
                    onClick={() => setPurpose(opt.id)}
                    className={`relative p-3.5 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent/15 border-accent shadow-[0_0_15px_rgba(0,229,255,0.15)] text-text-primary'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-accent' : 'text-text-muted'}`} />
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

          <div className="flex justify-end pt-2 border-t border-white/10">
            <Button type="submit" loading={saving} className="px-6 py-2.5">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
