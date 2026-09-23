import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, QrCode, Share2, Link as LinkIcon } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopiedToast: () => void;
}

const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '::1'];

export const ShareModal = ({ isOpen, onClose, onCopiedToast }: ShareModalProps) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [qrFailed, setQrFailed] = useState<boolean>(false);
  const [lanUrl, setLanUrl] = useState<string | null>(null);
  const localUrl = typeof window !== 'undefined' ? window.location.href : '';
  const isLocalHost =
    typeof window !== 'undefined' && LOCAL_HOSTNAMES.includes(window.location.hostname);

  // Swap `localhost` for this machine's LAN IP while developing, so the QR code / link
  // actually opens from another device (e.g. a phone) on the same WiFi — "localhost" on
  // that device would otherwise resolve to itself, not this machine.
  useEffect(() => {
    if (!isOpen || !isLocalHost) return;
    let cancelled = false;
    fetch('/api/lan-ip')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.ip) return;
        const url = new URL(window.location.href);
        url.hostname = data.ip;
        setLanUrl(url.toString());
      })
      .catch(() => {
        /* stay on the localhost URL if this fails */
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isLocalHost]);

  const currentUrl = lanUrl || localUrl;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&margin=8&data=${encodeURIComponent(currentUrl)}`;

  useEffect(() => {
    setQrFailed(false);
  }, [currentUrl]);

  useEffect(() => {
    if (isOpen) setLanUrl(null);
  }, [isOpen]);

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
          className="relative w-full max-w-md bg-bg-surface border border-border rounded-3xl p-6 sm:p-7 shadow-2xl z-10 text-text-primary overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
                <Share2 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-text-primary">Share Hardware Comparison</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-fill-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-text-muted mb-5 leading-relaxed">
            Share this custom matrix permalink with friends or scan the QR code to open directly on
            your smartphone.
          </p>

          {/* QR Code Card */}
          <div className="w-full p-4 rounded-2xl bg-fill-subtle border border-border flex flex-col items-center justify-center mb-5">
            <div className="p-3 bg-white rounded-xl shadow-inner mb-2 w-[152px] h-[152px] flex items-center justify-center">
              {qrFailed ? (
                <QrCode className="w-16 h-16 text-slate-300" />
              ) : (
                <img
                  src={qrCodeUrl}
                  alt={`QR code linking to ${currentUrl}`}
                  className="w-32 h-32"
                  onError={() => setQrFailed(true)}
                />
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-text-muted font-semibold">
              <QrCode className="w-3.5 h-3.5 text-accent" />
              <span>
                {qrFailed ? 'QR code unavailable, use the link below' : 'Scan with mobile camera'}
              </span>
            </div>
            {isLocalHost && (
              <div className="mt-1.5 text-[10px] text-text-muted text-center leading-relaxed">
                {lanUrl
                  ? 'Using this device’s network address, which works on other devices on the same WiFi.'
                  : 'Using localhost, which only opens on this device until the network address loads.'}
              </div>
            )}
          </div>

          {/* Copy Link Input Bar */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-fill-subtle border border-border">
            <div className="pl-3 text-text-muted">
              <LinkIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="w-full bg-transparent text-xs text-text-primary font-mono focus:outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-accent text-slate-950 hover:bg-accent/90 transition-all flex-shrink-0 cursor-pointer"
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
