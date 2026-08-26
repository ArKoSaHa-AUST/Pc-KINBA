import { ArrowLeftRight, Printer, Save, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../ui/useToast';
import type { BuildSelection } from './compatibility';

interface ExportActionsProps {
  build: BuildSelection;
  onSave: () => void;
}

function buildShareUrl(build: BuildSelection): string {
  const ids = Object.values(build)
    .filter((p) => p !== undefined)
    .map((p) => p.id);
  return `${window.location.origin}/pc-builder?parts=${ids.join(',')}`;
}

export default function ExportActions({ build, onSave }: ExportActionsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasParts = Object.keys(build).length > 0;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(build));
      toast({ message: 'Share link copied to clipboard!', variant: 'success' });
    } catch {
      toast({ message: 'Could not copy the link — clipboard unavailable.', variant: 'danger' });
    }
  };

  return (
    <div className="export-actions">
      <button type="button" className="button-secondary" onClick={onSave} disabled={!hasParts}>
        <Save size={16} /> Save Build
      </button>
      <button type="button" className="button-secondary" onClick={handleShare} disabled={!hasParts}>
        <Share2 size={16} /> Share Link
      </button>
      <button
        type="button"
        className="button-secondary"
        onClick={() => window.print()}
        disabled={!hasParts}
      >
        <Printer size={16} /> Export PDF
      </button>
      <button type="button" className="button-secondary" onClick={() => navigate('/compare')}>
        <ArrowLeftRight size={16} /> Compare Builds
      </button>
    </div>
  );
}
