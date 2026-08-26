import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { CheckCircle2, Plus, X } from 'lucide-react';
import { formatTaka } from './buildConfig';
import type { BuilderProduct, CategoryMeta } from './builderCatalog';

interface ComponentCardProps {
  meta: CategoryMeta;
  selected: BuilderProduct | null;
  onOpen: () => void;
  onRemove: () => void;
}

export default function ComponentCard({ meta, selected, onOpen, onRemove }: ComponentCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 25 });
  const springY = useSpring(y, { stiffness: 200, damping: 25 });
  const rotateX = useTransform(springY, [-0.5, 0.5], ['8deg', '-8deg']);
  const rotateY = useTransform(springX, [-0.5, 0.5], ['-8deg', '8deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const Icon = meta.icon;

  return (
    <div className="component-card-perspective">
      <motion.div
        className={`component-card${selected ? ' is-selected' : ''}`}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={selected ? undefined : onOpen}
        role={selected ? undefined : 'button'}
        tabIndex={selected ? undefined : 0}
        onKeyDown={
          selected
            ? undefined
            : (e) => {
                if (e.key === 'Enter' || e.key === ' ') onOpen();
              }
        }
        aria-label={selected ? undefined : `Select ${meta.label}`}
      >
        {selected ? (
          <motion.div
            key={selected.id}
            className="component-card-selected"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: [1, 1.05, 1], opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            <button
              type="button"
              className="component-card-remove"
              onClick={onRemove}
              aria-label={`Remove ${meta.label}`}
            >
              <X size={16} />
            </button>
            <div className="component-card-thumb">
              <Icon size={28} />
              <motion.span
                className="component-card-check"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.25 }}
              >
                <CheckCircle2 size={18} />
              </motion.span>
            </div>
            <div className="component-card-info">
              <span className="component-card-category">{meta.label}</span>
              <span className="component-card-name" title={selected.name}>
                {selected.name}
              </span>
              <span className="component-card-price">{formatTaka(selected.price)}</span>
              <span className="component-card-spec">{selected.keySpec}</span>
            </div>
            <button type="button" className="component-card-change" onClick={onOpen}>
              Change
            </button>
          </motion.div>
        ) : (
          <div className="component-card-empty">
            <Icon size={48} className="component-card-empty-icon" />
            <span className="component-card-label">{meta.label}</span>
            <span className="component-card-desc">{meta.description}</span>
            <span className="component-card-add">
              <Plus size={14} /> Select
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
