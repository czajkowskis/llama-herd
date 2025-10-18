from fastapi import APIRouter, HTTPException
from datetime import datetime

from ...schemas.experiment import ExperimentRequest
from ...core.exceptions import ValidationError, NotFoundError, ExperimentError
from ...services.experiment_service import ExperimentService
from ...services.conversation_service import ConversationService
from ...services.autogen_service import autogen_service
from ...storage import get_storage
from ...utils.logging import get_logger, log_with_context, set_experiment_context
from ...utils.case_converter import normalize_dict_to_snake

storage = get_storage()
logger = get_logger(__name__)


router = APIRouter(prefix="/api/experiments", tags=["experiments"])


@router.post("/start")
async def start_experiment(request: ExperimentRequest):
    """Start a new experiment."""
    try:
        # Create experiment using service
        experiment_id = ExperimentService.create_experiment(request)
        
        # Set experiment context for logging
        set_experiment_context(experiment_id)
        
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
        log_with_context(
            logger, 
            'info',
            f"Started experiment",
            experiment_id=experiment_id,
            agent_count=len(request.agents),
            iterations=request.iterations
        )
        
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
        
    except (ValidationError, ExperimentError) as e:
        # These will be handled by exception handlers
        raise
    except Exception as e:
        log_with_context(
            logger,
            'error',
            f"Unexpected error starting experiment: {str(e)}",
            exception_type=type(e).__name__
        )
        raise ExperimentError(f"Failed to start experiment: {str(e)}")


@router.get("/{experiment_id}")
async def get_experiment(experiment_id: str):
    """Get experiment details by ID."""
    try:
        # Set experiment context for logging
        set_experiment_context(experiment_id)
        
        # First check active experiments (for running experiments)
        try:
            experiment = ExperimentService.get_experiment(experiment_id)
        except (ValidationError, NotFoundError):
            # If not in active experiments, check persistent storage
            stored_experiment = storage.get_experiment(experiment_id)
            if not stored_experiment:
                raise NotFoundError(
                    f"Experiment not found",
                    resource_type="experiment",
                    resource_id=experiment_id
                )
            
            # Get conversations for this experiment
            conversations = storage.get_experiment_conversations(experiment_id)
            
            log_with_context(
                logger,
                'info',
                f"Retrieved experiment from storage",
                experiment_id=experiment_id,
                conversation_count=len(conversations)
            )
            
            return {
                "experiment_id": experiment_id,
                "status": stored_experiment.get('status', 'unknown'),
                "conversation": None,  # No live conversation for stored experiments
                "conversations": conversations,
                "iterations": stored_experiment.get('iterations', 1),
                "current_iteration": stored_experiment.get('current_iteration', 0),
                "agents": stored_experiment.get('agents', []),
                "created_at": stored_experiment.get('created_at'),
                "error": None
            }
        
        # For active experiments, get live conversation from service
        live_conversation = ConversationService.get_live_conversation(experiment_id)
        
        return {
            "experiment_id": experiment_id,
            "title": experiment.task.prompt[:100] + ("..." if len(experiment.task.prompt) > 100 else ""),
            "status": experiment.status,
            "conversation": live_conversation,
            "conversations": [c.model_dump() if hasattr(c, 'model_dump') else c for c in experiment.conversations],
            "iterations": experiment.iterations,
            "current_iteration": experiment.current_iteration,
            "agents": [a.model_dump() if hasattr(a, 'model_dump') else a for a in experiment.agents],
            "created_at": experiment.created_at,
            "error": experiment.error
        }
        
    except (NotFoundError, ValidationError, ExperimentError) as e:
        # These will be handled by exception handlers
        raise
    except Exception as e:
        log_with_context(
            logger,
            'error',
            f"Unexpected error getting experiment: {str(e)}",
            experiment_id=experiment_id,
            exception_type=type(e).__name__
        )
        raise ExperimentError(
            f"Failed to retrieve experiment",
            experiment_id=experiment_id
        )


@router.get("")
async def list_experiments():
    """List all experiments."""
    try:
        experiments_list = ExperimentService.list_experiments()
        
        # Convert Pydantic objects to dictionaries
        experiments = [exp.model_dump() for exp in experiments_list]
        
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
        
        logger.info(f"Listed {len(experiments)} experiments")
        return {"experiments": experiments}
        
    except Exception as e:
        log_with_context(
            logger,
            'error',
            f"Unexpected error listing experiments: {str(e)}",
            exception_type=type(e).__name__
        )
        raise ExperimentError(f"Failed to list experiments: {str(e)}")


@router.delete("/{experiment_id}")
async def delete_experiment(experiment_id: str):
    """Delete an experiment and its associated data."""
    try:
        set_experiment_context(experiment_id)
        
        # Remove from active experiments if running
        ExperimentService.delete_experiment(experiment_id)
        
        # Get associated conversations before deleting experiment
        conversations = storage.get_experiment_conversations(experiment_id)
        
        # Delete experiment from persistent storage
        storage.delete_experiment(experiment_id)
        
        # Delete associated conversations from storage
        for conversation in conversations:
            storage.delete_conversation(conversation['id'])

        log_with_context(
            logger,
            'info',
            f"Deleted experiment and associated data",
            experiment_id=experiment_id,
            deleted_conversations=len(conversations)
        )
        
        return {"message": "Experiment deleted"}
        
    except Exception as e:
        log_with_context(
            logger,
            'error',
            f"Error deleting experiment: {str(e)}",
            experiment_id=experiment_id,
            exception_type=type(e).__name__
        )
        raise ExperimentError(
            f"Failed to delete experiment",
            experiment_id=experiment_id
        )


@router.put("/{experiment_id}/status")
async def update_experiment_status(experiment_id: str, status: str):
    """Update experiment status in both memory and persistent storage."""
    try:
        set_experiment_context(experiment_id)
        
        # Update in memory if active
        success = ExperimentService.update_experiment_status(experiment_id, status)
        
        # Update in persistent storage
        updates = {'status': status}
        if status == 'completed':
            updates['completed_at'] = datetime.now().isoformat()
        
        storage_success = storage.update_experiment(experiment_id, updates)
        if not storage_success:
            raise NotFoundError(
                f"Experiment not found in persistent storage",
                resource_type="experiment",
                resource_id=experiment_id
            )
        
        log_with_context(
            logger,
            'info',
            f"Updated experiment status",
            experiment_id=experiment_id,
            new_status=status
        )
        
        return {"message": "Status updated", "status": status}
        
    except NotFoundError as e:
        raise
    except Exception as e:
        log_with_context(
            logger,
            'error',
            f"Error updating experiment status: {str(e)}",
            experiment_id=experiment_id,
            exception_type=type(e).__name__
        )
        raise ExperimentError(
            f"Failed to update experiment status",
            experiment_id=experiment_id
        )


@router.put("/{experiment_id}")
async def update_experiment(experiment_id: str, experiment: dict):
    """Update experiment metadata (title, status, etc.) in persistent storage."""
    try:
        set_experiment_context(experiment_id)
        
        # Normalize camelCase keys to snake_case
        normalized_experiment = normalize_dict_to_snake(experiment, deep=True)
        
        # Extract only updatable fields to prevent overwriting system fields
        updatable_fields = ['title', 'status', 'completed_at']
        updates = {k: v for k, v in normalized_experiment.items() if k in updatable_fields}
        
        # Update in persistent storage
        storage_success = storage.update_experiment(experiment_id, updates)
        if not storage_success:
            raise NotFoundError(
                f"Experiment not found in persistent storage",
                resource_type="experiment",
                resource_id=experiment_id
            )
        
        log_with_context(
            logger,
            'info',
            f"Updated experiment metadata",
            experiment_id=experiment_id,
            updated_fields=list(updates.keys())
        )
        
        return {"message": "Experiment updated", "id": experiment_id}
        
    except NotFoundError as e:
        raise
    except Exception as e:
        log_with_context(
            logger,
            'error',
            f"Error updating experiment: {str(e)}",
            experiment_id=experiment_id,
            exception_type=type(e).__name__
        )
        raise ExperimentError(
            f"Failed to update experiment",
            experiment_id=experiment_id
        )
