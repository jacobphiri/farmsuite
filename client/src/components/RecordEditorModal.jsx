import { useEffect, useMemo, useState } from 'react';

function normalizeDraft(schema, record) {
  const output = {};
  for (const field of schema?.fields || []) {
    if (field.read_only) continue;
    output[field.name] = record?.[field.name] ?? '';
  }
  return output;
}

function parseNumberOrEmpty(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const n = Number(raw);
  return Number.isFinite(n) ? n : '';
}

function fieldInput(field, value, setFieldValue) {
  const onChange = (next) => setFieldValue(field.name, next);

  if (field.enum_values?.length) {
    return (
      <select className="form-select" value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select...</option>
        {field.enum_values.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  if (field.field_type === 'text') {
    return <textarea className="form-control" rows={3} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />;
  }

  if (field.field_type === 'date') {
    return <input className="form-control" type="date" value={value ?? ''} onChange={(event) => onChange(event.target.value)} />;
  }

  if (field.field_type === 'datetime') {
    return <input className="form-control" type="datetime-local" value={value ?? ''} onChange={(event) => onChange(event.target.value)} />;
  }

  if (field.field_type === 'number' || field.field_type === 'decimal') {
    const isBool = field.column_type?.startsWith('tinyint(1)');
    if (isBool) {
      return (
        <select className="form-select" value={String(value ?? '')} onChange={(event) => onChange(parseNumberOrEmpty(event.target.value))}>
          <option value="">Select...</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>
      );
    }

    return (
      <input
        className="form-control"
        type="number"
        step={field.field_type === 'decimal' ? '0.01' : '1'}
        value={value ?? ''}
        onChange={(event) => onChange(parseNumberOrEmpty(event.target.value))}
      />
    );
  }

  return <input className="form-control" value={value ?? ''} onChange={(event) => onChange(event.target.value)} />;
}

function RecordEditorModal({ schema, record, open, saving, onClose, onSubmit }) {
  const [draft, setDraft] = useState({});
  const title = record ? 'Edit Record' : 'Create Record';

  useEffect(() => {
    if (!open) return;
    setDraft(normalizeDraft(schema, record));
  }, [open, schema, record]);

  const writableFields = useMemo(
    () => (schema?.fields || []).filter((field) => !field.read_only),
    [schema]
  );

  if (!open) return null;

  const setFieldValue = (fieldName, value) => {
    setDraft((prev) => ({ ...prev, [fieldName]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSubmit(draft);
  };

  return (
    <div className="fr-modal-overlay" role="dialog" aria-modal="true">
      <div className="fr-modal-card p-3 p-md-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="mb-0">{title}</h5>
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={onClose}>Close</button>
        </div>

        <form onSubmit={submit}>
          <div className="fr-form-grid mb-3">
            {writableFields.map((field) => (
              <label key={field.name} className="form-label small">
                <span className="fw-semibold text-uppercase fr-text-muted d-block mb-1">{field.name.replaceAll('_', ' ')}</span>
                {fieldInput(field, draft[field.name], setFieldValue)}
              </label>
            ))}
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-outline-secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="btn fr-btn-accent" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecordEditorModal;
