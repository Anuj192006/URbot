import {
  ArrowRight,
  BookOpenText,
  BriefcaseBusiness,
  ChevronDown,
  Eye,
  EyeOff,
  ExternalLink,
  HelpCircle,
  KeyRound,
  LoaderCircle,
  MessagesSquare,
  ShieldCheck,
  Waypoints,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../api';
import Button from '../components/Button';
import InputField from '../components/InputField';
import SectionCard from '../components/SectionCard';
import TextareaField from '../components/TextareaField';

const LIMITS = {
  name: 80,
  description: 200,
  welcome_message: 300,
  system_instructions: 2000,
  knowledge_text: 50000,
  groq_api_key: 500,
};

const initialFormState = {
  name: '',
  description: '',
  welcome_message: '',
  system_instructions: '',
  knowledge_text: '',
  strict_grounding: true,
  groq_api_key: '',
};

const useCases = [
  {
    icon: <BookOpenText size={18} />,
    title: 'Study assistant',
    description:
      'Turn your notes into a revision bot for quick explanations and practice questions.',
  },
  {
    icon: <BriefcaseBusiness size={18} />,
    title: 'Portfolio bot',
    description:
      'Share your projects, skills, and experience through an interactive personal bot.',
  },
  {
    icon: <MessagesSquare size={18} />,
    title: 'FAQ assistant',
    description:
      'Give customers a simple chatbot for common product or service questions.',
  },
  {
    icon: <Waypoints size={18} />,
    title: 'Knowledge bot',
    description:
      'Convert documentation, policies, or internal information into an easy-to-query assistant.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Paste your context',
    description: 'Add your knowledge and define how the chatbot should behave.',
  },
  {
    number: '2',
    title: 'Add your Groq API key',
    description: 'Use your own Groq key so your bot can answer questions securely.',
  },
  {
    number: '3',
    title: 'Share your link',
    description: 'Get a public chatbot URL and a private management URL instantly.',
  },
];

function validateForm(form, keyState) {
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

  if (!form.groq_api_key.trim()) {
    errors.groq_api_key = 'Groq API key is required.';
  } else if (form.groq_api_key.trim().length > LIMITS.groq_api_key) {
    errors.groq_api_key = `Groq API key must be ${LIMITS.groq_api_key} characters or fewer.`;
  } else if (keyState.status !== 'valid' || keyState.validatedValue !== form.groq_api_key.trim()) {
    errors.groq_api_key = 'Test this Groq API key before creating your chatbot.';
  }

  return errors;
}

function HomePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [keyState, setKeyState] = useState({
    status: 'idle',
    message: '',
    validatedValue: '',
  });

  const knowledgeCount = form.knowledge_text.length;
  const hasTestedCurrentKey =
    keyState.status === 'valid' && keyState.validatedValue === form.groq_api_key.trim();

  function updateField(event) {
    const { name, type, checked, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));

    setErrors((current) => ({ ...current, [name]: undefined }));
    setApiError('');

    if (name === 'groq_api_key') {
      setKeyState((current) =>
        current.validatedValue === value.trim()
          ? current
          : { status: 'idle', message: '', validatedValue: '' },
      );
    }
  }

  async function handleTestKey() {
    const trimmedKey = form.groq_api_key.trim();

    if (!trimmedKey) {
      setErrors((current) => ({
        ...current,
        groq_api_key: 'Enter your Groq API key before testing it.',
      }));
      return;
    }

    setErrors((current) => ({ ...current, groq_api_key: undefined }));
    setKeyState({ status: 'testing', message: '', validatedValue: '' });

    try {
      const response = await api.validateGroqKey({ groq_api_key: trimmedKey });

      if (!response.valid) {
        setKeyState({
          status: 'invalid',
          message:
            response.detail ||
            'This API key could not be verified. Please check the key and try again.',
          validatedValue: '',
        });
        return;
      }

      setKeyState({
        status: 'valid',
        message: 'Groq API key verified successfully.',
        validatedValue: trimmedKey,
      });
    } catch (error) {
      setKeyState({
        status: 'invalid',
        message: error.message || 'Unable to verify the Groq API key right now.',
        validatedValue: '',
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateForm(form, keyState);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setApiError('');

    try {
      const response = await api.createBot({
        name: form.name.trim(),
        description: form.description.trim(),
        welcome_message: form.welcome_message.trim(),
        system_instructions: form.system_instructions.trim(),
        knowledge_text: form.knowledge_text.trim(),
        strict_grounding: form.strict_grounding,
        groq_api_key: form.groq_api_key.trim(),
      });

      navigate(`/created/${response.slug}`, {
        state: {
          editToken: response.edit_token,
          bot: response.bot,
        },
      });
    } catch (error) {
      setApiError(error.message || 'Unable to create your chatbot right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="landing-page">
      <section className="hero-grid">
        <div className="hero-copy-block">
          <p className="eyebrow">URbot</p>
          <h1 className="hero-title">Build a chatbot that knows your context.</h1>
          <p className="hero-copy">
            Paste your notes, profile, FAQs, or any useful text. URbot turns it into a personalized chatbot with a link you can share.
          </p>
          <div className="hero-actions">
            <Button href="#create-bot" icon={<ArrowRight size={16} />}>
              Create your bot
            </Button>
            <a href="#how-it-works" className="text-link">
              See how it works
            </a>
          </div>
          <div className="hero-meta">
            <span>Your knowledge. Your chatbot. Your link.</span>
            <span>Create a personalized chatbot from your notes, profile, FAQs, or any text you want to share.</span>
          </div>
        </div>

        <div className="preview-shell" aria-hidden="true">
          <div className="preview-window">
            <div className="preview-window-bar">
              <span className="preview-dot" />
              <span className="preview-dot" />
              <span className="preview-dot" />
            </div>
            <div className="preview-header">
              <div>
                <p className="preview-title">Portfolio bot</p>
                <p className="preview-subtitle">Answers from your resume, projects, and bio.</p>
              </div>
              <span className="status-pill status-pill-ready">Ready</span>
            </div>
            <div className="preview-messages">
              <div className="preview-message preview-message-assistant">
                I can answer questions about Priya&apos;s projects, skills, and product design work.
              </div>
              <div className="preview-message preview-message-user">
                What kind of apps has Priya shipped recently?
              </div>
              <div className="preview-message preview-message-assistant">
                She recently shipped a fintech dashboard, a scheduling workflow tool, and a self-serve onboarding flow.
              </div>
            </div>
            <div className="preview-composer">
              <span>Ask a question about this bot...</span>
              <span className="preview-send">Send</span>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-intro">
          <p className="eyebrow">Use cases</p>
          <h2>One flow, many kinds of chatbots.</h2>
        </div>
        <div className="feature-grid">
          {useCases.map((item) => (
            <article key={item.title} className="feature-card">
              <div className="feature-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="content-section">
        <div className="section-intro">
          <p className="eyebrow">How it works</p>
          <h2>Go from pasted text to a public chatbot in minutes.</h2>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <article key={step.number} className="step-card">
              <span className="step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="create-bot" className="creation-layout">
        <div className="creation-form-column">
          <form onSubmit={handleSubmit}>
            <SectionCard
              eyebrow="Create your bot"
              title="Set up your public chatbot."
              description="Paste your content, define how your chatbot should behave, and add the Groq API key that will power responses."
            >
              <div className="form-section-block">
                <div className="form-section-heading">
                  <h3>Basic details</h3>
                  <p>Name the chatbot and set the public copy visitors will see first.</p>
                </div>
                <div className="field-grid">
                  <InputField
                    htmlFor="name"
                    label="Bot name"
                    maxLength={LIMITS.name}
                    name="name"
                    onChange={updateField}
                    placeholder="Finance Revision Assistant"
                    required
                    value={form.name}
                    error={errors.name}
                  />
                  <InputField
                    htmlFor="description"
                    label="Description"
                    maxLength={LIMITS.description}
                    name="description"
                    onChange={updateField}
                    placeholder="Ask questions from my corporate finance notes."
                    value={form.description}
                    error={errors.description}
                  />
                </div>
                <TextareaField
                  htmlFor="welcome_message"
                  label="Welcome message"
                  maxLength={LIMITS.welcome_message}
                  name="welcome_message"
                  onChange={updateField}
                  placeholder="Ask me anything from these notes."
                  rows={3}
                  value={form.welcome_message}
                  error={errors.welcome_message}
                />
              </div>

              <div className="form-section-block">
                <div className="form-section-heading">
                  <h3>Bot personality</h3>
                  <p>Tell the chatbot how to explain things and how tightly it should stay grounded.</p>
                </div>
                <TextareaField
                  htmlFor="system_instructions"
                  label="Instructions for your chatbot"
                  maxLength={LIMITS.system_instructions}
                  name="system_instructions"
                  onChange={updateField}
                  placeholder="Explain concepts in simple language. Use short examples where helpful."
                  rows={5}
                  value={form.system_instructions}
                  error={errors.system_instructions}
                />
                <label className="checkbox-card">
                  <input
                    checked={form.strict_grounding}
                    name="strict_grounding"
                    onChange={updateField}
                    type="checkbox"
                  />
                  <div>
                    <span className="checkbox-title">Answer only from supplied knowledge</span>
                    <p className="checkbox-note">
                      When enabled, the chatbot will say it does not know instead of inventing an answer.
                    </p>
                  </div>
                </label>
              </div>

              <div className="form-section-block">
                <div className="form-section-heading">
                  <h3>Knowledge base</h3>
                  <p>Paste the text your chatbot should use. PDF upload is not included in this version, so paste extracted text directly.</p>
                </div>
                <TextareaField
                  htmlFor="knowledge_text"
                  label="Paste your knowledge"
                  name="knowledge_text"
                  onChange={updateField}
                  placeholder="Paste your notes, personal profile, FAQs, policies, documentation, or other text here."
                  required
                  rows={14}
                  value={form.knowledge_text}
                  error={errors.knowledge_text}
                  footer={
                    <>
                      <span className="form-note">Only pasted text is supported in this MVP.</span>
                      <span className={`character-count${knowledgeCount > LIMITS.knowledge_text ? ' character-count-over' : ''}`}>
                        {knowledgeCount.toLocaleString()} / {LIMITS.knowledge_text.toLocaleString()}
                      </span>
                    </>
                  }
                />
              </div>

              <div className="form-section-block">
                <div className="form-section-heading">
                  <h3>Groq API key</h3>
                  <p>Add the Groq API key that will power this specific chatbot.</p>
                </div>
                <InputField
                  htmlFor="groq_api_key"
                  label="Groq API key"
                  maxLength={LIMITS.groq_api_key}
                  name="groq_api_key"
                  onChange={updateField}
                  placeholder="gsk_..."
                  required
                  type={isKeyVisible ? 'text' : 'password'}
                  value={form.groq_api_key}
                  error={errors.groq_api_key}
                  note="Your key is used only to power your chatbot. It is sent securely to the backend and stored in encrypted form. It is never shown publicly."
                  actions={
                    <>
                      <Button
                        aria-label={isKeyVisible ? 'Hide Groq API key' : 'Show Groq API key'}
                        icon={isKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        iconOnly
                        onClick={() => setIsKeyVisible((current) => !current)}
                        tone="ghost"
                        type="button"
                      >
                        {isKeyVisible ? 'Hide key' : 'Show key'}
                      </Button>
                      <Button
                        disabled={!form.groq_api_key.trim() || keyState.status === 'testing'}
                        icon={
                          keyState.status === 'testing' ? (
                            <LoaderCircle className="spin" size={16} />
                          ) : (
                            <ShieldCheck size={16} />
                          )
                        }
                        onClick={handleTestKey}
                        tone="secondary"
                        type="button"
                      >
                        {keyState.status === 'testing' ? 'Testing...' : 'Test API key'}
                      </Button>
                    </>
                  }
                />

                <div className={`validation-banner validation-banner-${keyState.status === 'invalid' ? 'error' : keyState.status === 'valid' ? 'success' : 'neutral'}`}>
                  <div className="validation-banner-icon">
                    {keyState.status === 'valid' ? (
                      <ShieldCheck size={18} />
                    ) : keyState.status === 'invalid' ? (
                      <HelpCircle size={18} />
                    ) : (
                      <KeyRound size={18} />
                    )}
                  </div>
                  <p>
                    {keyState.status === 'valid'
                      ? keyState.message
                      : keyState.status === 'invalid'
                        ? keyState.message
                        : 'Test your Groq API key before creating the chatbot. The create button stays disabled until the current key is verified.'}
                  </p>
                </div>

                <details className="help-panel">
                  <summary>
                    <span>How to create a free Groq API key</span>
                    <ChevronDown size={16} />
                  </summary>
                  <div className="help-panel-body">
                    <p>
                      A Groq API key allows your chatbot to generate answers. Creating a key takes about a minute and does not require coding.
                    </p>
                    <ol className="help-steps">
                      <li>Open the Groq API Keys page using the button below.</li>
                      <li>Sign in with Google, GitHub, or your email.</li>
                      <li>Click “Create API Key”.</li>
                      <li>Give the key any name, such as “URbot”.</li>
                      <li>Copy the generated key.</li>
                      <li>Return to this page and paste it into the field above.</li>
                    </ol>
                    <p className="help-warning">
                      Keep your key private. Do not share it in messages or post it online.
                    </p>
                    <Button
                      href="https://console.groq.com/keys"
                      icon={<ExternalLink size={16} />}
                      target="_blank"
                      tone="secondary"
                    >
                      Open Groq API Keys page
                    </Button>
                  </div>
                </details>

                <p className="privacy-note">
                  Your Groq API key is encrypted before it is stored. It is never included in your public chatbot link or shown to visitors.
                </p>
              </div>

              {apiError ? <div className="inline-alert inline-alert-error">{apiError}</div> : null}

              <div className="submit-row">
                <Button
                  disabled={isSubmitting || !hasTestedCurrentKey}
                  icon={isSubmitting ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}
                  type="submit"
                >
                  {isSubmitting ? 'Creating your chatbot...' : 'Create my chatbot'}
                </Button>
                <p className="submit-note">
                  The button unlocks after your current Groq API key passes the test.
                </p>
              </div>
            </SectionCard>
          </form>
        </div>

        <aside className="creation-info-column">
          <SectionCard
            eyebrow="What gets created"
            title="A public chatbot and a private control link."
            description="URbot creates a visitor-facing chatbot page and a private management page for the creator."
          >
            <div className="info-list">
              <article className="info-item">
                <div className="info-item-icon">
                  <MessagesSquare size={16} />
                </div>
                <div>
                  <h3>Public chatbot page</h3>
                  <p>Anyone with the public link can ask questions, with no sign-in and no API key required.</p>
                </div>
              </article>
              <article className="info-item">
                <div className="info-item-icon">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3>Private management link</h3>
                  <p>The creator gets a private edit link once. Anyone with it can update or delete the bot.</p>
                </div>
              </article>
              <article className="info-item">
                <div className="info-item-icon">
                  <KeyRound size={16} />
                </div>
                <div>
                  <h3>Creator-owned billing</h3>
                  <p>Each chatbot runs on the creator’s Groq API key, so visitors never need their own credentials.</p>
                </div>
              </article>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Before you share"
            title="A few practical notes."
            description="Keep these constraints in mind when creating a bot."
          >
            <ul className="checklist">
              <li>Paste extracted text directly. File uploads and PDF parsing are not included in this version.</li>
              <li>Knowledge stays server-side and is never exposed by the public bot details endpoint.</li>
              <li>If you replace your Groq key later, the bot starts using the new one immediately.</li>
            </ul>
          </SectionCard>
        </aside>
      </section>
    </div>
  );
}

export default HomePage;
