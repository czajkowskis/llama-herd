from pydantic import BaseModel
from typing import List

from .agent import AgentModel
from .task import TaskModel


class ExperimentRequest(BaseModel):
    task: TaskModel
    agents: List[AgentModel]
    iterations: int = 1

