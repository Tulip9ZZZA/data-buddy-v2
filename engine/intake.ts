/**
 * Upload intake validation (adversarial-input boundary).
 * The browser parse path and the Node tooling share these limits so the
 * documented ceilings in security/adversarial.md are enforced in code, not prose.
 */
import { SafeRejection } from "./guards";

export { SafeRejection };
export const ALLOWED_EXTENSIONS = ["csv", "xlsx", "xls", "json"] as const;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export function validateFileForAudit(name: string, size: number): void {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (
    !ALLOWED_EXTENSIONS.includes(
      extension as (typeof ALLOWED_EXTENSIONS)[number]
    )
  ) {
    throw new SafeRejection(
      "EXTENSION_NOT_ALLOWED",
      `Choose a CSV, Excel, or JSON file. "${extension || "unknown"}" files are not audited.`
    );
  }
  if (size > MAX_UPLOAD_BYTES) {
    throw new SafeRejection(
      "FILE_TOO_LARGE",
      `This file is ${(size / 1024 / 1024).toFixed(1)} MB. The in-browser MVP audits files up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`
    );
  }
  if (size === 0) {
    throw new SafeRejection(
      "EMPTY_FILE",
      "This file is empty — there is no data to review."
    );
  }
}
