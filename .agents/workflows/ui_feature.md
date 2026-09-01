# /ui-feature Workflow (Type-Safe Full-Stack Sync)

1. **Switch to @ux**:
   - Analyze user requirements and screen workflows.
   - Use `.agents/skills/ux_design.md` to draft `.agents/artifacts/UX_Design_Spec.md`.
   - **PAUSE** and wait for explicit user approval.

2. **Once approved, switch to @engineer**:
   - Read `.agents/artifacts/UX_Design_Spec.md`.
   - Implement FastAPI endpoints and strict Pydantic v2 request/response models.
   - Run `export_openapi.py` and `npm run generate:types` to regenerate `api.d.ts`.
   - Construct Next.js App Router components and connect them with `openapi-fetch` using the generated types.

3. **Switch to @qa**:
   - Run backend `pytest` test suites.
   - Execute frontend `tsc --noEmit` to confirm zero type mismatches and verify end-to-end API-frontend contract integrity.
