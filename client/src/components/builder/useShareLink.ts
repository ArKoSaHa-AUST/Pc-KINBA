import { useCallback } from 'react';
import { shareBuild } from '../../api/builds';
import { useToast } from '../ui/useToast';
import { partIdsOf, type BuildSelection } from './compatibility';

/** Copies a short `/b/:code` link; falls back to the long `?parts=` link if the share API is down. */
export function useShareLink(build: BuildSelection, purpose?: string) {
  const { toast } = useToast();
  return useCallback(async () => {
    const origin = window.location.origin;
    let url = `${origin}/pc-builder?parts=${partIdsOf(build).join(',')}`;
    let message = 'Share link copied to clipboard!';
    try {
      const code = await shareBuild(build, purpose);
      url = `${origin}/b/${code}`;
      message = `Short link copied: ${window.location.host}/b/${code}`;
    } catch {
      // long link still works
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ message, variant: 'success' });
    } catch {
      toast({ message: 'Could not copy the link — clipboard unavailable.', variant: 'danger' });
    }
  }, [build, purpose, toast]);
}
