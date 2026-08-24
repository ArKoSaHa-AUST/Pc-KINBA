import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ShieldCheck, FileText, Lock } from 'lucide-react';

interface TermsModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function TermsModal({ open, onClose, onAccept }: TermsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Terms of Service & Privacy Policy"
      closeLabel="Close Terms"
    >
      <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2 text-sm text-text-muted">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/10 border border-accent/20 text-accent font-medium text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            Your privacy and data protection are backed by 256-bit encryption & Kinba Zero-Share
            policy.
          </span>
        </div>

        <section className="flex flex-col gap-1.5">
          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" /> 1. Account Usage & Kinba Ecosystem
          </h4>
          <p>
            By creating a PC Kinba account, you gain access to custom PC configuration saving, AI
            Rig recommendations, real-time price tracking, and community showcase submissions.
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple" /> 2. Hardware Compatibility & Data Protection
          </h4>
          <p>
            System specs, saved configurations, and hardware preferences are processed locally and
            stored securely. We never sell your personal contact info to third-party advertisers.
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green" /> 3. Kinba Care Guarantee
          </h4>
          <p>
            Registered members enjoy extended price protection alerts and priority customer support
            for custom hardware builds.
          </p>
        </section>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
        <Button variant="ghost" onClick={onClose}>
          Decline
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            onAccept();
            onClose();
          }}
        >
          Accept & Continue
        </Button>
      </div>
    </Modal>
  );
}
