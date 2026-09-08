import { useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';
import { getSharedBuild } from '../api/builds';
import './BuildCheckoutPage.css';

/** Resolves a short share link to the builder. The server renders this same path with OG tags for crawlers. */
export default function SharedBuildPage() {
  const { code = '' } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['shared-build', code],
    queryFn: () => getSharedBuild(code),
    enabled: /^[0-9a-f]{7}$/i.test(code),
    retry: false,
  });

  if (isLoading) return <p className="checkout-loading">Opening shared build…</p>;
  if (isError || !data?.partIds.length) return <Navigate to="/pc-builder" replace />;
  return <Navigate to={`/pc-builder?parts=${data.partIds.join(',')}`} replace />;
}
