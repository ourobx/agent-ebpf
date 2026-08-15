import sys
from pathlib import Path
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(Path(__file__).parent / "packages" / "ksec-shield-py"))

from ksec_shield import KsecShield, guard, PolicyRule, KsecSecurityViolationError

print("\n🛡️  [Agent-eBPF] Initializing Kernel Shield for AI Agent...")

shield = KsecShield(
    gateway_url="https://ksec.space",
    agent_id="demo-python-agent-01",
    sync_interval_seconds=0
)

# 1. Add zero-trust policy rule
shield.add_policy_rule(PolicyRule(
    id="rule-block-unauthorized-bash",
    action_type="tool_execution",
    target="bash_exec",
    decision="BLOCK",
    reason="Kernel Policy: Arbitrary bash execution forbidden in production"
))

# 2. Register alert hook
shield.on("threat_blocked", lambda evt: print(f"\n🚨 [ALERT: Threat Blocked by eBPF]: {evt}"))


@guard(shield, action_type="tool_execution")
def safe_calculator(x: int, y: int) -> int:
    return x * y


@guard(shield, action_type="tool_execution")
def bash_exec(cmd: str) -> str:
    return f"executed: {cmd}"


def main():
    print("\n✅ 1. Executing Safe Tool (safe_calculator)...")
    res = safe_calculator(21, 2)
    print(f"   Result: {res}")

    print("\n⚠️  2. Simulating Rogue LLM attempting bash_exec('rm -rf /')...")
    try:
        bash_exec("rm -rf /")
    except KsecSecurityViolationError as e:
        print(f"🛡️  [Shield Protection Success]: {e}")

    print("\n🎉 Python Demo completed successfully! Agent-eBPF kept the agent safe.\n")


if __name__ == "__main__":
    main()
