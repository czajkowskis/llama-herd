"""
Service for notifying about experiment status changes.
"""
from datetime import datetime
from ..core.state import state_manager
from ..utils.logging import get_logger

logger = get_logger(__name__)


class ExperimentNotifier:
    """Service for notifying about experiment status changes."""
    
    @staticmethod
    def notify_status(experiment_id: str, status: str, iteration: int = None):
        """Notify about status change."""
        try:
            data = {"experiment_id": experiment_id, "status": status}
            if iteration:
                data["current_iteration"] = iteration
            # Non-final status update (running, paused, etc.)
            state_manager.put_message_threadsafe(experiment_id, {"type": "status", "data": data})
        except Exception:
            pass
    
    @staticmethod
    def notify_completion(experiment_id: str):
        """Notify about experiment completion."""
        try:
            data = {
                "experiment_id": experiment_id,
                "status": "completed",
                "final": True,
                "completed_at": datetime.now().isoformat(),
                "close_connection": True
            }
            state_manager.put_message_threadsafe(experiment_id, {"type": "status", "data": data})
        except Exception:
            pass
    
    @staticmethod
    def notify_error(experiment_id: str, error: str):
        """Notify about experiment error."""
        try:
            data = {
                "experiment_id": experiment_id,
                "status": "error",
                "final": True,
                "error": str(error),
                "completed_at": datetime.now().isoformat(),
                "close_connection": True
            }
            # Send as a final status message so clients have a single contract to listen for
            state_manager.put_message_threadsafe(experiment_id, {"type": "status", "data": data})
        except Exception:
            pass
