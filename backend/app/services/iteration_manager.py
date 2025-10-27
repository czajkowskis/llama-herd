"""
Service for managing experiment iterations.
"""
import threading
from typing import List
from datetime import datetime

from ..schemas.agent import AgentModel
from ..schemas.task import TaskModel
from ..core.state import state_manager
from ..services.conversation_runner import ConversationRunner
from ..services.conversation_service import ConversationService
from ..services.experiment_notifier import ExperimentNotifier
from ..storage import get_storage
from ..utils.logging import get_logger

logger = get_logger(__name__)


class IterationManager:
    """Service for managing experiment iterations."""
    
    def __init__(self):
        self.conversation_runner = ConversationRunner()
        self.notifier = ExperimentNotifier()
        self.storage = get_storage()
    
    def run_experiment(
        self,
        experiment_id: str,
        task: TaskModel,
        agents: List[AgentModel]
    ):
        """Run a complete experiment with multiple iterations."""
        final_sent = False
        try:
            logger.info(f"Starting experiment {experiment_id} with {len(agents)} agents")
            
            experiment = state_manager.get_experiment(experiment_id)
            if not experiment:
                raise ValueError(f"Experiment {experiment_id} not found")
            
            logger.info(f"Experiment {experiment_id} found, starting iterations")
            
            iterations = experiment.iterations
            dataset_items = getattr(task, 'datasetItems', None)
            
            logger.info(f"Experiment {experiment_id}: {iterations} iterations, dataset items: {len(dataset_items) if dataset_items else 0}")
            
            # Run iterations
            if dataset_items and isinstance(dataset_items, list) and len(dataset_items) > 0:
                logger.info(f"Running dataset iterations for experiment {experiment_id}")
                self._run_dataset_iterations(experiment_id, dataset_items, agents)
            else:
                logger.info(f"Running manual iterations for experiment {experiment_id}")
                self._run_manual_iterations(experiment_id, task.prompt, agents, iterations)
            
            logger.info(f"Experiment {experiment_id} iterations completed, marking as completed")
            
            # Mark as completed in memory
            state_manager.update_experiment_status(experiment_id, 'completed')
            
            # Persist status change to storage
            self.storage.update_experiment(experiment_id, {
                'status': 'completed',
                'completed_at': datetime.now().isoformat()
            })
            logger.info(f"Persisted completion status for experiment {experiment_id}")
            
            self.notifier.notify_completion(experiment_id)
            final_sent = True
            
        except Exception as e:
            logger.error(f"Error in experiment {experiment_id}: {str(e)}")
            logger.error(f"Exception type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Mark as error in memory
            state_manager.update_experiment_status(experiment_id, 'error', error=str(e))
            
            # Persist error status to storage
            self.storage.update_experiment(experiment_id, {
                'status': 'error',
                'error': str(e),
                'completed_at': datetime.now().isoformat()
            })
            logger.info(f"Persisted error status for experiment {experiment_id}")
            
            self.notifier.notify_error(experiment_id, str(e))
            final_sent = True
        finally:
            # If for some reason we exited without sending a final notification, ensure we persist and notify
            if not final_sent:
                try:
                    logger.warning(f"Final notification not sent for {experiment_id}; sending fallback error status")
                    state_manager.update_experiment_status(experiment_id, 'error', error='terminated_without_final')
                    self.storage.update_experiment(experiment_id, {
                        'status': 'error',
                        'error': 'terminated_without_final',
                        'completed_at': datetime.now().isoformat()
                    })
                    self.notifier.notify_error(experiment_id, 'terminated_without_final')
                except Exception as e2:
                    logger.error(f"Failed to send fallback final notification for {experiment_id}: {str(e2)}")
    
    def _run_dataset_iterations(self, experiment_id: str, dataset_items: List, agents: List[AgentModel]):
        """Run experiment over dataset items."""
        for idx, item in enumerate(dataset_items, start=1):
            self._run_single_iteration(experiment_id, item.task, agents, idx)
            self._snapshot_conversation(experiment_id, f"Dataset item {idx}")
    
    def _run_manual_iterations(self, experiment_id: str, prompt: str, agents: List[AgentModel], iterations: int):
        """Run experiment with manual iterations."""
        for iteration in range(1, iterations + 1):
            self._run_single_iteration(experiment_id, prompt, agents, iteration)
            self._snapshot_conversation(experiment_id, f"Run {iteration}")
    
    def _run_single_iteration(self, experiment_id: str, prompt: str, agents: List[AgentModel], iteration: int):
        """Run a single iteration."""
        # Update current iteration
        state_manager.update_experiment_status(experiment_id, 'running', current_iteration=iteration)
        self.notifier.notify_status(experiment_id, 'running', iteration)
        
        # Clear messages for new iteration
        experiment = state_manager.get_experiment(experiment_id)
        if experiment:
            experiment.messages = []

        # Announce conversation start for this iteration before any messages
        try:
            title = f"Run {iteration}"
            ConversationService.notify_conversation_started(experiment_id, title)
        except Exception as e:
            logger.warning(f"Failed to notify conversation start for {experiment_id} iter {iteration}: {str(e)}")
        
        # Create message handler and run conversation
        from ..services.message_handler import MessageHandler
        message_handler = MessageHandler(experiment_id)
        # Get chat_rules from experiment state
        chat_rules = experiment.chat_rules if experiment else None
        # Run conversation in a thread
        conv_thread = threading.Thread(
            target=self.conversation_runner.run_conversation,
            args=(experiment_id, prompt, agents, message_handler, chat_rules),
            daemon=True
        )
        conv_thread.start()

        # Wait for iteration to complete (no timeout)
        try:
            conv_thread.join()
        except Exception as e:
            logger.error(f"Error while waiting for conversation thread: {str(e)}")
            raise
    
    def _snapshot_conversation(self, experiment_id: str, title: str):
        """Create a snapshot of the current conversation."""
        ConversationService.add_conversation_snapshot(experiment_id, title)
