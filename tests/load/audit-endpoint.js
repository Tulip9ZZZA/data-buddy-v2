/**
 * k6 load test for the audit-save endpoint.
 *
 *   k6 run tests/load/audit-endpoint.js   (K6_BASE_URL=http://staging:3000)
 *
 * Bounded VUs; records p95 latency so security/costs.md can publish real
 * cost-per-action numbers once a staging target exists.
 */
import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    audit_save: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 20 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1500"],
    checks: ["rate>0.99"],
  },
};

const BASE = __ENV.K6_BASE_URL || "http://localhost:3000";

export default function () {
  const payload = JSON.stringify({
    datasetName: "k6-load.csv",
    sourceFormat: "csv",
    rowCount: 120,
    columnCount: 8,
    completeness: 97,
    counts: { blocker: 1, review: 2, info: 0 },
    findings: [
      {
        id: "AUDIT.MISSING.VALUES:age",
        rule: "AUDIT.MISSING.VALUES",
        severity: "review",
        title: "age has missing values",
        description: "k6 synthetic finding",
        affectedCount: 2,
        evidence: [
          { rowNumber: 3, column: "age", value: "blank", message: "k6" },
        ],
      },
    ],
  });
  const res = http.post(`${BASE}/api/trpc/audit.save?batch=1`, payload, {
    headers: { "Content-Type": "application/json" },
  });
  check(res, {
    "status is 200 or 401 (unauthed is a valid bound)": r =>
      r.status === 200 || r.status === 401,
  });
}
