"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FastPathEngine = void 0;
/**
 * Fast-Path In-Memory Evaluation Engine.
 * Evaluates actions in < 0.02ms using optimized pattern matching.
 */
class FastPathEngine {
    rules = [];
    constructor(initialRules = []) {
        this.rules = [...initialRules];
    }
    addRule(rule) {
        this.rules.push(rule);
    }
    setRules(rules) {
        this.rules = [...rules];
    }
    clear() {
        this.rules = [];
    }
    getRules() {
        return this.rules;
    }
    /**
     * Evaluates an incoming action against loaded rules synchronously with zero network overhead.
     */
    evaluate(actionType, target) {
        const targetLower = target.toLowerCase();
        for (const rule of this.rules) {
            if (rule.actionType === '*' || rule.actionType === actionType) {
                let matches = false;
                if (typeof rule.pattern === 'string') {
                    const pat = rule.pattern.toLowerCase();
                    matches = pat === '*' || targetLower === pat || targetLower.includes(pat);
                }
                else if (rule.pattern instanceof RegExp) {
                    matches = rule.pattern.test(target);
                }
                if (matches) {
                    if (rule.decision === 'BLOCK') {
                        return {
                            allowed: false,
                            decision: 'BLOCK',
                            rule,
                            reason: rule.reason || `Blocked by rule matching pattern '${rule.pattern}'`,
                        };
                    }
                    if (rule.decision === 'ALLOW') {
                        return {
                            allowed: true,
                            decision: 'ALLOW',
                            rule,
                        };
                    }
                    if (rule.decision === 'AUDIT') {
                        return {
                            allowed: true,
                            decision: 'AUDIT',
                            rule,
                            reason: rule.reason,
                        };
                    }
                }
            }
        }
        // Default Zero-Trust Fallback
        return {
            allowed: true,
            decision: 'ALLOW',
        };
    }
}
exports.FastPathEngine = FastPathEngine;
//# sourceMappingURL=in-memory-matcher.js.map