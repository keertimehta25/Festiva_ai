import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container page">
      <h1>Page not found</h1>
      <p>We could not find that page. It may have been moved or the link may be wrong.</p>
      <Link className="btn btn-primary" to="/">
        Back to home
      </Link>
    </div>
  );
}
