import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Cpu } from 'lucide-react';
import { formatTaka } from './buildConfig';
import { COMPONENT_CATEGORIES } from './builderCatalog';
import { getBuildChecks, getCompatibilityScore, type BuildSelection } from './compatibility';

interface StickyBuildBarProps {
  build: BuildSelection;
  onSave: () => void;
  onCheckout: () => void;
}

export default function StickyBuildBar({ build, onSave, onCheckout }: StickyBuildBarProps) {
  const partsCount = Object.keys(build).length;
  const total = Object.values(build).reduce((sum, p) => sum + (p?.price ?? 0), 0);
  const score = getCompatibilityScore(getBuildChecks(build));

  return (
    <AnimatePresence>
      {partsCount > 0 && (
        <motion.div
          className="sticky-build-bar"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        >
          <div className="sticky-build-bar-inner container">
            <div className="sticky-build-stat sticky-build-total">
              <Cpu size={18} />
              <span>
                Total: <strong className="gradient-text">{formatTaka(total)}</strong>
              </span>
            </div>
            <div className="sticky-build-stat sticky-build-parts">
              Parts:{' '}
              <strong>
                {partsCount}/{COMPONENT_CATEGORIES.length}
              </strong>
            </div>
            <div className="sticky-build-stat sticky-build-compat">
              Compat:{' '}
              <strong className={score >= 80 ? 'is-good' : score >= 50 ? 'is-warn' : 'is-bad'}>
                {score}%
              </strong>
            </div>
            <div className="sticky-build-actions">
              <button type="button" className="button-secondary sticky-build-save" onClick={onSave}>
                Save Build
              </button>
              <button type="button" className="button-primary" onClick={onCheckout}>
                Checkout <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
