import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClubConfig } from '../contexts/ClubConfigContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { isAuthenticated, loading } = useAuth();
  const { loading: clubConfigLoading } = useClubConfig();

  if (loading || (isAuthenticated && clubConfigLoading)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

