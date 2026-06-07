import { Link } from 'react-router-dom';

function joinClasses(...values) {
  return values.filter(Boolean).join(' ');
}

function Button({
  children,
  className,
  href,
  icon,
  iconOnly = false,
  size = 'md',
  target,
  to,
  tone = 'primary',
  type = 'button',
  ...props
}) {
  const classes = joinClasses(
    'button',
    `button-${tone}`,
    `button-${size}`,
    iconOnly ? 'button-icon-only' : '',
    className,
  );

  const content = (
    <>
      {icon ? <span className="button-icon">{icon}</span> : null}
      {iconOnly ? <span className="sr-only">{children}</span> : children}
    </>
  );

  if (to) {
    return (
      <Link className={classes} to={to} {...props}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a className={classes} href={href} target={target} rel={target === '_blank' ? 'noreferrer' : undefined} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button className={classes} type={type} {...props}>
      {content}
    </button>
  );
}

export default Button;
