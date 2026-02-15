import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getDashboard } from '../api/endpoints.js';
import { withCache } from '../utils/cache.js';

function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ source: 'remote', stale: false });
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const result = await withCache(
        'dashboard:overview',
        async () => {
          const response = await getDashboard();
          if (!response?.ok) {
            throw new Error(response?.message || 'Failed to load dashboard.');
          }
          return response;
        },
        { maxAgeMs: 1000 * 60 * 60 * 12 }
      );

      setDashboard(result.payload.dashboard || null);
      setStatus({ source: result.source, stale: result.stale });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => { });
  }, []);

  const cards = useMemo(() => dashboard?.cards || [], [dashboard]);
  const moduleSnapshots = useMemo(() => dashboard?.modules || [], [dashboard]);
  const salesTrend = useMemo(() => dashboard?.sales_trend || [], [dashboard]);
  const recentTasks = useMemo(() => dashboard?.recent_tasks || [], [dashboard]);
  const recentIssues = useMemo(() => dashboard?.recent_issues || [], [dashboard]);

  const formatMoney = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(val || 0);
  };

  const formatNumber = (val) => {
    return new Intl.NumberFormat('en-US').format(val || 0);
  };

  // Map module keys to tones for the pulse cards
  const moduleToneMap = {
    BROILERS: 'tone-broilers',
    LAYERS: 'tone-layers',
    PIGS: 'tone-pigs',
    CROPS: 'tone-crops',
    AQUACULTURE: 'tone-aqua',
    FINANCE: 'tone-finance',
    INVENTORY: 'tone-inventory'
  };

  return (
    <div className="vstack gap-3">
      {/* Search PHP "dash-stage" equivalent */}
      <section className="dash-stage">
        <div className="dash-stage-top">
          <div>
            <div className="dash-eyebrow text-uppercase">Portfolio Command Center</div>
            <h3 className="mb-1">Operational Overview</h3>
            <div className="text-secondary small">
              Real-time coordination across production, workforce, alerts, and sales.
              {status.stale ? <span className="ms-2 badge text-bg-warning">Cached</span> : null}
            </div>
          </div>
          <div className="dash-stage-actions">
            <button className="btn btn-sm btn-outline-info" onClick={() => load()} disabled={loading}>
              <i className={`bi bi-arrow-repeat me-1 ${loading ? 'spin' : ''}`} />Refresh
            </button>
            <NavLink to="/reports" className="btn btn-sm btn-outline-info">Reports</NavLink>
          </div>
        </div>

        <div className="dash-kpi-strip mt-3">
          {cards.map((card) => {
            const isMoney = card.key === 'sales_this_month' || card.key === 'expenses_this_month';
            return (
              <div key={card.key} className="dash-kpi-pill">
                <div className="dash-kpi-label">{card.label}</div>
                <div className="dash-kpi-value">
                  {isMoney ? formatMoney(card.value) : formatNumber(card.value)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {error ? <div className="alert alert-danger py-2">{error}</div> : null}

      <section className="dash-pulse-grid">
        {moduleSnapshots.map((mod) => (
          <NavLink
            key={mod.module_key}
            to={`/${mod.module_key.toLowerCase()}`}
            className={`dash-pulse-card ${moduleToneMap[mod.module_key] || ''} text-decoration-none`}
          >
            <span className="dash-pulse-icon">
              <i className={`fi ${mod.icon || 'fi-sr-leaf'}`} />
            </span>
            <div className="dash-pulse-value">{formatNumber(mod.total)}</div>
            <div className="dash-pulse-title">{mod.module_name}</div>
            <div className="dash-pulse-meta">Live operations tracking</div>
          </NavLink>
        ))}
        <NavLink to="/hr-access/tasks" className="dash-pulse-card tone-tasks text-decoration-none">
          <span className="dash-pulse-icon">
            <i className="fi fi-sr-list-check" />
          </span>
          <div className="dash-pulse-value">{formatNumber(dashboard?.pending_tasks || 0)}</div>
          <div className="dash-pulse-title">Open Tasks</div>
          <div className="dash-pulse-meta">Pending or in progress</div>
        </NavLink>
      </section>

      <div className="row g-3">
        <div className="col-xl-8">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Sales Trend (Last 7 Days)</span>
              <span className="small text-secondary fw-normal">Daily performance pulse</span>
            </div>
            <div className="card-body">
              {!salesTrend.length ? (
                <div className="text-secondary py-5 text-center">No recent sales activity data.</div>
              ) : (
                <div className="dash-sales-list">
                  {salesTrend.map((item) => (
                    <div key={item.date} className="dash-sales-row">
                      <div className="dash-sales-main">
                        <div className="dash-sales-module">
                          <i className="fi fi-sr-calendar-day" />
                          <span>{item.date}</span>
                        </div>
                      </div>
                      <div className="dash-sales-values text-end">
                        <strong>{formatMoney(item.value)}</strong>
                      </div>
                      <div className="dash-sales-track">
                        <span
                          className="dash-sales-fill"
                          style={{
                            width: `${Math.min(100, (item.value / (Math.max(...salesTrend.map(s => s.value)) || 1)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card h-100">
            <div className="card-header">Priority Stream</div>
            <div className="card-body">
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">Recent Tasks</h6>
                  <NavLink to="/hr-access/tasks" className="small">View All</NavLink>
                </div>
                <div className="vstack gap-2">
                  {recentTasks.map((task) => (
                    <div key={task.task_id} className="p-2 border rounded-2 small d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold">{task.title}</div>
                        <div className="text-secondary">{task.module_key} • {task.priority}</div>
                      </div>
                      <span className={`badge ${task.status === 'DONE' ? 'text-bg-success' : 'text-bg-warning'}`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                  {!recentTasks.length ? <div className="text-secondary small">No pending tasks.</div> : null}
                </div>
              </div>

              <div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="mb-0">Recent Issues</h6>
                  <NavLink to="/issues" className="small">View All</NavLink>
                </div>
                <div className="vstack gap-2">
                  {recentIssues.map((issue) => (
                    <div key={issue.issue_id} className="p-2 border rounded-2 small d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold">{issue.title}</div>
                        <div className="text-secondary">{issue.module_key} • {issue.priority}</div>
                      </div>
                      <span className="badge text-bg-danger">{issue.status}</span>
                    </div>
                  ))}
                  {!recentIssues.length ? <div className="text-secondary small">No open issues.</div> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;

