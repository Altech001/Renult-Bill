import asyncio
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket


class RouterEventHub:
    def __init__(self) -> None:
        self._clients: dict[UUID, set[WebSocket]] = defaultdict(set)
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, user_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self._loop = asyncio.get_running_loop()
        self._clients[user_id].add(websocket)

    def disconnect(self, user_id: UUID, websocket: WebSocket) -> None:
        self._clients[user_id].discard(websocket)
        if not self._clients[user_id]:
            self._clients.pop(user_id, None)

    async def _broadcast(self, user_id: UUID, payload: dict[str, Any]) -> None:
        stale: list[WebSocket] = []
        for websocket in tuple(self._clients.get(user_id, ())):
            try:
                await websocket.send_json(payload)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            self.disconnect(user_id, websocket)

    def publish(self, user_id: UUID, payload: dict[str, Any]) -> None:
        if not self._loop or not self._loop.is_running():
            return
        asyncio.run_coroutine_threadsafe(self._broadcast(user_id, payload), self._loop)


router_event_hub = RouterEventHub()
