import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, KeyRound, Save, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

import { api } from '../api';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { ToastRegion } from '../components/Toast';
import InputField from '../components/InputField';
import TextareaField from '../components/TextareaField';
import SectionCard from '../components/SectionCard';

const LIMITS = {
  name: 80,
  description: 200,
  welcome_message: 300,
  system_instructions: 2000,
  knowledge_text: 50000,
  groq_api_key: 500,
};

function validateForm(form) {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = 'Bot name is required.';
  } else if (form.name.trim().length > LIMITS.name) {
    errors.name = `Bot name must be ${LIMITS.name} characters or fewer.`;
  }

  if (form.description.trim().length > LIMITS.description) {
    errors.description = `Description must be ${LIMITS.description} characters or fewer.`;
  }

  if (form.welcome_message.trim().length > LIMITS.welcome_message) {
    errors.welcome_message = `Welcome message must be ${LIMITS.welcome_message} characters or fewer.`;
  }

  if (form.system_instructions.trim().length > LIMITS.system_instructions) {
    errors.system_instructions = `Instructions must be ${LIMITS.system_instructions} characters or fewer.`;
  }

  if (!form.knowledge_text.trim()) {
    errors.knowledge_text = 'Knowledge text is required.';
  } else if (form.knowledge_text.trim().length > LIMITS.knowledge_text) {
    errors.knowledge_text = `Knowledge text must be ${LIMITS.knowledge_text} characters or fewer.`;
  }

  if (form.groq_api_key.trim().length > LIMITS.groq_api_key) {
    errors.groq_api_key = `Groq API key must be ${LIMITS.groq_api_key} characters or fewer.`;
  }

  return errors;
}

const emptyForm = {
  name: '',
  description: '',
  welcome_message: '',
  system_instructions: '',
  knowledge_text: '',
  strict_grounding: true,
  groq_api_key: '',
};

function ManageBotPage() {
  const { slug, token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [pageState, setPageState] = useState({ loading: true, error: '' });
  const [errors, setErrors] = useState({});
  const [saveState, setSaveState] = useState({ saving: false, success: '', error: '' });
  const [hasGroqApiKey, setHasGroqApiKey] = useState(false);
  const [toasts, setToasts] = useState([]);
  
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteState, setDeleteState] = useState({
    confirming: false,
    deleting: false,
    deleted: false,
    error: '',
  });

  useEffect(() => {
    let isMounted = true;

    async function loadBot() {
      setPageState({ loading: true, error: '' });
      try {
        const data = await api.getManageBot(slug, token);
        if (!isMounted) {
          return;
        }
        setForm({
          name: data.name || '',
          description: data.description || '',
          welcome_message: data.welcome_message || '',
          system_instructions: data.system_instructions || '',
          knowledge_text: data.knowledge_text || '',
          strict_grounding: Boolean(data.strict_grounding),
          groq_api_key: '',
        });
        setHasGroqApiKey(Boolean(data.has_groq_api_key));
        setPageState({ loading: false, error: '' });
      } catch (error) {
        if (isMounted) {
          setPageState({
            loading: false,
            error: error.message || 'Unable to load this management page.',
          });
        }
      }
    }

    loadBot();
    return () => {
      isMounted = false;
    };
  }, [slug, token]);

  const knowledgeCount = useMemo(() => form.knowledge_text.length, [form.knowledge_text]);

  function addToast(title, message, tone = 'info') {
    const id = Date.now().toString();
    setToasts((current) => [...current, { id, title, message, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4000);
  }

  function dismissToast(id) {
    setToasts((current) => current.filter((t) => t.id !== id));
  }

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSaveState((current) => ({ ...current, success: '', error: '' }));
  }

  async function handleSave(event) {
    event.preventDefault();
    const nextErrors = validateForm(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      addToast('Validation Error', 'Please check the form for errors.', 'error');
      return;
    }

    setSaveState({ saving: true, success: '', error: '' });

    try {
      const nextGroqApiKey = form.groq_api_key.trim();
      
      // If a new key is entered, validate it first
      if (nextGroqApiKey) {
        const check = await api.validateGroqKey({ groq_api_key: nextGroqApiKey });
        if (!check.valid) {
          throw new Error(check.detail || 'This API key could not be verified. Please check the key and try again.');
        }
      }

      await api.updateManageBot(slug, token, {
        name: form.name.trim(),
        description: form.description.trim(),
        welcome_message: form.welcome_message.trim(),
        system_instructions: form.system_instructions.trim(),
        knowledge_text: form.knowledge_text.trim(),
        strict_grounding: form.strict_grounding,
        groq_api_key: nextGroqApiKey || undefined,
      });

      setForm((current) => ({ ...current, groq_api_key: '' }));
      if (nextGroqApiKey) {
        setHasGroqApiKey(true);
      }
      setSaveState({
        saving: false,
        success: 'Changes saved successfully.',
        error: '',
      });
      addToast('Success', 'Changes saved successfully.', 'success');
    } catch (error) {
      setSaveState({
        saving: false,
        success: '',
        error: error.message || 'Unable to save changes.',
      });
      addToast('Error', error.message || 'Unable to save changes.', 'error');
    }
  }

  async function confirmDelete() {
    setDeleteState((current) => ({
      ...current,
      deleting: true,
      error: '',
    }));

    try {
      await api.deleteManageBot(slug, token);
      setDeleteState({
        confirming: false,
        deleting: false,
        deleted: true,
        error: '',
      });
      addToast('Deleted', 'Chatbot deleted successfully.', 'success');
    } catch (error) {
      setDeleteState({
        confirming: true,
        deleting: false,
        deleted: false,
        error: error.message || 'Unable to delete chatbot.',
      });
      addToast('Error', error.message || 'Unable to delete chatbot.', 'error');
    }
  }

  if (deleteState.deleted) {
    return (
      <div className="page-stack" style={{ maxWidth: '640px', margin: '4rem auto' }}>
        <SectionCard className="panel empty-state">
          <div className="success-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', margin: '0 auto 1.5rem', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={24} />
          </div>
          <h1>Chatbot deleted</h1>
          <p className="subtle-copy" style={{ marginBottom: '2rem' }}>
            The chatbot and its private management page have been permanently removed.
          </p>
          <Button to="/" tone="primary">
            Return to homepage
          </Button>
        </SectionCard>
      </div>
    );
  }

  if (pageState.loading) {
    return (
      <div className="page-stack" style={{ maxWidth: '640px', margin: '4rem auto' }}>
        <SectionCard className="panel empty-state">
          <p className="eyebrow">Loading</p>
          <h1>Fetching settings...</h1>
          <div className="skeleton-line skeleton-line-short" style={{ margin: '1rem auto' }} />
          <div className="skeleton-line" />
        </SectionCard>
      </div>
    );
  }

  if (pageState.error) {
    return (
      <div className="page-stack" style={{ maxWidth: '640px', margin: '4rem auto' }}>
        <SectionCard className="panel empty-state">
          <div className="success-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', margin: '0 auto 1.5rem', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={24} />
          </div>
          <h1>Management link unavailable</h1>
          <p className="subtle-copy" style={{ marginBottom: '2rem' }}>{pageState.error}</p>
          <Button to="/" tone="primary">
            Return home
          </Button>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="page-stack" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <ToastRegion toasts={toasts} onDismiss={dismissToast} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Button to="/" tone="ghost" size="sm" icon={<ArrowLeft size={14} />}>
          Back to home
        </Button>
      </div>

      <SectionCard className="panel-spacious">
        <p className="eyebrow">Private management page</p>
        <h1 style={{ fontSize: '2rem', letterSpacing: '-0.02em', margin: '0.5rem 0 1rem' }}>Manage chatbot</h1>
        
        <div className="status-banner status-warning" style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', marginBottom: '1rem' }}>
          <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Private link:</strong> Anyone with this URL can edit or delete your chatbot. Keep it safe and do not share it publicly.
          </div>
        </div>

        <div className="status-banner status-info" style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
          <KeyRound size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            {hasGroqApiKey
              ? 'A Groq API key is already stored for this bot. Enter a new one below only if you want to replace it.'
              : 'No Groq API key is currently stored for this bot. Add one below to enable chat replies.'}
          </div>
        </div>
      </SectionCard>

      <SectionCard className="form-panel">
        <form className="bot-form" onSubmit={handleSave}>
          <InputField
            htmlFor="name"
            label="Bot name *"
            name="name"
            value={form.name ?? ''}
            onChange={updateField}
            maxLength={LIMITS.name}
            error={errors.name}
          />

          <InputField
            htmlFor="description"
            label="Description"
            name="description"
            value={form.description ?? ''}
            onChange={updateField}
            maxLength={LIMITS.description}
            error={errors.description}
          />

          <TextareaField
            htmlFor="welcome_message"
            label="Welcome message"
            name="welcome_message"
            value={form.welcome_message ?? ''}
            onChange={updateField}
            rows={3}
            maxLength={LIMITS.welcome_message}
            error={errors.welcome_message}
          />

          <TextareaField
            htmlFor="system_instructions"
            label="Instructions for the assistant"
            name="system_instructions"
            value={form.system_instructions ?? ''}
            onChange={updateField}
            rows={5}
            maxLength={LIMITS.system_instructions}
            error={errors.system_instructions}
          />

          <InputField
            htmlFor="groq_api_key"
            label="Replace Groq API key"
            type="password"
            name="groq_api_key"
            value={form.groq_api_key ?? ''}
            onChange={updateField}
            maxLength={LIMITS.groq_api_key}
            autoComplete="off"
            spellCheck="false"
            placeholder="Leave blank to keep the current key"
            note="The existing key is never shown. Enter a new one only when you want to replace it. It will be validated before saving."
            error={errors.groq_api_key}
          />

          <TextareaField
            htmlFor="knowledge_text"
            label="Knowledge text *"
            name="knowledge_text"
            value={form.knowledge_text ?? ''}
            onChange={updateField}
            rows={14}
            error={errors.knowledge_text}
            footer={
              <>
                <span className="form-note">Characters used</span>
                <span className={`character-count${knowledgeCount > LIMITS.knowledge_text ? ' character-count-over' : ''}`}>
                  {knowledgeCount.toLocaleString()} / {LIMITS.knowledge_text.toLocaleString()}
                </span>
              </>
            }
          />

          <label className="checkbox-card" style={{ display: 'flex', gap: '0.75rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--surface-muted)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="strict_grounding"
              checked={form.strict_grounding}
              onChange={updateField}
              style={{ marginTop: '3px' }}
            />
            <div>
              <span className="checkbox-title" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Answer only from supplied knowledge</span>
              <p className="checkbox-note" style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-soft)' }}>
                When enabled, the chatbot will say it does not know instead of inventing answers.
              </p>
            </div>
          </label>

          {saveState.error ? (
            <div className="status-banner status-error" style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
              <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{saveState.error}</div>
            </div>
          ) : null}

          {saveState.success ? (
            <div className="status-banner status-success" style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
              <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{saveState.success}</div>
            </div>
          ) : null}

          <div className="form-actions form-actions-spread" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
            <Button type="submit" tone="primary" icon={<Save size={16} />} disabled={saveState.saving}>
              {saveState.saving ? 'Saving changes...' : 'Save changes'}
            </Button>
            <Button href={`/bot/${slug}`} tone="secondary">
              Open chatbot page
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard className="panel danger-panel" style={{ border: '1px solid #e5c2bc', background: '#fdfbfa' }}>
        <h2 style={{ color: 'var(--danger)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.5rem' }}>
          <Trash2 size={18} /> Danger Zone
        </h2>
        <p className="subtle-copy" style={{ marginBottom: '1.5rem' }}>
          Deleting this chatbot removes its public page, custom knowledge, and private management configurations permanently.
        </p>

        <Button
          type="button"
          tone="danger"
          icon={<Trash2 size={16} />}
          onClick={() => {
            setDeleteConfirmationText('');
            setDeleteState((current) => ({
              ...current,
              confirming: true,
              error: '',
            }));
          }}
        >
          Delete chatbot
        </Button>
      </SectionCard>

      <Modal
        open={deleteState.confirming}
        onClose={() => {
          setDeleteConfirmationText('');
          setDeleteState((current) => ({ ...current, confirming: false }));
        }}
        title="Delete chatbot permanently"
        description="This action is completely irreversible. All chatbot data will be lost forever."
        actions={
          <>
            <Button
              tone="danger"
              disabled={deleteState.deleting || deleteConfirmationText !== 'DELETE'}
              onClick={confirmDelete}
            >
              {deleteState.deleting ? 'Deleting...' : 'Delete permanently'}
            </Button>
            <Button
              tone="secondary"
              disabled={deleteState.deleting}
              onClick={() => {
                setDeleteConfirmationText('');
                setDeleteState((current) => ({ ...current, confirming: false }));
              }}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div className="form-field" style={{ display: 'grid', gap: '0.5rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: 'var(--text-soft)' }}>
            To confirm this deletion, please type <code style={{ background: '#eee', padding: '2px 4px', borderRadius: '4px', fontStyle: 'normal', fontWeight: 'bold' }}>DELETE</code> in the field below.
          </p>
          <input
            id="delete-confirm-input"
            type="text"
            className="text-input"
            style={{ width: '100%', padding: '0.8rem 0.95rem', border: '1px solid var(--border)', borderRadius: '10px' }}
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            placeholder="DELETE"
            disabled={deleteState.deleting}
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      </Modal>
    </div>
  );
}

export default ManageBotPage;
