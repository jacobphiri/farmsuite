function formatValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value || '0');
  }

  if (Math.abs(numeric) >= 1000) {
    return numeric.toLocaleString();
  }

  return String(numeric);
}

function StatCard({ label, value, icon = 'bi-bar-chart-line', hint }) {
  return (
    <div className="card p-3 h-100">
      <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
        <span className="small text-secondary text-uppercase fw-semibold">{label}</span>
        <i className={`bi ${icon} fs-5`} />
      </div>
      <div className="fr-stat-value">{formatValue(value)}</div>
      {hint ? <div className="small text-secondary mt-1">{hint}</div> : null}
    </div>
  );
}

export default StatCard;
