import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock } from 'lucide-react';
import { Button, Input, useToast } from '../../components/ui';
import { useAuth } from '../../auth/useAuth';
import { authErrorMessage } from '../../auth/errorMessage';
import { ApiError } from '../../api/client';
import AuthLayout from './AuthLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const { t } = useTranslation('auth');
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as LocationState | null)?.from ?? '/profile';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!EMAIL_RE.test(email)) next.email = t('validation.email');
    if (password.length === 0) next.password = t('validation.required');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      toast({ message: t('login.success'), variant: 'success' });
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'auth.email_not_verified') {
        toast({ message: authErrorMessage(t, error), variant: 'warning' });
        navigate(`/verify?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      toast({ message: authErrorMessage(t, error), variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      footer={
        <span>
          {t('noAccount')}{' '}
          <Link to="/register" className="text-accent font-medium hover:underline">
            {t('createAccount')}
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
        <Input
          type="password"
          label={t('password')}
          placeholder={t('passwordPlaceholder')}
          autoComplete="current-password"
          leftIcon={<Lock className="w-4 h-4" />}
          revealToggle
          revealLabel={t('togglePassword')}
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex justify-end -mt-1">
          <Link to="/forgot-password" className="text-sm text-text-muted hover:text-accent">
            {t('forgotPassword')}
          </Link>
        </div>
        <Button type="submit" fullWidth loading={loading}>
          {t('login.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}
