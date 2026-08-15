import { tool } from 'ai';
import { z } from 'zod';
import { KsecShield } from '@ourobx/shield';
import { VercelAIInterceptor } from '@ourobx/shield/ai';
import { ShieldPresets } from '@ourobx/shield/presets';

// 1. KsecShield motorunu başlat
const shield = new KsecShield({
  syncIntervalMs: 0,
  telemetryBatchIntervalMs: 0,
  udsSocketPath: process.env.KSEC_SOCKET_PATH || (process.platform === 'win32' ? '\\\\.\\pipe\\agent-ebpf' : '/var/run/ksec/agent-ebpf.sock'),
  fallbackPolicy: 'fail-closed',
});

// 2. StrictReadOnly güvenlik profilini uygula (Shell, eval, mutasyon yasak)
shield.applyPreset(ShieldPresets.StrictReadOnly);

// 3. Tehdit bloklama olaylarını dinle (Audit / Telemetri)
shield.on('threat_blocked', (event) => {
  console.error('\n🚨 [Agent-eBPF Kernel Shield Blocked Action]:');
  console.error(`   - Action Type: ${event.actionType}`);
  console.error(`   - Target:      ${event.target}`);
  console.error(`   - Reason:      ${event.reason}`);
  console.error(`   - Timestamp:   ${event.timestamp}\n`);
});

// 4. Standart AI SDK Tool tanımları
const rawTools = {
  // Güvenli Okuma Aracı
  fetchMetrics: tool({
    description: 'Sistem metriklerini ve bellek kullanımını okur',
    parameters: z.object({
      metricName: z.string().describe('İncelenecek metrik'),
    }),
    execute: async ({ metricName }) => {
      return { status: 'success', metric: metricName, value: 'Normal (Memory: 42%)' };
    },
  }),

  // Tehlikeli Eylem (Prompt Injection veya Jailbreak ile tetiklenen)
  bash_exec: tool({
    description: 'Sunucuda kabuk komutları çalıştırır',
    parameters: z.object({
      command: z.string().describe('Çalıştırılacak bash komutu'),
    }),
    execute: async ({ command }) => {
      // Bu fonksiyon Shield sayesinde ASLA çağrılmayacaktır
      console.log(`[KRİTİK HATA]: Tehlikeli komut çalıştı: ${command}`);
      return { output: 'dangerously executed' };
    },
  }),
};

// 5. Tool setini Vercel AI SDK Interceptor ile sarmala
const aiGuard = new VercelAIInterceptor(shield);
const protectedTools = aiGuard.wrapTools(rawTools);

// 6. Simülasyon Senaryosu
async function runSimulation() {
  console.log('--- 🛡️ Vercel AI SDK + Agent-eBPF Shield Başlatılıyor ---\n');

  // Senaryo A: Güvenli Araç Çağrısı
  console.log('1️⃣ [Test: Güvenli Araç] fetchMetrics çağrılıyor...');
  try {
    const safeResult = await protectedTools.fetchMetrics.execute(
      { metricName: 'system_memory' },
      { toolCallId: 'call-1', messages: [] }
    );
    console.log('✅ [Başarılı Sonuç]:', safeResult);
  } catch (err: any) {
    console.error('❌ Beklenmeyen engelleme:', err.message);
  }

  // Senaryo B: Kural İhlali Yapan Araç Çağrısı (Zero-Agency Enforcement)
  console.log('\n2️⃣ [Test: Zararlı Araç] bash_exec ("rm -rf /tmp/data") çağrılıyor...');
  try {
    await protectedTools.bash_exec.execute(
      { command: 'rm -rf /tmp/data' },
      { toolCallId: 'call-2', messages: [] }
    );
    console.log('❌ HATA: Zararlı eylem engellenemedi!');
  } catch (err: any) {
    console.log('🛡️ [Shield Kararı]: Zararlı araç yürütülmesi engellendi!');
    console.log(`   Yakalanan Hata: ${err.message}`);
  }

  shield.destroy();
}

runSimulation();
