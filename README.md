# 🛡️⚡ Agent-eBPF: AI Sentinel in Kernel Space

**Agent-eBPF**, otonom yapay zeka ajanları (AI Agents), LLM servisleri ve uygulama süreçleri için Linux çekirdek seviyesinde (Ring 0) mikrosaniye-altı (<35µs) güvenlik kalkanı ve telemetri ağ geçididir.

Sıfır-Güven (Zero-Trust) ilkeleriyle çalışan bu mimari, yapay zeka ajanlarının veritabanı, ağ veya sistem çağrılarında gerçekleştirebileceği tahrip edici eylemleri (örneğin `WHERE` şartı olmayan `DELETE` sorguları veya yetkisiz paket iletimleri) çekirdek katmanında (XDP) sıfır gecikmeyle engeller.

---

## 🚀 Hızlı Başlangıç (Tek Tıkla / 1-Click Launch)

Teknik veya kod detayına ihtiyaç duymadan **Agent-eBPF** sistemini ve **Görsel Web Dashboard**'unu başlatmak için işletim sisteminize uygun başlatıcıyı çalıştırmanız yeterlidir:

### 💻 Windows

Proje kök dizininde bulunan başlatıcıya çift tıklayın:

```cmd
start.bat
```

### 🐧 Linux / 🍎 macOS

Terminal veya dosya yöneticisinde betiği çalıştırın:

```bash
chmod +x start.sh
./start.sh
```

> **💡 Otomatik İşlem:** Başlatıcı script bağımlılıkları kontrol eder, gerekli Python kütüphanelerini yükler, eBPF & MCP Gateway servisini ayağa kaldırır ve varsayılan tarayıcınızda otomatik olarak **`http://localhost:8000`** adresini açar.

---

## 🖥️ Görsel Web Kontrol Paneli (Web UI)

Tarayıcınızda açılan görsel kontrol paneli (`http://localhost:8000`) üzerinden tüm çekirdek güvenlik operasyonlarını kod yazmadan yönetebilirsiniz:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🛡️⚡ Agent-eBPF | Autonomous Linux Kernel Shield                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [1. CANLI TELEMETRİ]         [2. AST SANDBOX]                         │
│  • Anlık Kernel Logları       • Sınama SQL sorgusu girin:              │
│  • Engellenen Paketler        • UPDATE users SET role='admin'          │
│  • Tepki Süresi (<35µs)       • [⚡ DENE] -> Kernel Engelledi (DROP)    │
│                                                                        │
│  [3. KURAL POLİTİKALARI]      [4. MCP SSE BAĞLANTISI]                  │
│  • policy.yaml Önizleme       • SSE Bağlantı Adresi:                   │
│  • Tek Tıkla Kural Ekle       • http://localhost:8000/sse              │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Etkileşimli AST Sandbox:** `DELETE` veya `UPDATE` gibi tahrip edici sorguları sınayabilir, sistemin çekirdek seviyesindeki mikrosaniye altı engelleme mantığını canlı olarak simüle edebilirsiniz.
2. **Canlı Telemetri Akışı:** Yapay zeka ajanlarının gerçekleştirdiği veritabanı mutasyonlarını ve sistem çağrılarını anlık akan log ekranından takip edebilirsiniz.
3. **Kural & Politika Yönetimi:** Aktif güvenlik politikalarını (`policy.yaml`) listeleyebilir ve dinamik kurallar ekleyebilirsiniz.

---

## 🤖 Yapay Zeka Ajanları ile Entegrasyon (MCP SSE)

**Agent-eBPF**, Anthropic Model Context Protocol (MCP) standartlarını yerleşik olarak destekler. Yapay zeka asistanınızı (Claude Desktop, Cursor, Gemini Spark / Orchestrator) bağlamak için aşağıdaki SSE adresini MCP aracı olarak tanımlamanız yeterlidir:

```text
http://localhost:8000/sse
```

### Kullanılabilir MCP Araçları (Tools)

* `add_security_rule`: XDP / BPF haritasına dinamik IP/Sorgu engelleme kuralı ekler.
* `get_ebpf_status`: Çekirdek paket sayaçlarını ve harita kullanım istatistiklerini getirir.
* `simulate_query_check`: SQL/AST sorgusunun güvenlik politikalarına uyumunu sınar.
* `get_active_policies`: Aktif güvenlik kurallarını ve politika metinlerini döndürür.

---

## 🏗️ Sistem Mimarisi

```text
[ Network Interface / XDP Hook ]
       │
       ├──► BPF_MAP_TYPE_LRU_HASH (blocked_ips) ──► XDP_DROP (<35µs)
       │
       └──► BPF_MAP_TYPE_RINGBUF (events_ringbuf)
                   │
                   ▼ (Async Event Loop)
       [ ebpf_loader.py (Python / Ctypes / bpftool) ]
                   │
                   ▼ (Zero-Trust Guard)
       [ mcp_server.py (FastAPI / OAuth2 / SlowAPI / Prometheus) ]
                   │
                   ├──► Dashboard Web UI (http://localhost:8000)
                   └──► MCP SSE Gateway (http://localhost:8000/sse)
```

* **Kernel Space (XDP & eBPF CO-RE):** Paketler ve sistem çağrıları TCP/IP yığınına girmeden doğrudan NIC sürücüsünde filtrelenir. `BPF_MAP_TYPE_LRU_HASH` yapısı ile bellek sızıntısı ve DoS riski engellenir.
* **User Space (FastAPI & MCP Gateway):** OWASP güvenlik başlıkları, JWT (OAuth2) kimlik doğrulama, RBAC/ABAC yetkilendirme, SlowAPI rate limiting ve Prometheus (`/metrics`) telemetrisi.

---

## 🐳 Coolify / Docker Compose ile Canlıya Alma

Agent-eBPF, **Coolify** veya herhangi bir Docker sunucusu üzerinde eBPF yetkileri (`CAP_BPF`, `CAP_NET_ADMIN`) ile tek tıkla canlıya alınabilir.

```bash
docker compose -f docker-compose.coolify.yml up -d
```

### Çevre Değişkenleri (`.env`)

```env
POSTGRES_PASSWORD=UltraSecurePostgresPass2026!
REDIS_PASSWORD=UltraSecureRedisPass2026!
JWT_SECRET_KEY=9a8f7c6e5d4c3b2a10987654321fedcba9876543210123456789abcdef012345
XDP_INTERFACE=eth0
ENVIRONMENT=production
```

---

## 💻 CLI Arayüzü (Typer & Rich)

Geliştiriciler ve sistem yöneticileri için komut satırı arayüzü:

```bash
# eBPF C Bytecode derleme
python cli.py build

# Çekirdeğe BPF programını yükleme ve XDP bağlama
python cli.py load --interface eth0

# Çekirdek istatistiklerini ve paket sayaçlarını sorgulama
python cli.py status

# RingBuffer ihlal akışını canlı izleme
python cli.py events
```

---

## 🧪 Test ve Doğrulama

Sistem testlerini çalıştırmak için:

```bash
python -m pytest tests/
```

* **15 Passed Test:** BPF Loader, Ctypes arayüzü, FastAPI OAuth2/JWT yetkilendirme ve MCP REST uç noktalarının doğrulama testleri.

---

## 📄 Lisans

Bu proje **MIT Lisansı** altında sunulmaktadır. Detaylı bilgi için [LICENSE](file:///c:/Users/win10/sysauto.org/Sysauto.org/Agent-eBPF/LICENSE) dosyasına göz atabilirsiniz.
