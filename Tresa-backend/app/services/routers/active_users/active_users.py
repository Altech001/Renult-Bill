import os
from typing import Any

from app.models.router import Router


DEFAULT_WINBOX_PORT = int(os.getenv("ROUTER_WINBOX_PORT", "8291"))


def get_remote_winbox_access(router: Router) -> dict[str, Any]:
    winbox_port = DEFAULT_WINBOX_PORT
    endpoint = f"{router.host}:{winbox_port}"
    return {
        "enabled": router.is_active,
        "protocol": "L2TP",
        "service": "Winbox",
        "host": router.host,
        "port": winbox_port,
        "endpoint": endpoint,
        "url": endpoint,
    }
