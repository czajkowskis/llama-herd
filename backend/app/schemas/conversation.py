from pydantic import BaseModel
from typing import List, Optional


class Message(BaseModel):
    id: str
    agentId: str
    content: str
    timestamp: str
    model: Optional[str] = None


class ConversationAgent(BaseModel):
    id: str
    name: str
    color: str
    originalName: Optional[str] = None
    model: str


class Conversation(BaseModel):
    id: str
    title: str
    agents: List[ConversationAgent]
    messages: List[Message]
    createdAt: str
    experiment_id: Optional[str] = None
    iteration: Optional[int] = None
    source: Optional[str] = None  # 'import' or 'experiment'
    importedAt: Optional[str] = None  # When conversation was imported

