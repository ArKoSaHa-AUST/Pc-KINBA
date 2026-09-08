import { ArrowLeftRight, ArrowRight, FileText, Save, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { BuildPurpose } from './buildConfig';
import { partIdsOf, type BuildSelection } from './compatibility';
import { useShareLink } from './useShareLink';

interface ExportActionsProps {
  build: BuildSelection;
  purpose: BuildPurpose;
  onSave: () => void;
  onCheckout: () => void;
}

export default function ExportActions({ build, purpose, onSave, onCheckout }: ExportActionsProps) {
  const navigate = useNavigate();
  const share = useShareLink(build, purpose);
  const ids = partIdsOf(build).join(',');
  const hasParts = ids.length > 0;

  return (
    <div className="export-actions">
      <button type="button" className="button-secondary" onClick={onSave} disabled={!hasParts}>
        <Save size={16} /> Save Build
      </button>
      <button type="button" className="button-secondary" onClick={share} disabled={!hasParts}>
        <Share2 size={16} /> Share Link
      </button>
      <button
        type="button"
        className="button-secondary"
        onClick={() => navigate(`/pc-builder/quote?parts=${ids}`)}
        disabled={!hasParts}
      >
        <FileText size={16} /> Quote Sheet / PDF
      </button>
      <button
        type="button"
        className="button-secondary"
        onClick={() => navigate(`/pc-builder/compare?a=${ids}`)}
      >
        <ArrowLeftRight size={16} /> Compare Builds
      </button>
      <button type="button" className="button-primary" onClick={onCheckout} disabled={!hasParts}>
        Checkout <ArrowRight size={16} />
      </button>
    </div>
  );
}
