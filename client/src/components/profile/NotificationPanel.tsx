import { motion } from 'framer-motion';
import { Bell, Tag, Newspaper, Sparkles, Smartphone } from 'lucide-react';
import { Card } from '../ui/Card';
import { use3DTilt } from '../ai/use3DTilt';
import type { NotificationPreferences } from '../../api/auth';

interface NotificationPanelProps {
  preferences: NotificationPreferences;
  onChange: (prefs: NotificationPreferences) => void;
}

export function NotificationPanel({ preferences, onChange }: NotificationPanelProps) {
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
  } = use3DTilt({ maxTilt: 4, scaleOnHover: 1.01 });

  const handleToggle = (key: keyof NotificationPreferences) => {
    onChange({
      ...preferences,
      [key]: !preferences[key],
    });
  };

  const TOGGLE_ITEMS = [
    {
      key: 'emailPriceDrops' as const,
      label: 'Price Drop Alerts',
      desc: 'Instant notifications when components on your build list go on discount',
      icon: Tag,
      color: 'text-accent',
    },
    {
      key: 'emailProductUpdates' as const,
      label: 'New Hardware & Catalog Updates',
      desc: 'Get notified when Next-Gen GPUs, CPUs, and PC cases are stocked',
      icon: Sparkles,
      color: 'text-purple',
    },
    {
      key: 'emailNewsletter' as const,
      label: 'PC Kinba Weekly Tech Newsletter',
      desc: 'Curated weekly benchmarks, PC building guides, and hardware analysis',
      icon: Newspaper,
      color: 'text-blue-400',
    },
    {
      key: 'pushEnabled' as const,
      label: 'Browser Push Notifications',
      desc: 'Real-time alerts directly in your browser for critical build changes',
      icon: Smartphone,
      color: 'text-green-400',
    },
  ];

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, scale }}
      className="relative rounded-2xl overflow-hidden transition-all duration-300"
    >
      <Card className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 flex flex-col gap-5 shadow-2xl">
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
              <Bell className="w-5 h-5" />
            </div>
            <span>Notification Preferences</span>
          </div>
          <span className="text-xs text-text-muted">Real-time sync</span>
        </div>

        <div className="divide-y divide-white/5">
          {TOGGLE_ITEMS.map((item) => {
            const Icon = item.icon;
            const isChecked = !!preferences[item.key];
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 py-4 first:pt-1 last:pb-1"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2 rounded-lg bg-white/[0.03] border border-white/5 ${item.color} mt-0.5`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text-primary">{item.label}</div>
                    <div className="text-xs text-text-muted mt-0.5">{item.desc}</div>
                  </div>
                </div>

                <button
                  id={`profile-pref-${item.key}`}
                  type="button"
                  role="switch"
                  aria-checked={isChecked}
                  onClick={() => handleToggle(item.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    isChecked ? 'bg-accent' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      isChecked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}
