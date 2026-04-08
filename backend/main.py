from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import agents, commands, skills, workflows, settings, relationships, mcp, chat, cli, github

app = FastAPI(title="Claude Agents API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router)
app.include_router(commands.router)
app.include_router(skills.router)
app.include_router(workflows.router)
app.include_router(settings.router)
app.include_router(relationships.router)
app.include_router(mcp.router)
app.include_router(chat.router)
app.include_router(cli.router)
app.include_router(github.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
