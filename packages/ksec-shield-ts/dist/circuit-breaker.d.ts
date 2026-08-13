import { ActionType, PolicyRule } from './types.js';
export declare class KsecSecurityViolationError extends Error {
    readonly actionType: ActionType;
    readonly target: string;
    readonly ruleId?: string;
    constructor(message: string, actionType: ActionType, target: string, ruleId?: string);
}
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