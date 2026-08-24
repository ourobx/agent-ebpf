# 📑 KSEC v2.0 — Pilot Design Partner Package

Bu paket, **ilk 3 AI Startup Design Partner'ı** kapalı pilota alırken kullanılacak **1 Sayfalık Veri İşleme Sözleşmesi (DPA)**, **Soğuk Outreach E-posta Şablonu** ve **15 Dakikalık Canlı Demo Senaryosu**nu içerir.

---

## 📧 1. Soğuk Outreach E-posta Şablonu (AI Startup Kurucuları / CISO için)

**Konu:** LangChain / AI Ajanınız Postgres'e `'; DROP TABLE` atarsa ne olur?

> Selam **[İsim]**,
>
> **[Şirket Adı]** bünyesinde geliştirdiğiniz AI ajanlarının veritabanı ve dış API'larla doğrudan etkileşime girdiğini gördüm.
>
> Geleneksel WAF'lar ve Datadog, LLM ile PostgreSQL arasındaki tel (wire) trafiğini göremez; sidecar proxy'ler ise 15–50 ms ek gecikme yaratır.
>
> Biz **KSEC (ksec.space)** ile Linux çekirdeğinde (Ring-0 / eBPF) çalışan, **~8µs ortalama gecikmeyle** çalışan bir güvenlik kalkanı geliştirdik:
> 1. LLM Prompt Injection veya yetkisiz `DROP/DELETE` sorgusu gönderdiğinde işlem veritabanına ulaşmadan **5.8µs'de kesilir.**
> 2. TCP soketine anında otomatik `ROLLBACK;` basılır.
> 3. Hiçbir `privileged: true` veya root yetkisi gerekmez (Sadece `CAP_BPF`).
>
> 15 dakikalık bir Kind/EKS oturumunda canlı **Proof-of-Hack** demosunu göstermek ve sizi **Kapalı Pilot (Design Partner)** programımıza davet etmek isteriz.
>
> Bu hafta 15 dakikanız var mı?
>
> Sevgiler,  
> **KSEC Engineering Ekibi**  
> `pilot@ksec.space` • [https://ksec.space](https://ksec.space)

---

## 📜 2. 1 Sayfalık Veri İşleme & Pilot Sözleşmesi (DPA / Pilot Agreement)

### KSEC Zero-Data-Retention Pilot Sözleşmesi Özeti

**1. Kapsam ve Çalışma Prensibi:**
* KSEC eBPF Agent, Müşteri'nin Kubernetes kümesinde yerel (local daemonset) olarak çalışır.
* Veritabanı sorguları ve yükler (payloads) Müşteri'nin kendi Linux çekirdek belleğinde (Ring-0) denetlenir.
* Müşteri verileri, SQL tabloları veya PII içerikleri KSEC sunucularına **ASLA aktarılmaz veya saklanmaz (Zero-Data Retention).**

**2. Telemetri ve Loglar:**
* KSEC yalnızca kriptografik denetim meta verilerini (Zaman damgası, Gecikme süresi, Karar: `PASS/DROP`, AST SHA-256 özeti) Müşteri'nin kendi tahsis edilmiş ClickHouse / S3 kasasına şifreli olarak iletir.

**3. Güvenlik ve İzolasyon:**
* Agent, Linux 5.15+ çekirdek standartlarına uygun olarak `CAP_BPF` ve `CAP_NET_ADMIN` yetkileriyle izole çalışır; ana makineye root veya `privileged: true` erişimi talep etmez.

**4. Pilot Süresi ve Taahhüt:**
* Pilot süresi 30 gündür. Müşteri bu süre boyunca sistemi ücretsiz kullanır; karşılığında haftalık 15 dakikalık mimari geri bildirim sağlamayı ve pilot bitiminde vaka analizi (case study) logosu paylaşmayı taahhüt eder.

---

## ⏱️ 3. 15 Dakikalık Canlı Demo Akışı (Execution Plan)

```
[00:00 - 03:00] Tanışma & Acı Noktası: "AI ajanlarınızın veritabanı yetkilerini nasıl izole ediyorsunuz?"
[03:00 - 07:00] 1-Tık Kurulum: `helm install ksec-shield ./deploy/helm/ksec-shield` (30 saniye)
[07:00 - 11:00] Proof-of-Hack: `python demo/proof_of_hack_langchain.py`
                - İzinli SELECT: ~19µs PASS
                - Prompt Injection DROP TABLE: 5.80µs DROP + Sokete anında ROLLBACK
                - Adli Hasar Raporu: 8.5M kayıt ve 4.5 saatlik RTO kesintisi önlendi
[11:00 - 15:00] Pilot Başlatma: Kendi staging cluster'larına Secret bağlama ve kapanış.
```
