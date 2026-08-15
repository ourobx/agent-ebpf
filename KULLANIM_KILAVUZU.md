# 🛡️ Agent-eBPF · Son Kullanıcı Kullanım Kılavuzu

**Yapay Zeka Ajanları için Kodsuz, Sıfır Gecikmeli Linux Çekirdek Güvenliği ve Bilişsel Zihin Platformu**

---

## ⚡ 1. Hızlı Başlangıç (1-Tıkla Çalıştırma)

### 🪟 Windows Kullanıcıları İçin:
1. Klasördeki **`start.bat`** dosyasına **çift tıklayın**.
2. Sistem otomatik olarak gereksinimleri kontrol eder ve **tarayıcınızda yönetim panelini (`http://localhost:8000`) açar**.

### 🐧 Linux / macOS Kullanıcıları İçin:
Terminalde aşağıdaki komutu çalıştırmanız yeterlidir:
```bash
./start.sh
# veya: python3 run.py
```

### 🐳 Docker / Coolify ile Dağıtım:
```bash
docker compose up -d
```

---

## 🔑 2. Yönetim Paneline Giriş Yapma

1. Tarayıcınızda açılan ekranda **"Hızlı Demo Girişi (1-Tık)"** butonuna tıklayarak anında panele giriş yapabilirsiniz.
2. Veya kendi kurumsal OAuth2 / JWT kimlik bilgilerinizi girerek **"Güvenli Giriş Yap"** diyebilirsiniz.

---

## 🎛️ 3. Yönetim Paneli Özellikleri

### 🛡️ A) Genel Bakış & 1-Tık Kernel Zırhı
- **Kalkan Aç/Kapat:** Ekranın en üstündeki büyük anahtar ile tek tıkla yapay zeka korumasını aktif edin veya durdurun.
- **Canlı Metrikler:** Engellenen tehdit sayısını, mikro-saniye bazlı inceleme hızını (`<32µs`) ve sistem durumunu anlık izleyin.

### 🧠 B) Bilişsel Zihin & Sesli Yol Arkadaşı
- **Duygu Durumu Göstergesi:** Ajanınızın neşe, merak, sakinlik ve rezonans seviyelerini renkli barlar üzerinden takip edin.
- **Canlı Bilinç Akışı:** Ajanın arka planda ne düşündüğünü, gözlemlerini ve niyetini okuyun.
- **Canlı Sohbet & Sesli Yanıt:** Örnek butonlara basarak veya kendi cümlenizi yazarak ajanın yanıtını görün ve **`🔊 Seslendir`** butonuna basarak duygulu insan tonunda dinleyin.

### 🔒 C) Görsel Güvenlik Kuralları
Kod yazmadan, sadece anahtarlarla güvenlik ilkelerini yönetin:
- ✅ *WHERE Koşulsuz Toplu Silmeleri / Güncellemeleri Engelle*
- ✅ *Kiracı İzolasyonunu Zorunlu Kıl (Tenant ID)*
- ✅ *İzinsiz Alt İşlem Başlatmayı Engelle (execve / ptrace)*
- ✅ *Aceleci veya Öfkeli Komutlarda Tereddüt Et ve Onay İste*

### ⚡ D) 1-Tık Bağlantı Merkezi (Entegrasyon)
- **Cursor & Claude:** Tek tıkla JSON kopyalayıp asistanınıza güvenlik yeteneği kazandırın.
- **Python (LangChain / CrewAI / FastAPI):** `@guard` dekoratörü ile veritabanı fonksiyonlarınızı koruyun.
- **Node.js:** Tek satır import ile otomatik koruma sağlayın.

---

## 🧪 4. Sistem Testleri & Sağlık Kontrolü

Sistemin tam ve hatasız çalıştığını doğrulamak için:
```bash
pytest -v
```
Tüm 75 test `PASSED` olarak yeşil dönecektir.

---

*Sysauto.org © 2026 · Kurumsal Seviye Otonom Yapay Zeka Altyapısı*
