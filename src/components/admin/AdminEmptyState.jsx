function AdminEmptyState({ title, description, compact = false }) {
  return (
    <div className={`admin-empty-state ${compact ? "compact" : ""}`}>
      <span>Sin datos</span>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export default AdminEmptyState;
