import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, KeyRound } from 'lucide-react';
import { Button, Input, useToast } from '../../components/ui';
import { useAuth } from '../../auth/useAuth';
import { authErrorMessage } from '../../auth/errorMessage';
import AuthLayout from './AuthLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function VerifyPage() {
  const { t } = useTranslation('auth');
  const { verifyEmail } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<{ email?: string; code?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: { email?: string; code?: string } = {};
    if (!EMAIL_RE.test(email)) next.email = t('validation.email');
    if (!/^\d{6}$/.test(code)) next.code = t('validation.code');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await verifyEmail(email.trim(), code.trim());
      toast({ message: t('verify.success'), variant: 'success' });
      navigate('/login');
    } catch (error) {
      toast({ message: authErrorMessage(t, error), variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const knownEmail = params.get('email');

  return (
    <AuthLayout
      title={t('verify.title')}
      subtitle={knownEmail ? t('verify.subtitle', { email: knownEmail }) : t('verify.subtitleNoEmail')}
      footer={
        <Link to="/login" className="text-accent font-medium hover:underline">
          {t('forgot.backToLogin')}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {!knownEmail && (
          <Input
            type="email"
            label={t('email')}
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
            leftIcon={<Mail className="w-4 h-4" />}
            value={email}
            error={errors.email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
        <Input
          label={t('verify.code')}
          placeholder={t('verify.codePlaceholder')}
          inputMode="numeric"
          maxLength={6}
          leftIcon={<KeyRound className="w-4 h-4" />}
          value={code}
          error={errors.code}
          hint={errors.code ? undefined : t('verify.hint')}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
        <Button type="submit" fullWidth loading={loading}>
          {t('verify.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}
