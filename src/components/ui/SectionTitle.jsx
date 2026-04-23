function SectionTitle({ eyebrow, title, subtitle, light = false }) {
  return (
    <header className={`section-title ${light ? "light" : ""}`}>
      {eyebrow && <p>{eyebrow}</p>}
      <h2>{title}</h2>
      {subtitle && <span>{subtitle}</span>}
    </header>
  );
}

export default SectionTitle;
