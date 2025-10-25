"""
Helper functions for experiment-related operations.
"""
from typing import Dict, Any, Optional
from ..core.state import state_manager
from ..storage import get_storage
from ..utils.logging import get_logger

logger = get_logger(__name__)


def get_experiment_with_fallback(experiment_id: str) -> Optional[Dict[str, Any]]:
    """
    Get experiment from active state or persistent storage with fallback.
    
    Args:
        experiment_id: The experiment ID to retrieve
        
    Returns:
        Experiment data dictionary or None if not found
    """
    # First check active experiments (for running experiments)
    try:
        experiment = state_manager.get_experiment(experiment_id)
        if experiment:
            return {
                "experiment_id": experiment.experiment_id,
                "title": experiment.task.prompt[:100] + ("..." if len(experiment.task.prompt) > 100 else ""),
                "status": experiment.status,
                "conversation": None,  # Will be set by caller if needed
                "conversations": [c.model_dump() if hasattr(c, 'model_dump') else c for c in experiment.conversations],
                "iterations": experiment.iterations,
                "current_iteration": experiment.current_iteration,
                "agents": [a.model_dump() if hasattr(a, 'model_dump') else a for a in experiment.agents],
                "created_at": experiment.created_at,
                "error": experiment.error
            }
    except Exception as e:
        logger.warning(f"Failed to get active experiment {experiment_id}: {e}")
    
    # If not in active experiments, check persistent storage
    storage = get_storage()
    stored_experiment = storage.get_experiment(experiment_id)
    if stored_experiment:
                    # Get conversations for this experiment
        conversations = storage.get_experiment_conversations(experiment_id)
        
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
    
    return None


def serialize_experiment(experiment) -> Dict[str, Any]:
    """
    Serialize an experiment object to dictionary format.
    
    Args:
        experiment: Experiment object (from state or storage)
        
    Returns:
        Serialized experiment dictionary
    """
    if hasattr(experiment, 'model_dump'):
        return experiment.model_dump()
    elif isinstance(experiment, dict):
        return experiment
    else:
        # Fallback for other object types
        return {
            "experiment_id": getattr(experiment, 'experiment_id', None),
            "title": getattr(experiment, 'title', None),
            "status": getattr(experiment, 'status', None),
            "created_at": getattr(experiment, 'created_at', None),
            "agents": getattr(experiment, 'agents', []),
            "agent_count": len(getattr(experiment, 'agents', [])),
            "message_count": getattr(experiment, 'message_count', 0)
        }


def truncate_title(title: str, max_length: int = 100) -> str:
    """
    Truncate a title to the specified maximum length.
    
    Args:
        title: The title to truncate
        max_length: Maximum length (default 100)
        
    Returns:
        Truncated title with "..." if needed
    """
    if len(title) > max_length:
        return title[:max_length] + "..."
    return title


def get_experiment_list_with_storage() -> list:
    """
    Get combined list of active and stored experiments.
    
    Returns:
        List of experiment dictionaries
    """
    from ..services.experiment_service import ExperimentService
    
    # Get active experiments
    experiments_list = ExperimentService.list_experiments()
    experiments = []
    
    for exp in experiments_list:
        exp_dict = serialize_experiment(exp)
        # Get the full experiment state to include agents
        experiment_state = state_manager.get_experiment(exp.experiment_id)
        if experiment_state:
            exp_dict['agents'] = [agent.model_dump() for agent in experiment_state.agents]
        else:
            exp_dict['agents'] = []
        experiments.append(exp_dict)
    
    # Get stored experiments (excluding active ones)
    storage = get_storage()
    stored_experiments = storage.get_experiments()
    for stored_exp in stored_experiments:
        # Skip if already in active experiments
        if not any(exp['experiment_id'] == stored_exp['id'] for exp in experiments):
            # Load full experiment data to get agents
            full_experiment = storage.get_experiment(stored_exp['id'])
            if full_experiment:
                experiments.append({
                    "experiment_id": stored_exp['id'],
                    "title": stored_exp['title'],
                    "status": stored_exp.get('status', 'unknown'),
                    "created_at": stored_exp.get('created_at'),
                    "agents": full_experiment.get('agents', []),
                    "agent_count": len(full_experiment.get('agents', [])),
                    "message_count": 0  # We don't store message count in persistent storage
                })
            else:
                # Fallback to index data if full experiment can't be loaded
                experiments.append({
                    "experiment_id": stored_exp['id'],
                    "title": stored_exp['title'],
                    "status": stored_exp.get('status', 'unknown'),
                    "created_at": stored_exp.get('created_at'),
                    "agents": [],
                    "agent_count": 0,
                    "message_count": 0
                })
    
    # Sort by created_at (newest first)
    experiments.sort(key=lambda x: x['created_at'], reverse=True)
    return experiments
