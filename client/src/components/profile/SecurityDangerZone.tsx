import { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, LogOut, AlertTriangle, Send } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface SecurityDangerZoneProps {
  email: string;
  onResetPassword: () => Promise<void>;
  onLogout: () => Promise<void>;
  resetting: boolean;
  loggingOut: boolean;
}

export function SecurityDangerZone({
  email,
  onResetPassword,
  onLogout,
  resetting,
  loggingOut,
}: SecurityDangerZoneProps) {
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Password Reset Section */}
      <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-2xl flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5 text-text-primary font-bold text-lg">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <span>Account Security & Password</span>
          </div>
          <span className="text-xs text-text-muted">Supabase Auth</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-text-primary">Password Reset</div>
            <div className="text-xs text-text-muted mt-0.5">
              Send a secure password reset link to <span className="text-text-primary font-medium">{email}</span>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={onResetPassword}
            loading={resetting}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            Send Reset Link
          </Button>
        </div>
      </Card>

      {/* Danger Zone (Logout) */}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 15px rgba(255, 77, 94, 0.1)',
            '0 0 25px rgba(255, 77, 94, 0.25)',
            '0 0 15px rgba(255, 77, 94, 0.1)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="rounded-2xl"
      >
        <Card className="bg-slate-900/80 backdrop-blur-xl border border-red-500/40 p-6 md:p-8 rounded-2xl flex flex-col gap-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-red-500/20 pb-4">
            <div className="flex items-center gap-2.5 text-red-400 font-bold text-lg">
              <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span>Danger Zone</span>
            </div>
            <span className="text-xs text-red-400/80 uppercase font-bold tracking-wider">Session Control</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-text-primary">Sign Out of Account</div>
              <div className="text-xs text-text-muted mt-0.5">
                Revoke your authenticated session and return to the home screen.
              </div>
            </div>

            {showConfirmLogout ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirmLogout(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={onLogout}
                  loading={loggingOut}
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
                  Confirm Sign Out
                </Button>
              </div>
            ) : (
              <Button
                variant="danger"
                onClick={() => setShowConfirmLogout(true)}
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Sign Out
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
