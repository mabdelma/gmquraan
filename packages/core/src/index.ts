/**
 * GM-OS domain rules.
 *
 * The controlled package at /gmos is the authority; this is its executable
 * half. Nothing here reaches the database or the network — it is pure policy,
 * so the portal and the background orchestrator enforce exactly the same rules
 * and can both be tested without either.
 */
export * from "./config.js";
export * from "./naming.js";
export * from "./lifecycle.js";
export * from "./autonomy.js";
export * from "./access.js";
export * from "./org.js";
export * from "./hr.js";
export * from "./agents.js";
export * from "./workspace.js";
export * from "./packs.js";
export * from "./permissions.js";
export * from "./storage.js";
export * from "./folders.js";
export * from "./totp.js";
export * from "./crm.js";
export * from "./compensation.js";
export * from "./imap-auth.js";
export * from "./tenancy.js";

export * from "./company.js";

export * from "./audit.js";

export * from "./workflow.js";

export * from "./jurisdiction.js";

export * from "./money.js";

export * from "./ledger.js";

export * from "./receivables.js";
