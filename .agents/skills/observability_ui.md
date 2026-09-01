# Skill: Real-Time Observability UI (Next.js)

## Design & Engineering Standards

1. **Design System**:
   - Dark-mode first, monospaced metrics typography (`Geist Mono`, `JetBrains Mono`), cyber/terminal aesthetics, and TailwindCSS tokens.
2. **API Client**:
   - Utilize the fully typed `openapi-fetch` client configured in `src/lib/api-client.ts`.
3. **State & Live Telemetry**:
   - Stream real-time kernel metrics using Server-Sent Events (SSE) or periodic TanStack React Query cache invalidation.
   - Include skeleton loading states, empty state placeholders, and inline error boundaries for resilient user experience.
