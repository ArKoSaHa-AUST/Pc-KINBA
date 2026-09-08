import { motion } from 'framer-motion';
import { COMPONENT_CATEGORIES, type ComponentCategory } from './builderCatalog';
import type { BuildSelection } from './compatibility';
import ComponentCard from './ComponentCard';

interface ComponentGridProps {
  build: BuildSelection;
  onOpenCategory: (category: ComponentCategory) => void;
  onRemove: (category: ComponentCategory) => void;
}

const gridVariants = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, rotateX: 8 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export default function ComponentGrid({ build, onOpenCategory, onRemove }: ComponentGridProps) {
  return (
    <motion.div
      className="component-grid"
      variants={gridVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
    >
      {COMPONENT_CATEGORIES.map((meta) => (
        <motion.div key={meta.id} variants={cardVariants}>
          <ComponentCard
            meta={meta}
            selected={build[meta.id] ?? null}
            onOpen={() => onOpenCategory(meta.id)}
            onRemove={() => onRemove(meta.id)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
