import { ArrowUp, RefreshCcw, SendHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api } from '../api';
import Button from '../components/Button';

const MAX_MESSAGE_CHARS = 2000;

function buildMessage(role, content) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function BotChatPage() {
  const { slug } = useParams();
  const [bot, setBot] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pageState, setPageState] = useState({ loading: true, error: '' });
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [retryPayload, setRetryPayload] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBot() {
      setPageState({ loading: true, error: '' });

      try {
        const response = await api.getPublicBot(slug);
        if (cancelled) {
          return;
        }

        setBot(response);
        setMessages(
          response.welcome_message ? [buildMessage('assistant', response.welcome_message)] : [],
        );
        setPageState({ loading: false, error: '' });
      } catch (error) {
        if (!cancelled) {
          setPageState({
            loading: false,
            error: error.message || 'Unable to load this chatbot.',
          });
        }
      }
    }

    loadBot();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  async function sendMessage(options = {}) {
    const content = options.message ?? draft.trim();
    if (!content || !bot || isSending) {
      return;
    }

    const historyPayload =
      options.history ||
      messages
        .map(({ content: messageContent, role }) => ({
          role,
          content: messageContent,
        }))
        .slice(-10);

    if (!options.retry) {
      setMessages((current) => [...current, buildMessage('user', content)]);
      setDraft('');
    }

    setChatError('');
    setIsSending(true);

    try {
      const response = await api.chatWithBot(slug, {
        message: content,
        history: historyPayload,
      });

      setMessages((current) => [...current, buildMessage('assistant', response.reply)]);
      setRetryPayload(null);
    } catch (error) {
      setChatError(error.message || 'Unable to get a reply right now.');
      setRetryPayload({ message: content, history: historyPayload });
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (draft.trim()) {
      sendMessage();
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!isSending && draft.trim()) {
        sendMessage();
      }
    }
  }

  const starterPrompts = bot
    ? [
        `What can you help me with?`,
        `Give me a quick overview of ${bot.name}.`,
        'What are the main topics covered here?',
      ]
    : [];

  if (pageState.loading) {
    return (
      <div className="chat-page">
        <div className="chat-column chat-column-loading">
          <div className="section-card skeleton-card">
            <div className="skeleton-line skeleton-line-short" />
            <div className="skeleton-line skeleton-line-medium" />
            <div className="skeleton-line" />
          </div>
        </div>
      </div>
    );
  }

  if (pageState.error || !bot) {
    return (
      <div className="chat-page">
        <div className="chat-column">
          <div className="section-card empty-state-card">
            <p className="eyebrow">Unavailable</p>
            <h1>Chatbot not found</h1>
            <p>{pageState.error || 'This chatbot link is no longer available.'}</p>
            <Button to="/">Return home</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-column">
        <header className="chat-topbar">
          <div>
            <div className="chat-title-row">
              <h1>{bot.name}</h1>
              <span className="status-pill status-pill-ready">Ready</span>
            </div>
            {bot.description ? <p className="chat-description">{bot.description}</p> : null}
          </div>
          <Link className="chat-credit-link" to="/">
            Created with URbot
          </Link>
        </header>

        <section className="chat-surface">
          <div className="message-list" aria-live="polite">
            {!messages.length ? (
              <div className="chat-empty-state">
                <h2>Start the conversation.</h2>
                <p>{bot.welcome_message || 'This bot is ready for your first question.'}</p>
              </div>
            ) : null}

            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <article
                  key={message.id}
                  className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}
                >
                  <div className="chat-avatar">{isUser ? 'Y' : bot.name.slice(0, 1).toUpperCase()}</div>
                  <div className="chat-bubble">
                    <div className="chat-bubble-meta">
                      <span>{isUser ? 'You' : bot.name}</span>
                      <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
                    </div>
                    <p>{message.content}</p>
                  </div>
                </article>
              );
            })}

            {messages.length <= 1 ? (
              <div className="starter-chip-row">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    className="starter-chip"
                    onClick={() => setDraft(prompt)}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}

            {isSending ? (
              <article className="chat-message chat-message-assistant">
                <div className="chat-avatar">{bot.name.slice(0, 1).toUpperCase()}</div>
                <div className="chat-bubble chat-bubble-pending">
                  <div className="typing-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <p>Thinking...</p>
                </div>
              </article>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <div className="chat-composer-wrap">
            <form className="chat-composer" onSubmit={handleSubmit}>
              {chatError ? (
                <div className="inline-alert inline-alert-error composer-alert">
                  <span>{chatError}</span>
                  {retryPayload ? (
                    <Button
                      icon={<RefreshCcw size={16} />}
                      onClick={() => sendMessage({ ...retryPayload, retry: true })}
                      tone="ghost"
                      type="button"
                    >
                      Retry
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <label className="sr-only" htmlFor="chat-message">
                Message
              </label>
              <textarea
                className="chat-textarea"
                disabled={isSending}
                id="chat-message"
                maxLength={MAX_MESSAGE_CHARS}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                rows={3}
                value={draft}
              />

              <div className="chat-composer-footer">
                <div className="chat-composer-meta">
                  <span>Press Enter to send. Use Shift+Enter for a new line.</span>
                  <span className={draft.length > MAX_MESSAGE_CHARS ? 'character-count-over' : ''}>
                    {draft.length} / {MAX_MESSAGE_CHARS}
                  </span>
                </div>
                <Button
                  disabled={!draft.trim() || isSending}
                  icon={isSending ? <ArrowUp className="spin" size={16} /> : <SendHorizontal size={16} />}
                  type="submit"
                >
                  Send
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default BotChatPage;
