export class ShieldPresets {
    /**
     * Yalnızca okuma izinli mod: Dosya modifikasyonu, tehlikeli kabuk komutları ve silme işlemlerini engeller.
     */
    static StrictReadOnly = [
        {
            actionType: 'tool_execution',
            pattern: /^(bash_exec|sh|exec|eval|rm_rf|write_file|delete_file|modify_env)$/i,
            decision: 'BLOCK',
            reason: '[StrictReadOnly] Modifying actions and shell executions are prohibited',
        },
        {
            actionType: 'file_system',
            pattern: /^(unlink|rmdir|rename|chmod|chown|write|delete)$/i,
            decision: 'BLOCK',
            reason: '[StrictReadOnly] Filesystem mutations are blocked by kernel policy',
        },
        {
            actionType: 'system_call',
            pattern: /^(unlink|rmdir|rename|chmod|chown)$/i,
            decision: 'BLOCK',
            reason: '[StrictReadOnly] Filesystem mutations are blocked by kernel policy',
        },
    ];
    /**
     * Dış ağ çıkışını tamamen kapatan profil: Veri sızıntısını (exfiltration) %100 engeller.
     */
    static NoOutboundNetwork = [
        {
            actionType: 'network_egress',
            pattern: /.*/,
            decision: 'BLOCK',
            reason: '[NoOutboundNetwork] All egress network connections are prohibited',
        },
        {
            actionType: 'network_request',
            pattern: /.*/,
            decision: 'BLOCK',
            reason: '[NoOutboundNetwork] All egress network connections are prohibited',
        },
    ];
    /**
     * Güvenli Web Tarama: Yalnızca HTTP/HTTPS GET isteklerine izin verir, yerel ağ/loopback sızmalarını engeller.
     */
    static SafeWebBrowsing = [
        {
            actionType: 'network_egress',
            pattern: /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1]))/i,
            decision: 'BLOCK',
            reason: '[SafeWebBrowsing] SSRF and Private subnet access blocked',
        },
        {
            actionType: 'network_request',
            pattern: /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1]))/i,
            decision: 'BLOCK',
            reason: '[SafeWebBrowsing] SSRF and Private subnet access blocked',
        },
        {
            actionType: 'tool_execution',
            pattern: /^(curl|wget|nc|ncat|netcat|ssh|scp)$/i,
            decision: 'BLOCK',
            reason: '[SafeWebBrowsing] Raw socket utilities blocked',
        },
    ];
}
//# sourceMappingURL=index.js.map