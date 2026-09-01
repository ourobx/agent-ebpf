import type { ShieldRule } from '../engine/in-memory-matcher.js';
export declare class ShieldPresets {
    /**
     * Yalnızca okuma izinli mod: Dosya modifikasyonu, tehlikeli kabuk komutları ve silme işlemlerini engeller.
     */
    static readonly StrictReadOnly: ShieldRule[];
    /**
     * Dış ağ çıkışını tamamen kapatan profil: Veri sızıntısını (exfiltration) %100 engeller.
     */
    static readonly NoOutboundNetwork: ShieldRule[];
    /**
     * Safe Web Browsing: Permits only HTTP/HTTPS GET requests, blocking local network/loopback SSRF leaks.
     */
    static readonly SafeWebBrowsing: ShieldRule[];
}
//# sourceMappingURL=index.d.ts.map