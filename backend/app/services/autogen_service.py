"""
Service for managing AutoGen agent interactions and conversations.
"""

import threading
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

    def run_experiment(
        self, experiment_id: str, task: TaskModel, agents: List[AgentModel]
    ):
        """Run a complete experiment with multiple iterations."""
        self.iteration_manager.run_experiment(experiment_id, task, agents)

    def start_experiment_background(
        self, experiment_id: str, task: TaskModel, agents: List[AgentModel]
    ) -> None:
        """Start an experiment in a background thread."""
        try:
            logger.info(f"Starting experiment {experiment_id} in background thread")
            thread = threading.Thread(
                target=self.run_experiment,
                args=(experiment_id, task, agents),
                daemon=True,
            )
            thread.start()
            logger.info(f"Background thread started for experiment {experiment_id}")

            # Start a watchdog thread to enforce experiment-level timeout
            def _watchdog():
                try:
                    timeout = settings.experiment_timeout_seconds
                    logger.info(
                        f"Watchdog for {experiment_id} will monitor for {timeout}s"
                    )
                    thread.join(timeout=timeout)
                    if thread.is_alive():
                        logger.error(
                            f"Experiment {experiment_id} exceeded timeout of {timeout}s; marking as error"
                        )
                        state_manager.update_experiment_status(
                            experiment_id, "error", error="experiment_timeout"
                        )
                        from datetime import datetime

                        storage.update_experiment(
                            experiment_id,
                            {
                                "status": "error",
                                "error": "experiment_timeout",
                                "completed_at": datetime.now().isoformat(),
                            },
                        )
                        # Emit final terminal status
                        try:
                            data = {
                                "status": "error",
                                "final": True,
                                "error": "experiment_timeout",
                                "completed_at": datetime.now().isoformat(),
                                "close_connection": True,
                            }
                            state_manager.put_message_threadsafe(
                                experiment_id, {"type": "status", "data": data}
                            )
                        except Exception:
                            pass
                except Exception as e:
                    logger.error(f"Watchdog for {experiment_id} failed: {str(e)}")

            watchdog_thread = threading.Thread(target=_watchdog, daemon=True)
            watchdog_thread.start()
        except Exception as e:
            logger.error(
                f"Error starting background thread for experiment {experiment_id}: {str(e)}"
            )
            raise


# Import MessageHandler from its own module


# Global service instance
autogen_service = AutogenService()
