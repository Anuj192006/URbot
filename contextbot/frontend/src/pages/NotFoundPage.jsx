import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="panel empty-state">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>This link does not point to an available page or chatbot.</p>
      <Link to="/" className="button button-primary">
        Return home
      </Link>
    </div>
  );
}

export default NotFoundPage;
