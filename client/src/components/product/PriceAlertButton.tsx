import { useState, useEffect, useCallback } from 'react';
import { BellRing, Check } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import PriceAlertModal from './PriceAlertModal';
import type { ProductDetails } from './ProductHero';

interface PriceAlertButtonProps {
  product?: ProductDetails | null;
  bestPriceStr?: string;
}

export default function PriceAlertButton({ product, bestPriceStr }: PriceAlertButtonProps) {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const checkSubscriptionStatus = useCallback(async () => {
    if (!product?.id) return;
    const email = user?.email;
    const userId = user?.id;

    if (!email && !userId) {
      setIsSubscribed(false);
      return;
    }

    try {
      const query = email
        ? `email=${encodeURIComponent(email)}`
        : `userId=${encodeURIComponent(userId!)}`;
      const res = await fetch(`/api/product/${product.id}/price-alert?${query}`);
      if (res.ok) {
        const data = await res.json();
        setIsSubscribed(!!data.subscribed);
      }
    } catch (err) {
      console.warn('[PriceAlert] Error checking subscription status:', err);
    }
  }, [product?.id, user?.email, user?.id]);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer ${
          isSubscribed
            ? 'bg-rose-600 hover:bg-rose-500 border border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.45)]'
            : 'bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-white shadow-[0_0_15px_rgba(244,63,94,0.15)]'
        }`}
        title={
          isSubscribed
            ? 'You are subscribed to price change notifications for this product (Click to manage)'
            : 'Subscribe to get notified whenever the price drops or updates for this product'
        }
      >
        {isSubscribed ? (
          <>
            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
            <span>Subscribed</span>
          </>
        ) : (
          <>
            <BellRing className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Subscribe Price Alerts</span>
          </>
        )}
      </button>

      {/* Subscription Management Modal */}
      <PriceAlertModal
        product={product}
        bestPriceStr={bestPriceStr}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isSubscribed={isSubscribed}
        onSubscriptionChange={(newStatus) => {
          setIsSubscribed(newStatus);
        }}
      />
    </>
  );
}
