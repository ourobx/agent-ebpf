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

if __name__ == "__main__":
    app()
