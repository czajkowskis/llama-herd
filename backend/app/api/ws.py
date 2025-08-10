from fastapi import APIRouter, WebSocket
import asyncio
import json
import queue

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

        # Listen for messages
        while True:
            try:
                message_data = message_queue.get_nowait()
                await websocket.send_text(json.dumps(message_data))
            except queue.Empty:
                # Check if experiment is completed
                current_experiment = state_manager.get_experiment(experiment_id)
                if current_experiment and current_experiment.status in ['completed', 'error']:
                    break
                await asyncio.sleep(0.1)

    except Exception:
        try:
            await websocket.close(code=1011, reason="Internal error")
        except Exception:
            pass

