import { ActionType, PolicyRule } from './types.js';

export class KsecSecurityViolationError extends Error {
  public readonly actionType: ActionType;
  public readonly target: string;
  public readonly ruleId?: string;

  constructor(message: string, actionType: ActionType, target: string, ruleId?: string) {
    super(message);
    this.name = 'KsecSecurityViolationError';
    this.actionType = actionType;
    this.target = target;
    this.ruleId = ruleId;
    Object.setPrototypeOf(this, KsecSecurityViolationError.prototype);
  }
}

interface CacheEntry {
  rule: PolicyRule;
  expiresAt: number;
}

export class PolicyCache {
  private cache = new Map<string, CacheEntry>();
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly cooldownPeriodMs = 15000;

  private makeKey(actionType: ActionType, target: string): string {
    return `${actionType}:${target.toLowerCase()}`;
  }

  public setRule(rule: PolicyRule): void {
    const key = this.makeKey(rule.actionType, rule.target);
    const ttlMs = (rule.ttlSeconds || 300) * 1000;
    this.cache.set(key, {
      rule,
      expiresAt: Date.now() + ttlMs,
    });
  }

  public setRules(rules: PolicyRule[]): void {
    for (const rule of rules) {
      this.setRule(rule);
    }
  }

  public evaluate(actionType: ActionType, target: string): { decision: 'ALLOW' | 'BLOCK'; rule?: PolicyRule } {
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

  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }

  public recordSuccess(): void {
    this.failureCount = 0;
  }

  public isCircuitOpen(): boolean {
    if (this.failureCount >= this.failureThreshold) {
      if (Date.now() - this.lastFailureTime < this.cooldownPeriodMs) {
        return true;
      }
      // Half-open attempt
      this.failureCount = Math.floor(this.failureThreshold / 2);
    }
    return false;
  }

  public clear(): void {
    this.cache.clear();
  }
}
