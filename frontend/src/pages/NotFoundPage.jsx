import { Link } from 'react-router-dom';
import { EmptyState } from '../components/States';

export default function NotFoundPage() {
  return (
    <div className="narrow-page">
      <EmptyState
        title="This shelf does not exist"
        message="The route may have moved, or perhaps it was never provisioned."
        action={
          <Link className="button" to="/">
            Return home
          </Link>
        }
      />
    </div>
  );
}

