# Data Buddy: Simple User Guide

> **The simple idea:** Data Buddy helps you look at a spreadsheet or data file before you trust it. It shows the exact rows that need attention, suggests safe previews, and keeps your original upload unchanged.

## 1. What to do first

When you open Data Buddy, you will see a welcome card with the mascot. You have three choices.

| Button or control          | What it does                                                  | When to use it                                                       |
| -------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Upload a file**          | Opens your device’s file picker.                              | Use this when you want to check your own data.                       |
| **Explore public example** | Opens a small public Titanic dataset already inside the app.  | Use this if you want to learn safely before uploading your own file. |
| **Enter workspace**        | Closes the welcome card without changing the current dataset. | Use this if you want to look around first.                           |

You can upload **CSV**, **Excel** (`.xlsx` or `.xls`), or **JSON** files. The current MVP processes files up to **20 MB** in your browser. A JSON file needs to be an array of objects, such as `[ {"name":"Ada"}, {"name":"Bea"} ]`, or an object with a `data` array.

## 2. The normal Data Buddy workflow

The easiest way to use the app is to follow this order.

| Step | Where to go   | What to do                                                                                                  |
| ---- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| 1    | **Overview**  | Upload a file or open the public example.                                                                   |
| 2    | **Evidence**  | Read the most serious findings first and inspect the exact source rows.                                     |
| 3    | **Cleaning**  | Open a safe preview, read the before-and-after ledger, then decide whether to apply it to the working copy. |
| 4    | **Analysis**  | Look at the profile and basic statistics for each column.                                                   |
| 5    | **Documents** | Download or copy the audit, data dictionary, and any remediation ledger.                                    |

The word **working copy** means the temporary version currently inside Data Buddy. Your original uploaded file is not overwritten by the app.

## 3. Overview page

The Overview is the home screen after the welcome card.

| Area                       | Meaning                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quality signal**         | A prioritization score based on completeness and audit findings. It is not a certificate that the data is correct.                                                |
| **Current dataset**        | Shows the active file, number of rows and columns, and confirms that the original snapshot is preserved.                                                          |
| **Evidence findings**      | Shows how many deterministic rules found something worth checking. If a finding blocks analysis, inspect it before relying on the affected field.                 |
| **Drop zone**              | You can drag a CSV, Excel, or JSON file onto this area instead of using the upload button.                                                                        |
| **Recent in this session** | Shows files opened during this browser session. This is a convenience list, not a permanent file library.                                                         |
| **Ask Data Buddy**         | Lets you describe an outcome, such as “prepare this data for reporting.” It creates a review-first plan using profile metadata, not a bulk dump of your raw rows. |

Use **Inspect source rows** in the Evidence findings card when you want to see the proof behind an alert.

## 4. Evidence page: the most important screen

The Evidence page is where Data Buddy becomes useful for real work. It does not just say “there may be a problem.” It shows the rule, the affected count, and the exact source rows that triggered the rule.

| Area                 | What it means                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Blocks analysis**  | A finding that can make an affected field unsafe to use until you resolve it or consciously accept it.                              |
| **Requires review**  | A finding with real evidence, but a person must decide what it means for the business.                                              |
| **Informational**    | Context worth knowing that does not claim the source is wrong.                                                                      |
| **Finding queue**    | Click any finding in the left list to open its details.                                                                             |
| **Rule ID**          | A stable label such as `AUDIT.TYPE.CONFLICT:age`. It is included in the downloadable audit so the finding can be discussed clearly. |
| **Source row table** | Shows the source-row number, column, original value, and the reason that row was flagged.                                           |
| **Preview repair**   | Appears only when a rule has a deterministic, conservative action that can be previewed.                                            |

### What Data Buddy checks

Data Buddy currently checks for blank values, exact duplicate rows, mixed numeric and text values, invalid email patterns, name-based range violations, formatting variation, unusually high cardinality, IQR outliers, and instruction-like cell text. Instruction-like text is treated as untrusted **data only**; it is never followed as an instruction.

## 5. Cleaning page: preview before changing the working copy

The Cleaning page appears after you press **Preview repair** from a finding.

| Button or area              | What it does                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Before / after ledger**   | Shows which rows would change, be skipped, or be excluded, and explains why.                                                        |
| **Apply to working copy**   | Applies only the displayed deterministic preview to the temporary working copy. It does not overwrite the original source snapshot. |
| **Back to evidence**        | Returns to the selected evidence finding without changing anything.                                                                 |
| **Restore source snapshot** | Throws away working-copy changes and returns to the original uploaded rows for the current session.                                 |

### Safe preview types

| Preview                      | What happens                                                                                 | What Data Buddy does not do                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Normalize formatting**     | Trims text and standardizes email casing.                                                    | It does not invent missing text.                                       |
| **Flag incomplete rows**     | Adds a `data_buddy_missing_review` flag to rows that need attention.                         | It does not fill blanks.                                               |
| **Flag range violations**    | Adds a `data_buddy_range_review` flag while leaving the original out-of-range value visible. | It does not silently replace the value.                                |
| **Coerce numeric values**    | Converts clearly parseable number-like values and records non-parseable values as skipped.   | It does not guess what text such as “unknown” should become.           |
| **Exclude exact duplicates** | Excludes only rows that match every visible value of an earlier row from the working copy.   | It does not decide which near-duplicate person or customer is correct. |
| **Winsorize IQR outliers**   | Caps only an IQR-outlier preview to the documented bounds.                                   | It does not claim an outlier is definitely an error.                   |

## 6. Datasets and Analysis pages

The **Datasets** page provides a quick structural profile. It lists each column, its inferred type, coverage, distinct values, examples, and basic signals.

The **Analysis** page lets you select a column from the left-hand list. It shows distinct values, nulls, minimum, maximum, mean when relevant, and a lightweight value-footprint chart. Use it to understand the structure of a field; use the Evidence page when you need row-level proof.

## 7. Documents page

Documents is the handoff area.

| Tab or button              | What it does                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Evidence audit**         | Shows severity counts, rule IDs, affected counts, and row evidence.                                                     |
| **Quality report**         | Gives a readable summary of the active profile.                                                                         |
| **Data dictionary**        | Explains the columns and the inferred data shape.                                                                       |
| **Ledger**                 | Shows the latest applied working-copy remediation ledger.                                                               |
| **Copy**                   | Copies the currently selected document tab.                                                                             |
| **Copy all documentation** | Copies the evidence audit, quality report, data dictionary, and ledger together.                                        |
| **Download audit .md**     | Downloads a Markdown file you can share, keep in a project folder, or open in a text editor.                            |
| **Save audit**             | Saves report metadata, findings, evidence, status, and any remediation ledger to your signed-in private report history. |

Saved reports begin with the status **saved**. The small report history card shows recently saved audits. The app does **not** save the original file bytes as part of this history.

## 8. Privacy and safety boundaries

Data Buddy is designed to make its limits visible.

| Data or action          | Current behavior                                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Original upload         | Kept in the browser session for the working experience; it is not automatically overwritten.                                           |
| AI planning             | Receives profile metadata and a goal, not a bulk export of your raw rows.                                                              |
| Saved audit             | Requires sign-in and saves report metadata, findings, row-level evidence selected by the audit, status, and remediation ledger.        |
| Original file bytes     | Not stored in the audit-history database.                                                                                              |
| Ambiguous choices       | Left for you to review. Data Buddy will not choose the “correct” customer record, invent a missing value, or make a business judgment. |
| Restore source snapshot | Lets you abandon every working-copy repair from this session.                                                                          |

## 9. Current MVP limits

Data Buddy is a growing MVP, so keep these limits in mind. It is best for a first-pass audit of structured, tabular files. It does not yet support multi-sheet selection, collaborative review, scheduled monitoring, or a full version history of every working-copy change. Always keep a copy of your original file and use the evidence ledger to make important decisions reviewable.

## 10. If you only remember three things

1. **Open Evidence before trusting a score.** The exact rows matter more than a single number.
2. **Preview before applying.** Read the ledger, then apply only what you understand.
3. **Restore if unsure.** You can return to the source snapshot for the current session at any time.
