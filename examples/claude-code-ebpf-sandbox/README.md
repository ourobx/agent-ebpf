# Autonomous Agent CLI Sandbox with @ourobx/shield

Zero-Trust containment and syscall enforcement for autonomous coding agents (Claude Code, CrewAI, AutoGen).

## Quick Start

```bash
npm install
npm start
```

## Running directly with CLI Wrapper

You can wrap any autonomous agent tool without writing code:

```bash
# Wrap claude-code with kernel shield
npx @ourobx/shield claude-code --dangerously-skip-permissions

# Wrap python agent scripts
npx @ourobx/shield python my_agent.py
```
