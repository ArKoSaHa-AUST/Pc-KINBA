import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, QrCode, Share2, Link as LinkIcon } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopiedToast: () => void;
}

export const ShareModal = ({ isOpen, onClose, onCopiedToast }: ShareModalProps) => {
  const [copied, setCopied] = useState<boolean>(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      onCopiedToast();
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 text-white overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
                <Share2 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-white">Share Hardware Comparison</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-text-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-text-muted mb-5 leading-relaxed">
            Share this custom matrix permalink with friends or scan the QR code to open directly on
            your smartphone.
          </p>

          {/* QR Code Card */}
          <div className="w-full p-4 rounded-2xl bg-slate-950/80 border border-white/5 flex flex-col items-center justify-center mb-5">
            <div className="p-3 bg-white rounded-xl shadow-inner mb-2">
              <svg viewBox="0 0 100 100" className="w-32 h-32">
                {/* SVG QR Code Pattern Representation */}
                <rect width="100" height="100" fill="#ffffff" />
                <rect x="10" y="10" width="24" height="24" fill="#050816" />
                <rect x="14" y="14" width="16" height="16" fill="#ffffff" />
                <rect x="18" y="18" width="8" height="8" fill="#050816" />

                <rect x="66" y="10" width="24" height="24" fill="#050816" />
                <rect x="70" y="14" width="16" height="16" fill="#ffffff" />
                <rect x="74" y="18" width="8" height="8" fill="#050816" />

                <rect x="10" y="66" width="24" height="24" fill="#050816" />
                <rect x="14" y="70" width="16" height="16" fill="#ffffff" />
                <rect x="18" y="74" width="8" height="8" fill="#050816" />

                <rect x="42" y="14" width="16" height="6" fill="#050816" />
                <rect x="42" y="26" width="8" height="18" fill="#050816" />
                <rect x="56" y="30" width="14" height="6" fill="#050816" />
                <rect x="42" y="52" width="16" height="8" fill="#050816" />
                <rect x="68" y="52" width="18" height="16" fill="#050816" />
                <rect x="42" y="70" width="16" height="16" fill="#050816" />
                <rect x="68" y="76" width="18" height="12" fill="#050816" />
              </svg>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-text-muted font-semibold">
              <QrCode className="w-3.5 h-3.5 text-accent" />
              <span>Scan with mobile camera</span>
            </div>
          </div>

          {/* Copy Link Input Bar */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/90 border border-white/10">
            <div className="pl-3 text-text-muted">
              <LinkIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="w-full bg-transparent text-xs text-slate-300 font-mono focus:outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-accent text-slate-950 hover:bg-accent/90 transition-all flex-shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
