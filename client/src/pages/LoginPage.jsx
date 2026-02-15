import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [farmId, setFarmId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const nextPath = location.state?.from || '/dashboard';

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await auth.loginUser({ email, password, farm_id: farmId || undefined });
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-3">
      <div className="fr-panel p-4" style={{ width: 'min(460px, 100%)' }}>
        <div className="mb-3">
          <div className="small text-uppercase fr-text-muted">FarmreactERP</div>
          <h3 className="mb-1">Sign in</h3>
          <p className="fr-text-muted mb-0">Native React rebuild connected to FarmSuite database.</p>
        </div>

        {error ? <div className="alert alert-danger py-2">{error}</div> : null}

        <form className="vstack gap-3" onSubmit={submit}>
          <input className="form-control" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <input className="form-control" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <input className="form-control" type="number" placeholder="Farm ID (optional)" value={farmId} onChange={(event) => setFarmId(event.target.value)} />
          <button className="btn fr-btn-accent" disabled={busy}>{busy ? 'Signing in...' : 'Login'}</button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
