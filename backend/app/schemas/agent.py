from pydantic import BaseModel
from typing import Optional


class AgentModel(BaseModel):
    id: str
    name: str
    prompt: str
    color: str
    model: str
    temperature: Optional[float] = None

