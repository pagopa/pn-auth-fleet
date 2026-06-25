import { createAuditLogger } from "pn-auth-common-ts";

// FIMS audit logger: shares the audit log shape with the other lambdas, only
// the logger_name differs.
export const auditLog = createAuditLogger("fims");
