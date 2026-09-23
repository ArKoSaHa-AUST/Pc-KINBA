import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { PasswordStrength } from '../../utils/passwordStrength';

export interface PasswordStrengthMeterProps {
  strength: PasswordStrength;
  id?: string;
  className?: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  strength,
  id = 'password-strength-feedback',
  className = '',
}) => {
  const { t } = useTranslation('auth');

  if (!strength || strength.isEmpty) {
    return null;
  }

  const score = strength.score;
  const progressPercent = Math.max((score / 4) * 100, 5);
  const localizedLabel = t(strength.label, { defaultValue: strength.label });

  const getTierIcon = () => {
    switch (score) {
      case 0:
        return <AlertCircle className="w-3.5 h-3.5 text-danger" />;
      case 1:
        return <ShieldAlert className="w-3.5 h-3.5 text-danger" />;
      case 2:
        return <Shield className="w-3.5 h-3.5 text-warning" />;
      case 3:
        return <ShieldCheck className="w-3.5 h-3.5 text-accent" />;
      case 4:
        return <Sparkles className="w-3.5 h-3.5 text-success" />;
      default:
        return <Shield className="w-3.5 h-3.5" />;
    }
  };

  const formattedCrackTime = strength.crackTimeDisplay.startsWith('pw.crackTime.')
    ? t(strength.crackTimeDisplay)
    : strength.crackTimeDisplay;

  return (
    <div
      id={id}
      className={`p-3 rounded-xl bg-glass border border-border flex flex-col gap-2.5 text-xs ${className}`}
      aria-label={t('register.strength', { defaultValue: 'Password Strength' })}
    >
      {/* Tier Header & Live Region */}
      <div className="flex items-center justify-between">
        <span className="text-text-muted flex items-center gap-1.5 font-medium">
          {t('register.strength', { defaultValue: 'Password Strength' })}:
        </span>
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 font-bold tracking-wide"
          style={{ color: strength.color }}
        >
          {getTierIcon()}
          <span>{localizedLabel}</span>
        </div>
      </div>

      {/* Visual Entropy Gauge Bar */}
      <div
        className="w-full h-2 rounded-full bg-border overflow-hidden"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuetext={localizedLabel}
      >
        <div
          className="h-full transition-all duration-300 rounded-full"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: strength.color,
          }}
        />
      </div>

      {/* Estimated Crack Time */}
      {score > 0 && formattedCrackTime && (
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-0.5">
          <Clock className="w-3 h-3 text-text-muted shrink-0" />
          <span>
            {t('pw.crackTimePrefix', {
              time: formattedCrackTime,
              defaultValue: `Estimated time to guess: ${formattedCrackTime}`,
            })}
          </span>
        </div>
      )}

      {/* Actionable Warning */}
      {strength.warning && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-danger/10 border border-danger/20 text-danger text-[11px] leading-snug">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{t(strength.warning, { defaultValue: strength.warning })}</span>
        </div>
      )}

      {/* Actionable Constructive Suggestions */}
      {strength.suggestions && strength.suggestions.length > 0 && (
        <ul className="flex flex-col gap-1 text-[11px] text-text-muted list-disc list-inside">
          {strength.suggestions.slice(0, 2).map((sugKey, idx) => (
            <li key={idx} className="leading-snug">
              {t(sugKey, { defaultValue: sugKey })}
            </li>
          ))}
        </ul>
      )}

      {/* Criteria Checklist */}
      <div
        className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-border/50 text-[11px]"
        role="list"
        aria-label={t('register.strength', { defaultValue: 'Password Criteria' })}
      >
        <div
          role="listitem"
          className={`flex items-center gap-1 ${
            strength.hasMinLength ? 'text-green font-medium' : 'text-text-muted'
          }`}
        >
          <CheckCircle2
            className={`w-3 h-3 ${strength.hasMinLength ? 'text-green' : 'text-text-muted/50'}`}
          />
          <span>{t('register.strengthMinLength', { defaultValue: '8+ chars' })}</span>
        </div>
        <div
          role="listitem"
          className={`flex items-center gap-1 ${
            strength.hasUppercase ? 'text-green font-medium' : 'text-text-muted'
          }`}
        >
          <CheckCircle2
            className={`w-3 h-3 ${strength.hasUppercase ? 'text-green' : 'text-text-muted/50'}`}
          />
          <span>
            {t('register.strengthUppercase', {
              defaultValue: 'Uppercase (A-Z)',
            })}
          </span>
        </div>
        <div
          role="listitem"
          className={`flex items-center gap-1 ${
            strength.hasNumber ? 'text-green font-medium' : 'text-text-muted'
          }`}
        >
          <CheckCircle2
            className={`w-3 h-3 ${strength.hasNumber ? 'text-green' : 'text-text-muted/50'}`}
          />
          <span>{t('register.strengthNumber', { defaultValue: 'Number (0-9)' })}</span>
        </div>
        <div
          role="listitem"
          className={`flex items-center gap-1 ${
            strength.hasSymbol ? 'text-green font-medium' : 'text-text-muted'
          }`}
        >
          <CheckCircle2
            className={`w-3 h-3 ${strength.hasSymbol ? 'text-green' : 'text-text-muted/50'}`}
          />
          <span>{t('register.strengthSymbol', { defaultValue: 'Symbol (!@#$)' })}</span>
        </div>
      </div>
    </div>
  );
};
