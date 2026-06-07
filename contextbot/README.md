# URbot

Turn your knowledge into a shareable chatbot instantly.

URbot is a public no-code chatbot creator. A creator pastes their knowledge base (notes, profile, FAQs, documentation), defines the assistant's behavior, enters their own Groq API key (stored encrypted server-side), and instantly gets a public chatbot link and a private management link. Public visitors can chat with the bot without needing any account or API key of their own.

---

## Product Architecture & Security

- **Server-Side Decryption:** The creator's Groq API key is encrypted before it is written to the server's disk using AES-256 (via `cryptography.fernet`). It is never exposed in the browser or public API responses.
- **Billing Integrity:** Each chatbot runs on the creator's API key. Visitors do not need to sign in or pay.
- **Server Storage:** The backend saves bot configurations on disk as JSON files. In production, this requires a persistent disk volume to ensure bot data survives service restarts and redeployments.

---

## Tech Stack

- **Frontend:** React + Vite, React Router, Lucide Icons, Plain premium CSS
- **Backend:** FastAPI, Uvicorn, Pydantic, HTTPX, Cryptography (Fernet)
- **Database / Storage:** Local JSON file store with auto-creating directories
- **LLM Engine:** Groq API (Default model: `llama-3.1-8b-instant`)

---

## Repository Structure

```text
contextbot/
  render.yaml          # Render Blueprint deployment config
  package.json         # Workspace/Scripts configuration
  scripts/
    dev.js             # Root one-command startup script
  frontend/
    src/               # React application code
    index.html         # Frontend HTML entry
    vercel.json        # SPA rewrites config for Vercel
    package.json       # Frontend dependencies
  backend/
    app/               # FastAPI application code
    data/              # Local data storage directory
    Dockerfile         # Containerized production runtime
    requirements.txt   # Python dependencies
```

---

## Local Setup

### Prerequisite: Generate an Encryption Key
The backend requires a 32-byte url-safe base64-encoded key (`Fernet` key) to encrypt Groq API keys. Generate one using python:
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 1. Backend Setup
1. Enter the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
5. Open `.env` and fill in `APP_ENCRYPTION_KEY` with your generated Fernet key.

### 2. Frontend Setup
1. Enter the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

### 3. Running Locally
From the project root directory, run:
```bash
npm run dev
```
This launches both the FastAPI backend (`http://localhost:8000`) and the Vite React frontend (`http://localhost:5173`) concurrently.

---

## Environment Variables

### Backend Configuration (`backend/.env`)
- `APP_ENCRYPTION_KEY`: (Required) The 32-byte Fernet key used to encrypt Groq API keys.
- `DATA_DIR`: (Optional) Path to store bot JSON configs (defaults to `./data`). Set to `/var/data` in production.
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS.

### Frontend Configuration (`frontend/.env`)
- `VITE_API_BASE_URL`: URL of the backend API (e.g. `http://localhost:8000` in dev).

---

## Production Deployment

### 1. Backend Deployment (Render)
URbot contains a `render.yaml` blueprint configuration in the root. You can deploy it instantly:
1. Push your code to your GitHub repository.
2. In the Render Dashboard, click **New** -> **Blueprint**.
3. Select your URbot repository.
4. Render will automatically parse `render.yaml` and configure:
   - A Docker-based Web Service (`urbot-backend`).
   - A persistent disk volume (`urbot-data` size: 1GB) mounted at `/var/data`.
   - Set the `DATA_DIR` env variable to `/var/data`.
   - Generate a secure `APP_ENCRYPTION_KEY` automatically.

### 2. Frontend Deployment (Vercel)
Vercel is the recommended host for the React frontend:
1. Connect Vercel to your GitHub repository.
2. Add a new project and select the `contextbot/frontend` folder as the project root.
3. Configure the build command: `npm run build` and the output directory: `dist`.
4. Add the Environment Variable:
   - `VITE_API_BASE_URL`: Set this to your live Render backend URL (e.g., `https://urbot-backend.onrender.com`).
5. Click **Deploy**. Vercel will build the frontend and serve it under your public URL. The included `vercel.json` ensures that all routing redirects to `index.html` for smooth client-side React Router navigation.

---

## Groq API Key Instructions
To create a free Groq API key:
1. Sign in or register at the [Groq Console](https://console.groq.com/).
2. Navigate to **API Keys** in the sidebar.
3. Click **Create API Key**.
4. Name it (e.g., `URbot`) and copy the generated `gsk_...` key.
5. Paste it into the creation input field on URbot.
