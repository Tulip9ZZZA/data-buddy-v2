import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Persisted audit metadata only. Original file bytes remain out of the database. */
export const auditReports = mysqlTable(
  "auditReports",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: int("userId").notNull(),
    datasetName: varchar("datasetName", { length: 255 }).notNull(),
    sourceFormat: varchar("sourceFormat", { length: 24 }).notNull(),
    rowCount: int("rowCount").notNull(),
    columnCount: int("columnCount").notNull(),
    completeness: int("completeness").notNull(),
    status: mysqlEnum("status", ["draft", "saved", "reviewed"])
      .default("saved")
      .notNull(),
    blockerCount: int("blockerCount").notNull(),
    reviewCount: int("reviewCount").notNull(),
    infoCount: int("infoCount").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("auditReports_user_created_idx").on(table.userId, table.createdAt),
  ]
);

/** Rule-level evidence is saved only after the user explicitly chooses to save an audit. */
export const auditFindings = mysqlTable(
  "auditFindings",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    reportId: varchar("reportId", { length: 36 }).notNull(),
    ruleId: varchar("ruleId", { length: 200 }).notNull(),
    severity: mysqlEnum("severity", ["blocker", "review", "info"]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    columnName: varchar("columnName", { length: 255 }),
    affectedCount: int("affectedCount").notNull(),
    evidenceJson: text("evidenceJson").notNull(),
    remediationAction: varchar("remediationAction", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("auditFindings_report_idx").on(table.reportId)]
);

export const auditRemediations = mysqlTable(
  "auditRemediations",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    reportId: varchar("reportId", { length: 36 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    ledgerJson: text("ledgerJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("auditRemediations_report_idx").on(table.reportId)]
);

export type AuditReport = typeof auditReports.$inferSelect;
export type AuditFinding = typeof auditFindings.$inferSelect;
export type AuditRemediation = typeof auditRemediations.$inferSelect;
