import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import Button from './Button';

function CopyButton({ text, label = 'Copy link', tone = 'secondary' }) {
  const [status, setStatus] = useState('idle');

  async function handleCopy() {
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
      window.setTimeout(() => setStatus('idle'), 1800);
    } catch {
      setStatus('error');
      window.setTimeout(() => setStatus('idle'), 1800);
    }
  }

  return (
    <Button
      onClick={handleCopy}
      tone={status === 'copied' ? 'success' : tone}
      icon={status === 'copied' ? <Check size={16} /> : <Copy size={16} />}
    >
      {status === 'copied' ? 'Copied' : status === 'error' ? 'Copy failed' : label}
    </Button>
  );
}

export default CopyButton;
