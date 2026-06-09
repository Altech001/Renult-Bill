from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Request schemas ──────────────────────────────────────────


class PppoeUser(BaseModel):
    """A PPPoE secret (username/password) to provision on the router."""

    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=255)
    profile: str = Field(default="10MBPS", max_length=60)


class HotspotProvisionConfig(BaseModel):
    """
    User-supplied parameters for hotspot provisioning.

    Defaults match the ALTECH reference template so the caller can
    POST an empty body and get a sensible default config.
    """

    # ── Interface assignment ────────────────────────────────
    wan_interface_index: int = Field(
        default=1,
        ge=1,
        description="Which ether port is the ISP uplink (1 = ether1).",
    )
    mgmt_interface_index: Optional[int] = Field(
        default=None,
        ge=1,
        description="Optional management port number excluded from bridge.",
    )

    # ── IP / Pool ───────────────────────────────────────────
    bridge_ip: str = Field(default="172.16.0.1", max_length=15)
    bridge_subnet: int = Field(default=24, ge=8, le=30)
    pool_start: str = Field(default="172.16.0.2", max_length=15)
    pool_end: str = Field(default="172.16.0.254", max_length=15)

    # ── PPPoE ───────────────────────────────────────────────
    rate_limit: str = Field(
        default="2M/2M",
        max_length=40,
        description="Upload/Download rate-limit string (e.g. '2M/2M').",
    )
    pppoe_profile_name: str = Field(default="10MBPS", max_length=60)
    pppoe_service_name: str = Field(default="PPPOE", max_length=60)
    pppoe_users: list[PppoeUser] = Field(
        default_factory=lambda: [
            PppoeUser(username="altech", password="altech"),
            PppoeUser(username="hspotagent", password="test123"),
        ],
    )

    # ── Upstream ISP PPPoE client ───────────────────────────
    enable_pppoe_client: bool = Field(
        default=True,
        description="Whether the router should dial an upstream ISP via PPPoE.",
    )
    isp_username: Optional[str] = Field(default=None, max_length=120)
    isp_password: Optional[str] = Field(default=None, max_length=255)

    # ── DNS ─────────────────────────────────────────────────
    dns_servers: str = Field(default="8.8.8.8,8.8.4.4", max_length=120)


# ── Response schemas ─────────────────────────────────────────


class CommandResult(BaseModel):
    """Result of a single RouterOS API command."""

    step: str
    path: str
    action: str
    params: dict[str, Any] = {}
    success: bool
    error: Optional[str] = None


class RouterHardwareResponse(BaseModel):
    """Detected hardware capabilities of a router."""

    router_id: UUID
    router_name: str
    identity: Optional[str] = None
    ethernet_ports: list[dict[str, Any]] = []
    has_wireless: bool = False
    wireless_interfaces: list[dict[str, Any]] = []
    port_count: int = 0
    error: Optional[str] = None


class HotspotProvisionResponse(BaseModel):
    """Result of provisioning a router for hotspot."""

    success: bool
    router_id: UUID
    router_name: str
    hardware: dict[str, Any] = {}
    commands_executed: int = 0
    command_log: list[CommandResult] = []
    error: Optional[str] = None
