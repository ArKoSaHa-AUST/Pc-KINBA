import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { Button, Input, useToast } from '../../components/ui';
import { useAuth } from '../../auth/useAuth';
import { authErrorMessage } from '../../auth/errorMessage';
import AuthLayout from './AuthLayout';

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const { forgotPassword } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
      toast({ message: t('forgot.success'), variant: 'success', duration: 6000 });
    } catch (err) {
      toast({ message: authErrorMessage(t, err), variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('forgot.title')}
      subtitle={t('forgot.subtitle')}
      footer={
        <Link to="/login" className="text-accent font-medium hover:underline">
          {t('forgot.backToLogin')}
        </Link>
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
          error={error}
          disabled={sent}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" fullWidth loading={loading} disabled={sent}>
          {t('forgot.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}
