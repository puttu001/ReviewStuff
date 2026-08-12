import { CheckIcon, XIcon } from './Icons';
import './Toast.css';

export default function Toast({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="toast" role="status">
      <CheckIcon width={18} height={18} />
      <span>{message}</span>
      <button className="toast__close" onClick={onClose} aria-label="Dismiss">
        <XIcon width={16} height={16} />
      </button>
    </div>
  );
}
