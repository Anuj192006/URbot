function SectionCard({ actions, children, className = '', description, eyebrow, title }) {
  return (
    <section className={`section-card ${className}`.trim()}>
      {eyebrow || title || description || actions ? (
        <header className="section-card-header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="section-card-title">{title}</h2> : null}
            {description ? <p className="section-card-description">{description}</p> : null}
          </div>
          {actions ? <div className="section-card-actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export default SectionCard;
