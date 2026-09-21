import { useEffect, useCallback } from 'react';
import ChatWorkspace from './ChatWorkspace';
import type { BuildUpdatePayload } from './ChatWorkspace';
import BuildPreviewHUD from './BuildPreviewHUD';
import { useTonimaSession } from '../../store/useTonimaSession';
import './TonimaWorkspace.css';

interface TonimaWorkspaceProps {
  initialPrompt?: string;
  initialBudget?: number;
  className?: string;
}

export default function TonimaWorkspace({
  initialPrompt = '',
  initialBudget,
  className = '',
}: TonimaWorkspaceProps) {
  const activeBuild = useTonimaSession((s) => s.activeBuild);
  const applyBuildEvent = useTonimaSession((s) => s.applyBuildEvent);
  const resetSession = useTonimaSession((s) => s.resetSession);
  const setBudget = useTonimaSession((s) => s.setBudget);

  // Sync initialBudget into session store if provided
  useEffect(() => {
    if (initialBudget !== undefined && initialBudget > 0) {
      setBudget(initialBudget);
    }
  }, [initialBudget, setBudget]);

  // Memoisable updates from live backend SSE stream
  const handleBuildUpdated = useCallback(
    (payload: BuildUpdatePayload) => {
      applyBuildEvent({
        parts: payload.parts,
        totalBDT: payload.totalBDT,
        validation: payload.validation,
        alternatives: payload.alternatives,
        diff: payload.diff,
      });
    },
    [applyBuildEvent],
  );

  const handleResetSession = useCallback(() => {
    resetSession();
  }, [resetSession]);

  return (
    <section className={`tonima-workspace-section ${className}`} id="tonima-workspace">
      <div className="tonima-workspace-container">
        {/* Left Column: 60% Chat Workspace */}
        <ChatWorkspace
          initialPrompt={initialPrompt}
          onBuildUpdated={handleBuildUpdated}
          onResetSession={handleResetSession}
          className="tonima-workspace-chat"
        />

        {/* Right Column: 40% Sticky 3D Preview HUD */}
        <BuildPreviewHUD
          components={activeBuild.parts}
          totalPrice={activeBuild.totalBDT}
          validation={activeBuild.validation}
          compatibilityScore={
            activeBuild.validation?.score ?? (activeBuild.parts.length > 0 ? 100 : 0)
          }
          estimatedWattage={activeBuild.validation?.wattage ?? 0}
          psuWattage={activeBuild.validation?.psuWattage ?? 0}
          priceDiff={activeBuild.diff?.priceDelta}
          className="tonima-workspace-hud"
        />
      </div>
    </section>
  );
}
