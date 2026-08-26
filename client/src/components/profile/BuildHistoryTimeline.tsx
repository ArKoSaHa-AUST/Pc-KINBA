import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers, Calendar, ArrowUpRight, Cpu, CheckCircle2, Upload, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { listBuilds, deleteBuild, type SavedBuild } from '../../api/builds';
import { BUILDER_CATALOG } from '../builder/builderCatalog';
import { useToast } from '../ui/useToast';

interface SavedBuildItem {
  id: string;
  name: string;
  date: string;
  totalPrice: number;
  partsCount: number;
  parts: string[];
  status: 'Complete' | 'Draft';
  /** ids for reloading into the builder — only present on Supabase-backed rows */
  partIds?: string[];
}

function toItem(build: SavedBuild): SavedBuildItem {
  const names = build.partIds
    .map((id) => BUILDER_CATALOG.find((p) => p.id === id)?.name)
    .filter((n): n is string => !!n);
  return {
    id: build.id,
    name: build.name,
    date: build.createdAt,
    totalPrice: build.totalPrice,
    partsCount: build.partIds.length,
    parts: names.slice(0, 4),
    status: 'Complete',
    partIds: build.partIds,
  };
}

export function BuildHistoryTimeline() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [builds, setBuilds] = useState<SavedBuildItem[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Prefer Supabase-backed builds; fall back to local/demo data
      try {
        const remote = await listBuilds();
        if (mounted && remote.length > 0) {
          setBuilds(remote.map(toItem));
          return;
        }
      } catch {
        // anonymous session or network issue — use fallback below
      }
      if (mounted) setBuilds(loadLocalBuilds());
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLoad = (item: SavedBuildItem) => {
    if (item.partIds) navigate(`/pc-builder?parts=${item.partIds.join(',')}`);
  };

  const handleDelete = async (item: SavedBuildItem) => {
    try {
      await deleteBuild(item.id);
      setBuilds((prev) => prev.filter((b) => b.id !== item.id));
      toast({ message: `“${item.name}” deleted.`, variant: 'info' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to delete build.';
      toast({ message: msg, variant: 'danger' });
    }
  };

  // Local/demo fallback shown when the user has no Supabase-backed builds
  function loadLocalBuilds(): SavedBuildItem[] {
    const saved: SavedBuildItem[] = [];
    try {
      const storedConfig = localStorage.getItem('pc_kinba_configured_build');
      if (storedConfig) {
        const parsed = JSON.parse(storedConfig) as Record<string, unknown>;
        const partsObj = (parsed.components || parsed.parts || {}) as Record<
          string,
          { name?: string; model?: string } | string
        >;
        saved.push({
          id: 'build_configured',
          name: (parsed.name as string) || 'Custom Quantum Rig',
          date: (parsed.date as string) || new Date().toISOString(),
          totalPrice: (parsed.totalPrice as number) || 165000,
          partsCount: Object.keys(partsObj).length || 7,
          parts: Object.values(partsObj)
            .map((p) =>
              typeof p === 'object' && p !== null
                ? p.name || p.model || ''
                : typeof p === 'string'
                  ? p
                  : '',
            )
            .filter(Boolean)
            .slice(0, 4),
          status: 'Complete',
        });
      }

      const storedSavedList = localStorage.getItem('pcbuilder_saved_builds');
      if (storedSavedList) {
        const parsedList = JSON.parse(storedSavedList) as Array<Record<string, unknown>>;
        if (Array.isArray(parsedList)) {
          parsedList.forEach((b, index: number) => {
            const rawParts = (b.parts || {}) as Record<string, { name?: string } | string>;
            saved.push({
              id: (b.id as string) || `build_saved_${index}`,
              name: (b.name as string) || `PC Builder Rig #${index + 1}`,
              date: (b.date as string) || (b.savedAt as string) || new Date().toISOString(),
              totalPrice: (b.totalPrice as number) || (b.total as number) || 145000,
              partsCount: (b.partsCount as number) || (b.parts ? Object.keys(rawParts).length : 6),
              parts: b.parts
                ? Object.values(rawParts)
                    .map((p) =>
                      typeof p === 'object' && p !== null
                        ? p.name || ''
                        : typeof p === 'string'
                          ? p
                          : '',
                    )
                    .filter(Boolean)
                    .slice(0, 4)
                : ['Ryzen 7 7800X3D', 'RTX 4070 Ti Super', '32GB DDR5', '1TB NVMe'],
              status: (b.status as string) === 'Draft' ? 'Draft' : 'Complete',
            });
          });
        }
      }

      // Default fallback mock builds if user has none yet
      if (saved.length === 0) {
        saved.push(
          {
            id: 'mock_1',
            name: 'Cyberpunk 4K Titan Rig',
            date: new Date(Date.now() - 86400000 * 2).toISOString(),
            totalPrice: 245000,
            partsCount: 8,
            parts: [
              'Intel Core i7-14700K',
              'RTX 4080 Super 16GB',
              'Corsair Dominator 32GB DDR5',
              'Samsung 990 PRO 2TB',
            ],
            status: 'Complete',
          },
          {
            id: 'mock_2',
            name: 'AI Engineering & Deep Learning Node',
            date: new Date(Date.now() - 86400000 * 12).toISOString(),
            totalPrice: 320000,
            partsCount: 7,
            parts: [
              'AMD Ryzen 9 7950X',
              'RTX 4090 24GB',
              'G.Skill 64GB DDR5-6000',
              'WD Black SN850X 4TB',
            ],
            status: 'Complete',
          },
        );
      }
    } catch {
      return [];
    }
    return saved;
  }

  return (
    <div className="relative flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5 text-text-primary font-bold text-lg">
          <div className="p-2 rounded-lg bg-purple/10 border border-purple/20 text-purple">
            <Layers className="w-5 h-5" />
          </div>
          <span>Build History & Saved Rigs</span>
        </div>
        <Button
          id="profile-open-builder-btn"
          variant="secondary"
          size="sm"
          onClick={() => navigate('/pc-builder')}
          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
        >
          Open Builder
        </Button>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-gradient-to-b before:from-accent before:via-purple before:to-transparent">
        {builds.map((build, index) => (
          <motion.div
            key={build.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="relative group"
          >
            {/* Timeline dot */}
            <div className="absolute -left-6 top-5 w-4 h-4 rounded-full bg-bg-primary border-2 border-accent group-hover:scale-125 group-hover:bg-accent transition-all duration-300 shadow-[0_0_10px_rgba(0,229,255,0.6)]" />

            <Card className="bg-slate-900/50 backdrop-blur-md border border-white/10 p-5 rounded-xl hover:border-accent/40 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-text-primary text-base group-hover:text-accent transition-colors">
                      {build.name}
                    </h3>
                    <Badge
                      variant={build.status === 'Complete' ? 'success' : 'neutral'}
                      className="text-xs"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> {build.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(build.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> {build.partsCount} Components
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-xs text-text-muted font-medium">Estimated Total</div>
                  <div className="text-lg font-black text-accent tracking-tight">
                    ৳{build.totalPrice.toLocaleString()}
                  </div>
                </div>
              </div>

              {build.parts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                  {build.parts.map((part, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5 text-[11px] text-text-muted"
                    >
                      {part}
                    </span>
                  ))}
                </div>
              )}

              {build.partIds && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleLoad(build)}
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                  >
                    Load in Builder
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(build)}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
