# Local AI Desktop Assistant

A local-first web assistant that runs models through **Ollama**, exposes a modular **FastAPI** backend (tools, memory, settings, saved chats), and ships with a **Next.js** panel-based UI.

## Features

- **Local LLM** via Ollama (no cloud model API required for core chat)
- **Modular FastAPI** backend: thin route modules, services, typed schemas
- **Tool execution** (time, system info, safe URL open, allowlisted app launch) with optional multi-round tool loops
- **Assistant memory** (SQLite) separate from **saved chat sessions** (distinct SQLite DB for conversation history)
- **System dashboard** (CPU, memory, battery, uptime where available)
- **Settings** panel for Ollama URL/model, feature flags, personality preset, and allowlists
- **Voice hooks** (browser Web Speech API when enabled; server STT is a documented stub)

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Python 3.11+, FastAPI, Pydantic / pydantic-settings, httpx, SQLite (stdlib + services) |
| LLM runtime | [Ollama](https://ollama.com) |
| Notable frontend libs | react-markdown, remark-gfm |

## Architecture overview

```text
Browser (Next.js)
    → same-origin /jarvis-api/* (Next rewrite)
    → FastAPI /api/* (Python)
        → Ollama HTTP API (/api/chat, /api/tags)
        → SQLite (memory.db, chat_sessions.db)
        → Local tools registry
```

The UI never talks to Ollama directly. The backend builds the system prompt (personality + optional memory block), assembles `messages`, and calls Ollama. Saved conversations are persisted through `/api/chats` and are unrelated to assistant memory entries.

## Setup

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **Ollama** installed and running locally

### 1. Install and run Ollama

Install Ollama from the official site, then pull a model (example):

```bash
ollama pull llama3
```

Ensure the Ollama daemon is listening (default `http://127.0.0.1:11434`).

### 2. Backend

**Windows (PowerShell):**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**macOS / Linux:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The application module path is `app.main:app` (not `main:app`). If port `8000` fails (e.g. Windows policy or port in use), choose another port and point the frontend at it (see below).

API health check: `GET http://127.0.0.1:8000/api/health`

### 3. Frontend

**Windows (PowerShell):**

```powershell
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

**macOS / Linux:**

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open the URL printed in the terminal (often `http://localhost:3000`). If the backend is not on port 8000, set in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:<PORT>
BACKEND_INTERNAL_URL=http://127.0.0.1:<PORT>
```

Restart `npm run dev` after changing env files.

## Usage

- **Chat:** Use the Chat panel to send messages. The sidebar lists **saved conversations**; start a **New chat** to create a session without deleting history. Titles are generated from the first user message when still a placeholder.
- **Tools:** When enabled in Settings, the model may call registered tools; results appear in the chat flow. Inspect capabilities under the Tools panel.
- **Memory:** The Memory panel manages short factual entries the backend may inject into the system prompt (distinct from saved chat threads).
- **System:** Live-ish metrics for the machine running the backend.
- **Settings:** Configure Ollama base URL and model, toggles for memory/tools/voice, assistant personality preset, and allowlisted application IDs for the app-launch tool.

## Screenshots

| | |
|---|---|
| Chat | ![Chat UI](screenshots/chat.png) |
| System dashboard | ![Dashboard](screenshots/dashboard.png) |
| Tools | ![Tools](screenshots/tools.png) |

Replace the placeholder images in `screenshots/` with your own (see `screenshots/README.md`).

## Project structure

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry, CORS, routers
│   │   ├── config/              # Environment settings + personality presets
│   │   ├── api/routes/          # HTTP handlers (chat, chats, memory, settings, …)
│   │   ├── services/            # Settings, memory, chat sessions, system metrics, health
│   │   ├── tools/               # Tool implementations + registry
│   │   ├── chat_service.py      # Ollama orchestration, memory injection
│   │   ├── ollama_client.py     # Ollama HTTP client only
│   │   └── models/schemas.py    # Request/response models
│   ├── data/                    # Runtime SQLite + settings (gitignored when generated)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/                     # Next.js app router
│   ├── components/              # Panels: chat, layout, memory, settings, system, tools
│   ├── contexts/                # App shell + chat session state
│   ├── lib/                     # API client, parsers, chat codecs
│   └── package.json
├── screenshots/                 # README images (placeholders included)
├── .gitignore
└── README.md
```

## API overview (prefix `/api`)

| Area | Examples |
|------|----------|
| Chat | `POST /chat` |
| Saved sessions | `GET/POST /chats`, `GET/PUT/PATCH/DELETE /chats/{id}` |
| Memory | `GET/POST /memory`, `DELETE /memory/{id}` |
| Settings | `GET/PUT /settings`, `POST /settings/test-ollama` |
| Status | `GET /status`, `GET /health/full` |
| System | `GET /system/metrics` |

Full detail and tool list are documented in code and OpenAPI at `/docs` when the backend is running.

## Future improvements

- Server-side speech-to-text behind `POST /voice/transcribe` (currently a stub response)
- Richer retrieval and ranking for assistant memory
- Stronger tool planning and validation for complex multi-step tasks
- Optional accessibility modules (e.g. sign language / gesture interfaces) as separate, well-scoped components

## Notes

- **Ollama must be running** on the host configured in Settings or `backend/.env`; the UI shows connectivity status.
- **No cloud LLM API keys** are required for the default path; keep any future keys in `.env` files that stay out of version control.
- **Security:** Application launch uses a fixed allowlist; arbitrary shell execution is not exposed.

## License

MIT — see [`LICENSE`](LICENSE) in the repository root.
