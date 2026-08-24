import { useTranslation } from 'react-i18next';
import { KeyRound } from 'lucide-react';
import { useToast } from '../ui';

interface SocialAuthGroupProps {
  onSocialClick?: (provider: string) => void;
}

export function SocialAuthGroup({ onSocialClick }: SocialAuthGroupProps) {
  const { t } = useTranslation('auth');
  const { toast } = useToast();

  const handleProviderClick = (provider: string) => {
    if (onSocialClick) {
      onSocialClick(provider);
    } else {
      toast({
        message: t('auth.socialInit', {
          defaultValue: `Connecting to ${provider} authentication gateway...`,
          provider,
        }),
        variant: 'info',
      });
    }
  };

  const providers = [
    { name: 'Google', icon: '🌐', label: 'Google' },
    { name: 'GitHub', icon: '💻', label: 'GitHub' },
    { name: 'Discord', icon: '💬', label: 'Discord' },
    { name: 'Steam', icon: '🎮', label: 'Steam' },
  ];

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Social OAuth Row */}
      <div className="grid grid-cols-4 gap-2">
        {providers.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => handleProviderClick(p.name)}
            className="h-10 rounded-xl bg-glass border border-border flex items-center justify-center gap-1.5 text-xs font-medium text-text-primary hover:border-accent hover:bg-fill-muted transition-all duration-200 shadow-sm hover:shadow-[0_0_12px_rgba(0,229,255,0.15)] cursor-pointer"
            aria-label={`Sign in with ${p.name}`}
          >
            <span className="text-sm">{p.icon}</span>
            <span className="hidden sm:inline font-medium">{p.label}</span>
          </button>
        ))}
      </div>

      {/* Passkey / WebAuthn One-Touch Button */}
      <button
        type="button"
        onClick={() => handleProviderClick('Passkey / WebAuthn')}
        className="w-full h-9 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center gap-2 text-xs font-semibold text-accent hover:bg-accent/20 transition-all duration-200 cursor-pointer"
      >
        <KeyRound className="w-3.5 h-3.5" />
        <span>{t('auth.passkeySignIn', { defaultValue: 'Sign in with Passkey / Face ID' })}</span>
      </button>

      {/* Glass Hairline Divider */}
      <div className="relative flex items-center justify-center my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/60" />
        </div>
        <span className="relative px-3 bg-bg-surface text-[11px] font-medium text-text-muted uppercase tracking-wider">
          {t('register.orContinueWith', { defaultValue: 'or continue with email' })}
        </span>
      </div>
    </div>
  );
}
