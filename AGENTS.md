# Project Rules for Agent-eBPF / KSEC v2.0

- **Master SaaS Guide**: Refer to [DEVELOPER_GUIDE_SAAS.md](DEVELOPER_GUIDE_SAAS.md) as the single source of truth for all enterprise architecture, billing, telemetry, Helm, and security rules.
- **Hallmark Design Skill**: Always trigger and follow the `hallmark` skill (`C:\Users\win10\.agents\skills\hallmark\SKILL.md`) for any web UI, frontend components, web application, dashboard, landing page, or UI interface development in this project.
- **Strict Security Standard**: Zero tolerance for `privileged: true` or `CAP_SYS_ADMIN` in default values. All kernel BPF operations must strictly enforce zero-trust Linux capabilities (`CAP_BPF`, `CAP_NET_ADMIN`, `CAP_PERFMON`, `CAP_SYS_RESOURCE`).
- **Zero Permanent Tokens (OIDC Secretless Standard)**: Zero tolerance for storing long-lived/permanent API tokens, Personal Access Tokens (PATs), or static credential keys in repository files, commits, or CI secrets where OIDC is supported. All releases (Hugging Face, PyPI, npm, Cloud Providers) must strictly authenticate via short-lived OpenID Connect (OIDC) Trusted Publishers (`permissions: id-token: write`).
