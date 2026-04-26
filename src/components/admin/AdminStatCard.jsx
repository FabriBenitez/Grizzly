function AdminStatCard({ icon: Icon, title, value, helper, eyebrow, tone = "default" }) {
  return (
    <article className={`admin-stat-card ${tone}`}>
      <div className="admin-stat-card-top">
        <span className="admin-stat-icon">{Icon ? <Icon size={18} /> : null}</span>
        {eyebrow ? <span className="admin-stat-eyebrow">{eyebrow}</span> : null}
      </div>
      <p>{title}</p>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </article>
  );
}

export default AdminStatCard;
