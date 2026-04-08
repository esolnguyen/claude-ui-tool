# Claude Agent Management

A full-stack web UI for managing Claude Code configuration — agents, commands, skills, workflows, MCP servers, and settings — with a built-in terminal and chat interface.

**Stack:** Vite + React + TypeScript (frontend) · FastAPI + Python (backend)

## Features

- **Agents** — Create and edit Claude Code agent definitions
- **Commands** — Manage slash commands (`/commands`)
- **Skills** — Define and edit reusable skills
- **Workflows** — Build multi-step agent workflows
- **MCP Servers** — Configure Model Context Protocol servers
- **Settings** — Edit Claude Code `settings.json` directly
- **Graph View** — Visualize relationships between entities
- **Terminal** — Embedded PTY terminal (xterm.js)
- **Chat** — Real-time Claude chat via WebSocket

## Project Structure

```
claude_agent_management/
├── backend/        # Python FastAPI (port 8000)
├── frontend/       # Vite + React + TypeScript (port 5173)
└── start.sh        # One-command startup script
```

## Quick Start

```bash
./start.sh
```

This will:
1. Create a Python virtual environment and install backend dependencies (first run)
2. Install frontend npm dependencies (first run)
3. Start both servers concurrently

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

Press `Ctrl+C` to stop both servers.

## Manual Setup

### Backend

Requires Python 3.11+

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 --app-dir ..
```

### Frontend

Requires Node.js

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_DIR` | `~/.claude` | Path to Claude config directory |

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
| `/mcp` | MCP servers |
| `/settings` | Settings editor |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET / POST | `/api/agents` | List / create agents |
| GET / PUT / DELETE | `/api/agents/{slug}` | Get / update / delete agent |
| GET / POST | `/api/commands` | List / create commands |
| GET / PUT / DELETE | `/api/commands/{slug}` | Command CRUD |
| GET / POST | `/api/skills` | List / create skills |
| GET / PUT / DELETE | `/api/skills/{slug}` | Skill CRUD |
| GET / POST | `/api/workflows` | List / create workflows |
| GET / PUT / DELETE | `/api/workflows/{slug}` | Workflow CRUD |
| GET / PUT | `/api/settings` | Read / write settings |
| GET | `/api/relationships` | Entity relationship graph |
| GET / POST / DELETE | `/api/mcp` | MCP server management |
| WS | `/ws/chat` | Claude chat WebSocket |
| WS | `/ws/cli` | PTY terminal WebSocket |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Routing | React Router v6 |
| Data fetching | TanStack Query v5 |
| Terminal | xterm.js |
| Graph | React Flow |
| Icons | Lucide React |
| Backend | FastAPI + Uvicorn |
| Config parsing | python-frontmatter + PyYAML |
| PTY | ptyprocess |
| Git integration | GitPython |
