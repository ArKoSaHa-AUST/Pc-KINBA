import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Mail, Lock, User, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button, Input, useToast } from '../../components/ui';
import { useAuth } from '../../auth/useAuth';
import { authErrorMessage } from '../../auth/errorMessage';
import { TermsModal } from '../../components/auth/TermsModal';
import { calculatePasswordStrength } from '../../utils/passwordStrength';

export default function RegisterPage() {
  const { t } = useTranslation('auth');
  const { register, loginWithOAuth } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Wizard Step State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [purpose, setPurpose] = useState<'gaming' | 'creation' | 'ai' | 'workstation'>('gaming');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  // Password strength engine
  const strength = calculatePasswordStrength(password);

  // 3D Parallax Tilt Physics for Auth Card
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 200, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 200, damping: 25 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['10deg', '-10deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-10deg', '10deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / rect.width - 0.5);
    y.set(mouseY / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Step Navigators
  const canGoToStep2 = name.trim().length >= 2 && email.includes('@');
  const canGoToStep3 =
    strength.score >= 2 && password === confirmPassword && confirmPassword.length > 0;

  const handleNext = () => {
    if (step === 1 && canGoToStep2) setStep(2);
    else if (step === 2 && canGoToStep3) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!agreeTerms) {
      toast({
        message: 'Please accept the Terms of Service to create an account.',
        variant: 'danger',
      });
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, purpose, agreeTerms);
      toast({ message: t('register.successNoVerify'), variant: 'success', duration: 6000 });
      navigate('/profile');
    } catch (error) {
      toast({ message: authErrorMessage(t, error), variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialRegister = async (provider: string) => {
    const p = provider.toLowerCase();
    if ((p === 'google' || p === 'github' || p === 'discord') && loginWithOAuth) {
      try {
        await loginWithOAuth(p as 'google' | 'github' | 'discord');
      } catch (error) {
        toast({ message: authErrorMessage(t, error), variant: 'danger' });
      }
    } else {
      toast({ message: `Initiating ${provider} sign up...`, variant: 'info' });
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full flex items-center justify-center px-4 py-8 overflow-hidden">
      {/* Dynamic Ambient Background Elements */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-accent/15 via-purple/15 to-green/10 blur-3xl" />

      {/* Main Registration Card Container */}
      <div className="relative z-10 w-full max-w-[540px] flex justify-center">
        <motion.div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass relative z-20 w-full p-6 sm:p-8 rounded-[28px] border border-glass-border shadow-[0_24px_80px_rgba(0,0,0,0.4)]"
        >
          {/* Header Brand & Step Progress Indicator */}
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                <span className="font-black text-white text-sm">PC</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-text-primary">
                {t('brand', { defaultValue: 'KINBA' })}
              </span>
            </Link>

            {/* Wizard Step Pills */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (
                      i === 1 ||
                      (i === 2 && canGoToStep2) ||
                      (i === 3 && canGoToStep2 && canGoToStep3)
                    ) {
                      setStep(i as 1 | 2 | 3);
                    }
                  }}
                  className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all duration-300 cursor-pointer ${
                    step === i
                      ? 'bg-gradient-to-br from-accent to-purple text-white shadow-[0_0_12px_rgba(0,229,255,0.4)] scale-110'
                      : step > i
                        ? 'bg-green/20 text-green border border-green/40'
                        : 'bg-glass text-text-muted border border-border'
                  }`}
                >
                  {step > i ? '✓' : i}
                </div>
              ))}
            </div>
          </div>

          {/* Title & Subtitle */}
          <h1 className="text-2xl font-bold text-text-primary">
            {step === 1
              ? t('register.step1Title', { defaultValue: 'Step 1: Account Identity' })
              : step === 2
                ? t('register.step2Title', { defaultValue: 'Step 2: Security & Password' })
                : t('register.step3Title', { defaultValue: 'Step 3: Rig Purpose & Terms' })}
          </h1>
          <p className="mt-1 text-sm text-text-muted">{t('register.subtitle')}</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <AnimatePresence mode="wait">
              {/* STEP 1: IDENTITY & SOCIALS */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4"
                >
                  {/* Social OAuth Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: 'Google', icon: '🌐' },
                      { name: 'GitHub', icon: '💻' },
                      { name: 'Discord', icon: '💬' },
                      { name: 'Steam', icon: '🎮' },
                    ].map((soc) => (
                      <button
                        key={soc.name}
                        type="button"
                        onClick={() => handleSocialRegister(soc.name)}
                        className="h-10 rounded-xl bg-glass border border-border flex items-center justify-center gap-1.5 text-xs font-medium text-text-primary hover:border-accent hover:bg-fill-muted transition-all"
                      >
                        <span>{soc.icon}</span>
                        <span className="hidden sm:inline">{soc.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="relative flex items-center justify-center my-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <span className="relative px-3 bg-bg-surface text-[11px] font-medium text-text-muted uppercase tracking-wider">
                      {t('register.orContinueWith', { defaultValue: 'or continue with email' })}
                    </span>
                  </div>

                  <Input
                    label={t('fullName')}
                    placeholder={t('register.namePlaceholder')}
                    autoComplete="name"
                    leftIcon={<User className="w-4 h-4" />}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Input
                    type="email"
                    label={t('email')}
                    placeholder={t('emailPlaceholder')}
                    autoComplete="email"
                    leftIcon={<Mail className="w-4 h-4" />}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    size="lg"
                    onClick={handleNext}
                    disabled={!canGoToStep2}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="mt-2"
                  >
                    {t('register.nextStep', { defaultValue: 'Continue to Security →' })}
                  </Button>
                </motion.div>
              )}

              {/* STEP 2: SECURITY & PASSWORD STRENGTH */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4"
                >
                  <Input
                    type="password"
                    label={t('password')}
                    placeholder={t('passwordPlaceholder')}
                    autoComplete="new-password"
                    leftIcon={<Lock className="w-4 h-4" />}
                    revealToggle
                    revealLabel={t('togglePassword')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />

                  {/* 4-Tier Visual Password Strength Meter */}
                  {password.length > 0 && (
                    <div className="p-3 rounded-xl bg-glass border border-border flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted">
                          {t('register.strength', { defaultValue: 'Password Strength' })}:
                        </span>
                        <span className="font-bold" style={{ color: strength.color }}>
                          {strength.label}
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full transition-all duration-400 rounded-full"
                          style={{
                            width: `${(strength.score / 4) * 100}%`,
                            backgroundColor: strength.color,
                          }}
                        />
                      </div>

                      {/* Entropy Checklist */}
                      <div className="grid grid-cols-2 gap-1.5 mt-1 text-[11px]">
                        <span
                          className={`flex items-center gap-1 ${strength.hasMinLength ? 'text-green' : 'text-text-muted'}`}
                        >
                          <CheckCircle2 className="w-3 h-3" />{' '}
                          {t('register.strengthMinLength', { defaultValue: '8+ chars' })}
                        </span>
                        <span
                          className={`flex items-center gap-1 ${strength.hasUppercase ? 'text-green' : 'text-text-muted'}`}
                        >
                          <CheckCircle2 className="w-3 h-3" />{' '}
                          {t('register.strengthUppercase', {
                            defaultValue: 'Uppercase (A-Z)',
                          })}
                        </span>
                        <span
                          className={`flex items-center gap-1 ${strength.hasNumber ? 'text-green' : 'text-text-muted'}`}
                        >
                          <CheckCircle2 className="w-3 h-3" />{' '}
                          {t('register.strengthNumber', { defaultValue: 'Number (0-9)' })}
                        </span>
                        <span
                          className={`flex items-center gap-1 ${strength.hasSymbol ? 'text-green' : 'text-text-muted'}`}
                        >
                          <CheckCircle2 className="w-3 h-3" />{' '}
                          {t('register.strengthSymbol', { defaultValue: 'Symbol (!@#$)' })}
                        </span>
                      </div>
                    </div>
                  )}

                  <Input
                    type="password"
                    label={t('confirmPassword')}
                    placeholder={t('passwordPlaceholder')}
                    autoComplete="new-password"
                    leftIcon={<Lock className="w-4 h-4" />}
                    revealToggle
                    revealLabel={t('togglePassword')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />

                  {confirmPassword.length > 0 && confirmPassword === password && (
                    <span className="text-xs text-green flex items-center gap-1 font-medium -mt-2">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match perfectly!
                    </span>
                  )}

                  <div className="flex gap-3 mt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleBack}
                      leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                      {t('register.backStep', { defaultValue: 'Back' })}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      fullWidth
                      onClick={handleNext}
                      disabled={!canGoToStep3}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      {t('register.nextStep3', { defaultValue: 'Configure Rig Profile →' })}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: RIG PURPOSE & TERMS CONSENT */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-text-primary">
                      {t('register.purposeLabel', { defaultValue: 'Primary PC Usage Goal' })}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          id: 'gaming',
                          label: t('register.purposeGaming', { defaultValue: '🎮 PC Gaming' }),
                        },
                        {
                          id: 'creation',
                          label: t('register.purposeCreation', {
                            defaultValue: '🎥 Content Creation',
                          }),
                        },
                        {
                          id: 'ai',
                          label: t('register.purposeAI', {
                            defaultValue: '🧠 AI / Machine Learning',
                          }),
                        },
                        {
                          id: 'workstation',
                          label: t('register.purposeWorkstation', {
                            defaultValue: '💼 Workstation',
                          }),
                        },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPurpose(item.id as typeof purpose)}
                          className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                            purpose === item.id
                              ? 'bg-gradient-to-br from-accent/20 to-purple/20 border-accent text-accent font-bold shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                              : 'bg-glass border-border text-text-muted hover:border-text-muted'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mandatory Terms & Privacy Consent Checkbox */}
                  <div className="p-3.5 rounded-xl bg-glass border border-border flex items-start gap-3 mt-1">
                    <input
                      id="agreeTerms"
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded bg-glass border-border text-accent focus:ring-accent accent-accent cursor-pointer"
                    />
                    <label
                      htmlFor="agreeTerms"
                      className="text-xs text-text-muted cursor-pointer leading-relaxed"
                    >
                      {t('register.termsAgree', { defaultValue: 'I agree to the PC Kinba' })}{' '}
                      <button
                        type="button"
                        onClick={() => setTermsModalOpen(true)}
                        className="text-accent underline font-medium hover:text-white"
                      >
                        {t('register.termsOfService', { defaultValue: 'Terms of Service' })}
                      </button>{' '}
                      {t('register.and', { defaultValue: 'and' })}{' '}
                      <button
                        type="button"
                        onClick={() => setTermsModalOpen(true)}
                        className="text-accent underline font-medium hover:text-white"
                      >
                        {t('register.privacyPolicy', { defaultValue: 'Privacy Policy' })}
                      </button>
                      .
                    </label>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleBack}
                      leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                      {t('register.backStep', { defaultValue: 'Back' })}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      size="lg"
                      loading={loading}
                      disabled={!agreeTerms}
                    >
                      {t('register.submit')}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <div className="mt-6 text-sm text-text-muted text-center">
            <span>
              {t('haveAccount')}{' '}
              <Link to="/login" className="text-accent font-medium hover:underline">
                {t('signIn')}
              </Link>
            </span>
          </div>
        </motion.div>
      </div>

      {/* Terms of Service Drawer Modal */}
      <TermsModal
        open={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        onAccept={() => setAgreeTerms(true)}
      />
    </div>
  );
}
