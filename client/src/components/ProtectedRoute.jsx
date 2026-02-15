import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

function ProtectedRoute({ children }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="fr-panel p-4 text-center">
          <div className="spinner-border spinner-border-sm me-2" role="status" />
          Loading...
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default ProtectedRoute;
