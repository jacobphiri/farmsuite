import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

function LogoutPage() {
  const auth = useAuth();

  useEffect(() => {
    auth.logout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Navigate to="/login" replace />;
}

export default LogoutPage;
