import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { formatDate } from '../utils';

export default function ProfilePage() {
  const { user } = useAuth();
  const initial = (user?.name || user?.email || 'M')[0].toUpperCase();

  return (
    <div className="page-width standard-page narrow-content">
      <div className="profile-card">
        <div className="profile-avatar">{initial}</div>
        <div className="profile-title">
          <span className="eyebrow">MicroShop account</span>
          <h1>{user?.name || 'Unnamed member'}</h1>
          <p>{user?.email}</p>
        </div>
        <dl className="profile-details">
          <div>
            <dt>User ID</dt>
            <dd>#{user?.id}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{formatDate(user?.created_at)}</dd>
          </div>
          <div>
            <dt>Session</dt>
            <dd>In-memory JWT</dd>
          </div>
        </dl>
        <div className="profile-actions">
          <Link className="button" to="/orders">
            View order history
          </Link>
          <Link className="button button-secondary" to="/">
            Browse catalog
          </Link>
        </div>
      </div>
    </div>
  );
}

