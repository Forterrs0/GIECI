import { useState, useEffect, useRef } from "react";
import { Pencil } from "./Icons.jsx";
export default function EditableName({ value, onSave }) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(value),
    [saving, setSaving] = useState(false);
  const committing = useRef(false),
    cancelled = useRef(false);
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);
  async function commit() {
    if (committing.current || cancelled.current) return;
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setDraft(value);
      setEditing(false);
      return;
    }
    committing.current = true;
    setSaving(true);
    try {
      if (await onSave(trimmed)) setEditing(false);
    } finally {
      committing.current = false;
      setSaving(false);
    }
  }
  if (editing)
    return (
      <input
        className="g-input g-inline-input"
        aria-label="Novo nome"
        autoFocus
        maxLength={120}
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancelled.current = true;
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  return (
    <button
      type="button"
      className="g-editable g-org-row-name"
      onClick={() => {
        cancelled.current = false;
        setEditing(true);
      }}
      title="Clique para renomear"
    >
      {value}
      <Pencil size={11} className="g-edit-icon" />
    </button>
  );
}
