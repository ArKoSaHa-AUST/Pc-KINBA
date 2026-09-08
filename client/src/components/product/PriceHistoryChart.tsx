import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, History, Loader2, TrendingDown, TrendingUp } from 'lucide-react';

interface PricePoint {
  date: string;
  price: number;
  retailer: string;
}

interface PriceHistoryData {
  days: number;
  current_price: number;
  lowest_price: number;
  highest_price: number;
  is_lowest: boolean;
  change_pct: number;
  points: PricePoint[];
}

const RANGES = [
  { days: 30, label: '1M' },
  { days: 90, label: '3M' },
  { days: 180, label: '6M' },
  { days: 365, label: '1Y' },
] as const;

const formatTaka = (value: number) => `৳${value.toLocaleString()}`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

interface PriceHistoryChartProps {
  productId?: string;
}

export default function PriceHistoryChart({ productId }: PriceHistoryChartProps) {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<PriceHistoryData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/product/${encodeURIComponent(productId)}/price-history?days=${days}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: PriceHistoryData | null) => setData(json))
      .catch((err) => {
        if (err.name !== 'AbortError') console.error('Error fetching price history:', err);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [productId, days]);

  if (!productId) return null;

  const isDrop = (data?.change_pct ?? 0) < 0;
  const hasTrend = (data?.points.length ?? 0) > 1;

  return (
    <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" /> Price History
          </h3>
          {data?.is_lowest && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-[11px] font-extrabold uppercase tracking-wider">
              <Award className="w-3 h-3" /> Lowest price in {days} days
            </span>
          )}
        </div>
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          {RANGES.map((range) => (
            <button
              key={range.days}
              onClick={() => setDays(range.days)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                days === range.days
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {data && data.current_price > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 text-xs">
          <Stat label="Current" value={formatTaka(data.current_price)} accent="text-cyan-400" />
          <Stat
            label={`${days}d Low`}
            value={formatTaka(data.lowest_price)}
            accent="text-green-400"
          />
          <Stat
            label={`${days}d High`}
            value={formatTaka(data.highest_price)}
            accent="text-white"
          />
          <div className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
            <p className="text-gray-500 font-semibold mb-1">Change</p>
            <p
              className={`font-extrabold text-base inline-flex items-center gap-1 ${
                isDrop ? 'text-green-400' : data.change_pct > 0 ? 'text-red-400' : 'text-gray-300'
              }`}
            >
              {isDrop ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              {data.change_pct > 0 ? '+' : ''}
              {data.change_pct}%
            </p>
          </div>
        </div>
      )}

      <div className="h-[220px] w-full">
        {loading ? (
          <div className="h-full flex items-center justify-center text-cyan-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : hasTrend ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.points} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceHistoryFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="rgba(255,255,255,0.3)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={8}
              />
              <YAxis
                domain={['auto', 'auto']}
                tickFormatter={formatTaka}
                stroke="rgba(255,255,255,0.3)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={72}
              />
              <Tooltip
                labelFormatter={(label) => formatDate(String(label))}
                formatter={(value, _name, item) => [
                  formatTaka(Number(value)),
                  (item?.payload as PricePoint | undefined)?.retailer ?? 'Price',
                ]}
                contentStyle={{
                  backgroundColor: 'rgba(10, 15, 37, 0.95)',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                itemStyle={{ color: '#00e5ff', fontWeight: 700 }}
                cursor={{
                  stroke: 'rgba(0, 229, 255, 0.25)',
                  strokeWidth: 1.5,
                  strokeDasharray: '4 4',
                }}
              />
              <Area
                type="stepAfter"
                dataKey="price"
                stroke="#00e5ff"
                strokeWidth={2.5}
                fill="url(#priceHistoryFill)"
                dot={{ r: 3, fill: '#00e5ff', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-bold text-white">Tracking started</p>
            <p className="text-xs text-gray-400 max-w-sm">
              We record every price change from each retailer. The trend line will appear as soon as
              this product's price moves.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
      <p className="text-gray-500 font-semibold mb-1">{label}</p>
      <p className={`font-extrabold text-base ${accent}`}>{value}</p>
    </div>
  );
}
