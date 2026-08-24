import { SchemaValidationError, SecurityViolationError, TenantIsolationError } from './errors.js';

export interface SchemaValidator<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: any };
}

export class DeterminismEngine {
  private static readonly UNSAFE_SQL_PATTERNS = [
    /\bDROP\b/i,
    /\bTRUNCATE\b/i,
    /\bALTER\b/i,
    /\bGRANT\b/i,
    /\bREVOKE\b/i
  ];

  private static readonly DANGEROUS_CODE_PATTERNS = [
    /\beval\s*\(/i,
    /\bexec\s*\(/i,
    /\bFunction\s*\(/i,
    /\bchild_process\b/i,
    /\bprocess\.exit\b/i,
    /\bfs\.(unlink|rmdir|rm)\b/i
  ];

  /**
   * Validates schema integrity using Zod or standard JSON schema validators in microsecond speeds.
   */
  static validateSchema<T>(data: unknown, schema: SchemaValidator<T>): T {
    const result = schema.safeParse(data);
    if (!result.success) {
      throw new SchemaValidationError("JSON şema uyumsuzluğu tespit edildi.", result.error);
    }
    return result.data;
  }

  /**
   * Analyzes generated SQL queries in-memory (<1ms):
   * 1. Blocks destructive DDL/DCL commands (DROP, TRUNCATE, etc.).
   * 2. Blocks disastrous UPDATE or DELETE queries lacking a WHERE clause.
   * 3. Verifies required tenant_id matching for Multi-Tenant RLS isolation.
   */
  static inspectSql(sqlQuery: string, requiredTenantId?: string): boolean {
    const cleanQuery = sqlQuery.trim();

    // 1. Destructive DDL/DCL command inspection
    for (const pattern of this.UNSAFE_SQL_PATTERNS) {
      if (pattern.test(cleanQuery)) {
        throw new SecurityViolationError(`Yasaklı SQL komutu tespit edildi: ${pattern.source}`);
      }
    }

    // 2. Unbounded UPDATE / DELETE inspection (Silent disaster prevention)
    const isUpdate = /^UPDATE\b/i.test(cleanQuery);
    const isDelete = /^DELETE\b/i.test(cleanQuery);

    if ((isUpdate || isDelete) && !/\bWHERE\b/i.test(cleanQuery)) {
      throw new SecurityViolationError("WHERE koşulu barındırmayan UPDATE veya DELETE sorgusu engellendi.");
    }

    // 3. Multi-Tenant RLS Isolation check
    if (requiredTenantId) {
      const tenantRegex = new RegExp(`tenant_id\\s*=\\s*['"]?${requiredTenantId}['"]?`, "i");
      if (!tenantRegex.test(cleanQuery)) {
        throw new TenantIsolationError(
          `Tenant izolasyon ihlali: Sorguda zorunlu tenant_id ('${requiredTenantId}') bulunamadı.`
        );
      }
    }

    return true;
  }

  /**
   * Scans generated JavaScript/TypeScript code for dangerous execution patterns (<1ms).
   */
  static inspectCode(codeStr: string): boolean {
    for (const pattern of this.DANGEROUS_CODE_PATTERNS) {
      if (pattern.test(codeStr)) {
        throw new SecurityViolationError(`Yasaklı kod çalıştırma kalıbı engellendi: ${pattern.source}`);
      }
    }
    return true;
  }
}
