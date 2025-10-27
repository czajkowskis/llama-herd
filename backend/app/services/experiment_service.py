"""
Service for managing experiments.
"""
import uuid
from typing import List
from ..schemas.experiment import ExperimentRequest, ExperimentResponse, ExperimentListItem
from ..core.exceptions import ExperimentError, ValidationError, NotFoundError
from ..core.state import state_manager
from ..services.agent_service import AgentService
from ..utils.logging import get_logger, log_with_context, set_experiment_context

logger = get_logger(__name__)


class ExperimentService:
    """Service for managing experiments."""
    
    @staticmethod
    def create_experiment(request: ExperimentRequest) -> str:
        """Create a new experiment."""
        try:
            # Validate request
            ExperimentService._validate_experiment_request(request)
            
            # Generate experiment ID
            experiment_id = str(uuid.uuid4())
            
            # Set context for logging
            set_experiment_context(experiment_id)
            
            # Create experiment state
            experiment_state = state_manager.create_experiment(
                experiment_id=experiment_id,
                task=request.task,
                agents=request.agents
            )
            
            # Set iterations
            iterations = ExperimentService._calculate_iterations(request)
            experiment_state.iterations = iterations
            
            log_with_context(
                logger,
                'info',
                "Created experiment",
                experiment_id=experiment_id,
                agent_count=len(request.agents),
                iterations=iterations
            )
            
            return experiment_id
            
        except ValidationError:
            raise
        except Exception as e:
            log_with_context(
                logger,
                'error',
                f"Failed to create experiment: {str(e)}",
                exception_type=type(e).__name__
            )
            raise ExperimentError(f"Failed to create experiment: {str(e)}")
    
    @staticmethod
    def get_experiment(experiment_id: str) -> ExperimentResponse:
        """Get experiment by ID."""
        experiment = state_manager.get_experiment(experiment_id)
        if not experiment:
            raise NotFoundError(
                "Experiment not found",
                resource_type="experiment",
                resource_id=experiment_id
            )
        
        return ExperimentResponse(
            experiment_id=experiment.experiment_id,
            task=experiment.task,
            agents=experiment.agents,
            conversations=experiment.conversations,
            iterations=experiment.iterations,
            current_iteration=experiment.current_iteration,
            status=experiment.status,
            created_at=experiment.created_at,
            completed_at=experiment.completed_at,
            error=experiment.error
        )

    
    @staticmethod
    def list_experiments() -> List[ExperimentListItem]:
        """List all experiments."""
        experiments = []
        
        for experiment_id, experiment in state_manager.get_all_experiments().items():
            # Generate title from task prompt (truncate only if longer than 100 chars)
            title = experiment.task.prompt
            if len(title) > 100:
                title = title[:100] + "..."
            
            experiments.append(ExperimentListItem(
                experiment_id=experiment_id,
                title=title,
                status=experiment.status,
                created_at=experiment.created_at,
                agent_count=len(experiment.agents),
                message_count=len(experiment.messages),
                iterations=experiment.iterations,
                current_iteration=experiment.current_iteration
            ))
        
        # Sort by created_at (newest first)
        experiments.sort(key=lambda x: x.created_at, reverse=True)
        return experiments
    
    @staticmethod
    def delete_experiment(experiment_id: str) -> bool:
        """Delete an experiment."""
        return state_manager.remove_experiment(experiment_id)
    
    @staticmethod
    def update_experiment_status(experiment_id: str, status: str, **kwargs) -> bool:
        """Update experiment status."""
        return state_manager.update_experiment_status(experiment_id, status, **kwargs)
    
    @staticmethod
    def _validate_experiment_request(request: ExperimentRequest) -> bool:
        """Validate experiment request."""
        if not request.task:
            raise ValidationError("Task is required")
        
        if not request.agents or len(request.agents) == 0:
            raise ValidationError("At least one agent is required")
        
        # Validate agents
        AgentService.validate_agents_for_experiment(request.agents)
        
        return True
    
    @staticmethod
    def _calculate_iterations(request: ExperimentRequest) -> int:
        """Calculate total iterations for the experiment."""
        # Check if dataset items are provided
        try:
            dataset_items = getattr(request.task, 'datasetItems', None)
            if dataset_items and isinstance(dataset_items, list) and len(dataset_items) > 0:
                return len(dataset_items)
        except Exception:
            pass
        
        # Fall back to manual iterations
        return max(1, getattr(request, 'iterations', 1)) 