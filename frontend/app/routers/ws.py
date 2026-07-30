import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_mgr import ws_manager

logger = logging.getLogger("ws_router")
router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and accept client ping messages
            data = await websocket.receive_text()
            logger.debug(f"Received WebSocket ping from client: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket)
