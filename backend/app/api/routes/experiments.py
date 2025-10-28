from fastapi import APIRouter
from datetime import datetime

from ...schemas.experiment import ExperimentRequest
from ...core.exceptions import ValidationError, NotFoundError, ExperimentError
from ...services.experiment_service import ExperimentService
from ...services.conversation_service import ConversationService
from ...services.autogen_service import autogen_service
from ...storage import get_storage
from ...utils.logging import get_logger, log_with_context, set_experiment_context
from ...utils.case_converter import normalize_dict_to_snake
from ...utils.experiment_helpers import get_experiment_with_fallback, truncate_title, get_experiment_list_with_storage
from ...schemas.task import TaskModel
from ...schemas.agent import AgentModel
from ...schemas.chat_rules import ChatRulesModel
from ...schemas.conversation import Conversation

storage = get_storage()
logger = get_logger(__name__)


router = APIRouter(prefix="/api/experiments", tags=["experiments"])


@router.post("/start", summary="Start a new experiment", description="Create and start a new multi-agent experiment with the specified task and agents.")
async def start_experiment(request: ExperimentRequest):
    """
    Start a new multi-agent experiment.
    
    This endpoint creates a new experiment with the provided configuration and starts it in the background.
    The experiment will run until completion, error, or timeout.
    
    Returns the experiment ID and WebSocket URL for real-time updates.
    """
    try:
        # Create experiment using service
        experiment_id = ExperimentService.create_experiment(request)
        
        # Set experiment context for logging
        set_experiment_context(experiment_id)
        
        # Persist initial experiment metadata immediately
        # Generate title from task prompt (truncate only if longer than 100 chars)
        title = truncate_title(request.task.prompt)
        
        experiment_metadata = {
            'id': experiment_id,
            'title': title,
            'status': 'running',
            'created_at': datetime.now().isoformat(),
            'agents': [agent.model_dump() for agent in request.agents],
            'task': request.task.model_dump(),
            'iterations': request.iterations
        }
        
        storage.save_experiment(experiment_metadata)
        log_with_context(
            logger, 
            'info',
            "Started experiment",
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
        
    except (ValidationError, ExperimentError):
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
        
        # Get experiment with fallback to storage
        experiment_data = get_experiment_with_fallback(experiment_id)
        if not experiment_data:
            raise NotFoundError(
                "Experiment not found",
                resource_type="experiment",
                resource_id=experiment_id
            )
        
        # For active experiments, get live conversation from service
        if experiment_data.get("status") in ["running", "pending"]:
            live_conversation = ConversationService.get_live_conversation(experiment_id)
            experiment_data["conversation"] = live_conversation
        
        log_with_context(
            logger,
            'info',
            "Retrieved experiment",
            experiment_id=experiment_id,
            conversation_count=len(experiment_data.get("conversations", []))
        )
        
        return experiment_data
        
    except (NotFoundError, ValidationError, ExperimentError):
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
            "Failed to retrieve experiment",
            experiment_id=experiment_id
        )


@router.get("")
async def list_experiments():
    """List all experiments."""
    try:
        experiments = get_experiment_list_with_storage()
        
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
        
        # Check if experiment exists first
        experiment_data = get_experiment_with_fallback(experiment_id)
        if not experiment_data:
            raise NotFoundError(
                "Experiment not found",
                resource_type="experiment",
                resource_id=experiment_id
            )
        
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
            "Deleted experiment and associated data",
            experiment_id=experiment_id,
            deleted_conversations=len(conversations)
        )
        
        return {"message": "Experiment deleted"}
        
    except NotFoundError:
        raise
    except Exception as e:
        log_with_context(
            logger,
            'error',
            f"Error deleting experiment: {str(e)}",
            experiment_id=experiment_id,
            exception_type=type(e).__name__
        )
        raise ExperimentError(
            "Failed to delete experiment",
            experiment_id=experiment_id
        )


@router.put("/{experiment_id}/status")
async def update_experiment_status(experiment_id: str, status: str):
    """Update experiment status in both memory and persistent storage."""
    try:
        set_experiment_context(experiment_id)
        
        # Update in memory if active
        ExperimentService.update_experiment_status(experiment_id, status)
        
        # Update in persistent storage
        updates = {'status': status}
        if status == 'completed':
            updates['completed_at'] = datetime.now().isoformat()
        
        storage_success = storage.update_experiment(experiment_id, updates)
        if not storage_success:
            raise NotFoundError(
                "Experiment not found in persistent storage",
                resource_type="experiment",
                resource_id=experiment_id
            )
        
        log_with_context(
            logger,
            'info',
            "Updated experiment status",
            experiment_id=experiment_id,
            new_status=status
        )
        
        return {"message": "Status updated", "status": status}
        
    except NotFoundError:
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
            "Failed to update experiment status",
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
                "Experiment not found in persistent storage",
                resource_type="experiment",
                resource_id=experiment_id
            )
        
        log_with_context(
            logger,
            'info',
            "Updated experiment metadata",
            experiment_id=experiment_id,
            updated_fields=list(updates.keys())
        )
        
        return {"message": "Experiment updated", "id": experiment_id}
        
    except NotFoundError:
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
            "Failed to update experiment",
            experiment_id=experiment_id
        )

@router.get("/default-chat-rules", response_model=ChatRulesModel)
async def get_default_chat_rules():
    """Get the default chat rules for an experiment."""
    return ChatRulesModel()
