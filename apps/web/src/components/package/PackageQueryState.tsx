import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ApiClientError } from '../../services/api-client';
import { QueryState } from '../gym/GymUi';
const ExpiredSession = () => {
  const { refreshSession } = useAuth();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    let mounted = true;
    void refreshSession().then(() => { if (mounted) setChecked(true); });
    return () => { mounted = false; };
  }, [refreshSession]);
  return checked ? <Navigate to="/login" replace /> : <QueryState pending error={null} retry={refreshSession} />;
};
export const PackageQueryState = (props: { pending: boolean; error: Error | null; retry: () => unknown }) => {
  if (props.error instanceof ApiClientError && props.error.statusCode === 401) return <ExpiredSession />;
  return <QueryState {...props} />;
};
