from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json

from ..core.state import state_manager


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

        # Get message queue for this experiment
        message_queue = state_manager.get_message_queue(experiment_id)
        if not message_queue:
            await websocket.close(code=4004, reason="Experiment message queue not found")
            return

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
        # Ensure proper cleanup
        try:
            await websocket.close()
        except Exception:
            pass

