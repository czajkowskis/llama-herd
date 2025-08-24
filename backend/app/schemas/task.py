from pydantic import BaseModel
from typing import List, Optional


class TaskItemModel(BaseModel):
    task: str
    answer: str


class TaskModel(BaseModel):
    id: str
    prompt: str
    datasetItems: Optional[List[TaskItemModel]] = None
    expectedSolutionRegex: Optional[str] = None

