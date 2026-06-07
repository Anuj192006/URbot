import { CheckCircle2, ExternalLink, Link2, LockKeyhole } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { api } from '../api';
import Button from '../components/Button';
import CopyButton from '../components/CopyButton';
import SectionCard from '../components/SectionCard';

function CreatedPage() {
  const { slug } = useParams();
  const location = useLocation();
  const [publicBot, setPublicBot] = useState(location.state?.bot || null);
  const [editToken] = useState(location.state?.editToken || '');
  const [pageState, setPageState] = useState({
    loading: !location.state?.bot,
    error: '',
  });

  useEffect(() => {
    let cancelled = false;

    async function loadBot() {
      setPageState({ loading: true, error: '' });

      try {
        const response = await api.getPublicBot(slug);
        if (!cancelled) {
          setPublicBot(response);
          setPageState({ loading: false, error: '' });
        }
      } catch (error) {
        if (!cancelled) {
          setPageState({
            loading: false,
            error: error.message || 'Unable to load this chatbot.',
          });
        }
      }
    }

    if (!publicBot) {
      loadBot();
    }

    return () => {
      cancelled = true;
    };
  }, [publicBot, slug]);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const publicLink = `${origin}/bot/${slug}`;
  const privateLink = editToken ? `${origin}/manage/${slug}/${editToken}` : '';

  if (pageState.loading) {
    return (
      <div className="page-stack">
        <section className="section-card skeleton-card">
          <div className="skeleton-line skeleton-line-short" />
          <div className="skeleton-line skeleton-line-medium" />
          <div className="skeleton-line" />
        </section>
      </div>
    );
  }

  if (pageState.error && !publicBot) {
    return (
      <SectionCard title="Chatbot not found" description={pageState.error}>
        <Button to="/">Return home</Button>
      </SectionCard>
    );
  }

  return (
    <div className="page-stack">
      <SectionCard className="success-hero-card">
        <div className="success-hero">
          <div className="success-icon">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="eyebrow">URbot</p>
            <h1>Your chatbot is ready to share.</h1>
            <p className="section-card-description">
              {publicBot?.name ? `${publicBot.name} is live.` : 'Your chatbot is live.'}
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="cards-two-up">
        <SectionCard
          title="Public chatbot link"
          description="Share this link with anyone who should be able to chat with your bot."
        >
          <div className="link-panel">
            <div className="link-panel-icon">
              <Link2 size={18} />
            </div>
            <code>{publicLink}</code>
          </div>
          <div className="card-action-row">
            <CopyButton label="Copy public link" text={publicLink} />
            <Button href={publicLink} icon={<ExternalLink size={16} />} tone="secondary">
              Open chatbot
            </Button>
          </div>
        </SectionCard>

        <SectionCard
          className="warning-card"
          title="Private management link"
          description="Save this private link somewhere safe. Anyone with this link can edit or delete your chatbot."
        >
          <div className="link-panel link-panel-warning">
            <div className="link-panel-icon">
              <LockKeyhole size={18} />
            </div>
            <code>
              {privateLink ||
                'This page was opened without the one-time private management token. If you did not save it, create a new bot.'}
            </code>
          </div>
          <p className="warning-copy">
            The private management link remains visible only on this page immediately after creation.
          </p>
          <div className="card-action-row">
            <CopyButton
              label="Copy private link"
              text={privateLink}
              tone="warning"
            />
            {editToken ? (
              <Button href={privateLink} tone="warning">
                Manage chatbot
              </Button>
            ) : (
              <Button disabled tone="warning">
                Manage chatbot
              </Button>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="action-strip">
        <Button href={publicLink}>Open chatbot</Button>
        <Button to="/" tone="secondary">
          Create another bot
        </Button>
        {editToken ? (
          <Button href={privateLink} tone="secondary">
            Manage chatbot
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default CreatedPage;
