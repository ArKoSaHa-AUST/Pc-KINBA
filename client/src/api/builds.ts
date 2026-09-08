import type { BuildSelection } from '../components/builder/compatibility';
import { createClient } from '../utils/supabase/client';

export interface SavedBuild {
  id: string;
  name: string;
  partIds: string[];
  totalPrice: number;
  createdAt: string;
  purpose: string | null;
  isPublic: boolean;
  authorName: string | null;
}

interface SavedBuildRow {
  id: string;
  name: string;
  part_ids: string[];
  total_price: number;
  created_at: string;
  purpose: string | null;
  is_public: boolean | null;
  author_name: string | null;
}

const BUILD_COLUMNS =
  'id, name, part_ids, total_price, created_at, purpose, is_public, author_name';

const supabase = createClient();

function toSavedBuild(row: SavedBuildRow): SavedBuild {
  return {
    id: row.id,
    name: row.name,
    partIds: row.part_ids,
    totalPrice: row.total_price,
    createdAt: row.created_at,
    purpose: row.purpose,
    isPublic: !!row.is_public,
    authorName: row.author_name,
  };
}

/** Persist the current build for the signed-in user. */
export async function saveBuild(build: BuildSelection, purpose?: string): Promise<SavedBuild> {
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
      purpose: purpose ?? null,
    })
    .select(BUILD_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toSavedBuild(data as SavedBuildRow);
}

/** Newest-first list of the signed-in user's saved builds. */
export async function listBuilds(): Promise<SavedBuild[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('saved_builds')
    .select(BUILD_COLUMNS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as SavedBuildRow[]).map(toSavedBuild);
}

/** Newest public builds for the community gallery (readable by anyone). */
export async function listPublicBuilds(limit = 60): Promise<SavedBuild[]> {
  const { data, error } = await supabase
    .from('saved_builds')
    .select(BUILD_COLUMNS)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as SavedBuildRow[]).map(toSavedBuild);
}

/** Publish / unpublish one of the signed-in user's builds. */
export async function setBuildVisibility(
  id: string,
  isPublic: boolean,
  authorName: string,
): Promise<void> {
  const { error } = await supabase
    .from('saved_builds')
    .update({ is_public: isPublic, author_name: isPublic ? authorName : null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteBuild(id: string): Promise<void> {
  const { error } = await supabase.from('saved_builds').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Short share code for this exact part list (guests included). Same parts → same code. */
export async function shareBuild(build: BuildSelection, purpose?: string): Promise<string> {
  const parts = Object.values(build).filter((p) => p !== undefined);
  const flagship = build.gpu ?? build.cpu;
  const { data, error } = await supabase.rpc('share_build', {
    p_part_ids: parts.map((p) => p.id),
    p_total_price: parts.reduce((sum, p) => sum + p.price, 0),
    p_purpose: purpose ?? null,
    p_name: flagship ? `${flagship.name} Build` : `Custom Build (${parts.length} parts)`,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export interface SharedBuild {
  name: string;
  partIds: string[];
  totalPrice: number;
  purpose: string | null;
}

export async function getSharedBuild(code: string): Promise<SharedBuild | null> {
  const { data, error } = await supabase.rpc('shared_build', { p_code: code }).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as {
    name: string;
    part_ids: string[];
    total_price: number;
    purpose: string | null;
  };
  return {
    name: row.name,
    partIds: row.part_ids,
    totalPrice: row.total_price,
    purpose: row.purpose,
  };
}
