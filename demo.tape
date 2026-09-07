# ==============================================================================
#  KSEC — 30-Second eBPF Attack Interception Terminal Recording (Charm VHS)
#  Generate GIF: vhs demo.tape
# ==============================================================================

# Output configuration
Output docs/assets/demo.gif
Output demo.gif

# Visual styling
Set FontSize 15
Set Width 1200
Set Height 600
Set Padding 20
Set Theme "Catppuccin Mocha"
Set WindowBar "Colorful"
Set BorderRadius 10

# Initialize live status
Type "ksec status --live"
Enter
Sleep 2.5s

# Phase 1: Attack Simulation
Type "# Simulating an autonomous agent compromised by prompt injection..."
Enter
Sleep 1.5s

Type "python3 demo/terminal_attack_demo.py"
Enter
Sleep 12s

# Phase 2: Live eBPF LSM cgroup inspection
Type "ksec-ebpf-lsm --monitor-cgroup /ai-agents"
Enter
Sleep 2s

# Output display
Sleep 4s
