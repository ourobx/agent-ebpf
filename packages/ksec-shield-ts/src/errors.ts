/**
 * Tier-1 Type-Safe Error Hierarchy & Veto Exception Classes for @ourobx/shield SDK.
 */

export type ErrorCode =
  | 'MISSING_API_KEY'
  | 'AUTHENTICATION_FAILED'
  | 'FORBIDDEN_SCOPE'
  | 'RATE_LIMITED'
  | 'TIMEOUT_ERROR'
  | 'STREAM_CONNECTION_FAILED'
  | 'NETWORK_FAILURE'
  | 'MAX_RETRIES_EXCEEDED'
  | 'SECURITY_VIOLATION'
  | 'SCHEMA_VALIDATION_ERROR'
  | 'TENANT_ISOLATION_ERROR'
  | 'API_ERROR';

export class KsecShieldError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly isKsecShieldError = true;

  constructor(message: string, code: ErrorCode = 'API_ERROR', status: number = 500) {
    super(message);
    this.name = 'KsecShieldError';
    this.code = code;
    this.status = status;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KsecShieldError);
    }
    Object.setPrototypeOf(this, KsecShieldError.prototype);
  }
}

export class KsecSecurityViolationError extends KsecShieldError {
  readonly actionType: string;
  readonly target: string;
  readonly ruleId?: string;

  constructor(message: string, actionType: string = 'unknown', target: string = 'unknown', ruleId?: string) {
    super(message, 'SECURITY_VIOLATION', 403);
    this.name = 'KsecSecurityViolationError';
    this.actionType = actionType;
    this.target = target;
    this.ruleId = ruleId;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KsecSecurityViolationError);
    }
    Object.setPrototypeOf(this, KsecSecurityViolationError.prototype);
  }
}

export class VetoException extends Error {
  readonly isVetoException = true;
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string = 'VETO_EXCEPTION', status: number = 422) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VetoException);
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SchemaValidationError extends VetoException {
  readonly details: any;

  constructor(message: string, details: any) {
    super(message, 'SCHEMA_VALIDATION_ERROR', 422);
    this.details = details;
  }
}

export class SecurityViolationError extends VetoException {
  constructor(message: string) {
    super(message, 'SECURITY_VIOLATION', 422);
  }
}

export class TenantIsolationError extends VetoException {
  constructor(message: string) {
    super(message, 'TENANT_ISOLATION_ERROR', 422);
  }
}
