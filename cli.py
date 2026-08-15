"""
CLI Module for Agent-eBPF using Typer & Rich.
Provides build, load, unload, status, event stream, and firewall rule management.
"""

import sys
import time
from pathlib import Path
import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.live import Live

try:
    from tools import ebpf_loader
except ImportError:
    sys.path.append(str(Path(__file__).parent))
    from tools import ebpf_loader

app = typer.Typer(
    name="agent-ebpf",
    help="Agent-eBPF: Production-Grade eBPF Engine & Security Management CLI",
    add_completion=False
)
console = Console()

@app.command("build")
def cmd_build():
    """Build: Compiles CO-RE eBPF C code into a BPF bytecode object file."""
    console.print("[bold blue]==> Starting eBPF Bytecode Compilation Process...[/bold blue]")
    try:
        obj_file = ebpf_loader.compile_ebpf()
        console.print(f"[bold green]✓ Compilation Successful:[/bold green] {obj_file}")
    except Exception as e:
        console.print(f"[bold red]✗ Compilation Error:[/bold red] {e}")
        raise typer.Exit(code=1)

@app.command("load")
def cmd_load(
    interface: str = typer.Option("eth0", "--iface", "-i", help="Network Interface to attach"),
    obj_path: str = typer.Option("ebpf/shield.bpf.o", "--obj", "-o", help="Bytecode Object File")
):
    """Load: Loads eBPF program into kernel and binds to XDP hook."""
    console.print(f"[bold yellow]==> Loading eBPF Program onto Interface '{interface}'...[/bold yellow]")
    try:
        path = Path(obj_path)
        if not path.exists():
            console.print("[yellow]Bytecode not found, building first...[/yellow]")
            path = ebpf_loader.compile_ebpf()

        res = ebpf_loader.load_with_bpftool(path, iface=interface)
        console.print(Panel(f"[bold green]eBPF Successfully Loaded and Pinned![/bold green]\n"
                            f"Pin Location: {res['pinned_at']}\n"
                            f"Interface: {res['iface']}", title="Attachment Status"))
    except Exception as e:
        console.print(f"[bold red]✗ Load Failed:[/bold red] {e}")
        raise typer.Exit(code=1)

@app.command("unload")
def cmd_unload(interface: str = typer.Option("eth0", "--iface", "-i", help="Network Interface")):
    """Unload: Detaches loaded eBPF program from XDP interface and cleans pins."""
    console.print(f"[bold red]==> Unloading eBPF Program ({interface})...[/bold red]")
    try:
        res = ebpf_loader.unload_ebpf(iface=interface)
        console.print(f"[bold green]✓ Program successfully unloaded.[/bold green]")
    except Exception as e:
        console.print(f"[bold red]✗ Unload Error:[/bold red] {e}")
        raise typer.Exit(code=1)

@app.command("status")
def cmd_status():
    """Status: Displays loaded eBPF program state and packet counters."""
    try:
        stats = ebpf_loader.inspect_maps()
        table = Table(title="Agent-eBPF Kernel Status Report")
        table.add_column("Metric / State", style="cyan")
        table.add_column("Value", style="magenta")

        table.add_row("Kernel Status", stats["status"].upper())
        table.add_row("Total Packets Processed", str(stats["total_packets"]))
        table.add_row("Dropped Packets (Drop)", str(stats["dropped_packets"]))

        console.print(table)
    except Exception as e:
        console.print(f"[bold red]✗ Status Query Error:[/bold red] {e}")

@app.command("add-rule")
def cmd_add_rule(
    ip: str = typer.Argument(..., help="IPv4 Address to block"),
    rule_id: int = typer.Option(100, "--rule-id", "-r", help="Rule ID")
):
    """Add Rule: Adds IPv4 block entry to BPF Hash Map."""
    try:
        ebpf_loader.add_blocked_ip(ip, rule_id=rule_id)
        console.print(f"[bold green]✓ IP Rule Added to BPF Map:[/bold green] {ip} (Rule ID: {rule_id})")
    except Exception as e:
        console.print(f"[bold red]✗ Rule Addition Error:[/bold red] {e}")

@app.command("events")
def cmd_events():
    """Live Stream: Displays real-time violation event stream from BPF RingBuffer."""
    console.print("[bold cyan]==> Listening to RingBuffer Live Violation Stream (Press Ctrl+C to exit)...[/bold cyan]")
    try:
        while True:
            try:
                events = ebpf_loader.poll_security_events(window_ms=1000)
            except Exception as e:
                console.print(f"[bold red]✗ Cannot read kernel events:[/bold red] {e}")
                raise typer.Exit(code=1)

            if not events:
                # No violations in this window — that is a real (empty) reading.
                time.sleep(1)
                continue

            with Live(console=console, refresh_per_second=4) as live:
                table = Table(title="Live Security Event Stream (Real Kernel Data)")
                table.add_column("Time", style="dim")
                table.add_column("Source IP", style="red")
                table.add_column("Destination IP", style="blue")
                table.add_column("Action", style="bold yellow")

                for evt in events:
                    table.add_row(
                        time.strftime("%H:%M:%S"),
                        evt["src_ip"],
                        evt["dst_ip"],
                        evt["action"],
                    )
                live.update(table)
    except KeyboardInterrupt:
        console.print("\n[yellow]Live event stream terminated.[/yellow]")

@app.command("init")
def cmd_init():
    """Init: 1-Click Zero-Friction Setup Wizard for Agent-eBPF."""
    console.print(Panel.fit(
        "[bold cyan]🛡️⚡ Agent-eBPF Zero-Friction Setup Wizard[/bold cyan]\n"
        "Autonomous Kernel-Level Shield for AI Agents & LLM Swarms",
        title="Agent-eBPF"
    ))

    policy_file = Path("policy.yaml")
    if not policy_file.exists():
        console.print("[yellow]Creating default declarative policy (policy.yaml)...[/yellow]")
        default_policy = """version: "v1alpha"
metadata:
  name: "production-agent-shield"

rules:
  - id: "sql-no-where-mutation"
    type: "db_query"
    protocol: "postgres"
    severity: "critical"
    action: "DROP"
    match:
      pattern: '(?i)^(UPDATE|DELETE)\\s+((?!WHERE).)*$'
    message: "Destructive SQL mutation lacking WHERE clause was blocked."

  - id: "tenant-isolation-enforce"
    type: "db_query"
    protocol: "postgres"
    severity: "high"
    action: "DROP"
    match:
      require_header_context: "X-Tenant-ID"
      must_contain: "tenant_id ="
    message: "SQL query missing tenant_id isolation filter."

  - id: "block-unsafe-syscalls"
    type: "syscall"
    severity: "critical"
    action: "KILL_PROCESS"
    match:
      syscalls:
        - "execve"
        - "ptrace"
      binary_path_regex: ".*/python.*"
    message: "AI agent unauthorized sub-process execution was intercepted."
"""
        policy_file.write_text(default_policy, encoding="utf-8")
        console.print("[bold green]✓ Created policy.yaml[/bold green]")
    else:
        console.print("[bold green]✓ policy.yaml already exists[/bold green]")

    console.print("\n[bold]📦 1-Line Integration Instructions:[/bold]\n")
    console.print("[cyan]🐍 Python (Zero-Code Import):[/cyan]")
    console.print("   [dim]pip install ksec-shield[/dim]")
    console.print("   [green]from ksec_shield import guard[/green]\n")

    console.print("[cyan]⚡ Node.js / TypeScript:[/cyan]")
    console.print("   [dim]npm install @ourobx/shield[/dim]")
    console.print("   [green]import \"@ourobx/shield/auto\";[/green]\n")

    console.print("[cyan]🤖 Cursor / Claude Desktop (MCP Server):[/cyan]")
    console.print("   [green]python cli.py export-mcp[/green]  (prints 1-click JSON configuration)\n")

    console.print("[bold green]✓ Setup complete! Run 'python cli.py load' to attach to Linux kernel.[/bold green]")


@app.command("export-mcp")
def cmd_export_mcp(
    gateway_url: str = typer.Option("http://localhost:8000", "--url", "-u", help="Gateway URL")
):
    """Export MCP: Generates 1-click MCP Server configuration for Cursor and Claude Desktop."""
    import json
    mcp_config = {
        "mcpServers": {
            "agent-ebpf-shield": {
                "url": f"{gateway_url.rstrip('/')}/sse",
                "transport": "sse"
            }
        }
    }
    console.print(Panel(
        json.dumps(mcp_config, indent=2),
        title="1-Click MCP Config (Add to claude_desktop_config.json or Cursor MCP)",
        subtitle="Agent-eBPF Gateway"
    ))


if __name__ == "__main__":
    app()

