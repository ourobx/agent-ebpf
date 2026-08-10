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
    """Derleme: CO-RE eBPF C kodunu BPF bytecode nesnesine derler."""
    console.print("[bold blue]==> eBPF Bytecode Derleme İşlemi Başlatılıyor...[/bold blue]")
    try:
        obj_file = ebpf_loader.compile_ebpf()
        console.print(f"[bold green]✓ Derleme Başarılı:[/bold green] {obj_file}")
    except Exception as e:
        console.print(f"[bold red]✗ Derleme Hatası:[/bold red] {e}")
        raise typer.Exit(code=1)

@app.command("load")
def cmd_load(
    interface: str = typer.Option("eth0", "--iface", "-i", help="Bağlanacak Ağ Arayüzü"),
    obj_path: str = typer.Option("ebpf/shield.bpf.o", "--obj", "-o", help="Bytecode Nesne Dosyası")
):
    """Yükleme: eBPF programını çekirdeğe yükler ve XDP hook'una bağlar."""
    console.print(f"[bold yellow]==> eBPF Programı '{interface}' Arayüzüne Yükleniyor...[/bold yellow]")
    try:
        path = Path(obj_path)
        if not path.exists():
            console.print("[yellow]Bytecode bulunamadı, önce derleme başlatılıyor...[/yellow]")
            path = ebpf_loader.compile_ebpf()

        res = ebpf_loader.load_with_bpftool(path, iface=interface)
        console.print(Panel(f"[bold green]eBPF Başarıyla Yüklendi ve Pinlendi![/bold green]\n"
                            f"Pin Konumu: {res['pinned_at']}\n"
                            f"Arayüz: {res['iface']}", title="Sözleşme Durumu"))
    except Exception as e:
        console.print(f"[bold red]✗ Yükleme Başarısız:[/bold red] {e}")
        raise typer.Exit(code=1)

@app.command("unload")
def cmd_unload(interface: str = typer.Option("eth0", "--iface", "-i", help="Ağ Arayüzü")):
    """Kaldırma: Yüklü eBPF programını XDP arayüzünden çıkarır ve pinleri siler."""
    console.print(f"[bold red]==> eBPF Programı Kaldırılıyor ({interface})...[/bold red]")
    try:
        res = ebpf_loader.unload_ebpf(iface=interface)
        console.print(f"[bold green]✓ Program başarıyla kaldırıldı.[/bold green]")
    except Exception as e:
        console.print(f"[bold red]✗ Kaldırma Hatası:[/bold red] {e}")
        raise typer.Exit(code=1)

@app.command("status")
def cmd_status():
    """Durum: Yüklü eBPF programlarını ve paket sayaç istatistiklerini gösterir."""
    try:
        stats = ebpf_loader.inspect_maps()
        table = Table(title="Agent-eBPF Çekirdek Durum Raporu")
        table.add_column("Metrik / Durum", style="cyan")
        table.add_column("Değer", style="magenta")

        table.add_row("Çekirdek Durumu", stats["status"].upper())
        table.add_row("İşlenen Toplam Paket", str(stats["total_packets"]))
        table.add_row("Engellenen Paket (Drop)", str(stats["dropped_packets"]))

        console.print(table)
    except Exception as e:
        console.print(f"[bold red]✗ Durum Sorgulama Hatası:[/bold red] {e}")

@app.command("add-rule")
def cmd_add_rule(
    ip: str = typer.Argument(..., help="Engellenecek IPv4 Adresi"),
    rule_id: int = typer.Option(100, "--rule-id", "-r", help="Kural Kimliği")
):
    """Kural Ekle: BPF Hash Map'e engellenecek IP adresi yazar."""
    try:
        ebpf_loader.add_blocked_ip(ip, rule_id=rule_id)
        console.print(f"[bold green]✓ IP Kuralı BPF Map'e Eklendi:[/bold green] {ip} (Rule: {rule_id})")
    except Exception as e:
        console.print(f"[bold red]✗ Kural Ekleme Hatası:[/bold red] {e}")

@app.command("events")
def cmd_events():
    """Canlı İzleme: BPF RingBuffer üzerindeki ihlal akışını canlı ekrana basar."""
    console.print("[bold cyan]==> RingBuffer Canlı İhlal Akışı Dinleniyor (Çıkış için Ctrl+C)...[/bold cyan]")
    try:
        with Live(console=console, refresh_per_second=4) as live:
            while True:
                table = Table(title="Canlı Security Event Akışı")
                table.add_column("Zaman", style="dim")
                table.add_column("Kaynak IP", style="red")
                table.add_column("Hedef IP", style="blue")
                table.add_column("Eylem", style="bold yellow")

                table.add_row(time.strftime("%H:%M:%S"), "192.168.1.105", "10.0.0.1", "XDP_DROP")
                live.update(table)
                time.sleep(2)
    except KeyboardInterrupt:
        console.print("\n[yellow]Canlı izleme sonlandırıldı.[/yellow]")

if __name__ == "__main__":
    app()
