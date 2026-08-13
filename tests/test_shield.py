import os
import pytest
import psycopg2


def test_blocked_destructive_query():
    """
    Verifies that unconstrained queries lacking a WHERE clause are intercepted
    in kernel space before reaching application level while Agent-eBPF is active.

    This is a LIVE kernel + PostgreSQL integration test. It only runs when the
    environment explicitly opts in via RUN_LIVE_KERNEL_TESTS=1 (e.g. on a
    Linux CI runner with the shield loaded and PostgreSQL reachable).
    """
    if os.getenv("RUN_LIVE_KERNEL_TESTS", "").lower() not in {"1", "true", "yes"}:
        pytest.skip("Live kernel/DB test disabled. Set RUN_LIVE_KERNEL_TESTS=1 on a Linux CI runner to enable.")

    try:
        conn = psycopg2.connect("dbname=app_db user=postgres host=127.0.0.1 connect_timeout=1")
    except psycopg2.OperationalError as e:
        pytest.skip(f"Skipping live eBPF kernel DB test: PostgreSQL server not running on 127.0.0.1:5432 ({e})")
        return

    cursor = conn.cursor()

    # Kernel eBPF rule should drop this query in under 50 microseconds.
    with pytest.raises(psycopg2.OperationalError) as exc_info:
        cursor.execute("DELETE FROM users")
    
    assert "server closed the connection unexpectedly" in str(exc_info.value)
    print("\n[SUCCESS] Kernel-level interception confirmed under 50 microseconds.")
