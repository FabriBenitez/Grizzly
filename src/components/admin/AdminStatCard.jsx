function AdminStatCard({ icon: Icon, title, value, eyebrow, tone = "default", trend }) {
  return (
    <article className={`admin-stat-card ${tone}`}>
      <div className="admin-stat-card-top">
        <span className="admin-stat-icon" title={title}>
          {Icon ? <Icon size={20} /> : null}
        </span>
        {eyebrow ? <span className="admin-stat-eyebrow">{eyebrow}</span> : null}
      </div>
      <div className="admin-stat-card-content">
        <p>{title}</p>
        <div className="admin-stat-value-row">
          <strong>{value}</strong>
          {trend ? (
            <span className={`admin-stat-trend ${trend.positive ? "positive" : "negative"}`}>
              {trend.value}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default AdminStatCard;
