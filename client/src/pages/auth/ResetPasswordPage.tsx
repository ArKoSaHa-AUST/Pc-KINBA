import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Button, Input, useToast } from '../../components/ui';
import { useAuth } from '../../auth/useAuth';
import { authErrorMessage } from '../../auth/errorMessage';
import { calculatePasswordStrength } from '../../utils/passwordStrength';
import { meetsPasswordPolicy, passwordPolicyMessage } from '../../utils/passwordPolicy';
import { PasswordStrengthMeter } from '../../components/auth/PasswordStrengthMeter';
import AuthLayout from './AuthLayout';

export default function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const email = params.get('email') ?? '';
  const token = params.get('token') ?? '';
  const linkValid = email.length > 0 && token.length > 0;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);

  // Password entropy engine
  const userInputs = [email.split('@')[0].trim()].filter(Boolean);
  const strength = calculatePasswordStrength(password, userInputs);

  const validate = () => {
    const next: { password?: string; confirmPassword?: string } = {};
    if (!meetsPasswordPolicy(strength)) {
      const msgKey = passwordPolicyMessage(strength) || 'validation.passwordWeak';
      next.password = t(msgKey);
    }
    if (confirmPassword !== password) {
      next.confirmPassword = t('validation.passwordMatch');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await resetPassword(email, token, password);
      toast({ message: t('reset.success'), variant: 'success' });
      navigate('/login');
    } catch (error) {
      toast({ message: authErrorMessage(t, error), variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('reset.title')}
      subtitle={t('reset.subtitle')}
      footer={
        <Link to="/login" className="text-accent font-medium hover:underline">
          {t('forgot.backToLogin')}
        </Link>
      }
    >
      {!linkValid ? (
        <p className="text-sm text-danger">{t('reset.missingToken')}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Input
            type="password"
            label={t('reset.newPassword')}
            placeholder={t('passwordPlaceholder')}
            autoComplete="new-password"
            leftIcon={<Lock className="w-4 h-4" />}
            revealToggle
            revealLabel={t('togglePassword')}
            value={password}
            error={errors.password}
            aria-describedby={password ? 'reset-password-feedback' : undefined}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
          />

          {/* Entropy-Based Password Strength Meter */}
          <PasswordStrengthMeter strength={strength} id="reset-password-feedback" />

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
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword)
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
          />
          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={!meetsPasswordPolicy(strength) || password !== confirmPassword}
          >
            {t('reset.submit')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
