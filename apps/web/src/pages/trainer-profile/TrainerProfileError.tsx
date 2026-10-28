import { ApiClientError } from '../../services/api-client';
export const TrainerProfileError = ({ error }: { error: Error | null }) => {
  if (!error) return null;
  return <div role="alert" className="alert-banner alert-error"><p>{error.message}</p>
    {error instanceof ApiClientError && Array.isArray(error.details) && error.details.map((detail, index) => <p key={index}>{detail.message}</p>)}
  </div>;
};
