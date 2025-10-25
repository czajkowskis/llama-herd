"""
Service for managing AutoGen agent interactions and conversations.
"""
import asyncio
from typing import List

from ..schemas.agent import AgentModel
from ..schemas.task import TaskModel
from ..core.config import settings
from ..core.state import state_manager
from ..services.iteration_manager import IterationManager
from ..storage import get_storage
from ..utils.logging import get_logger

storage = get_storage()
logger = get_logger(__name__)


class AutogenService:
    """Service for managing AutoGen multi-agent conversations."""
    
    def __init__(self):
        self._setup_environment()
        self.iteration_manager = IterationManager()
    
    def _setup_environment(self):
        """Set up the environment for AutoGen."""
        # Don't override environment variables - let agent config handle it
        # The agent config already has the correct base_url from settings
        pass
    
    
    async def run_experiment(
        self,
        experiment_id: str,
        task: TaskModel,
        agents: List[AgentModel]
    ):
        """Run a complete experiment with multiple iterations."""
        await self.iteration_manager.run_experiment(experiment_id, task, agents)
    
    
    def start_experiment_background(
        self,
        experiment_id: str,
        task: TaskModel,
        agents: List[AgentModel]
    ) -> None:
        """Start an experiment in a background task."""
        try:
            logger.info(f"Starting experiment {experiment_id} in background task")
            
            # Get the event loop
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                # No event loop running, create one
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            # Create a task to run the experiment
            task_obj = loop.create_task(
                self.run_experiment(experiment_id, task, agents)
            )
            
            logger.info(f"Background task created for experiment {experiment_id}")

            # Start a watchdog task to enforce experiment-level timeout
            async def _watchdog():
                try:
                    timeout = settings.experiment_timeout_seconds
                    logger.info(f"Watchdog for {experiment_id} will monitor for {timeout}s")
                    
                    try:
                        await asyncio.wait_for(task_obj, timeout=timeout)
                    except asyncio.TimeoutError:
                        logger.error(f"Experiment {experiment_id} exceeded timeout of {timeout}s; marking as error")
                        state_manager.update_experiment_status(experiment_id, 'error', error='experiment_timeout')
                        from datetime import datetime
                        storage.update_experiment(experiment_id, {
                            'status': 'error',
                            'error': 'experiment_timeout',
                            'completed_at': datetime.now().isoformat()
                        })
                        # Emit final terminal status
                        try:
                            data = {
                                "status": "error",
                                "final": True,
                                "error": 'experiment_timeout',
                                "completed_at": datetime.now().isoformat(),
                                "close_connection": True
                            }
                            state_manager.put_message_threadsafe(experiment_id, {"type": "status", "data": data})
                        except Exception:
                            pass
                        
                        # Cancel the task
                        task_obj.cancel()
                except Exception as e:
                    logger.error(f"Watchdog for {experiment_id} failed: {str(e)}")

            # Create watchdog task
            watchdog_task = loop.create_task(_watchdog())
            
        except Exception as e:
            logger.error(f"Error starting background task for experiment {experiment_id}: {str(e)}")
            raise


# Import MessageHandler from its own module
from .message_handler import MessageHandler


# Global service instance
autogen_service = AutogenService()

