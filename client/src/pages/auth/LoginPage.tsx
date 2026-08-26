import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, AlertTriangle, HelpCircle } from 'lucide-react';
import { Button, Input, useToast } from '../../components/ui';
import { useAuth } from '../../auth/useAuth';
import { authErrorMessage } from '../../auth/errorMessage';
import { SocialAuthGroup } from '../../components/auth/SocialAuthGroup';
import { Interactive3DCard } from '../../components/auth/Interactive3DCard';
import { Kinba3DQuantumCore } from '../../components/auth/Kinba3DQuantumCore';

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const { t } = useTranslation('auth');
  const { login, loginWithOAuth } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as LocationState | null)?.from ?? '/profile';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRememberTooltip, setShowRememberTooltip] = useState(false);

  const handleSocialClick = async (provider: string) => {
    const p = provider.toLowerCase();
    if ((p === 'google' || p === 'github' || p === 'discord') && loginWithOAuth) {
      try {
        await loginWithOAuth(p as 'google' | 'github' | 'discord');
      } catch (error) {
        triggerCardShake();
        toast({ message: authErrorMessage(t, error), variant: 'danger' });
      }
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

  const handleKeyCheck = (e: KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const triggerCardShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 600);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setLoading(true);
    try {
      await login(email.trim(), password);
      toast({ message: t('login.success'), variant: 'success' });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      triggerCardShake();
      toast({ message: authErrorMessage(t, error), variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full flex items-center justify-center overflow-hidden bg-bg-primary text-text-primary px-4 py-8">
      {/* Dynamic Ambient Background Mesh */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[720px] rounded-full bg-gradient-to-br from-accent/15 via-purple/15 to-green/10 blur-3xl" />

      {/* Main 2-Column Split Grid Container (max-w-[1440px]) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 max-w-[1440px] w-full items-center gap-8 mx-auto z-10">
        {/* 3D Interactive Spatial Stage (Desktop Left Column: 58%) */}
        <div className="hidden lg:flex lg:col-span-7 flex-col justify-center relative min-h-[580px]">
          <Kinba3DQuantumCore activeFocusField={focusedField} loading={loading} />
        </div>

        {/* Auth Form Container (Right Column: 42%) */}
        <div className="col-span-1 lg:col-span-5 flex justify-center py-6">
          <Interactive3DCard isShaking={isShaking}>
            {/* Header Brand Link & Title */}
            <div className="flex flex-col gap-2 mb-6">
              <Link to="/" className="flex items-center gap-2.5 w-fit group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.3)] group-hover:scale-105 transition-transform">
                  <span className="font-black text-white text-sm">PC</span>
                </div>
                <span className="font-bold text-xl tracking-tight text-text-primary">KINBA</span>
              </Link>
              <h1 className="text-2xl font-bold text-text-primary mt-2">{t('login.title')}</h1>
              <p className="text-sm text-text-muted">{t('login.subtitle')}</p>
            </div>

            {/* Social OAuth Gateway */}
            <SocialAuthGroup onSocialClick={handleSocialClick} />

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2" noValidate>
              <Input
                type="email"
                label={t('email')}
                placeholder={t('emailPlaceholder')}
                autoComplete="email"
                leftIcon={<Mail className="w-4 h-4" />}
                value={email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="flex flex-col">
                <Input
                  type="password"
                  label={t('password')}
                  placeholder={t('passwordPlaceholder')}
                  autoComplete="current-password"
                  leftIcon={<Lock className="w-4 h-4" />}
                  revealToggle
                  revealLabel={t('togglePassword')}
                  value={password}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  onKeyDown={handleKeyCheck}
                  onKeyUp={handleKeyCheck}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {/* Caps Lock Active Warning Badge */}
                {isCapsLockOn && (
                  <span className="text-xs text-yellow font-medium flex items-center gap-1 mt-1.5 px-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t('login.capsLock', { defaultValue: 'Caps Lock is ON ⇪' })}
                  </span>
                )}
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between text-xs sm:text-sm mt-1">
                <div className="relative flex items-center gap-2">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-glass border-border text-accent focus:ring-accent accent-accent cursor-pointer"
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-text-muted hover:text-text-primary cursor-pointer flex items-center gap-1"
                  >
                    <span>{t('login.rememberMe', { defaultValue: 'Keep me signed in' })}</span>
                  </label>
                  <button
                    type="button"
                    onMouseEnter={() => setShowRememberTooltip(true)}
                    onMouseLeave={() => setShowRememberTooltip(false)}
                    onClick={() => setShowRememberTooltip(!showRememberTooltip)}
                    className="text-text-muted hover:text-accent transition-colors cursor-pointer"
                    aria-label="Remember me security details"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>

                  {/* Security Duration Tooltip */}
                  {showRememberTooltip && (
                    <div className="absolute bottom-full left-0 mb-2 w-56 p-2.5 rounded-xl bg-bg-surface border border-glass-border text-[11px] text-text-muted shadow-xl z-30 pointer-events-none">
                      {t('login.rememberMeTooltip', {
                        defaultValue: 'Your session stays active for 30 days on trusted devices.',
                      })}
                    </div>
                  )}
                </div>

                <Link
                  to="/forgot-password"
                  className="text-xs text-accent font-medium hover:underline"
                >
                  {t('forgotPassword')}
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                loading={loading}
                className="mt-2 rounded-full font-semibold shadow-[0_10px_30px_rgba(0,229,255,0.25)]"
              >
                {t('login.submit')}
              </Button>
            </form>

            {/* Footer Navigation */}
            <div className="mt-6 text-sm text-text-muted text-center">
              <span>
                {t('noAccount')}{' '}
                <Link to="/register" className="text-accent font-semibold hover:underline">
                  {t('createAccount')}
                </Link>
              </span>
            </div>
          </Interactive3DCard>
        </div>
      </div>
    </div>
  );
}
