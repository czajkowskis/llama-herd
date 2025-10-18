from fastapi import APIRouter, HTTPException
from datetime import datetime

from ...schemas.experiment import ExperimentRequest
from ...schemas.conversation import Conversation
from ...core.exceptions import AppException, ValidationError, NotFoundError
from ...services.experiment_service import ExperimentService
from ...services.autogen_service import autogen_service
from ...storage import get_storage
from ...utils.logging import logger

storage = get_storage()


router = APIRouter(prefix="/api/experiments", tags=["experiments"])


@router.post("/start")
async def start_experiment(request: ExperimentRequest):
    try:
        # Create experiment using service
        experiment_id = ExperimentService.create_experiment(request)
        
        # Persist initial experiment metadata immediately
        # Generate title from task prompt (truncate only if longer than 100 chars)
        title = request.task.prompt
        if len(title) > 100:
            title = title[:100] + "..."
        
        experiment_metadata = {
            'id': experiment_id,
            'title': title,
            'status': 'running',
            'created_at': datetime.now().isoformat(),
            'agents': [agent.dict() for agent in request.agents],
            'task': request.task.dict(),
            'iterations': request.iterations
        }
        
        storage.save_experiment(experiment_metadata)
        logger.info(f"Persisted initial metadata for experiment {experiment_id}")
        
        # Start experiment in background
        autogen_service.start_experiment_background(
            experiment_id,
            request.task,
            request.agents,
        )
        
        return {
            "experiment_id": experiment_id,
            "status": "started",
            "websocket_url": f"/ws/experiments/{experiment_id}"
        }
        
    except AppException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{experiment_id}")
async def get_experiment(experiment_id: str):
    try:
        # First check active experiments (for running experiments)
        experiment = ExperimentService.get_experiment(experiment_id)
        
        # Generate title from task prompt (truncate only if longer than 100 chars)
        title = experiment['task'].prompt
        if len(title) > 100:
            title = title[:100] + "..."
        
        conversation = Conversation(
            id=experiment_id,
            title=title,
            agents=experiment['conversation_agents'],
            messages=experiment['messages'],
            createdAt=experiment['created_at']
        )

        return {
            "experiment_id": experiment_id,
            "status": experiment['status'],
            "conversation": conversation.dict(),
            "conversations": [c.dict() if hasattr(c, 'dict') else c for c in experiment.get('conversations', [])],
            "iterations": experiment.get('iterations', 1),
            "current_iteration": experiment.get('current_iteration', 0),
            "error": experiment.get('error')
        }
        
    except ValidationError:
        # If not in active experiments, check persistent storage
        stored_experiment = storage.get_experiment(experiment_id)
        if not stored_experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        # Get conversations for this experiment
        conversations = storage.get_experiment_conversations(experiment_id)
        
        return {
            "experiment_id": experiment_id,
            "status": stored_experiment.get('status', 'unknown'),
            "conversation": None,  # No live conversation for stored experiments
            "conversations": conversations,
            "iterations": stored_experiment.get('iterations', 1),
            "current_iteration": stored_experiment.get('current_iteration', 0),
            "error": None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("")
async def list_experiments():
    try:
        experiments = ExperimentService.list_experiments()
        
        # Get stored experiments (excluding active ones)
        stored_experiments = storage.get_experiments()
        for stored_exp in stored_experiments:
            # Skip if already in active experiments
            if not any(exp['experiment_id'] == stored_exp['id'] for exp in experiments):
                experiments.append({
                    "experiment_id": stored_exp['id'],
                    "title": stored_exp['title'],
                    "status": stored_exp.get('status', 'unknown'),
                    "created_at": stored_exp['created_at'],
                    "agent_count": len(stored_exp.get('agents', [])),
                    "message_count": 0  # We don't store message count in persistent storage
                })
        
        # Sort by created_at (newest first)
        experiments.sort(key=lambda x: x['created_at'], reverse=True)
        
        return {"experiments": experiments}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/{experiment_id}")
async def delete_experiment(experiment_id: str):
    try:
        # Remove from active experiments if running
        ExperimentService.delete_experiment(experiment_id)
        
        # Remove from persistent storage
        storage.delete_experiment(experiment_id)
        
        # Also delete associated conversations
        conversations = storage.get_experiment_conversations(experiment_id)
        for conversation in conversations:
            storage.delete_conversation(conversation['id'])

        return {"message": "Experiment deleted"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.put("/{experiment_id}/status")
async def update_experiment_status(experiment_id: str, status: str):
    """Update experiment status in both memory and persistent storage."""
    try:
        # Update in memory if active
        success = ExperimentService.update_experiment_status(experiment_id, status)
        
        # Update in persistent storage
        updates = {'status': status}
        if status == 'completed':
            updates['completed_at'] = datetime.now().isoformat()
        
        storage_success = storage.update_experiment(experiment_id, updates)
        if not storage_success:
            raise HTTPException(status_code=404, detail="Experiment not found in persistent storage")
        
        return {"message": "Status updated", "status": status}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

