# ksec-shield

**Zero-Trust Kernel-Level Security SDK for Python AI Agents & LLMs**  
Powered by **Agent-eBPF** & [`ksec.space`](https://ksec.space).

[![PyPI version](https://img.shields.io/pypi/v/ksec-shield.svg)](https://pypi.org/project/ksec-shield/)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

---

## ⚡ Quick Start (1 Line Integration)

```bash
pip install ksec-shield
```

```python
from ksec_shield import KsecShield, guard

# 1. Initialize Shield connected to ksec.space Gateway
shield = KsecShield(gateway_url="https://ksec.space", api_key="YOUR_API_KEY")

# 2. Decorate any AI agent tool or function
@guard(shield, action_type="tool_execution")
def execute_sql_query(query: str):
    return db.execute(query)

# 3. Execution is checked with 0ms overhead against kernel policies
execute_sql_query("SELECT * FROM users")
```

---

## 🦜 LangChain Integration

```python
from ksec_shield import KsecShield, KsecLangChainCallback

shield = KsecShield(gateway_url="https://ksec.space")
callback = KsecLangChainCallback(shield)

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    callbacks=[callback]
)
```

---

## 👥 CrewAI Integration

```python
from ksec_shield import KsecShield, KsecCrewAIToolWrapper

shield = KsecShield(gateway_url="https://ksec.space")
wrapper = KsecCrewAIToolWrapper(shield)

secure_tool = wrapper.wrap_tool("web_search", original_search_tool)
```
