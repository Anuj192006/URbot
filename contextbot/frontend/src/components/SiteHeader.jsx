import { Link, useLocation } from 'react-router-dom';

import Button from './Button';

function SiteHeader() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const howItWorksHref = isHome ? '#how-it-works' : '/#how-it-works';
  const createHref = isHome ? '#create-bot' : '/#create-bot';

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand-link" aria-label="URbot home">
          <span className="brand-mark">U</span>
          <span>URbot</span>
        </Link>

        <nav className="site-nav" aria-label="Primary">
          <a href={howItWorksHref} className="site-nav-link">
            How it works
          </a>
          <Button href={createHref} size="sm">
            Create your bot
          </Button>
        </nav>
      </div>
    </header>
  );
}

export default SiteHeader;
