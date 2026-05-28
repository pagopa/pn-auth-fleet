import { createLogger, LogLevel } from "bunyan";

export const AUD_TYPE = "AUD_ACC_LOGIN";
export type AuditLogStatus = "OK" | "KO";

const LOG_LEVEL_MAP: Record<
  AuditLogStatus,
  { level: LogLevel; value: number }
> = {
  OK: { level: "info", value: 20000 },
  KO: { level: "warn", value: 40000 },
};

const statusPrefixMap: Record<AuditLogStatus, string> = {
  KO: "KO - FAILURE",
  OK: "OK - SUCCESS",
};

type AuditLogProps = {
  message?: string;
  aud_orig?: string;
  status?: AuditLogStatus;
  cx_type?: string;
  cx_id?: string;
  uid?: string;
  jti?: string;
  request_id: string;
};

export function auditLog({
  message = "",
  aud_orig,
  status,
  cx_type,
  cx_id,
  uid,
  jti,
  request_id,
}: AuditLogProps) {
  const statusPrefix =
    statusPrefixMap[status as keyof typeof statusPrefixMap] ?? "INFO";
  const statusMessage = `${statusPrefix} - ${message}`;
  const { level, value } =
    LOG_LEVEL_MAP[status as keyof typeof LOG_LEVEL_MAP] || LOG_LEVEL_MAP.OK;

  return createLogger({
    name: "AUDIT_LOG",
    message: `[${AUD_TYPE}] - ${statusMessage}`,
    aud_type: AUD_TYPE,
    aud_orig,
    level,
    level_value: value,
    logger_name: "oidc",
    uid,
    cx_type,
    cx_id,
    trace_id: process.env._X_AMZN_TRACE_ID,
    request_id,
    tags: ["AUDIT10Y"],
    jti,
  });
}
