import { DataBuddyMascot, type BuddyMood } from "@/components/DataBuddyMascot";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { SafeRejection, validateFileForAudit } from "../../../engine/intake";
import {
  auditReportMarkdown,
  previewRemediation,
  runEvidenceAudit,
  type AuditFinding,
  type AuditReport,
  type LedgerEntry,
  type RemediationPreview,
} from "@/lib/auditEngine";
import {
  createDocumentation,
  normaliseRows,
  profileRows,
  type DataRow,
} from "@/lib/dataBuddy";
import { getLoadingStage, type LoadingStage } from "@/lib/loadingStages";
import {
  applyCleaningAction,
  createImportedDataset,
  type CleaningAction,
  type RecentDataset,
} from "@/lib/workspaceActions";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  FileSearch,
  FileText,
  FolderUp,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Table2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import * as XLSX from "xlsx";

type ViewName =
  | "Overview"
  | "Datasets"
  | "Evidence"
  | "Cleaning"
  | "Analysis"
  | "Documents";

const demoRows: DataRow[] = [
  {
    PassengerId: 1,
    Survived: 0,
    Pclass: 3,
    Sex: "male",
    Age: 22,
    Fare: 7.25,
    Cabin: null,
    Embarked: "S",
  },
  {
    PassengerId: 2,
    Survived: 1,
    Pclass: 1,
    Sex: "female",
    Age: 38,
    Fare: 71.2833,
    Cabin: "C85",
    Embarked: "C",
  },
  {
    PassengerId: 3,
    Survived: 1,
    Pclass: 3,
    Sex: "female",
    Age: 26,
    Fare: 7.925,
    Cabin: null,
    Embarked: "S",
  },
  {
    PassengerId: 4,
    Survived: 1,
    Pclass: 1,
    Sex: "female",
    Age: 35,
    Fare: 53.1,
    Cabin: "C123",
    Embarked: "S",
  },
  {
    PassengerId: 5,
    Survived: 0,
    Pclass: 3,
    Sex: "male",
    Age: 35,
    Fare: 8.05,
    Cabin: null,
    Embarked: "S",
  },
  {
    PassengerId: 6,
    Survived: 0,
    Pclass: 3,
    Sex: "male",
    Age: null,
    Fare: 8.4583,
    Cabin: null,
    Embarked: "Q",
  },
  {
    PassengerId: 7,
    Survived: 0,
    Pclass: 1,
    Sex: "male",
    Age: 54,
    Fare: 51.8625,
    Cabin: "E46",
    Embarked: "S",
  },
  {
    PassengerId: 8,
    Survived: 0,
    Pclass: 3,
    Sex: "male",
    Age: 2,
    Fare: 21.075,
    Cabin: null,
    Embarked: "S",
  },
  {
    PassengerId: 9,
    Survived: 1,
    Pclass: 3,
    Sex: "female",
    Age: 27,
    Fare: 11.1333,
    Cabin: null,
    Embarked: "S",
  },
  {
    PassengerId: 10,
    Survived: 1,
    Pclass: 2,
    Sex: "female",
    Age: 14,
    Fare: 30.0708,
    Cabin: null,
    Embarked: "C",
  },
  {
    PassengerId: 11,
    Survived: 1,
    Pclass: 3,
    Sex: "female",
    Age: 4,
    Fare: 16.7,
    Cabin: "G6",
    Embarked: "S",
  },
  {
    PassengerId: 12,
    Survived: 1,
    Pclass: 1,
    Sex: "female",
    Age: 58,
    Fare: 26.55,
    Cabin: "C103",
    Embarked: "S",
  },
  {
    PassengerId: 13,
    Survived: 0,
    Pclass: 3,
    Sex: "male",
    Age: 20,
    Fare: 8.05,
    Cabin: null,
    Embarked: "S",
  },
  {
    PassengerId: 14,
    Survived: 0,
    Pclass: 3,
    Sex: "male",
    Age: 39,
    Fare: 31.275,
    Cabin: null,
    Embarked: "S",
  },
  {
    PassengerId: 15,
    Survived: 0,
    Pclass: 3,
    Sex: "female",
    Age: 14,
    Fare: 7.8542,
    Cabin: null,
    Embarked: "S",
  },
  {
    PassengerId: 16,
    Survived: 1,
    Pclass: 2,
    Sex: "female",
    Age: 55,
    Fare: 16,
    Cabin: null,
    Embarked: "S",
  },
  {
    PassengerId: 17,
    Survived: 0,
    Pclass: 3,
    Sex: "male",
    Age: 2,
    Fare: 29.125,
    Cabin: null,
    Embarked: "Q",
  },
  {
    PassengerId: 18,
    Survived: 1,
    Pclass: 2,
    Sex: "male",
    Age: null,
    Fare: 13,
    Cabin: null,
    Embarked: "S",
  },
  {
    PassengerId: 19,
    Survived: 0,
    Pclass: 3,
    Sex: "female",
    Age: 31,
    Fare: 18,
    Cabin: null,
    Embarked: "S",
  },
  {
    PassengerId: 20,
    Survived: 1,
    Pclass: 3,
    Sex: "female",
    Age: null,
    Fare: 7.225,
    Cabin: null,
    Embarked: "C",
  },
];

const navigation: {
  name: ViewName;
  icon: typeof LayoutDashboard;
  description: string;
}[] = [
  {
    name: "Overview",
    icon: LayoutDashboard,
    description: "Quality at a glance",
  },
  { name: "Datasets", icon: Table2, description: "Profile source files" },
  { name: "Evidence", icon: FileSearch, description: "Inspect risky rows" },
  { name: "Cleaning", icon: WandSparkles, description: "Preview safe fixes" },
  { name: "Analysis", icon: BarChart3, description: "Inspect each column" },
  { name: "Documents", icon: FileText, description: "Explain the dataset" },
];

function formatNumber(value?: number) {
  return value === undefined
    ? "—"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(
        value
      );
}

function saveText(name: string, content: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob([content], { type: "text/markdown;charset=utf-8" })
  );
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

const waitForLoadingStage = (milliseconds: number) =>
  new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));

export default function Home() {
  const [activeView, setActiveView] = useState<ViewName>("Overview");
  const [rows, setRows] = useState<DataRow[]>(demoRows);
  const [sourceRows, setSourceRows] = useState<DataRow[]>(demoRows);
  const [sourceFormat, setSourceFormat] = useState<
    "csv" | "excel" | "json" | "example" | "unknown"
  >("example");
  const [datasetName, setDatasetName] = useState("Titanic — public example");
  const [recentDatasets, setRecentDatasets] = useState<RecentDataset[]>([
    {
      name: "Titanic — public example",
      rows: demoRows.length,
      columns: Object.keys(demoRows[0] ?? {}).length,
      label: "Public sample",
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("intake");
  const [loadingFileName, setLoadingFileName] = useState("");
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [assistantGoal, setAssistantGoal] = useState(
    "Prepare this customer list for CRM import"
  );
  const [showPlan, setShowPlan] = useState(false);
  const [assistantPlan, setAssistantPlan] = useState<{
    summary: string;
    steps: { title: string; detail: string; risk: "safe" | "review" }[];
    caution: string;
  } | null>(null);
  const [notice, setNotice] = useState("Example workspace ready for review.");
  const [intakeError, setIntakeError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState("");
  const [remediationLedger, setRemediationLedger] = useState<LedgerEntry[]>([]);
  const [lastRemediationAction, setLastRemediationAction] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const profile = useMemo(() => profileRows(rows), [rows]);
  const audit = useMemo(() => runEvidenceAudit(rows), [rows]);
  const selectedFinding =
    audit.findings.find(finding => finding.id === selectedFindingId) ??
    audit.findings[0];
  const remediationPreview = useMemo(
    () => (selectedFinding ? previewRemediation(rows, selectedFinding) : null),
    [rows, selectedFinding]
  );
  const docs = useMemo(
    () => createDocumentation(profile, datasetName),
    [profile, datasetName]
  );
  const auditMarkdown = useMemo(
    () => auditReportMarkdown(audit, datasetName),
    [audit, datasetName]
  );
  const qualityScore = Math.max(
    0,
    Math.round(
      profile.completeness - audit.counts.blocker * 18 - audit.counts.review * 7
    )
  );
  const planMutation = trpc.assistant.plan.useMutation({
    onSuccess: plan => {
      setAssistantPlan(plan);
      setShowPlan(true);
      setTemporaryNotice(
        "Data Buddy prepared a review-first plan using profile metadata, not raw rows."
      );
    },
    onError: () => {
      setAssistantPlan(null);
      setShowPlan(true);
      setTemporaryNotice(
        "Data Buddy prepared a local review-first plan. The AI service was not available."
      );
    },
  });
  const savedReportsQuery = trpc.audit.recent.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });
  const saveAuditMutation = trpc.audit.save.useMutation({
    onSuccess: saved => {
      void utils.audit.recent.invalidate();
      setTemporaryNotice(
        `Saved evidence audit ${saved.id.slice(0, 8)} to your private report history.`
      );
    },
    onError: error =>
      setTemporaryNotice(
        error.message ||
          "Data Buddy could not save this audit. Try again shortly."
      ),
  });

  const setTemporaryNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4200);
  };

  const parseFile = async (file: File) => {
    setIsProcessing(true);
    setLoadingStage("intake");
    setLoadingFileName(file.name);
    setNotice("");
    setIntakeError(null);
    try {
      // Intake boundary: shared with the Node tooling (engine/intake.ts).
      validateFileForAudit(file.name, file.size);
      const extension = file.name.split(".").pop()?.toLowerCase();
      let importedRows: DataRow[];
      if (extension === "json") {
        setLoadingStage("parse");
        const parsed: unknown = JSON.parse(await file.text());
        const candidate = Array.isArray(parsed)
          ? parsed
          : parsed &&
              typeof parsed === "object" &&
              Array.isArray((parsed as { data?: unknown }).data)
            ? (parsed as { data: unknown[] }).data
            : null;
        if (
          !candidate ||
          candidate.some(
            item => !item || typeof item !== "object" || Array.isArray(item)
          )
        )
          throw new Error(
            "JSON must be an array of objects, or an object with a data array."
          );
        importedRows = normaliseRows(candidate as Record<string, unknown>[]);
      } else {
        setLoadingStage("parse");
        const bytes = await file.arrayBuffer();
        const workbook = XLSX.read(bytes, { type: "array", cellDates: true });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
        if (!firstSheet) throw new Error("No readable worksheet found.");
        importedRows = normaliseRows(
          XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
            defval: null,
            raw: false,
          })
        );
      }
      if (!importedRows.length)
        throw new Error("This file has no data rows to review.");
      setLoadingStage("types");
      profileRows(importedRows);
      await waitForLoadingStage(230);
      setLoadingStage("duplicates");
      await waitForLoadingStage(230);
      setLoadingStage("evidence");
      runEvidenceAudit(importedRows);
      await waitForLoadingStage(280);
      setLoadingStage("complete");
      await waitForLoadingStage(240);
      const importedDataset = createImportedDataset(file.name, importedRows);
      setRows(importedRows);
      setSourceRows(importedRows);
      setSourceFormat(
        extension === "json" ? "json" : extension === "csv" ? "csv" : "excel"
      );
      setDatasetName(importedDataset.name);
      setRecentDatasets(current =>
        [
          importedDataset,
          ...current.filter(item => item.name !== importedDataset.name),
        ].slice(0, 3)
      );
      setActiveView("Evidence");
      setSelectedFindingId("");
      setRemediationLedger([]);
      setLastRemediationAction(null);
      setIsOnboarding(false);
      setIsProcessing(false);
      setTemporaryNotice(
        `Imported ${importedRows.length} rows. The original file remains unchanged.`
      );
    } catch (error) {
      setIsProcessing(false);
      const message =
        error instanceof Error
          ? error.message
          : "Data Buddy could not read that file.";
      // Designed error state: hostile/invalid shapes get a named code and a
      // card in the workspace, not just a transient toast.
      setIntakeError({
        code: error instanceof SafeRejection ? error.code : "PARSE_ERROR",
        message,
      });
      setTemporaryNotice(message);
    }
  };

  const onUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void parseFile(file);
    event.target.value = "";
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDropActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void parseFile(file);
  };

  const applyPreview = (preview: RemediationPreview) => {
    setRows(preview.rows);
    setRemediationLedger(preview.ledger);
    setLastRemediationAction(preview.action);
    setTemporaryNotice(
      `${preview.title} applied to the working copy. The source snapshot remains untouched.`
    );
  };

  const restoreSourceSnapshot = () => {
    setRows(sourceRows);
    setRemediationLedger([]);
    setSelectedFindingId("");
    setLastRemediationAction(null);
    setTemporaryNotice(
      "Restored the original source snapshot. No uploaded source file was changed."
    );
  };

  const saveAudit = () => {
    if (!isAuthenticated) {
      setTemporaryNotice(
        "Sign in to save this evidence audit to your private report history."
      );
      window.setTimeout(() => startLogin(), 1200);
      return;
    }
    saveAuditMutation.mutate({
      datasetName,
      sourceFormat,
      rowCount: audit.rowCount,
      columnCount: audit.columnCount,
      completeness: profile.completeness,
      counts: audit.counts,
      findings: audit.findings.map(finding => ({
        id: finding.id,
        severity: finding.severity,
        title: finding.title,
        description: finding.description,
        ...(finding.column ? { column: finding.column } : {}),
        affectedCount: finding.affectedCount,
        evidence: finding.evidence,
        ...(finding.repair ? { repair: finding.repair } : {}),
      })),
      ...(lastRemediationAction
        ? {
            remediation: {
              action: lastRemediationAction,
              ledger: remediationLedger,
            },
          }
        : {}),
    });
  };

  const runAssistant = () => {
    planMutation.mutate({
      goal: assistantGoal,
      profile: {
        datasetName,
        rowCount: profile.rowCount,
        columnCount: profile.columnCount,
        completeness: profile.completeness,
        duplicateCount: profile.duplicateCount,
        columns: profile.columns.map(column => ({
          name: column.name,
          inferredType: column.inferredType,
          nullCount: column.nullCount,
          uniqueCount: column.uniqueCount,
          ...(column.issue ? { issue: column.issue } : {}),
        })),
      },
    });
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setTemporaryNotice(`${label} copied to your clipboard.`);
    } catch {
      setTemporaryNotice(
        "Copy was blocked by this browser. Select the text and copy it manually."
      );
    }
  };

  const currentMood: BuddyMood = isProcessing
    ? "loading"
    : activeView === "Cleaning"
      ? "review"
      : notice.includes("Applied")
        ? "success"
        : "idle";
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.24, ease: "easeOut" as const };

  return (
    <div className="buddy-app-shell">
      <aside
        className={cn("buddy-sidebar", isSidebarOpen && "buddy-sidebar-open")}
        aria-label="Data Buddy navigation"
      >
        <div className="buddy-sidebar-brand">
          <div className="buddy-brand-mark">
            <DataBuddyMascot size="small" decorative />
          </div>
          <div>
            <span className="buddy-wordmark">Data Buddy</span>
            <span className="buddy-submark">quality workspace</span>
          </div>
          <button
            className="buddy-mobile-close"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <button
          className="buddy-workspace-switcher"
          onClick={() =>
            setTemporaryNotice(
              "Workspace switching is ready for the connected account flow."
            )
          }
        >
          <span className="buddy-workspace-initial">D</span>
          <span>
            <strong>Data studio</strong>
            <small>Personal workspace</small>
          </span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>

        <nav className="buddy-nav-list">
          <p className="buddy-nav-label">Workspace</p>
          {navigation.map(item => {
            const Icon = item.icon;
            const active = activeView === item.name;
            return (
              <button
                key={item.name}
                onClick={() => {
                  setActiveView(item.name);
                  setIsSidebarOpen(false);
                }}
                className={cn("buddy-nav-item", active && "buddy-nav-active")}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="buddy-sidebar-bottom">
          <button
            className="buddy-nav-item"
            onClick={() =>
              setTemporaryNotice(
                "Settings will contain workspace and privacy preferences."
              )
            }
          >
            <Settings2 size={17} strokeWidth={1.8} />
            <span>Settings</span>
          </button>
          <div className="buddy-sidebar-status">
            <span className="buddy-status-dot" />
            Originals stay untouched
          </div>
        </div>
      </aside>

      {isSidebarOpen && (
        <button
          className="buddy-sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="buddy-main-canvas" id="buddy-main-content">
        <a className="buddy-skip-link" href="#buddy-evidence-panel">
          Skip to the evidence report
        </a>
        <header className="buddy-topbar">
          <div className="buddy-topbar-left">
            <button
              className="buddy-menu-button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>
            <div className="buddy-crumbs">
              <span>Data studio</span>
              <ChevronRight size={14} />
              <strong>{activeView}</strong>
            </div>
          </div>
          <div className="buddy-topbar-actions">
            <div className="buddy-save-state">
              <span className="buddy-status-dot" />
              All changes saved
            </div>
            <Button className="buddy-primary-button" onClick={openFilePicker}>
              <Upload size={16} />
              Upload data
            </Button>
            <input
              ref={fileInputRef}
              onChange={onUpload}
              type="file"
              accept=".csv,.xlsx,.xls,.json,application/json"
              className="sr-only"
              aria-label="Upload CSV, Excel, or JSON file"
            />
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={transition}
            className="buddy-page"
          >
            {activeView === "Overview" && (
              <OverviewView
                profile={profile}
                audit={audit}
                qualityScore={qualityScore}
                datasetName={datasetName}
                recentDatasets={recentDatasets}
                notice={notice}
                assistantGoal={assistantGoal}
                setAssistantGoal={setAssistantGoal}
                showPlan={showPlan}
                setShowPlan={setShowPlan}
                runAssistant={runAssistant}
                isPlanning={planMutation.isPending}
                assistantPlan={assistantPlan}
                onUpload={openFilePicker}
                onDrop={handleDrop}
                isDropActive={isDropActive}
                setIsDropActive={setIsDropActive}
                onSample={() => {
                  setRows(demoRows);
                  setSourceRows(demoRows);
                  setSourceFormat("example");
                  setDatasetName("Titanic — public example");
                  setSelectedFindingId("");
                  setRemediationLedger([]);
                  setLastRemediationAction(null);
                  setIsOnboarding(false);
                  setTemporaryNotice(
                    "A real public Titanic sample is ready to audit."
                  );
                }}
                onNavigate={setActiveView}
                onNotice={setTemporaryNotice}
              />
            )}
            {activeView === "Datasets" && (
              <DatasetsView
                profile={profile}
                datasetName={datasetName}
                onUpload={openFilePicker}
                onNotice={setTemporaryNotice}
              />
            )}
            {activeView === "Evidence" && (
              <EvidenceView
                audit={audit}
                datasetName={datasetName}
                selectedFinding={selectedFinding}
                preview={remediationPreview}
                onSelect={setSelectedFindingId}
                onReviewRepair={() => setActiveView("Cleaning")}
                intakeError={intakeError}
                onDismissError={() => setIntakeError(null)}
              />
            )}
            {activeView === "Cleaning" && (
              <CleaningView
                finding={selectedFinding}
                preview={remediationPreview}
                ledger={remediationLedger}
                onApply={applyPreview}
                onRestore={restoreSourceSnapshot}
                onViewEvidence={() => setActiveView("Evidence")}
              />
            )}
            {activeView === "Analysis" && (
              <AnalysisView profile={profile} datasetName={datasetName} />
            )}
            {activeView === "Documents" && (
              <DocumentsView
                dictionary={docs.dictionary}
                quality={docs.quality}
                auditMarkdown={auditMarkdown}
                ledger={remediationLedger}
                savedReports={savedReportsQuery.data ?? []}
                isAuthenticated={isAuthenticated}
                onCopy={copy}
                onSave={saveAudit}
                isSaving={saveAuditMutation.isPending}
                onDownload={() =>
                  saveText(
                    `${datasetName.toLowerCase().replace(/\s+/g, "-")}-evidence-audit.md`,
                    `${auditMarkdown}\n\n---\n\n# Data dictionary\n\n${docs.dictionary}\n\n---\n\n# Remediation ledger\n\n${remediationLedger.map(entry => `- source row ${entry.rowNumber}${entry.column ? ` · ${entry.column}` : ""}: ${entry.status} — ${entry.reason}`).join("\n") || "- No remediation has been applied to the working copy."}`
                  )
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {!!notice && (
          <motion.div
            className="buddy-notice"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 6 }}
            transition={transition}
            role="status"
          >
            <DataBuddyMascot
              mood={notice.includes("Applied") ? "success" : "idle"}
              size="small"
              decorative
            />
            <span>{notice}</span>
            <button
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProcessing && (
          <motion.div
            className="buddy-processing-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-busy="true"
            role="status"
            aria-live="polite"
          >
            <div className="buddy-processing-card">
              <DataBuddyMascot
                mood="loading"
                loadingStage={loadingStage}
                fileName={loadingFileName}
                size="large"
              />
              <p className="buddy-accent-script">
                One moment, I’m reading the shape of this file.
              </p>
              <strong>{getLoadingStage(loadingStage).title}</strong>
              <span>{getLoadingStage(loadingStage).detail}</span>
              <div className="buddy-loading-steps" aria-hidden="true">
                {["READ", "PARSE", "TYPES", "DUPES", "PROOF", "READY"].map(
                  (step, index) => (
                    <i
                      key={step}
                      className={
                        index <= getLoadingStage(loadingStage).index
                          ? "buddy-loading-step-active"
                          : undefined
                      }
                    >
                      {step}
                    </i>
                  )
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOnboarding && (
          <motion.div
            className="buddy-onboarding-overlay"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="buddy-onboarding-card">
              <p className="buddy-eyebrow">Welcome to Data Buddy</p>
              <DataBuddyMascot mood="idle" size="large" />
              <p className="buddy-accent-script">
                Bring me the messy spreadsheet. We’ll take it one check at a
                time.
              </p>
              <h1>See the proof before you trust the file.</h1>
              <p>
                Upload CSV, Excel, or JSON. Data Buddy flags the exact source
                rows, then previews a repair without changing your original.
              </p>
              <div>
                <Button
                  className="buddy-primary-button"
                  onClick={() => {
                    setIsOnboarding(false);
                    window.setTimeout(openFilePicker, 0);
                  }}
                >
                  <Upload size={16} />
                  Upload a file
                </Button>
                <button
                  className="buddy-text-action"
                  onClick={() => {
                    setIsOnboarding(false);
                    setTemporaryNotice(
                      "The public Titanic example is ready to audit."
                    );
                  }}
                >
                  Explore public example <ArrowUpRight size={15} />
                </button>
              </div>
              <button
                className="buddy-onboarding-skip"
                onClick={() => setIsOnboarding(false)}
              >
                Enter workspace
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="buddy-page-heading">
      <div>
        <p className="buddy-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function OverviewView({
  profile,
  audit,
  qualityScore,
  datasetName,
  recentDatasets,
  notice,
  assistantGoal,
  setAssistantGoal,
  showPlan,
  setShowPlan,
  runAssistant,
  isPlanning,
  assistantPlan,
  onUpload,
  onDrop,
  isDropActive,
  setIsDropActive,
  onSample,
  onNavigate,
  onNotice,
}: {
  profile: ReturnType<typeof profileRows>;
  audit: AuditReport;
  qualityScore: number;
  datasetName: string;
  recentDatasets: RecentDataset[];
  notice: string;
  assistantGoal: string;
  setAssistantGoal: (value: string) => void;
  showPlan: boolean;
  setShowPlan: (value: boolean) => void;
  runAssistant: () => void;
  isPlanning: boolean;
  assistantPlan: {
    summary: string;
    steps: { title: string; detail: string; risk: "safe" | "review" }[];
    caution: string;
  } | null;
  onUpload: () => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  isDropActive: boolean;
  setIsDropActive: (value: boolean) => void;
  onSample: () => void;
  onNavigate: (view: ViewName) => void;
  onNotice: (message: string) => void;
}) {
  const findingCount = audit.findings.length;
  return (
    <>
      <section className="buddy-welcome-panel buddy-reveal-1">
        <div className="buddy-welcome-copy">
          <p className="buddy-eyebrow">Today’s workspace</p>
          <div className="buddy-speech-bubble">
            Welcome back, dude. Want me to look at this file?
          </div>
          <h1>
            Make the next data decision <em>easy to defend.</em>
          </h1>
          <p>
            Data Buddy profiles source files, proposes reversible cleanup, and
            keeps uncertainty visible.
          </p>
          <div className="buddy-welcome-actions">
            <Button className="buddy-primary-button" onClick={onUpload}>
              <FolderUp size={16} />
              Upload a file
            </Button>
            <button className="buddy-text-action" onClick={onSample}>
              Explore the example <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
        <div className="buddy-welcome-visual">
          <span className="buddy-grid-doodle" />
          <DataBuddyMascot
            mood={notice.includes("Applied") ? "success" : "idle"}
            size="large"
          />
          <span className="buddy-visual-caption">
            FILE CARE, NOT FILE CHAOS
          </span>
        </div>
      </section>

      <section className="buddy-section-heading buddy-reveal-2">
        <div>
          <h2>A clear starting point</h2>
          <p>{datasetName}</p>
        </div>
        <button
          className="buddy-icon-button"
          onClick={() =>
            onNotice("Workspace options are scoped to a connected account.")
          }
          aria-label="More workspace options"
        >
          <MoreHorizontal size={20} />
        </button>
      </section>
      <section className="buddy-overview-grid buddy-reveal-3">
        <article className="buddy-card buddy-quality-card">
          <div className="buddy-card-kicker">
            <ShieldCheck size={16} />
            Quality signal
          </div>
          <div className="buddy-score-line">
            <strong>{qualityScore}</strong>
            <span>/ 100</span>
          </div>
          <p>
            {profile.completeness}% complete.{" "}
            {profile.duplicateCount
              ? "Review duplicate records before exporting."
              : "No exact duplicate records detected."}
          </p>
          <div className="buddy-score-track">
            <span style={{ width: `${qualityScore}%` }} />
          </div>
          <button
            className="buddy-inline-link"
            onClick={() =>
              onNotice(
                "Quality blends completeness with duplicate checks. It is a prioritization signal, not a certification."
              )
            }
          >
            Read how this score works <ChevronRight size={15} />
          </button>
        </article>
        <article className="buddy-card buddy-info-card">
          <div className="buddy-card-kicker">
            <Table2 size={16} />
            Current dataset
          </div>
          <h3>{datasetName}</h3>
          <p>
            {profile.rowCount.toLocaleString()} rows · {profile.columnCount}{" "}
            columns · CSV / Excel / JSON ready
          </p>
          <div className="buddy-mini-row">
            <span>Original snapshot</span>
            <strong>Preserved</strong>
          </div>
          <div className="buddy-mini-row">
            <span>Last profile</span>
            <strong>Just now</strong>
          </div>
        </article>
        <article className="buddy-card buddy-issues-card">
          <div className="buddy-card-kicker">
            <ClipboardCheck size={16} />
            Evidence findings
          </div>
          <strong className="buddy-issue-number">{findingCount || "0"}</strong>
          <p>
            {audit.counts.blocker
              ? `${audit.counts.blocker} block analysis. Open the exact rows before deciding.`
              : findingCount
                ? "Findings are visible before anything changes."
                : "No deterministic audit findings in this working copy."}
          </p>
          <button
            className="buddy-inline-link"
            onClick={() => onNavigate("Evidence")}
          >
            Inspect source rows <ChevronRight size={15} />
          </button>
        </article>
      </section>
      <section className="buddy-upload-recent buddy-reveal-4">
        <div
          className={cn(
            "buddy-drop-zone",
            isDropActive && "buddy-drop-zone-active"
          )}
          role="button"
          tabIndex={0}
          onClick={onUpload}
          onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onUpload();
            }
          }}
          onDragEnter={event => {
            event.preventDefault();
            setIsDropActive(true);
          }}
          onDragOver={event => event.preventDefault()}
          onDragLeave={() => setIsDropActive(false)}
          onDrop={onDrop}
        >
          <FolderUp size={22} />
          <div>
            <strong>Drop a CSV, Excel, or JSON file here</strong>
            <p>
              or browse from your device · Data Buddy builds an evidence audit
              in this browser session
            </p>
          </div>
          <ChevronRight size={18} />
        </div>
        <div className="buddy-recent-list">
          <div className="buddy-recent-heading">
            <span>Recent in this session</span>
            <small>Metadata only</small>
          </div>
          {recentDatasets.map(item => (
            <button
              key={item.name}
              onClick={() => {
                onNavigate("Evidence");
                onNotice(`${item.name} is the active audit in this session.`);
              }}
            >
              <span className="buddy-recent-file">
                <FileText size={14} />
                {item.name}
              </span>
              <span>
                {item.rows} rows · {item.columns} cols
              </span>
              <em>{item.label}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="buddy-assistant-panel buddy-reveal-4">
        <div className="buddy-assistant-avatar">
          <DataBuddyMascot
            mood={isPlanning ? "loading" : "working"}
            size="medium"
            decorative
          />
        </div>
        <div className="buddy-assistant-content">
          <div>
            <p className="buddy-eyebrow">Ask Data Buddy</p>
            <h2>Start with the outcome you need.</h2>
          </div>
          <div className="buddy-assistant-input">
            <input
              value={assistantGoal}
              onChange={event => setAssistantGoal(event.target.value)}
              aria-label="Describe the data outcome you need"
            />
            <Button
              disabled={isPlanning || assistantGoal.trim().length < 3}
              onClick={runAssistant}
              className="buddy-primary-button"
            >
              {isPlanning ? (
                <RefreshCw className="animate-spin" size={15} />
              ) : (
                <Sparkles size={15} />
              )}
              {isPlanning ? "Planning" : "Plan it"}
            </Button>
          </div>
          {showPlan && (
            <div className="buddy-plan">
              {assistantPlan && (
                <p className="buddy-plan-summary">{assistantPlan.summary}</p>
              )}
              {(
                assistantPlan?.steps ?? [
                  {
                    title: "Profile first",
                    detail:
                      "Confirm types, missingness, and exact duplicates before touching source values.",
                    risk: "safe" as const,
                  },
                  {
                    title: "Apply safe formatting",
                    detail:
                      "Trim whitespace and standardize email casing with a reversible preview.",
                    risk: "safe" as const,
                  },
                  {
                    title: "Keep judgement calls visible",
                    detail:
                      "Send missing customer attributes and duplicate candidates to review.",
                    risk: "review" as const,
                  },
                ]
              ).map((step, index) => (
                <div key={step.title}>
                  <span
                    className={cn(
                      "buddy-plan-marker",
                      step.risk === "review" && "buddy-plan-review"
                    )}
                  >
                    {String(index + 1)}
                  </span>
                  <p>
                    <strong>{step.title}.</strong> {step.detail}
                  </p>
                </div>
              ))}
              {assistantPlan && (
                <p className="buddy-plan-caution">{assistantPlan.caution}</p>
              )}
              <button
                onClick={() => setShowPlan(false)}
                className="buddy-plan-dismiss"
              >
                Dismiss plan
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function DatasetsView({
  profile,
  datasetName,
  onUpload,
  onNotice,
}: {
  profile: ReturnType<typeof profileRows>;
  datasetName: string;
  onUpload: () => void;
  onNotice: (message: string) => void;
}) {
  return (
    <>
      <PageHeading
        eyebrow="Dataset profile"
        title={datasetName}
        description="A first-pass profile of structure, completeness, and common data-quality signals."
        action={
          <Button onClick={onUpload} className="buddy-primary-button">
            <Upload size={16} />
            Replace file
          </Button>
        }
      />
      <div className="buddy-stat-grid">
        {[
          {
            label: "Rows",
            value: profile.rowCount.toLocaleString(),
            icon: Table2,
          },
          { label: "Columns", value: profile.columnCount, icon: FileSearch },
          {
            label: "Completeness",
            value: `${profile.completeness}%`,
            icon: ShieldCheck,
          },
          {
            label: "Exact duplicates",
            value: profile.duplicateCount,
            icon: ClipboardCheck,
          },
        ].map(({ label, value, icon: Icon }) => (
          <article className="buddy-stat-card" key={label}>
            <Icon size={17} />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="buddy-card buddy-table-card">
        <div className="buddy-card-header">
          <div>
            <h2>Column profile</h2>
            <p>
              Inferences are suggestions. Confirm types before applying
              consequential changes.
            </p>
          </div>
          <button
            className="buddy-inline-link"
            onClick={() =>
              onNotice(
                "Raw rows stay local to this browser session. The profile shows examples, not a bulk record dump."
              )
            }
          >
            How examples work <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="buddy-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Column</th>
                <th>Inferred type</th>
                <th>Coverage</th>
                <th>Distinct</th>
                <th>Example values</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {profile.columns.map(column => (
                <tr key={column.name}>
                  <td>
                    <strong>{column.name}</strong>
                  </td>
                  <td>
                    <span className="buddy-type-pill">
                      {column.inferredType}
                    </span>
                  </td>
                  <td>
                    {profile.rowCount - column.nullCount} / {profile.rowCount}
                  </td>
                  <td>{column.uniqueCount}</td>
                  <td className="buddy-example-cell">
                    {column.examples.join(", ") || "—"}
                  </td>
                  <td>
                    {column.issue ? (
                      <span className="buddy-signal-pill">
                        <span />
                        {column.issue}
                      </span>
                    ) : (
                      <span className="buddy-clear-text">
                        <Check size={14} />
                        Clear
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="buddy-observations">
        <div className="buddy-section-heading">
          <div>
            <h2>Observed issues</h2>
            <p>Each observation is evidence, not an automatic edit.</p>
          </div>
        </div>
        <div className="buddy-observation-grid">
          {profile.issues.length ? (
            profile.issues.map(issue => (
              <article className="buddy-observation" key={issue.title}>
                <span
                  className={cn(
                    "buddy-observation-icon",
                    issue.severity === "needs-review" &&
                      "buddy-observation-review"
                  )}
                >
                  <ClipboardCheck size={16} />
                </span>
                <div>
                  <strong>{issue.title}</strong>
                  <p>
                    {issue.count} affected{" "}
                    {issue.count === 1 ? "value" : "values"}
                  </p>
                </div>
                <ChevronRight size={17} />
              </article>
            ))
          ) : (
            <article className="buddy-empty-card">
              <DataBuddyMascot mood="success" size="medium" decorative />
              <div>
                <h3>Nothing common to flag</h3>
                <p>
                  Current checks did not find missing values, duplicate records,
                  or format variation.
                </p>
              </div>
            </article>
          )}
        </div>
      </section>
    </>
  );
}

function severityLabel(severity: AuditFinding["severity"]) {
  return severity === "blocker"
    ? "Blocks analysis"
    : severity === "review"
      ? "Requires review"
      : "Informational";
}

const verdictCopy: Record<
  AuditReport["verdict"],
  { label: string; body: string; className: string }
> = {
  blocked: {
    label: "Blocked",
    body: "At least one blocking finding needs a decision before this data feeds analysis.",
    className: "buddy-verdict-blocked",
  },
  review: {
    label: "Review",
    body: "Evidence exists, but only a person can decide the business meaning.",
    className: "buddy-verdict-review",
  },
  safe: {
    label: "Safe",
    body: "No deterministic rule raised a finding in the current working copy.",
    className: "buddy-verdict-safe",
  },
};

function EvidenceView({
  audit,
  datasetName,
  selectedFinding,
  preview,
  onSelect,
  onReviewRepair,
  intakeError,
  onDismissError,
}: {
  audit: AuditReport;
  datasetName: string;
  selectedFinding?: AuditFinding;
  preview: RemediationPreview | null;
  onSelect: (id: string) => void;
  onReviewRepair: () => void;
  intakeError: { code: string; message: string } | null;
  onDismissError: () => void;
}) {
  const verdict = verdictCopy[audit.verdict];
  const findingRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onFindingKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const next = event.key === "ArrowDown" ? index + 1 : index - 1;
    const target = findingRefs.current[next];
    if (target) {
      target.focus();
      const finding = audit.findings[next];
      if (finding) onSelect(finding.id);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="Evidence-first audit"
        title="Find the rows before they corrupt the analysis."
        description={`${datasetName} · findings are deterministic rules with source-row evidence, not invisible data edits.`}
      />
      <section
        className={cn("buddy-verdict-banner", verdict.className)}
        aria-live="polite"
        data-testid="verdict-banner"
      >
        <div className="buddy-verdict-marker" aria-hidden="true" />
        <div>
          <p className="buddy-eyebrow">Quality decision</p>
          <strong>{verdict.label.toUpperCase()}</strong>
          <span>{verdict.body}</span>
        </div>
        <div className="buddy-verdict-meta">
          <span>{audit.rowCount.toLocaleString()} source rows</span>
          <span>{audit.columnCount} columns</span>
          <span>engine {audit.engineVersion}</span>
          {audit.sampled && (
            <span className="buddy-verdict-sampled">
              duplicate detection: sampled mode
            </span>
          )}
        </div>
      </section>
      {intakeError && (
        <section
          className="buddy-error-card"
          role="alert"
          data-testid="intake-error"
        >
          <ClipboardCheck size={18} />
          <div>
            <strong>That file was safely rejected ({intakeError.code}).</strong>
            <p>{intakeError.message}</p>
          </div>
          <button onClick={onDismissError} aria-label="Dismiss error">
            <X size={14} />
          </button>
        </section>
      )}
      <section className="buddy-audit-summary">
        <article className="buddy-audit-summary-card buddy-audit-blocker">
          <span>Blocks analysis</span>
          <strong>{audit.counts.blocker}</strong>
          <p>
            Resolve or explicitly accept these before using affected fields
            downstream.
          </p>
        </article>
        <article className="buddy-audit-summary-card buddy-audit-review">
          <span>Requires review</span>
          <strong>{audit.counts.review}</strong>
          <p>
            Evidence exists, but only a person can decide the business meaning.
          </p>
        </article>
        <article className="buddy-audit-summary-card">
          <span>Informational</span>
          <strong>{audit.counts.info}</strong>
          <p>Useful context that does not claim the source is wrong.</p>
        </article>
      </section>
      <section className="buddy-evidence-layout" id="buddy-evidence-panel">
        <article className="buddy-card buddy-finding-queue">
          <div className="buddy-card-header">
            <div>
              <p className="buddy-eyebrow">Severity-ranked findings</p>
              <h2>Open a finding to see its proof.</h2>
            </div>
            <span className="buddy-review-badge">
              {audit.findings.length} rules
            </span>
          </div>
          <div
            className="buddy-finding-list"
            role="listbox"
            aria-label="Findings by severity"
          >
            {audit.findings.length ? (
              audit.findings.map((finding, index) => (
                <button
                  key={finding.id}
                  ref={element => {
                    findingRefs.current[index] = element;
                  }}
                  role="option"
                  aria-selected={selectedFinding?.id === finding.id}
                  className={cn(
                    "buddy-finding-item",
                    `buddy-finding-${finding.severity}`,
                    selectedFinding?.id === finding.id &&
                      "buddy-finding-selected"
                  )}
                  onClick={() => onSelect(finding.id)}
                  onKeyDown={event => onFindingKeyDown(event, index)}
                >
                  <span className="buddy-finding-rail" aria-hidden="true" />
                  <div>
                    <span className="buddy-severity-label">
                      {severityLabel(finding.severity)}
                      {finding.sampled ? " · sampled" : ""}
                    </span>
                    <strong>{finding.title}</strong>
                    <p>
                      {finding.affectedCount} affected · {finding.id}
                    </p>
                  </div>
                  <ChevronRight size={17} />
                </button>
              ))
            ) : (
              <div className="buddy-empty-card">
                <DataBuddyMascot mood="success" size="medium" decorative />
                <div>
                  <h3>No current findings</h3>
                  <p>
                    The configured deterministic rules did not surface an issue
                    in this working copy.
                  </p>
                </div>
              </div>
            )}
          </div>
        </article>
        <aside className="buddy-evidence-detail">
          {selectedFinding ? (
            <article className="buddy-card">
              <div className="buddy-card-header">
                <div>
                  <p className="buddy-eyebrow">
                    {severityLabel(selectedFinding.severity)}
                  </p>
                  <h2>{selectedFinding.title}</h2>
                </div>
                <span
                  className={cn(
                    "buddy-severity-chip",
                    `buddy-chip-${selectedFinding.severity}`
                  )}
                >
                  {selectedFinding.severity}
                </span>
              </div>
              <p className="buddy-evidence-description">
                {selectedFinding.description}
              </p>
              <div className="buddy-rule-line">
                <span>Rule ID</span>
                <code>{selectedFinding.id}</code>
              </div>
              <div className="buddy-evidence-table-wrap">
                <table className="buddy-evidence-table">
                  <caption className="sr-only">
                    Source-row evidence for {selectedFinding.id}
                  </caption>
                  <thead>
                    <tr>
                      <th>Source row</th>
                      <th>Column</th>
                      <th>Value</th>
                      <th>Why flagged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFinding.evidence.map(item => (
                      <tr
                        key={`${item.rowNumber}-${item.column ?? "row"}-${item.value}`}
                      >
                        <td>{item.rowNumber}</td>
                        <td>{item.column ?? "—"}</td>
                        <td>
                          <code>{item.value || "blank"}</code>
                        </td>
                        <td>{item.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview ? (
                <div className="buddy-preview-cta">
                  <div>
                    <strong>{preview.title}</strong>
                    <p>
                      {preview.changedCount} ledger entr
                      {preview.changedCount === 1 ? "y" : "ies"}. Review the
                      diff before it touches the working copy.
                    </p>
                  </div>
                  <Button
                    className="buddy-primary-button"
                    onClick={onReviewRepair}
                  >
                    Preview repair <ChevronRight size={15} />
                  </Button>
                </div>
              ) : (
                <p className="buddy-side-note">
                  No deterministic repair is proposed for this rule. Keep it in
                  human review.
                </p>
              )}
            </article>
          ) : (
            <div className="buddy-empty-card">
              <DataBuddyMascot mood="idle" size="medium" decorative />
              <div>
                <h3>Select a finding</h3>
                <p>
                  Choose a rule from the queue — its evidence rows and
                  reversible repair preview will open here.
                </p>
              </div>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}

function CleaningView({
  finding,
  preview,
  ledger,
  onApply,
  onRestore,
  onViewEvidence,
}: {
  finding?: AuditFinding;
  preview: RemediationPreview | null;
  ledger: LedgerEntry[];
  onApply: (preview: RemediationPreview) => void;
  onRestore: () => void;
  onViewEvidence: () => void;
}) {
  if (!finding || !preview)
    return (
      <>
        <PageHeading
          eyebrow="Remediation preview"
          title="Choose a finding with a safe preview first."
          description="Only rules with a deterministic repair can create a working-copy preview."
          action={
            <Button className="buddy-primary-button" onClick={onViewEvidence}>
              <FileSearch size={16} />
              Open evidence
            </Button>
          }
        />
        <article className="buddy-empty-card">
          <DataBuddyMascot mood="review" size="medium" decorative />
          <div>
            <h3>Nothing selected for repair</h3>
            <p>
              Open a finding in Evidence, then select Preview repair to inspect
              the before-and-after ledger.
            </p>
          </div>
        </article>
      </>
    );
  const examples = preview.ledger.slice(0, 5);
  return (
    <>
      <PageHeading
        eyebrow="Remediation preview"
        title="Preview the repair. Then decide."
        description={`${finding.title} · The original source snapshot remains untouched.`}
        action={
          <Button
            className="buddy-primary-button"
            onClick={() => onApply(preview)}
          >
            <Check size={16} />
            Apply to working copy
          </Button>
        }
      />
      <section className="buddy-cleaning-layout">
        <div className="buddy-cleaning-main">
          <article className="buddy-card buddy-cleaning-intro">
            <DataBuddyMascot mood="review" size="medium" decorative />
            <div>
              <p className="buddy-eyebrow">Reversible operation</p>
              <h2>{preview.title}</h2>
              <p>
                {preview.description} The repair changes only the current
                working copy and writes an evidence ledger.
              </p>
            </div>
          </article>
          <article className="buddy-card buddy-ledger-card">
            <div className="buddy-card-header">
              <div>
                <p className="buddy-eyebrow">Before / after ledger</p>
                <h2>What would change</h2>
              </div>
              <span className="buddy-review-badge">
                {preview.changedCount} entries
              </span>
            </div>
            {examples.length ? (
              <div className="buddy-evidence-table-wrap">
                <table className="buddy-evidence-table">
                  <thead>
                    <tr>
                      <th>Source row</th>
                      <th>Column</th>
                      <th>Status</th>
                      <th>Before</th>
                      <th>After</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examples.map(entry => (
                      <tr
                        key={`${entry.rowNumber}-${entry.column}-${entry.before}`}
                      >
                        <td>{entry.rowNumber}</td>
                        <td>{entry.column ?? "—"}</td>
                        <td>
                          <span className="buddy-type-pill">
                            {entry.status}
                          </span>
                        </td>
                        <td>
                          <code>{entry.before}</code>
                        </td>
                        <td>
                          <code>{entry.after}</code>
                        </td>
                        <td>{entry.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="buddy-side-note">
                This repair currently produces no changed or skipped entries for
                the active working copy.
              </p>
            )}
          </article>
        </div>
        <aside className="buddy-cleaning-side">
          <article className="buddy-card">
            <p className="buddy-eyebrow">Decision boundary</p>
            <h3>What Data Buddy will not decide</h3>
            <p className="buddy-side-note">
              It will not invent values, select which near-duplicate person is
              correct, or claim the repair is factually right. Use the ledger to
              review the deterministic operation.
            </p>
          </article>
          <button className="buddy-outline-action" onClick={onViewEvidence}>
            <FileSearch size={16} />
            Back to evidence
          </button>
          <button className="buddy-outline-action" onClick={onRestore}>
            <RefreshCw size={16} />
            Restore source snapshot
          </button>
        </aside>
      </section>
      {ledger.length ? (
        <section className="buddy-card buddy-review-queue">
          <div className="buddy-card-header">
            <div>
              <p className="buddy-eyebrow">Last applied ledger</p>
              <h2>
                {ledger.length} recorded working-copy operation
                {ledger.length === 1 ? "" : "s"}
              </h2>
            </div>
          </div>
          <p>
            Export the audit report from Documents to preserve this ledger
            alongside the evidence findings.
          </p>
        </section>
      ) : null}
    </>
  );
}

function AnalysisView({
  profile,
  datasetName,
}: {
  profile: ReturnType<typeof profileRows>;
  datasetName: string;
}) {
  const [selectedColumn, setSelectedColumn] = useState(
    profile.columns[0]?.name ?? ""
  );
  const selected =
    profile.columns.find(column => column.name === selectedColumn) ??
    profile.columns[0];
  const scale = Math.max(
    ...profile.columns.map(column => column.uniqueCount),
    1
  );
  return (
    <>
      <PageHeading
        eyebrow="Column analysis"
        title="Make the structure visible."
        description={`Summary statistics and lightweight distributions for ${datasetName}.`}
      />
      <section className="buddy-analysis-layout">
        <article className="buddy-card buddy-column-list">
          <p className="buddy-eyebrow">Columns</p>
          {profile.columns.map(column => (
            <button
              key={column.name}
              className={cn(
                "buddy-column-option",
                column.name === selected?.name && "buddy-column-selected"
              )}
              onClick={() => setSelectedColumn(column.name)}
            >
              <span>
                <strong>{column.name}</strong>
                <small>{column.inferredType}</small>
              </span>
              <span>
                {column.nullCount ? `${column.nullCount} null` : "Complete"}
              </span>
            </button>
          ))}
        </article>
        {selected ? (
          <article className="buddy-card buddy-analysis-detail">
            <div className="buddy-card-header">
              <div>
                <p className="buddy-eyebrow">Selected column</p>
                <h2>{selected.name}</h2>
              </div>
              <span className="buddy-type-pill">{selected.inferredType}</span>
            </div>
            <div className="buddy-metric-grid">
              <Metric label="Distinct values" value={selected.uniqueCount} />
              <Metric label="Null values" value={selected.nullCount} />
              <Metric label="Minimum" value={formatNumber(selected.min)} />
              <Metric label="Maximum" value={formatNumber(selected.max)} />
              <Metric label="Mean" value={formatNumber(selected.mean)} />
            </div>
            <div className="buddy-chart-area">
              <div className="buddy-chart-heading">
                <div>
                  <h3>Value footprint</h3>
                  <p>Relative distinct values by field</p>
                </div>
                <span>Current field highlighted</span>
              </div>
              <div className="buddy-bars">
                {profile.columns.slice(0, 7).map(column => (
                  <div
                    key={column.name}
                    className={cn(
                      "buddy-bar-row",
                      column.name === selected.name && "buddy-bar-current"
                    )}
                  >
                    <span>{column.name}</span>
                    <div>
                      <i
                        style={{
                          width: `${Math.max(8, (column.uniqueCount / scale) * 100)}%`,
                        }}
                      />
                    </div>
                    <strong>{column.uniqueCount}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="buddy-insight">
              <Sparkles size={17} />
              <p>
                <strong>Plain-language read:</strong>{" "}
                {selected.nullCount
                  ? `${selected.name} has ${selected.nullCount} blank value${selected.nullCount === 1 ? "" : "s"}, so use caution when relying on it for matching or segmentation.`
                  : `${selected.name} is complete in the current profile.`}
              </p>
            </div>
          </article>
        ) : null}
      </section>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DocumentsView({
  dictionary,
  quality,
  auditMarkdown,
  ledger,
  savedReports,
  isAuthenticated,
  onCopy,
  onSave,
  isSaving,
  onDownload,
}: {
  dictionary: string;
  quality: string;
  auditMarkdown: string;
  ledger: LedgerEntry[];
  savedReports: {
    id: string;
    datasetName: string;
    createdAt: Date;
    blockerCount: number;
    reviewCount: number;
    status: "draft" | "saved" | "reviewed";
  }[];
  isAuthenticated: boolean;
  onCopy: (text: string, label: string) => void;
  onSave: () => void;
  isSaving: boolean;
  onDownload: () => void;
}) {
  const [tab, setTab] = useState<"audit" | "quality" | "dictionary" | "ledger">(
    "audit"
  );
  const ledgerMarkdown = ledger.length
    ? ledger
        .map(
          entry =>
            `- source row ${entry.rowNumber}${entry.column ? ` · ${entry.column}` : ""}: **${entry.status}** — ${entry.reason}\n  - before: ${entry.before}\n  - after: ${entry.after}`
        )
        .join("\n")
    : "No remediation has been applied to the current working copy.";
  const content =
    tab === "audit"
      ? auditMarkdown
      : tab === "quality"
        ? quality
        : tab === "dictionary"
          ? dictionary
          : `# Remediation ledger\n\n${ledgerMarkdown}`;
  return (
    <>
      <PageHeading
        eyebrow="Audit documentation"
        title="Put the evidence in plain language."
        description="Download the rule IDs, row evidence, and applied working-copy ledger with the column profile."
        action={
          <div className="buddy-document-actions">
            <button className="buddy-outline-action" onClick={onSave}>
              {isSaving ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <ShieldCheck size={16} />
              )}
              {isSaving ? "Saving" : "Save audit"}
            </button>
            <Button onClick={onDownload} className="buddy-primary-button">
              <Download size={16} />
              Download audit .md
            </Button>
          </div>
        }
      />
      <section className="buddy-document-layout">
        <article className="buddy-card buddy-document-card">
          <div className="buddy-document-tabs">
            <button
              className={cn(tab === "audit" && "buddy-document-tab-active")}
              onClick={() => setTab("audit")}
            >
              Evidence audit
            </button>
            <button
              className={cn(tab === "quality" && "buddy-document-tab-active")}
              onClick={() => setTab("quality")}
            >
              Quality report
            </button>
            <button
              className={cn(
                tab === "dictionary" && "buddy-document-tab-active"
              )}
              onClick={() => setTab("dictionary")}
            >
              Data dictionary
            </button>
            <button
              className={cn(tab === "ledger" && "buddy-document-tab-active")}
              onClick={() => setTab("ledger")}
            >
              Ledger
            </button>
            <button
              className="buddy-document-copy"
              onClick={() => onCopy(content, "Current audit document")}
            >
              <Copy size={15} />
              Copy
            </button>
          </div>
          <pre className="buddy-document-preview">{content}</pre>
        </article>
        <aside className="buddy-document-side">
          <DataBuddyMascot mood="success" size="medium" decorative />
          <p className="buddy-accent-script">
            The clearest handoff is the one someone can check.
          </p>
          <h3>Ready for the next person.</h3>
          <p>
            Use this as a transparent companion to the working copy. It names
            what was found without claiming that a rule proves a business
            correction.
          </p>
          <button
            className="buddy-outline-action"
            onClick={() =>
              onCopy(
                `${auditMarkdown}\n\n${quality}\n\n${dictionary}\n\n# Remediation ledger\n\n${ledgerMarkdown}`,
                "Complete evidence package"
              )
            }
          >
            <Copy size={16} />
            Copy all documentation
          </button>
          <div className="buddy-report-history">
            <p className="buddy-eyebrow">Private report history</p>
            {!isAuthenticated ? (
              <p>
                Sign in and select Save audit to retain metadata, findings, and
                a remediation ledger in your account.
              </p>
            ) : savedReports.length ? (
              savedReports.slice(0, 3).map(report => (
                <div key={report.id}>
                  <strong>{report.datasetName}</strong>
                  <span>
                    {report.status} · {report.blockerCount} blockers ·{" "}
                    {report.reviewCount} review
                  </span>
                </div>
              ))
            ) : (
              <p>
                No saved audits yet. Your original file bytes are never stored
                in this report history.
              </p>
            )}
          </div>
        </aside>
      </section>
    </>
  );
}
