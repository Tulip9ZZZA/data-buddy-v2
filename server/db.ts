import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditFindings,
  auditRemediations,
  auditReports,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export type StoredFindingInput = {
  id: string;
  ruleId: string;
  severity: "blocker" | "review" | "info";
  title: string;
  description: string;
  columnName?: string;
  affectedCount: number;
  evidenceJson: string;
  remediationAction?: string;
};

export type StoredAuditInput = {
  id: string;
  userId: number;
  datasetName: string;
  sourceFormat: string;
  rowCount: number;
  columnCount: number;
  completeness: number;
  status: "draft" | "saved" | "reviewed";
  blockerCount: number;
  reviewCount: number;
  infoCount: number;
  findings: StoredFindingInput[];
  remediation?: { id: string; action: string; ledgerJson: string };
};

export async function saveAuditReport(input: StoredAuditInput) {
  const db = await getDb();
  if (!db)
    throw new Error(
      "Database is unavailable. Try saving the audit again shortly."
    );
  await db.transaction(async tx => {
    await tx.insert(auditReports).values({
      id: input.id,
      userId: input.userId,
      datasetName: input.datasetName,
      sourceFormat: input.sourceFormat,
      rowCount: input.rowCount,
      columnCount: input.columnCount,
      completeness: input.completeness,
      status: input.status,
      blockerCount: input.blockerCount,
      reviewCount: input.reviewCount,
      infoCount: input.infoCount,
    });
    if (input.findings.length) {
      await tx.insert(auditFindings).values(
        input.findings.map(finding => ({
          id: finding.id,
          reportId: input.id,
          ruleId: finding.ruleId,
          severity: finding.severity,
          title: finding.title,
          description: finding.description,
          columnName: finding.columnName ?? null,
          affectedCount: finding.affectedCount,
          evidenceJson: finding.evidenceJson,
          remediationAction: finding.remediationAction ?? null,
        }))
      );
    }
    if (input.remediation) {
      await tx.insert(auditRemediations).values({
        id: input.remediation.id,
        reportId: input.id,
        action: input.remediation.action,
        ledgerJson: input.remediation.ledgerJson,
      });
    }
  });
  return { id: input.id };
}

export async function listAuditReports(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(auditReports)
    .where(eq(auditReports.userId, userId))
    .orderBy(desc(auditReports.createdAt))
    .limit(20);
}
