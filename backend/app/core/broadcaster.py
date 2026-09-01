import asyncio
from typing import Set, Dict, List, Optional
from backend.app.schemas.telemetry import EbpfEvent


class MultiTenantBroadcaster:
    """
    Multi-Tenant eBPF Telemetry Event Broadcaster.
    Isolates real-time kernel telemetry streams per user/tenant based on registered
    Process IDs (PIDs), security contexts, or administrative privileges.
    """

    def __init__(self, max_queue_size: int = 500):
        self._user_subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._user_pids: Dict[str, List[int]] = {}
        self._global_subscribers: Set[asyncio.Queue] = set()
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._max_queue_size = max_queue_size

    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    def register_user_pid(self, username: str, pid: int):
        """Associates a target process PID with a tenant/user account."""
        if username not in self._user_pids:
            self._user_pids[username] = []
        if pid not in self._user_pids[username]:
            self._user_pids[username].append(pid)

    async def subscribe(self, username: str = "global") -> asyncio.Queue:
        """Creates an isolated event queue for the authenticated tenant."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=self._max_queue_size)
        if username == "global" or username == "admin":
            self._global_subscribers.add(queue)
        else:
            if username not in self._user_subscribers:
                self._user_subscribers[username] = set()
            self._user_subscribers[username].add(queue)
        return queue

    async def unsubscribe(self, username: str, queue: asyncio.Queue):
        """Removes subscriber queue on disconnect."""
        if username in ["global", "admin"]:
            self._global_subscribers.discard(queue)
        if username in self._user_subscribers:
            self._user_subscribers[username].discard(queue)

    async def publish(self, event: EbpfEvent):
        """Dispatches an eBPF event to global listeners and matching tenant queues."""
        # 1. Global / admin subscribers receive all events
        for queue in list(self._global_subscribers):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                try:
                    queue.get_nowait()
                    queue.put_nowait(event)
                except (asyncio.QueueEmpty, asyncio.QueueFull):
                    pass

        # 2. Tenant-scoped subscribers receive events matching their registered PIDs or tenant_id
        for username, queues in list(self._user_subscribers.items()):
            pids = self._user_pids.get(username, [])
            event_tenant = getattr(event, "tenant_id", None) or event.details.get("tenant_id")
            if event.pid in pids or event_tenant == username:
                for queue in list(queues):
                    try:
                        queue.put_nowait(event)
                    except asyncio.QueueFull:
                        try:
                            queue.get_nowait()
                            queue.put_nowait(event)
                        except (asyncio.QueueEmpty, asyncio.QueueFull):
                            pass

    def publish_from_thread(self, event: EbpfEvent):
        """Thread-safe bridge to dispatch kernel ring buffer events into the asyncio event loop."""
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(self.publish(event), self._loop)


# Singletons
event_broadcaster = MultiTenantBroadcaster()
tenant_broadcaster = event_broadcaster
