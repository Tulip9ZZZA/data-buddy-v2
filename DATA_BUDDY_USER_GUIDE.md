# Data Buddy: Simple User Guide

## What Data Buddy does

**Data Buddy** helps you inspect a spreadsheet before you use it somewhere important. It can read a CSV or Excel file, identify common quality issues, show simple summaries, suggest controlled cleaning actions, and create documentation you can share with another person.

> **The main idea:** Data Buddy is a guide, not an autopilot. It shows what it found and lets you choose the next action. It does not silently rewrite your original upload.

This guide is written for non-technical users. You do not need to understand coding, databases, or statistics to use the main parts of the app.

## Start here

When you open Data Buddy for the first time, you will see a welcome card with the mascot at the center.

| Button or link | What it does | When to use it |
|---|---|---|
| **Upload a file** | Opens your device’s file picker. | Use this when you have a CSV, `.xlsx`, or `.xls` spreadsheet ready. |
| **Explore example** | Opens the built-in example data without uploading your own file. | Use this if you want to learn safely first. |
| **Enter workspace** | Closes the welcome card and takes you to the main dashboard. | Use this when you want to look around before uploading. |

## Uploading your data

You can start an upload in two ways. Select **Upload data** in the top-right corner, or select **Upload a file** in the main welcome area. You can also drag a CSV or Excel file into the large dashed box labeled **“Drop a CSV or Excel file here.”**

Data Buddy supports the following spreadsheet formats:

| File type | Example | Supported |
|---|---|---|
| CSV | `customers.csv` | Yes |
| Excel workbook | `customers.xlsx` | Yes |
| Older Excel workbook | `customers.xls` | Yes |

After you choose a file, Data Buddy displays a short loading screen. The mascot is checking the file’s columns, blank values, repeated rows, formatting variation, and basic structure. When it finishes, you will land on the **Datasets** screen.

> **Important:** Your original file is not edited by this step. The app creates a working copy inside the current browser session for analysis.

### The upload drop zone

The dashed upload area in **Overview** is called the drop zone.

| Action | Result |
|---|---|
| Click the drop zone | Opens the file picker. |
| Drag a supported file over it | The border becomes more prominent to show it is ready. |
| Drop the file into it | Starts the same profiling process as a normal upload. |
| Press `Enter` or `Space` while it is selected | Opens the file picker, which helps keyboard users. |

### Recent in this session

The **Recent in this session** panel shows lightweight information about files you have profiled during the current browser session. Select an item to jump to the current dataset profile.

This panel shows the file name, row count, column count, and whether it is the example or an upload from the current session. It does **not** keep the original uploaded file as a long-term cloud file in this MVP.

## Your main navigation

The left sidebar is your main navigation. On smaller screens, select the menu icon in the upper-left corner to open it, and select the `X` beside the Data Buddy logo to close it.

| Sidebar item | What you will find there |
|---|---|
| **Overview** | Your starting dashboard, quality signal, file intake, recent items, and Data Buddy planning prompt. |
| **Datasets** | A profile of each column, including completeness, unique values, examples, duplicates, and common signals. |
| **Cleaning** | Separate, previewable cleaning actions. You choose exactly which action to apply. |
| **Analysis** | Simple per-column statistics and a compact comparison chart. |
| **Documents** | A quality report and data dictionary you can copy or download. |
| **Settings** | In this MVP, it explains that future workspace and privacy preferences will appear here. |

The **Data studio** switcher near the top of the sidebar is reserved for future account workspaces. Selecting it currently shows a short explanatory message rather than switching to another workspace.

## Overview: understand the starting point

The **Overview** page gives you a short, high-level reading of your active dataset.

| Area or button | What it means or does |
|---|---|
| **Quality signal** | A simple prioritization score based on completeness and duplicate checks. It is not a certification that the data is correct. |
| **Read how this score works** | Explains that the score is a guide for prioritization, not proof of data quality. |
| **Current dataset** | Shows the active file name, row count, column count, and the status of the working copy. |
| **Needs attention** | Shows the number of observed issues. |
| **Review observations** | Takes you to **Datasets** so you can inspect the evidence behind the issue count. |
| **Three-dot button** | Shows a message about future workspace options. |
| **Upload a file** | Opens the file picker again. |
| **Explore the example** | Returns to the built-in example data for practice. |

### Ask Data Buddy

At the bottom of Overview, write a goal in the **Ask Data Buddy** field. For example:

> “Prepare this customer list for CRM import.”

Then select **Plan it**. Data Buddy returns a short plan that separates safer preparation steps from items that require human review. Select **Dismiss plan** to hide the result.

Data Buddy uses the dataset profile, such as the number of rows and columns, inferred column types, blank-value counts, uniqueness, and issue labels. It does **not** send the raw spreadsheet rows in this planning request.

## Datasets: inspect what was found

Select **Datasets** in the sidebar when you want to understand the file before changing anything.

### The summary cards

The four cards show the following:

| Card | Meaning |
|---|---|
| **Rows** | How many data records are in the active working copy. |
| **Columns** | How many fields Data Buddy found. |
| **Completeness** | The percentage of cells that are not blank. |
| **Exact duplicates** | Rows that are exactly the same across all visible values. |

### The column profile table

Each row in the table describes one spreadsheet column.

| Table heading | Meaning |
|---|---|
| **Column** | The original column name from your spreadsheet. |
| **Inferred type** | Data Buddy’s best guess: Text, Number, Date, or Boolean. Treat this as a suggestion. |
| **Coverage** | How many rows contain a value in the column. |
| **Distinct** | How many different non-blank values are present. |
| **Example values** | A few example values from the working copy. |
| **Signal** | A possible issue, such as missing values, format variation, or type mismatch. **Clear** means no common issue was detected by the current checks. |

Select **Replace file** if you chose the wrong spreadsheet or have a newer version. Select **How examples work** to see a reminder that raw rows stay in the browser session and the app deliberately shows only examples on this screen.

### Observed issues

The **Observed issues** area turns the technical checks into plain-language cards. It may list missing values, exact duplicates, formatting variation, or type mismatches. These cards are evidence to review; they do not change data by themselves.

## Cleaning: choose one action at a time

Select **Cleaning** when you are ready to prepare a cleaner working copy.

> **Good habit:** Read the preview on the right before selecting **Apply selected fix**. Apply one action, then inspect the profile again.

You can select a cleaning option by clicking its card. The selected card gets a stronger outline. The preview panel changes to show an example of the selected transformation.

| Cleaning option | What it does | What it does not do |
|---|---|---|
| **Normalize formatting & exact copies** | Trims extra whitespace, standardizes email capitalization, and removes rows that are exactly identical. | It does not decide whether two similar-but-not-identical people are the same person. |
| **Flag rows with missing values** | Adds a `data_buddy_missing_review` flag to rows with blank values. | It does not invent or fill missing customer information. |
| **Coerce fully numeric columns** | Converts values to numbers only when every non-blank value in the column looks numeric. | It does not force mixed text-and-number columns into a number format. |

Select **Apply selected fix** to run only the option currently highlighted. A notification at the bottom confirms what happened. Select **Return to profile** to review the result in Datasets.

The **Human review** card is an intentional reminder that some decisions must remain human. For example, Data Buddy will not decide which incomplete duplicate customer record to keep.

## Analysis: explore a column

Select **Analysis** to look at individual columns.

| Control or area | What it does |
|---|---|
| **Column list** | Select any column name to change the active analysis. |
| **Distinct values** | Shows how many unique non-blank values the column has. |
| **Null values** | Shows how many blank values the column has. |
| **Minimum, maximum, mean** | Shows number summaries when values can be interpreted as numbers. A dash means the statistic is not applicable. |
| **Value footprint** | A compact bar chart comparing the number of distinct values across fields. |
| **Plain-language read** | Gives a short reminder about how missingness can affect matching or segmentation. |

The charts are intentionally simple. Use this view to ask practical questions such as: “Which column has the most blanks?” or “Does this field look like a number column?”

## Documents: make a handoff easier

Select **Documents** when you need a readable explanation of the active dataset.

| Button or tab | What it does |
|---|---|
| **Quality report** tab | Shows a plain-language summary of the data profile and observed issues. |
| **Data dictionary** tab | Shows each column name, inferred type, coverage, distinct-value count, and examples. |
| **Copy** | Copies the currently selected report to your clipboard. |
| **Copy all documentation** | Copies both the quality report and data dictionary together. |
| **Download .md** | Downloads both documents as a Markdown file that can be opened in a text editor, GitHub, Notion, or many documentation tools. |

## Notifications and status messages

Data Buddy uses a small message card near the bottom of the screen to confirm actions, explain placeholders, or tell you if something needs attention. Select the `X` on the message to dismiss it early.

| Status message | What you should do |
|---|---|
| **Example workspace ready for review** | Explore safely or upload your own file. |
| **Imported … rows** | Review the Datasets profile next. |
| **Applied deterministic …** | Inspect Datasets or Analysis to understand the effect. |
| **Data Buddy prepared a review-first plan** | Read the plan as guidance, then use Cleaning to apply only the action you choose. |
| **Could not read that file** | Check that the file is CSV, XLSX, or XLS and that the first sheet contains data rows. |

## Privacy and safe use

Data Buddy is designed to keep the current MVP conservative.

| Topic | What Data Buddy does now |
|---|---|
| **Original upload** | The upload is read into the current browser session for profiling. The original source file is not overwritten. |
| **Cleaning** | Changes are made to the working copy only after you select an explicit action. |
| **AI planning** | The assistant receives profile metadata, not the raw spreadsheet rows. |
| **Important decisions** | Missing values, likely duplicate customers, business judgments, and factual corrections are left for human review. |
| **Long-term storage** | This MVP does not yet provide a permanent personal dataset library or a full audit-history database. |

For sensitive, regulated, financial, legal, health, or customer-identifying data, make sure you follow your organization’s rules before uploading any file to any software product.

## A simple first workflow

If you are new, follow this sequence:

1. Select **Explore example** and click through each sidebar page.
2. Select **Upload data** and choose a CSV or Excel file.
3. In **Datasets**, check the row count, blanks, duplicates, and column signals.
4. In **Cleaning**, select one action and read the before-and-after preview.
5. Select **Apply selected fix** only if the action makes sense for your data.
6. In **Analysis**, inspect the most important columns.
7. In **Documents**, download the quality report and data dictionary for your team.

## What is not available yet

Data Buddy is an MVP. The following items are not available yet, although they are sensible next development steps:

| Future capability | Why it matters |
|---|---|
| User accounts and saved dataset history | Lets each person return to previous work. |
| Downloadable cleaned CSV/XLSX files | Lets you export the approved working copy. |
| Multi-sheet workbook selection | Lets you choose a sheet other than the first one. |
| Full audit log | Records exactly which cleaning step was applied and when. |
| Team collaboration controls | Lets colleagues review the same dataset safely. |

## Quick troubleshooting

| Problem | Try this |
|---|---|
| I cannot see the sidebar on my phone. | Select the menu icon in the upper-left corner. |
| My file did not load. | Confirm that it is CSV, XLSX, or XLS, and that its first sheet has column headings and data rows. |
| I do not understand a quality signal. | Select **Read how this score works**, then inspect the column-level evidence in **Datasets**. |
| I accidentally applied a working-copy cleanup. | Upload the original file again; your original source file was not overwritten by Data Buddy. |
| Copy did not work. | Your browser may block clipboard access. Select the text in the document preview and copy it manually. |

## Final reminder

Use Data Buddy to make your next data decision easier to explain, not to avoid reviewing important information. If a cleaning step would affect customers, money, access, reporting, or compliance, keep the final decision with a knowledgeable person.
