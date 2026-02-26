import './StatusMessage.css';

export default function StatusMessage({ status, message }) {
  if (status === 'idle' || !message) return null;

  return (
    <div className={`status status--${status}`} role="alert">
      {status === 'loading' && <span className="status__spinner" />}
      <p className="status__text">{message}</p>
    </div>
  );
}
