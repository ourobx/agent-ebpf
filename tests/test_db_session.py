import asyncio
import pytest
import anyio
from unittest.mock import AsyncMock, MagicMock, patch
from gateway.db_session import (
    DatabasePool,
    db_manager,
    tenant_context,
    set_tenant_context,
    reset_tenant_context,
    get_tenant_connection,
)


@pytest.mark.anyio
async def test_database_pool_lifecycle():
    pool_instance = DatabasePool()
    
    # Başlatılmadan çağrıldığında RuntimeError fırlatmalı
    with pytest.raises(RuntimeError, match="Database pool has not been initialized"):
        pool_instance.get_pool()

    mock_asyncpg_pool = AsyncMock()
    with patch("asyncpg.create_pool", new_callable=AsyncMock) as mock_create:
        mock_create.return_value = mock_asyncpg_pool
        await pool_instance.init_pool("postgresql://user:pass@localhost:5432/db")
        assert pool_instance.get_pool() == mock_asyncpg_pool
        
        # İkinci çağrıda tekrar havuz oluşturmamalı
        await pool_instance.init_pool("postgresql://user:pass@localhost:5432/db")
        assert mock_create.call_count == 1

        await pool_instance.close_pool()
        mock_asyncpg_pool.close.assert_awaited_once()


@pytest.mark.anyio
async def test_tenant_context_isolation_in_concurrency():
    async def worker(tenant_id: str, results: dict):
        token = set_tenant_context(tenant_id)
        await anyio.sleep(0.01)
        results[tenant_id] = tenant_context.get()
        reset_tenant_context(token)

    results = {}
    async with anyio.create_task_group() as tg:
        tg.start_soon(worker, "tenant-alpha", results)
        tg.start_soon(worker, "tenant-beta", results)
        tg.start_soon(worker, "tenant-gamma", results)

    assert results["tenant-alpha"] == "tenant-alpha"
    assert results["tenant-beta"] == "tenant-beta"
    assert results["tenant-gamma"] == "tenant-gamma"
    assert tenant_context.get() is None


@pytest.mark.anyio
async def test_get_tenant_connection_without_tenant_raises_permission_error():
    tenant_context.set(None)
    with pytest.raises(PermissionError, match="RLS Tenant ID is not defined"):
        async with get_tenant_connection():
            pass


@pytest.mark.anyio
async def test_get_tenant_connection_executes_set_local():
    mock_conn = MagicMock()
    mock_conn.execute = AsyncMock()
    mock_transaction = MagicMock()
    mock_transaction.__aenter__ = AsyncMock(return_value=None)
    mock_transaction.__aexit__ = AsyncMock(return_value=None)
    mock_conn.transaction = MagicMock(return_value=mock_transaction)

    mock_acquire = MagicMock()
    mock_acquire.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_acquire.__aexit__ = AsyncMock(return_value=None)

    mock_pool = MagicMock()
    mock_pool.acquire = MagicMock(return_value=mock_acquire)

    with patch.object(db_manager, "get_pool", return_value=mock_pool):
        token = set_tenant_context("tenant-corp-99")
        try:
            async with get_tenant_connection() as conn:
                assert conn == mock_conn
                mock_conn.execute.assert_awaited_once_with(
                    "SET LOCAL app.current_tenant_id = $1;", "tenant-corp-99"
                )
        finally:
            reset_tenant_context(token)
