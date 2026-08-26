import { createClient } from '../utils/supabase/client';
import type { BuildSelection } from '../components/builder/compatibility';

export interface SavedBuild {
  id: string;
  name: string;
  partIds: string[];
  totalPrice: number;
  createdAt: string;
}

interface SavedBuildRow {
  id: string;
  name: string;
  part_ids: string[];
  total_price: number;
  created_at: string;
}

const supabase = createClient();

function toSavedBuild(row: SavedBuildRow): SavedBuild {
  return {
    id: row.id,
    name: row.name,
    partIds: row.part_ids,
    totalPrice: row.total_price,
    createdAt: row.created_at,
  };
}

/** Persist the current build for the signed-in user. */
export async function saveBuild(build: BuildSelection): Promise<SavedBuild> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to save a build.');

  const parts = Object.values(build).filter((p) => p !== undefined);
  const flagship = build.gpu ?? build.cpu;
  const name = flagship ? `${flagship.name} Build` : `Custom Build (${parts.length} parts)`;

  const { data, error } = await supabase
    .from('saved_builds')
    .insert({
      user_id: user.id,
      name,
      part_ids: parts.map((p) => p.id),
      total_price: parts.reduce((sum, p) => sum + p.price, 0),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return toSavedBuild(data as SavedBuildRow);
}

/** Newest-first list of the signed-in user's saved builds. */
export async function listBuilds(): Promise<SavedBuild[]> {
  const { data, error } = await supabase
    .from('saved_builds')
    .select('id, name, part_ids, total_price, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as SavedBuildRow[]).map(toSavedBuild);
}

export async function deleteBuild(id: string): Promise<void> {
  const { error } = await supabase.from('saved_builds').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
