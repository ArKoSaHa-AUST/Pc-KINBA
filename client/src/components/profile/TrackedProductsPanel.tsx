import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowUpRight, BellRing, Heart, Radar, RefreshCw, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getUserPriceAlerts,
  resendPriceAlert,
  unsubscribePriceAlert,
  type PriceAlert,
} from '../../api/priceAlerts';
import { getWishlistProducts, type WishlistProduct } from '../../api/wishlist';
import { useAuth } from '../../auth/useAuth';
import { useWishlist } from '../../hooks/useWishlist';
import { sanitizeImageUrl } from '../../utils/image';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { useToast } from '../ui/useToast';

interface TrackedItem {
  key: string;
  id?: string;
  title: string;
  image: string | null;
  price: number | null;
  targetPrice?: number | null;
  since: string;
  kind: 'wishlist' | 'alert';
  status?: PriceAlert['status'];
  lastNotificationStatus?: string | null;
  lastNotificationAt?: string | null;
  failedNotificationCount?: number;
  /** Product page link (listing id) — absent when a wishlist product has no live listing yet. */
  href: string | null;
  remove: () => void;
  resend?: () => void;
  isResending?: boolean;
}

const formatTaka = (n: number | null) => (n && n > 0 ? `৳${n.toLocaleString()}` : '—');

/** Everything the user is tracking: wishlisted products + active price alerts. */
export function TrackedProductsPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuth, toggle } = useWishlist();

  const { data: wishlist = [] } = useQuery<WishlistProduct[]>({
    queryKey: ['wishlist-products', user?.id],
    queryFn: () => getWishlistProducts(user!.id),
    enabled: isAuth,
  });

  const { data: alerts = [] } = useQuery<PriceAlert[]>({
    queryKey: ['price-alerts', user?.email],
    queryFn: () => getUserPriceAlerts(user!.email),
    enabled: !!user?.email,
  });

  const removeAlert = useMutation({
    mutationFn: (listingId: string) => unsubscribePriceAlert(listingId, user!.email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts', user?.email] });
      toast({ message: 'Price alert cancelled.', variant: 'info' });
    },
    onError: () => toast({ message: 'Could not cancel price alert.', variant: 'danger' }),
  });

  const resendAlert = useMutation({
    mutationFn: (alertId: string) => resendPriceAlert(alertId, user!.email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts', user?.email] });
      toast({ message: 'Price drop notification resent to your email.', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({
        message: err.message || 'Could not resend price alert notification.',
        variant: 'danger',
      });
    },
  });

  const removeWish = (productId: string) =>
    toggle(productId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['wishlist-products', user?.id] });
        toast({ message: 'Removed from wishlist.', variant: 'info' });
      },
    });

  const items: TrackedItem[] = [
    ...wishlist.map<TrackedItem>((w) => ({
      key: `wish-${w.productId}`,
      title: w.name,
      image: w.image,
      price: w.bestPrice,
      since: w.addedAt,
      kind: 'wishlist',
      href: w.listingId ? `/product/${w.listingId}` : null,
      remove: () => removeWish(w.productId),
    })),
    ...alerts
      .filter((a) => a.status !== 'cancelled')
      .map<TrackedItem>((a) => ({
        key: `alert-${a.id}`,
        id: a.id,
        title: a.product_title || 'Component',
        image: a.product_image,
        price: a.current_price,
        targetPrice: a.target_price,
        since: a.created_at,
        kind: 'alert',
        status: a.status,
        lastNotificationStatus: a.last_notification_status,
        lastNotificationAt: a.last_notification_at,
        failedNotificationCount: a.failed_notification_count,
        href: `/product/${a.product_id}`,
        remove: () => removeAlert.mutate(a.product_id),
        resend: () => resendAlert.mutate(a.id),
        isResending: resendAlert.isPending && resendAlert.variables === a.id,
      })),
  ].sort((a, b) => Date.parse(b.since) - Date.parse(a.since));

  return (
    <div className="relative flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2.5 text-text-primary font-bold text-lg">
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-accent">
            <Radar className="w-5 h-5" />
          </div>
          <span>Tracked Products</span>
        </div>
        <span className="text-xs text-text-muted">
          {wishlist.length} wishlisted · {alerts.filter((a) => a.status === 'active').length} alerts
        </span>
      </div>

      {items.length === 0 ? (
        <Card className="border border-border p-6 text-center">
          <p className="text-sm text-text-muted">
            You aren't tracking anything yet. Use <strong>Track Price</strong> or{' '}
            <strong>Subscribe Price Alerts</strong> on any product page, or <strong>Track</strong>{' '}
            on a part in the PC Builder.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item, index) => {
            const img = sanitizeImageUrl(item.image);
            const inner = (
              <>
                <div className="w-14 h-14 rounded-xl bg-fill-subtle border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {img ? (
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Heart className="w-5 h-5 text-text-muted" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-text-primary text-sm truncate">
                      {item.title}
                    </h3>
                    {item.kind === 'wishlist' ? (
                      <Badge variant="accent">
                        <Heart className="w-3 h-3" /> Wishlist
                      </Badge>
                    ) : item.lastNotificationStatus?.startsWith('failed') ? (
                      <Badge
                        variant="warning"
                        className="border-amber-500/30 text-amber-400 bg-amber-500/10"
                      >
                        <AlertCircle className="w-3 h-3" /> Email delivery failed
                      </Badge>
                    ) : (
                      <Badge variant={item.status === 'triggered' ? 'success' : 'warning'}>
                        <BellRing className="w-3 h-3" />
                        {item.status === 'triggered' ? 'Target reached' : 'Price alert'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    Since{' '}
                    {new Date(item.since).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {item.targetPrice ? ` · Target ${formatTaka(item.targetPrice)}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-text-muted">Current</div>
                  <div className="font-black text-accent">{formatTaka(item.price)}</div>
                </div>
              </>
            );

            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="border border-border p-4 rounded-xl hover:border-accent/40 transition-colors flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    {item.href ? (
                      <Link to={item.href} className="flex items-center gap-4 min-w-0 flex-1">
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-4 min-w-0 flex-1">{inner}</div>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      {item.href && (
                        <Link
                          to={item.href}
                          aria-label="Open product"
                          className="p-2 rounded-lg text-text-muted hover:text-accent hover:bg-border transition-colors"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={item.remove}
                        aria-label="Stop tracking"
                        className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-border transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {item.kind === 'alert' && item.lastNotificationStatus?.startsWith('failed') && (
                    <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="truncate">
                          We couldn't reach your email — the price did drop.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            item.resend?.();
                          }}
                          disabled={item.isResending}
                          className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-white font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${item.isResending ? 'animate-spin' : ''}`}
                          />
                          {item.isResending ? 'Resending...' : 'Resend'}
                        </button>
                        <Link
                          to="/profile"
                          className="text-text-muted hover:text-text-primary underline transition-colors"
                        >
                          Update email
                        </Link>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
