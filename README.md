# Claude Agents UI — React + Python

Migrated from Nuxt 3 + Node.js to **Vite + React + TypeScript** (frontend) and **FastAPI** (backend).

## Structure

```
claude-code-agents-ui-react/
├── backend/    # Python FastAPI
└── frontend/   # Vite + React + TypeScript
```

## Setup

### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start dev server (API at http://localhost:8000)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at: http://localhost:8000/docs

### Frontend

```bash
cd frontend

# Install dependencies
npm install   # or: bun install

# Start dev server (UI at http://localhost:5173)
npm run dev
```

The frontend proxies `/api` and `/ws` requests to the backend at `localhost:8000`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_DIR` | `~/.claude` | Override path to Claude config directory |

## Pages

| Route | Page |
|-------|------|
| `/` | Dashboard |
| `/agents` | Agents list |
| `/agents/:slug` | Agent editor |
| `/commands` | Commands list |
| `/commands/:slug` | Command editor |
| `/skills` | Skills list |
| `/skills/:slug` | Skill editor |
| `/workflows` | Workflows list |
| `/workflows/:slug` | Workflow editor |
| `/cli` | Terminal + Chat |
| `/graph` | Relationship graph |
| `/settings` | Settings editor |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List agents |
| GET | `/api/agents/{slug}` | Get agent |
| POST | `/api/agents` | Create agent |
| PUT | `/api/agents/{slug}` | Update agent |
| DELETE | `/api/agents/{slug}` | Delete agent |
| GET | `/api/commands` | List commands |
| GET/POST/PUT/DELETE | `/api/commands/{slug}` | Command CRUD |
| GET | `/api/skills` | List skills |
| GET/POST/PUT/DELETE | `/api/skills/{slug}` | Skill CRUD |
| GET | `/api/workflows` | List workflows |
| GET/POST/PUT/DELETE | `/api/workflows/{slug}` | Workflow CRUD |
| GET/PUT | `/api/settings` | Settings |
| GET | `/api/relationships` | Entity graph |
| GET/POST/DELETE | `/api/mcp` | MCP servers |
| WS | `/ws/chat` | Claude chat WebSocket |
| WS | `/ws/cli` | PTY terminal WebSocket |
# claude_agent_management
