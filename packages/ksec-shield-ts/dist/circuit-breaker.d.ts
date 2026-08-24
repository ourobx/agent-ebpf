import { ActionType, PolicyRule } from './types.js';
import { KsecSecurityViolationError } from './errors.js';
export { KsecSecurityViolationError };
export declare class PolicyCache {
    private cache;
    private failureCount;
    private lastFailureTime;
    private readonly failureThreshold;
    private readonly cooldownPeriodMs;
    private makeKey;
    setRule(rule: PolicyRule): void;
    setRules(rules: PolicyRule[]): void;
    evaluate(actionType: ActionType, target: string): {
        decision: 'ALLOW' | 'BLOCK';
        rule?: PolicyRule;
    };
    recordFailure(): void;
    recordSuccess(): void;
    isCircuitOpen(): boolean;
    clear(): void;
}
//# sourceMappingURL=circuit-breaker.d.ts.map