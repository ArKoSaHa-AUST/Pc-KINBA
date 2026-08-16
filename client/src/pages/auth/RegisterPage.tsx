import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User } from 'lucide-react';
import { Button, Input, useToast } from '../../components/ui';
import { useAuth } from '../../auth/useAuth';
import { authErrorMessage } from '../../auth/errorMessage';
import { ApiError } from '../../api/client';
import AuthLayout from './AuthLayout';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const { t } = useTranslation('auth');
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next: FieldErrors = {};
    if (name.trim().length < 2) next.name = t('validation.nameShort');
    if (!EMAIL_RE.test(email)) next.email = t('validation.email');
    if (!STRONG_RE.test(password)) next.password = t('validation.passwordWeak');
    if (confirmPassword !== password) next.confirmPassword = t('validation.passwordMatch');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const profile = await register(name.trim(), email.trim(), password);
      if (profile.emailVerified) {
        // Verification disabled on the server — the account is ready to use.
        toast({ message: t('register.successNoVerify'), variant: 'success', duration: 6000 });
        navigate('/login');
      } else {
        toast({ message: t('register.success'), variant: 'success', duration: 6000 });
        navigate(`/verify?email=${encodeURIComponent(email.trim())}`);
      }
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        const mapped: FieldErrors = {};
        for (const key of Object.keys(error.fieldErrors)) {
          const field = key.toLowerCase();
          if (field.includes('name')) mapped.name = error.fieldErrors[key][0];
          else if (field.includes('email')) mapped.email = error.fieldErrors[key][0];
          else if (field.includes('password')) mapped.password = error.fieldErrors[key][0];
        }
        setErrors(mapped);
      }
      toast({ message: authErrorMessage(t, error), variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('register.title')}
      subtitle={t('register.subtitle')}
      footer={
        <span>
          {t('haveAccount')}{' '}
          <Link to="/login" className="text-accent font-medium hover:underline">
            {t('signIn')}
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label={t('fullName')}
          placeholder={t('register.namePlaceholder')}
          autoComplete="name"
          leftIcon={<User className="w-4 h-4" />}
          value={name}
          error={errors.name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          leftIcon={<Lock className="w-4 h-4" />}
          revealToggle
          revealLabel={t('togglePassword')}
          value={password}
          error={errors.password}
          hint={errors.password ? undefined : t('validation.passwordWeak')}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          label={t('confirmPassword')}
          placeholder={t('passwordPlaceholder')}
          autoComplete="new-password"
          leftIcon={<Lock className="w-4 h-4" />}
          revealToggle
          revealLabel={t('togglePassword')}
          value={confirmPassword}
          error={errors.confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button type="submit" fullWidth loading={loading}>
          {t('register.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}
