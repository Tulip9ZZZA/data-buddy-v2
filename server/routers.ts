import { COOKIE_NAME } from "@shared/const";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const assistantInput = z.object({
  goal: z.string().trim().min(3).max(500),
  profile: z.object({
    datasetName: z.string().trim().min(1).max(160),
    rowCount: z.number().int().nonnegative(),
    columnCount: z.number().int().nonnegative(),
    completeness: z.number().min(0).max(100),
    duplicateCount: z.number().int().nonnegative(),
    columns: z.array(z.object({
      name: z.string().max(160),
      inferredType: z.enum(["Text", "Number", "Date", "Boolean"]),
      nullCount: z.number().int().nonnegative(),
      uniqueCount: z.number().int().nonnegative(),
      issue: z.string().optional(),
    })).max(120),
  }),
});

const assistantPlanSchema = z.object({
  summary: z.string().max(420),
  steps: z.array(z.object({
    title: z.string().max(100),
    detail: z.string().max(240),
    risk: z.enum(["safe", "review"]),
  })).min(2).max(4),
  caution: z.string().max(300),
});

const persistedEvidence = z.object({
  rowNumber: z.number().int().positive(),
  column: z.string().max(255).optional(),
  value: z.string().max(1000),
  message: z.string().max(1000),
});

const persistedAuditInput = z.object({
  datasetName: z.string().trim().min(1).max(255),
  sourceFormat: z.enum(["csv", "excel", "json", "example", "unknown"]),
  rowCount: z.number().int().nonnegative(),
  columnCount: z.number().int().nonnegative(),
  completeness: z.number().int().min(0).max(100),
  counts: z.object({ blocker: z.number().int().nonnegative(), review: z.number().int().nonnegative(), info: z.number().int().nonnegative() }),
  findings: z.array(z.object({
    id: z.string().max(200),
    severity: z.enum(["blocker", "review", "info"]),
    title: z.string().max(255),
    description: z.string().max(2000),
    column: z.string().max(255).optional(),
    affectedCount: z.number().int().nonnegative(),
    evidence: z.array(persistedEvidence).max(10),
    repair: z.string().max(64).optional(),
  })).max(120),
  remediation: z.object({
    action: z.string().max(64),
    ledger: z.array(z.object({
      rowNumber: z.number().int().positive(),
      column: z.string().max(255).optional(),
      status: z.enum(["changed", "skipped", "excluded"]),
      before: z.string().max(1000),
      after: z.string().max(1000),
      reason: z.string().max(1000),
    })).max(500),
  }).optional(),
});

export function createAssistantFallback(input: z.infer<typeof assistantInput>) {
  return {
    summary: `Start with the ${input.profile.columnCount}-column profile, then apply only reversible formatting fixes for “${input.goal}”.`,
    steps: [
      { title: "Confirm the profile", detail: `Review ${input.profile.rowCount} rows, inferred column types, and ${input.profile.completeness}% completeness before applying changes.`, risk: "safe" as const },
      { title: "Apply deterministic formatting", detail: "Preview whitespace and known format normalization separately from the original source file.", risk: "safe" as const },
      { title: "Keep uncertain records visible", detail: "Review duplicate candidates and missing business fields rather than merging, deleting, or inventing values automatically.", risk: "review" as const },
    ],
    caution: "This plan is based on metadata only. It does not inspect raw rows or establish that a suggested correction is factually correct.",
  };
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  assistant: router({
    plan: publicProcedure.input(assistantInput).mutation(async ({ input }) => {
      const fallback = createAssistantFallback(input);

      try {
        const response = await invokeLLM({
          maxTokens: 520,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "data_buddy_plan",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  steps: {
                    type: "array",
                    minItems: 2,
                    maxItems: 4,
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        detail: { type: "string" },
                        risk: { type: "string", enum: ["safe", "review"] },
                      },
                      required: ["title", "detail", "risk"],
                      additionalProperties: false,
                    },
                  },
                  caution: { type: "string" },
                },
                required: ["summary", "steps", "caution"],
                additionalProperties: false,
              },
            },
          },
          messages: [
            {
              role: "system",
              content: "You are Data Buddy, a calm data-quality assistant. Return a concise, review-first plan. Never imply you inspected raw data or that an inferred issue proves a correction. Do not recommend automatic deletion, merging, imputation, financial edits, or identity changes. Use only the supplied metadata. Mark deterministic formatting as safe; mark any business or record judgement as review.",
            },
            {
              role: "user",
              content: JSON.stringify({ goal: input.goal, datasetProfileMetadata: input.profile }),
            },
          ],
        });
        const content = response.choices[0]?.message.content;
        const json = typeof content === "string" ? JSON.parse(content) : null;
        return assistantPlanSchema.parse(json);
      } catch (error) {
        console.warn("[Data Buddy] Assistant plan fallback used", error instanceof Error ? error.message : error);
        return fallback;
      }
    }),
  }),

  audit: router({
    save: protectedProcedure.input(persistedAuditInput).mutation(async ({ ctx, input }) => {
      const reportId = nanoid(20);
      await db.saveAuditReport({
        id: reportId,
        userId: ctx.user.id,
        datasetName: input.datasetName,
        sourceFormat: input.sourceFormat,
        rowCount: input.rowCount,
        columnCount: input.columnCount,
        completeness: input.completeness,
        status: "saved",
        blockerCount: input.counts.blocker,
        reviewCount: input.counts.review,
        infoCount: input.counts.info,
        findings: input.findings.map(finding => ({
          id: nanoid(24),
          ruleId: finding.id,
          severity: finding.severity,
          title: finding.title,
          description: finding.description,
          columnName: finding.column,
          affectedCount: finding.affectedCount,
          evidenceJson: JSON.stringify(finding.evidence),
          remediationAction: finding.repair,
        })),
        remediation: input.remediation ? { id: nanoid(24), action: input.remediation.action, ledgerJson: JSON.stringify(input.remediation.ledger) } : undefined,
      });
      return { id: reportId };
    }),
    recent: protectedProcedure.query(({ ctx }) => db.listAuditReports(ctx.user.id)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
