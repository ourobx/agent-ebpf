import contextvars
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional
import asyncpg
import structlog

logger = structlog.get_logger(__name__)

# Asenkron istek bağlamına duyarlı kiracı değişkeni
tenant_context: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "current_tenant_id", default=None
)


class DatabasePool:
    def __init__(self) -> None:
        self._pool: Optional[asyncpg.Pool] = None

    async def init_pool(
        self,
        dsn: str,
        min_size: int = 10,
        max_size: int = 50,
        max_inactive_connection_lifetime: float = 300.0,
    ) -> None:
        if self._pool is not None:
            logger.warning("Database connection pool is already initialized.")
            return

        try:
            self._pool = await asyncpg.create_pool(
                dsn=dsn,
                min_size=min_size,
                max_size=max_size,
                max_inactive_connection_lifetime=max_inactive_connection_lifetime,
                command_timeout=30.0,
            )
            logger.info("Database pool successfully initialized", min_size=min_size, max_size=max_size)
        except Exception as exc:
            logger.error("Failed to initialize database pool", error=str(exc))
            raise

    async def close_pool(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None
            logger.info("Database pool closed")

    def get_pool(self) -> asyncpg.Pool:
        if self._pool is None:
            raise RuntimeError("Database pool has not been initialized. Call init_pool() first.")
        return self._pool


db_manager = DatabasePool()


def set_tenant_context(tenant_id: str) -> contextvars.Token[Optional[str]]:
    """İstek middleware katmanında kiracı kimliğini bağlama enjekte eder."""
    return tenant_context.set(tenant_id)


def reset_tenant_context(token: contextvars.Token[Optional[str]]) -> None:
    """İstek tamamlandığında kiracı bağlamını sıfırlar."""
    tenant_context.reset(token)


@asynccontextmanager
async def get_tenant_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """
    ContextVar üzerinden okunan tenant_id ile PostgreSQL RLS değişkenini
    oturum bazlı aktive eden güvenli bağlantı context yöneticisi.
    """
    current_tenant = tenant_context.get()
    if not current_tenant:
        raise PermissionError("RLS Tenant ID is not defined in current execution context.")

    pool = db_manager.get_pool()

    async with pool.acquire() as conn:
        async with conn.transaction():
            # RLS politikalarının devreye girmesi için oturum değişkenini ayarla
            await conn.execute("SET LOCAL app.current_tenant_id = $1;", current_tenant)
            try:
                yield conn
            except Exception as exc:
                logger.error("Database transaction rolled back", tenant_id=current_tenant, error=str(exc))
                raise
