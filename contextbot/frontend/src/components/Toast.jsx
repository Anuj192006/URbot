import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

import Button from './Button';

const ICONS = {
  success: <CheckCircle2 size={18} />,
  error: <AlertCircle size={18} />,
  info: <Info size={18} />,
};

function Toast({ id, message, onDismiss, title, tone = 'info' }) {
  return (
    <article className={`toast toast-${tone}`} role="status" aria-live="polite">
      <div className="toast-icon">{ICONS[tone] || ICONS.info}</div>
      <div className="toast-copy">
        <p className="toast-title">{title}</p>
        {message ? <p className="toast-message">{message}</p> : null}
      </div>
      <Button
        aria-label="Dismiss notification"
        className="toast-dismiss"
        icon={<X size={16} />}
        iconOnly
        onClick={() => onDismiss(id)}
        tone="ghost"
      >
        Dismiss
      </Button>
    </article>
  );
}

export function ToastRegion({ onDismiss, toasts }) {
  if (!toasts.length) {
    return null;
  }

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export default Toast;
