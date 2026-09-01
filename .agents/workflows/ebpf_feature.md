# /ebpf-feature Workflow

1. **Switch to @pm**:
   - Analyze requirements, define the target eBPF hook, backend endpoints, and observability metrics.
   - Document specifications in `.agents/artifacts/spec.md`.
   - **PAUSE** and wait for explicit user approval.

2. **Once approved, switch to @kernel_eng**:
   - Write the eBPF C program in `agent/src/` or `ebpf/`.
   - Implement the userspace zero-copy ring buffer event consumer.

3. **Switch to @fullstack_eng**:
   - Define FastAPI Pydantic v2 schemas and route handlers.
   - Execute `python backend/scripts/export_openapi.py` and `npm --prefix frontend run sync:types`.
   - Implement the Next.js App Router live monitoring component using the generated types.

4. **Switch to @qa**:
   - Run `pytest` backend tests and `npm --prefix frontend run typecheck` (`tsc --noEmit`).
   - Audit eBPF verifier safety and resolve any type drift or edge cases.
