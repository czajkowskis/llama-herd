from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json

from ..core.state import state_manager
from ..utils.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.websocket("/ws/experiments/{experiment_id}")
async def websocket_endpoint(websocket: WebSocket, experiment_id: str):
    await websocket.accept()

    # Check if experiment exists
    experiment = state_manager.get_experiment(experiment_id)
    if not experiment:
        await websocket.close(code=4004, reason="Experiment not found")
        return

    try:
        # Send initial status
        await websocket.send_text(json.dumps({
            "type": "status", 
            "data": {"status": experiment.status}
        }))

        # Create an async queue for this WebSocket connection
        # We'll bridge messages from the thread-safe queue to this async queue
        message_queue = asyncio.Queue()
        
        # Background task to bridge messages from thread-safe queue to async queue
        async def bridge_messages():
            """Bridge messages from thread-safe queue to async queue."""
            while True:
                try:
                    # Poll the thread-safe queue periodically
                    msg = state_manager.get_message(experiment_id, timeout=0.1)
                    if msg:
                        await message_queue.put(msg)
                    else:
                        # Short sleep to avoid busy waiting
                        await asyncio.sleep(0.05)
                except Exception as e:
                    logger.error(f"Error bridging messages for {experiment_id}: {e}")
                    break
        
        # Start the bridge task
        bridge_task = asyncio.create_task(bridge_messages())

        # Listen for messages with proper async handling
        while True:
            try:
                # Use asyncio.wait_for to implement timeout and check experiment status
                message_data = await asyncio.wait_for(message_queue.get(), timeout=0.5)
                await websocket.send_text(json.dumps(message_data))
            except asyncio.TimeoutError:
                # Check if experiment is completed during timeout
                current_experiment = state_manager.get_experiment(experiment_id)
                if current_experiment and current_experiment.status in ['completed', 'error']:
                    # Send final status and exit gracefully
                    await websocket.send_text(json.dumps({
                        "type": "status",
                        "data": {"status": current_experiment.status}
                    }))
                    break
                # Continue listening if experiment is still running
                continue
            except asyncio.CancelledError:
                # Handle task cancellation (e.g., client disconnect)
                break

    except WebSocketDisconnect:
        # Client disconnected normally
        pass
    except Exception as e:
        # Handle unexpected errors
        try:
            await websocket.close(code=1011, reason=f"Internal error: {str(e)}")
        except Exception:
            pass
    finally:
        # Cancel the bridge task
        bridge_task.cancel()
        try:
            await bridge_task
        except asyncio.CancelledError:
            pass
        
        # Ensure proper cleanup with normal close code (1000)
        try:
            await websocket.close(code=1000, reason="Experiment completed")
        except Exception:
            pass

