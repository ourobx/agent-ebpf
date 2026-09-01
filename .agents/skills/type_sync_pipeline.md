# Skill: OpenAPI & TypeScript Type Sync Pipeline

## Execution Sequence

1. **FastAPI Schemas**: Define or update Pydantic v2 models in backend schemas or route definitions.
2. **OpenAPI Export**: Run `python backend/scripts/export_openapi.py` to refresh `frontend/src/types/openapi.json`.
3. **Typegen**: Run `npm --prefix frontend run sync:types` to compile `frontend/src/types/api.d.ts`.
4. **Type-Safety Verification**: Run `npm --prefix frontend run typecheck` (`tsc --noEmit`) to confirm zero type drift or breaking interface changes.
