import { ActionType } from '../types.js';
export type RuleAction = 'ALLOW' | 'BLOCK' | 'AUDIT';
export interface ShieldRule {
    id?: string;
    pattern: RegExp | string;
    actionType: ActionType | string;
    decision: RuleAction;
    reason?: string;
}
export interface RuleEvaluationResult {
    allowed: boolean;
    decision: RuleAction;
    rule?: ShieldRule;
    reason?: string;
}
/**
 * Fast-Path In-Memory Evaluation Engine.
 * Evaluates actions in < 0.02ms using optimized pattern matching.
 */
export declare class FastPathEngine {
    private rules;
    constructor(initialRules?: ShieldRule[]);
    addRule(rule: ShieldRule): void;
    setRules(rules: ShieldRule[]): void;
    clear(): void;
    getRules(): readonly ShieldRule[];
    /**
     * Evaluates an incoming action against loaded rules synchronously with zero network overhead.
     */
    evaluate(actionType: string, target: string): RuleEvaluationResult;
}
//# sourceMappingURL=in-memory-matcher.d.ts.map