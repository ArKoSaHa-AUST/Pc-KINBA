import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWishlist } from '../../hooks/useWishlist';
import { useToast } from '../ui/useToast';

interface WishlistButtonProps {
  /** Canonical products.id — required so the wishlist row can receive price-drop events. */
  productId?: string | null;
}

export default function WishlistButton({ productId }: WishlistButtonProps) {
  const { t } = useTranslation('wishlist');
  const { isAuth, isInWishlist, toggle, isPending } = useWishlist();
  const { toast } = useToast();

  if (!productId) return null;

  const saved = isInWishlist(productId);

  const handleClick = () => {
    toggle(productId, {
      onSuccess: () => {
        if (saved) return;
        toast({
          message: isAuth
            ? "Saved. We'll email you and ping the bell when the price drops."
            : 'Saved locally. Sign in to receive price-drop notifications.',
          variant: 'success',
        });
      },
      onError: () => toast({ message: 'Could not update wishlist.', variant: 'danger' }),
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={saved}
      title={saved ? t('remove') : t('add')}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60 ${
        saved
          ? 'bg-pink-600 hover:bg-pink-500 border border-pink-400 text-white'
          : 'bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white'
      }`}
    >
      <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
      <span>{saved ? 'Tracking' : 'Track Price'}</span>
    </button>
  );
}
