import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '../utils/supabase/client';

const supabase = createClient();

/**
 * Subscribes to real-time changes on the Supabase products table
 * to reactively update stock and live pricing across connected clients
 */
export function useRealtimeStock() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          console.log('[Realtime] Product update received from Supabase:', payload);
          // Invalidate components and product queries
          queryClient.invalidateQueries({ queryKey: ['components'] });
          queryClient.invalidateQueries({ queryKey: ['product'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
