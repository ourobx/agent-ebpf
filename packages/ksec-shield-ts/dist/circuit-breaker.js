"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyCache = exports.KsecSecurityViolationError = void 0;
class KsecSecurityViolationError extends Error {
    actionType;
    target;
    ruleId;
    constructor(message, actionType, target, ruleId) {
        super(message);
        this.name = 'KsecSecurityViolationError';
        this.actionType = actionType;
        this.target = target;
        this.ruleId = ruleId;
        Object.setPrototypeOf(this, KsecSecurityViolationError.prototype);
    }
}
exports.KsecSecurityViolationError = KsecSecurityViolationError;
class PolicyCache {
    cache = new Map();
    failureCount = 0;
    lastFailureTime = 0;
    failureThreshold = 5;
    cooldownPeriodMs = 15000;
    makeKey(actionType, target) {
        return `${actionType}:${target.toLowerCase()}`;
    }
    setRule(rule) {
        const key = this.makeKey(rule.actionType, rule.target);
        const ttlMs = (rule.ttlSeconds || 300) * 1000;
        this.cache.set(key, {
            rule,
            expiresAt: Date.now() + ttlMs,
        });
    }
    setRules(rules) {
        for (const rule of rules) {
            this.setRule(rule);
        }
    }
    evaluate(actionType, target) {
        const key = this.makeKey(actionType, target);
        const entry = this.cache.get(key);
        if (entry) {
            if (Date.now() <= entry.expiresAt) {
                return { decision: entry.rule.decision, rule: entry.rule };
            }
            this.cache.delete(key);
        }
        // Default to allow if no specific block rule is matched in local cache
        return { decision: 'ALLOW' };
    }
    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
    }
    recordSuccess() {
        this.failureCount = 0;
    }
    isCircuitOpen() {
        if (this.failureCount >= this.failureThreshold) {
            if (Date.now() - this.lastFailureTime < this.cooldownPeriodMs) {
                return true;
            }
            // Half-open attempt
            this.failureCount = Math.floor(this.failureThreshold / 2);
        }
        return false;
    }
    clear() {
        this.cache.clear();
    }
}
exports.PolicyCache = PolicyCache;
//# sourceMappingURL=circuit-breaker.js.map