# Skill: Full-Stack Implementation (FastAPI + Next.js App Router Type-Safe Sync)

## Objective
Read `.agents/artifacts/UX_Design_Spec.md` and the backend architecture to generate production-ready, End-to-End Type-Safe code spanning FastAPI (Pydantic v2) and Next.js App Router (TypeScript) synchronized via OpenAPI schemas.

---

## 1. Backend Contract & OpenAPI Standards (FastAPI)

- **Single Source of Truth:**
  - All request and response bodies must use strict Pydantic v2 (`BaseModel`) models.
  - Endpoints must explicitly declare `response_model`, `status_code`, and the standard `responses` dictionary (`400`, `401`, `403`, `404`, `422`, `500`).
- **No Type Drift (Zero Generic `dict` / `Any`):**
  - Never return untyped `dict`, `Any`, or schemaless `JSONResponse`.
  - Query and Path parameters must be bound to Pydantic `Field(...)` or `Query(...)` with explicit validation constraints.
- **OpenAPI Schema Exporter Script (`backend/scripts/export_openapi.py`):**
  - Standard static schema generation script without spinning up a live server:
    ```python
    import json
    from app.main import app

    def export():
        with open("../frontend/src/types/openapi.json", "w", encoding="utf-8") as f:
            json.dump(app.openapi(), f, indent=2)

    if __name__ == "__main__":
        export()
    ```

---

## 2. Type Synchronization Pipeline (TypeScript Codegen)

- **No Manual Type Definitions:**
  - Writing manual TypeScript `interface` or `type` definitions for backend models on the frontend is strictly forbidden.
- **Codegen Tooling (`openapi-typescript`):**
  - Define the generation script in `frontend/package.json`:
    ```json
    "scripts": {
      "generate:types": "openapi-typescript src/types/openapi.json -o src/types/api.d.ts"
    }
    ```
- **Type-Safe HTTP Client (`src/lib/api-client.ts`):**
  - Establish a fully typed client using `openapi-fetch`:
    ```typescript
    import createClient from "openapi-fetch";
    import { paths } from "@/types/api";

    export const api = createClient<paths>({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    });
    ```

---

## 3. Next.js App Router Integration Rules

- **Server Components & Server Actions:**
  - Server-side data fetching must use `api.GET("/endpoint", { params: { ... } })`.
  - Pass Next.js cache revalidation options (`next: { tags: ['...'], revalidate: 60 }`) in a type-safe manner.
- **Client Components & TanStack React Query:**
  - Wrap client-side `openapi-fetch` calls in `useQuery` or `useMutation` hooks:
    ```typescript
    const { data, error, isLoading } = useQuery({
      queryKey: ["users", userId],
      queryFn: async () => {
        const { data, error } = await api.GET("/api/v1/users/{id}", {
          params: { path: { id: userId } },
        });
        if (error) throw error;
        return data;
      },
    });
    ```
- **Resilient Error Handling:**
  - Discriminate standard FastAPI `HTTPValidationError` and custom `DetailError` types on the frontend to drive form validations and toast alerts without runtime crashes.

---

## 4. Autonomous Execution & Verification Sequence

1. **Backend:** Implement FastAPI endpoints and Pydantic v2 schema models.
2. **Schema Export:** Run `python backend/scripts/export_openapi.py` to refresh `openapi.json`.
3. **Typegen:** Execute `npm run generate:types` to regenerate `api.d.ts`.
4. **Frontend:** Implement Next.js pages and components using the auto-generated types.
5. **Type Check:** Run `tsc --noEmit` to verify zero breaking type mismatches across the full stack.
