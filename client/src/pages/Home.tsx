import { DataBuddyMascot, type BuddyMood } from "@/components/DataBuddyMascot";
import { Button } from "@/components/ui/button";
import { createDocumentation, normaliseRows, profileRows, type DataRow } from "@/lib/dataBuddy";
import { applyCleaningAction, createImportedDataset, type CleaningAction, type RecentDataset } from "@/lib/workspaceActions";
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
import { ChangeEvent, DragEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

type ViewName = "Overview" | "Datasets" | "Cleaning" | "Analysis" | "Documents";

const demoRows: DataRow[] = [
  { customer_id: 1001, name: "Ana Ortiz ", email: "ANA.ORTIZ@EXAMPLE.COM", region: "North", orders: "12", lifetime_value: "1890" },
  { customer_id: 1002, name: "Mika Tan", email: "mika.tan@example.com", region: "North", orders: "4", lifetime_value: "420" },
  { customer_id: 1003, name: "Jules Laurent", email: "jules.laurent@example.com", region: "West", orders: "8", lifetime_value: "1200" },
  { customer_id: 1004, name: "Samira Khan", email: "samira.khan@example.com", region: null, orders: "3", lifetime_value: "310" },
  { customer_id: 1005, name: "Samira Khan", email: "samira.khan@example.com", region: null, orders: "3", lifetime_value: "310" },
  { customer_id: 1006, name: "Leon Kim", email: "leon.kim@example.com ", region: "South", orders: "5", lifetime_value: "750" },
];

const navigation: { name: ViewName; icon: typeof LayoutDashboard; description: string }[] = [
  { name: "Overview", icon: LayoutDashboard, description: "Quality at a glance" },
  { name: "Datasets", icon: Table2, description: "Profile source files" },
  { name: "Cleaning", icon: WandSparkles, description: "Preview safe fixes" },
  { name: "Analysis", icon: BarChart3, description: "Inspect each column" },
  { name: "Documents", icon: FileText, description: "Explain the dataset" },
];

function formatNumber(value?: number) {
  return value === undefined ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function saveText(name: string, content: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export default function Home() {
  const [activeView, setActiveView] = useState<ViewName>("Overview");
  const [rows, setRows] = useState<DataRow[]>(demoRows);
  const [datasetName, setDatasetName] = useState("Customer import — example");
  const [recentDatasets, setRecentDatasets] = useState<RecentDataset[]>([{ name: "Customer import — example", rows: demoRows.length, columns: Object.keys(demoRows[0] ?? {}).length, label: "Example" }]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [assistantGoal, setAssistantGoal] = useState("Prepare this customer list for CRM import");
  const [showPlan, setShowPlan] = useState(false);
  const [assistantPlan, setAssistantPlan] = useState<{
    summary: string;
    steps: { title: string; detail: string; risk: "safe" | "review" }[];
    caution: string;
  } | null>(null);
  const [notice, setNotice] = useState("Example workspace ready for review.");
  const [isDropActive, setIsDropActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const profile = useMemo(() => profileRows(rows), [rows]);
  const docs = useMemo(() => createDocumentation(profile, datasetName), [profile, datasetName]);
  const qualityScore = Math.max(0, Math.round((profile.completeness * 0.72 + (profile.duplicateCount ? 12 : 28))));
  const planMutation = trpc.assistant.plan.useMutation({
    onSuccess: plan => {
      setAssistantPlan(plan);
      setShowPlan(true);
      setTemporaryNotice("Data Buddy prepared a review-first plan using profile metadata, not raw rows.");
    },
    onError: () => {
      setAssistantPlan(null);
      setShowPlan(true);
      setTemporaryNotice("Data Buddy prepared a local review-first plan. The AI service was not available.");
    },
  });

  const setTemporaryNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4200);
  };

  const parseFile = async (file: File) => {
    setIsProcessing(true);
    setNotice("");
    try {
      const bytes = await file.arrayBuffer();
      const workbook = XLSX.read(bytes, { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
      if (!firstSheet) throw new Error("No readable worksheet found.");
      const importedRows = normaliseRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: null, raw: false }));
      if (!importedRows.length) throw new Error("This file has no data rows to review.");
      window.setTimeout(() => {
        const importedDataset = createImportedDataset(file.name, importedRows);
        setRows(importedRows);
        setDatasetName(importedDataset.name);
        setRecentDatasets(current => [importedDataset, ...current.filter(item => item.name !== importedDataset.name)].slice(0, 3));
        setActiveView("Datasets");
        setIsOnboarding(false);
        setIsProcessing(false);
        setTemporaryNotice(`Imported ${importedRows.length} rows. The original file remains unchanged.`);
      }, 560);
    } catch (error) {
      setIsProcessing(false);
      setTemporaryNotice(error instanceof Error ? error.message : "Data Buddy could not read that file.");
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

  const applyFixes = (action: CleaningAction) => {
    const result = applyCleaningAction(rows, action);
    setRows(result.rows);
    setTemporaryNotice(result.notice);
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
      setTemporaryNotice("Copy was blocked by this browser. Select the text and copy it manually.");
    }
  };

  const currentMood: BuddyMood = isProcessing ? "loading" : activeView === "Cleaning" ? "review" : notice.includes("Applied") ? "success" : "idle";
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" as const };

  return (
    <div className="buddy-app-shell">
      <aside className={cn("buddy-sidebar", isSidebarOpen && "buddy-sidebar-open")} aria-label="Data Buddy navigation">
        <div className="buddy-sidebar-brand">
          <div className="buddy-brand-mark"><DataBuddyMascot size="small" decorative /></div>
          <div>
            <span className="buddy-wordmark">Data Buddy</span>
            <span className="buddy-submark">quality workspace</span>
          </div>
          <button className="buddy-mobile-close" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <button className="buddy-workspace-switcher" onClick={() => setTemporaryNotice("Workspace switching is ready for the connected account flow.")}>
          <span className="buddy-workspace-initial">D</span>
          <span><strong>Data studio</strong><small>Personal workspace</small></span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>

        <nav className="buddy-nav-list">
          <p className="buddy-nav-label">Workspace</p>
          {navigation.map(item => {
            const Icon = item.icon;
            const active = activeView === item.name;
            return <button key={item.name} onClick={() => { setActiveView(item.name); setIsSidebarOpen(false); }} className={cn("buddy-nav-item", active && "buddy-nav-active")} aria-current={active ? "page" : undefined}>
              <Icon size={17} strokeWidth={1.8} /><span>{item.name}</span>
            </button>;
          })}
        </nav>

        <div className="buddy-sidebar-bottom">
          <button className="buddy-nav-item" onClick={() => setTemporaryNotice("Settings will contain workspace and privacy preferences.")}><Settings2 size={17} strokeWidth={1.8} /><span>Settings</span></button>
          <div className="buddy-sidebar-status"><span className="buddy-status-dot" />Originals stay untouched</div>
        </div>
      </aside>

      {isSidebarOpen && <button className="buddy-sidebar-scrim" aria-label="Close navigation" onClick={() => setIsSidebarOpen(false)} />}

      <main className="buddy-main-canvas">
        <header className="buddy-topbar">
          <div className="buddy-topbar-left">
            <button className="buddy-menu-button" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
            <div className="buddy-crumbs"><span>Data studio</span><ChevronRight size={14} /><strong>{activeView}</strong></div>
          </div>
          <div className="buddy-topbar-actions">
            <div className="buddy-save-state"><span className="buddy-status-dot" />All changes saved</div>
            <Button className="buddy-primary-button" onClick={openFilePicker}><Upload size={16} />Upload data</Button>
            <input ref={fileInputRef} onChange={onUpload} type="file" accept=".csv,.xlsx,.xls" className="sr-only" aria-label="Upload CSV or Excel file" />
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div key={activeView} initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -6 }} transition={transition} className="buddy-page">
            {activeView === "Overview" && <OverviewView profile={profile} qualityScore={qualityScore} datasetName={datasetName} recentDatasets={recentDatasets} notice={notice} assistantGoal={assistantGoal} setAssistantGoal={setAssistantGoal} showPlan={showPlan} setShowPlan={setShowPlan} runAssistant={runAssistant} isPlanning={planMutation.isPending} assistantPlan={assistantPlan} onUpload={openFilePicker} onDrop={handleDrop} isDropActive={isDropActive} setIsDropActive={setIsDropActive} onSample={() => { setRows(demoRows); setDatasetName("Customer import — example"); setIsOnboarding(false); setTemporaryNotice("The example dataset is ready to explore."); }} onNavigate={setActiveView} onNotice={setTemporaryNotice} />}
            {activeView === "Datasets" && <DatasetsView profile={profile} datasetName={datasetName} onUpload={openFilePicker} onNotice={setTemporaryNotice} />}
            {activeView === "Cleaning" && <CleaningView profile={profile} rows={rows} onApply={applyFixes} onViewProfile={() => setActiveView("Datasets")} />}
            {activeView === "Analysis" && <AnalysisView profile={profile} datasetName={datasetName} />}
            {activeView === "Documents" && <DocumentsView dictionary={docs.dictionary} quality={docs.quality} onCopy={copy} onDownload={() => saveText(`${datasetName.toLowerCase().replace(/\s+/g, "-")}-documentation.md`, `${docs.quality}\n\n---\n\n# Data dictionary\n\n${docs.dictionary}`)} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {!!notice && <motion.div className="buddy-notice" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: 6 }} transition={transition} role="status"><DataBuddyMascot mood={notice.includes("Applied") ? "success" : "idle"} size="small" decorative /><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss notification"><X size={15} /></button></motion.div>}
      </AnimatePresence>

      <AnimatePresence>
        {isProcessing && <motion.div className="buddy-processing-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="buddy-processing-card"><DataBuddyMascot mood="loading" size="large" /><p className="buddy-accent-script">One moment, I’m reading the shape of this file.</p><strong>Profiling your data</strong><span>Data Buddy is checking columns, formats, and common quality issues.</span></div>
        </motion.div>}
      </AnimatePresence>
      <AnimatePresence>
        {isOnboarding && <motion.div className="buddy-onboarding-overlay" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="buddy-onboarding-card"><p className="buddy-eyebrow">Welcome to Data Buddy</p><DataBuddyMascot mood="idle" size="large" /><p className="buddy-accent-script">Bring me the messy spreadsheet. We’ll take it one check at a time.</p><h1>A calmer place to understand your data.</h1><p>Start with an upload or use a small example workspace. Nothing is changed without a visible step.</p><div><Button className="buddy-primary-button" onClick={() => { setIsOnboarding(false); window.setTimeout(openFilePicker, 0); }}><Upload size={16} />Upload a file</Button><button className="buddy-text-action" onClick={() => { setIsOnboarding(false); setTemporaryNotice("The example workspace is ready to explore."); }}>Explore example <ArrowUpRight size={15} /></button></div><button className="buddy-onboarding-skip" onClick={() => setIsOnboarding(false)}>Enter workspace</button></div></motion.div>}
      </AnimatePresence>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="buddy-page-heading"><div><p className="buddy-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function OverviewView({ profile, qualityScore, datasetName, recentDatasets, notice, assistantGoal, setAssistantGoal, showPlan, setShowPlan, runAssistant, isPlanning, assistantPlan, onUpload, onDrop, isDropActive, setIsDropActive, onSample, onNavigate, onNotice }: { profile: ReturnType<typeof profileRows>; qualityScore: number; datasetName: string; recentDatasets: RecentDataset[]; notice: string; assistantGoal: string; setAssistantGoal: (value: string) => void; showPlan: boolean; setShowPlan: (value: boolean) => void; runAssistant: () => void; isPlanning: boolean; assistantPlan: { summary: string; steps: { title: string; detail: string; risk: "safe" | "review" }[]; caution: string; } | null; onUpload: () => void; onDrop: (event: DragEvent<HTMLElement>) => void; isDropActive: boolean; setIsDropActive: (value: boolean) => void; onSample: () => void; onNavigate: (view: ViewName) => void; onNotice: (message: string) => void }) {
  const issueCount = profile.issues.reduce((total, issue) => total + issue.count, 0);
  return <>
    <section className="buddy-welcome-panel buddy-reveal-1">
      <div className="buddy-welcome-copy"><p className="buddy-eyebrow">Today’s workspace</p><div className="buddy-speech-bubble">Welcome back, dude. Want me to look at this file?</div><h1>Make the next data decision <em>easy to defend.</em></h1><p>Data Buddy profiles source files, proposes reversible cleanup, and keeps uncertainty visible.</p><div className="buddy-welcome-actions"><Button className="buddy-primary-button" onClick={onUpload}><FolderUp size={16} />Upload a file</Button><button className="buddy-text-action" onClick={onSample}>Explore the example <ArrowUpRight size={15} /></button></div></div>
      <div className="buddy-welcome-visual"><span className="buddy-grid-doodle" /><DataBuddyMascot mood={notice.includes("Applied") ? "success" : "idle"} size="large" /><span className="buddy-visual-caption">FILE CARE, NOT FILE CHAOS</span></div>
    </section>

    <section className="buddy-section-heading buddy-reveal-2"><div><h2>A clear starting point</h2><p>{datasetName}</p></div><button className="buddy-icon-button" onClick={() => onNotice("Workspace options are scoped to a connected account.")} aria-label="More workspace options"><MoreHorizontal size={20} /></button></section>
    <section className="buddy-overview-grid buddy-reveal-3">
      <article className="buddy-card buddy-quality-card"><div className="buddy-card-kicker"><ShieldCheck size={16} />Quality signal</div><div className="buddy-score-line"><strong>{qualityScore}</strong><span>/ 100</span></div><p>{profile.completeness}% complete. {profile.duplicateCount ? "Review duplicate records before exporting." : "No exact duplicate records detected."}</p><div className="buddy-score-track"><span style={{ width: `${qualityScore}%` }} /></div><button className="buddy-inline-link" onClick={() => onNotice("Quality blends completeness with duplicate checks. It is a prioritization signal, not a certification.")}>Read how this score works <ChevronRight size={15} /></button></article>
      <article className="buddy-card buddy-info-card"><div className="buddy-card-kicker"><Table2 size={16} />Current dataset</div><h3>{datasetName}</h3><p>{profile.rowCount.toLocaleString()} rows · {profile.columnCount} columns · CSV / XLSX ready</p><div className="buddy-mini-row"><span>Original snapshot</span><strong>Preserved</strong></div><div className="buddy-mini-row"><span>Last profile</span><strong>Just now</strong></div></article>
      <article className="buddy-card buddy-issues-card"><div className="buddy-card-kicker"><ClipboardCheck size={16} />Needs attention</div><strong className="buddy-issue-number">{issueCount || "0"}</strong><p>{issueCount ? "items are visible before anything changes." : "No common quality issues found by current checks."}</p><button className="buddy-inline-link" onClick={() => onNavigate("Datasets")}>Review observations <ChevronRight size={15} /></button></article>
    </section>
    <section className="buddy-upload-recent buddy-reveal-4"><div className={cn("buddy-drop-zone", isDropActive && "buddy-drop-zone-active")} role="button" tabIndex={0} onClick={onUpload} onKeyDown={(event: KeyboardEvent<HTMLElement>) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onUpload(); } }} onDragEnter={event => { event.preventDefault(); setIsDropActive(true); }} onDragOver={event => event.preventDefault()} onDragLeave={() => setIsDropActive(false)} onDrop={onDrop}><FolderUp size={22} /><div><strong>Drop a CSV or Excel file here</strong><p>or browse from your device · a profile is created in this browser session</p></div><ChevronRight size={18} /></div><div className="buddy-recent-list"><div className="buddy-recent-heading"><span>Recent in this session</span><small>Metadata only</small></div>{recentDatasets.map(item => <button key={item.name} onClick={() => { onNavigate("Datasets"); onNotice(`${item.name} is the active profile in this session.`); }}><span className="buddy-recent-file"><FileText size={14} />{item.name}</span><span>{item.rows} rows · {item.columns} cols</span><em>{item.label}</em></button>)}</div></section>

    <section className="buddy-assistant-panel buddy-reveal-4"><div className="buddy-assistant-avatar"><DataBuddyMascot mood={isPlanning ? "loading" : "working"} size="medium" decorative /></div><div className="buddy-assistant-content"><div><p className="buddy-eyebrow">Ask Data Buddy</p><h2>Start with the outcome you need.</h2></div><div className="buddy-assistant-input"><input value={assistantGoal} onChange={event => setAssistantGoal(event.target.value)} aria-label="Describe the data outcome you need" /><Button disabled={isPlanning || assistantGoal.trim().length < 3} onClick={runAssistant} className="buddy-primary-button">{isPlanning ? <RefreshCw className="animate-spin" size={15} /> : <Sparkles size={15} />}{isPlanning ? "Planning" : "Plan it"}</Button></div>{showPlan && <div className="buddy-plan">{assistantPlan && <p className="buddy-plan-summary">{assistantPlan.summary}</p>}{(assistantPlan?.steps ?? [{ title: "Profile first", detail: "Confirm types, missingness, and exact duplicates before touching source values.", risk: "safe" as const }, { title: "Apply safe formatting", detail: "Trim whitespace and standardize email casing with a reversible preview.", risk: "safe" as const }, { title: "Keep judgement calls visible", detail: "Send missing customer attributes and duplicate candidates to review.", risk: "review" as const }]).map((step, index) => <div key={step.title}><span className={cn("buddy-plan-marker", step.risk === "review" && "buddy-plan-review")}>{String(index + 1)}</span><p><strong>{step.title}.</strong> {step.detail}</p></div>)}{assistantPlan && <p className="buddy-plan-caution">{assistantPlan.caution}</p>}<button onClick={() => setShowPlan(false)} className="buddy-plan-dismiss">Dismiss plan</button></div>}</div></section>
  </>;
}

function DatasetsView({ profile, datasetName, onUpload, onNotice }: { profile: ReturnType<typeof profileRows>; datasetName: string; onUpload: () => void; onNotice: (message: string) => void }) {
  return <><PageHeading eyebrow="Dataset profile" title={datasetName} description="A first-pass profile of structure, completeness, and common data-quality signals." action={<Button onClick={onUpload} className="buddy-primary-button"><Upload size={16} />Replace file</Button>} />
    <div className="buddy-stat-grid">{[{ label: "Rows", value: profile.rowCount.toLocaleString(), icon: Table2 }, { label: "Columns", value: profile.columnCount, icon: FileSearch }, { label: "Completeness", value: `${profile.completeness}%`, icon: ShieldCheck }, { label: "Exact duplicates", value: profile.duplicateCount, icon: ClipboardCheck }].map(({ label, value, icon: Icon }) => <article className="buddy-stat-card" key={label}><Icon size={17} /><span>{label}</span><strong>{value}</strong></article>)}</div>
    <section className="buddy-card buddy-table-card"><div className="buddy-card-header"><div><h2>Column profile</h2><p>Inferences are suggestions. Confirm types before applying consequential changes.</p></div><button className="buddy-inline-link" onClick={() => onNotice("Raw rows stay local to this browser session. The profile shows examples, not a bulk record dump.")}>How examples work <ArrowUpRight size={15} /></button></div><div className="buddy-table-wrap"><table><thead><tr><th>Column</th><th>Inferred type</th><th>Coverage</th><th>Distinct</th><th>Example values</th><th>Signal</th></tr></thead><tbody>{profile.columns.map(column => <tr key={column.name}><td><strong>{column.name}</strong></td><td><span className="buddy-type-pill">{column.inferredType}</span></td><td>{profile.rowCount - column.nullCount} / {profile.rowCount}</td><td>{column.uniqueCount}</td><td className="buddy-example-cell">{column.examples.join(", ") || "—"}</td><td>{column.issue ? <span className="buddy-signal-pill"><span />{column.issue}</span> : <span className="buddy-clear-text"><Check size={14} />Clear</span>}</td></tr>)}</tbody></table></div></section>
    <section className="buddy-observations"><div className="buddy-section-heading"><div><h2>Observed issues</h2><p>Each observation is evidence, not an automatic edit.</p></div></div><div className="buddy-observation-grid">{profile.issues.length ? profile.issues.map(issue => <article className="buddy-observation" key={issue.title}><span className={cn("buddy-observation-icon", issue.severity === "needs-review" && "buddy-observation-review")}><ClipboardCheck size={16} /></span><div><strong>{issue.title}</strong><p>{issue.count} affected {issue.count === 1 ? "value" : "values"}</p></div><ChevronRight size={17} /></article>) : <article className="buddy-empty-card"><DataBuddyMascot mood="success" size="medium" decorative /><div><h3>Nothing common to flag</h3><p>Current checks did not find missing values, duplicate records, or format variation.</p></div></article>}</div></section>
  </>;
}

function CleaningView({ profile, rows, onApply, onViewProfile }: { profile: ReturnType<typeof profileRows>; rows: DataRow[]; onApply: (action: CleaningAction) => void; onViewProfile: () => void }) {
  const [selectedFix, setSelectedFix] = useState<CleaningAction>("format");
  const missingCount = profile.columns.reduce((sum, column) => sum + column.nullCount, 0);
  const fixes: { id: CleaningAction; title: string; detail: string; affected: number; before: string; after: string }[] = [
    { id: "format", title: "Normalize formatting & exact copies", detail: "Trim whitespace, normalize email casing, and remove exact duplicate rows.", affected: Math.max(profile.duplicateCount, 1), before: String(rows[0]?.email ?? "—"), after: String(rows[0]?.email ?? "—").trim().toLowerCase() },
    { id: "flagMissing", title: "Flag rows with missing values", detail: "Add a review flag without filling, replacing, or deleting any source values.", affected: missingCount, before: String(rows.find(row => Object.values(row).some(value => value === null || value === ""))?.region ?? "—"), after: "data_buddy_missing_review: true" },
    { id: "coerceNumbers", title: "Coerce fully numeric columns", detail: "Turn values into numbers only where every non-empty entry is number-like.", affected: profile.columns.filter(column => column.inferredType === "Number").length, before: String(rows[0]?.orders ?? "—"), after: String(Number(String(rows[0]?.orders ?? "").replaceAll(",", ""))) },
  ];
  const selected = fixes.find(fix => fix.id === selectedFix) ?? fixes[0];
  return <><PageHeading eyebrow="Cleaning studio" title="Preview first. Then decide." description="Data Buddy separates deterministic housekeeping from record-level decisions that should stay human." action={<Button onClick={() => onApply(selectedFix)} className="buddy-primary-button"><Check size={16} />Apply selected fix</Button>} />
    <section className="buddy-cleaning-layout"><div className="buddy-cleaning-main"><article className="buddy-card buddy-cleaning-intro"><DataBuddyMascot mood="review" size="medium" decorative /><div><p className="buddy-eyebrow">Review mode</p><h2>I’ll make the reversible things easy.</h2><p>Formatting, number conversion, and review flags each stay separate, so you can decide what changes next.</p></div></article><div className="buddy-fix-list">{fixes.map((fix, index) => <button className={cn("buddy-fix-item", selectedFix === fix.id && "buddy-fix-selected")} key={fix.id} onClick={() => setSelectedFix(fix.id)}><span className="buddy-fix-index">{String(index + 1).padStart(2, "0")}</span><div><strong>{fix.title}</strong><p>{fix.detail}</p></div><span className="buddy-ready-tag">{fix.affected} <Check size={14} /></span></button>)}</div></div>
      <aside className="buddy-cleaning-side"><article className="buddy-card"><p className="buddy-eyebrow">Preview selected fix</p><h3>{selected.title}</h3><div className="buddy-diff"><div><span>Before</span><code>{selected.before}</code></div><div><span>After</span><code>{selected.after}</code></div></div><p className="buddy-side-note">{selected.detail} The original upload remains unchanged.</p></article><button className="buddy-outline-action" onClick={onViewProfile}><FileSearch size={16} />Return to profile</button></aside></section>
    <section className="buddy-card buddy-review-queue"><div className="buddy-card-header"><div><p className="buddy-eyebrow">Human review</p><h2>Keep ambiguous cases out of autopilot.</h2></div><span className="buddy-review-badge">{profile.duplicateCount + profile.columns.filter(column => column.nullCount > 0).reduce((sum, column) => sum + column.nullCount, 0)} items</span></div><p>Exact duplicates and missing fields are visible here as prompts for a person. Data Buddy will not decide which customer record is more complete.</p></section>
  </>;
}

function AnalysisView({ profile, datasetName }: { profile: ReturnType<typeof profileRows>; datasetName: string }) {
  const [selectedColumn, setSelectedColumn] = useState(profile.columns[0]?.name ?? "");
  const selected = profile.columns.find(column => column.name === selectedColumn) ?? profile.columns[0];
  const scale = Math.max(...profile.columns.map(column => column.uniqueCount), 1);
  return <><PageHeading eyebrow="Column analysis" title="Make the structure visible." description={`Summary statistics and lightweight distributions for ${datasetName}.`} />
    <section className="buddy-analysis-layout"><article className="buddy-card buddy-column-list"><p className="buddy-eyebrow">Columns</p>{profile.columns.map(column => <button key={column.name} className={cn("buddy-column-option", column.name === selected?.name && "buddy-column-selected")} onClick={() => setSelectedColumn(column.name)}><span><strong>{column.name}</strong><small>{column.inferredType}</small></span><span>{column.nullCount ? `${column.nullCount} null` : "Complete"}</span></button>)}</article>
      {selected ? <article className="buddy-card buddy-analysis-detail"><div className="buddy-card-header"><div><p className="buddy-eyebrow">Selected column</p><h2>{selected.name}</h2></div><span className="buddy-type-pill">{selected.inferredType}</span></div><div className="buddy-metric-grid"><Metric label="Distinct values" value={selected.uniqueCount} /><Metric label="Null values" value={selected.nullCount} /><Metric label="Minimum" value={formatNumber(selected.min)} /><Metric label="Maximum" value={formatNumber(selected.max)} /><Metric label="Mean" value={formatNumber(selected.mean)} /></div><div className="buddy-chart-area"><div className="buddy-chart-heading"><div><h3>Value footprint</h3><p>Relative distinct values by field</p></div><span>Current field highlighted</span></div><div className="buddy-bars">{profile.columns.slice(0, 7).map(column => <div key={column.name} className={cn("buddy-bar-row", column.name === selected.name && "buddy-bar-current")}><span>{column.name}</span><div><i style={{ width: `${Math.max(8, (column.uniqueCount / scale) * 100)}%` }} /></div><strong>{column.uniqueCount}</strong></div>)}</div></div><div className="buddy-insight"><Sparkles size={17} /><p><strong>Plain-language read:</strong> {selected.nullCount ? `${selected.name} has ${selected.nullCount} blank value${selected.nullCount === 1 ? "" : "s"}, so use caution when relying on it for matching or segmentation.` : `${selected.name} is complete in the current profile.`}</p></div></article> : null}</section>
  </>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div><span>{label}</span><strong>{value}</strong></div>; }

function DocumentsView({ dictionary, quality, onCopy, onDownload }: { dictionary: string; quality: string; onCopy: (text: string, label: string) => void; onDownload: () => void }) {
  const [tab, setTab] = useState<"quality" | "dictionary">("quality");
  const content = tab === "quality" ? quality : dictionary;
  return <><PageHeading eyebrow="Documentation" title="Put the evidence in plain language." description="Generate a readable quality report and data dictionary from the active profile." action={<Button onClick={onDownload} className="buddy-primary-button"><Download size={16} />Download .md</Button>} />
    <section className="buddy-document-layout"><article className="buddy-card buddy-document-card"><div className="buddy-document-tabs"><button className={cn(tab === "quality" && "buddy-document-tab-active")} onClick={() => setTab("quality")}>Quality report</button><button className={cn(tab === "dictionary" && "buddy-document-tab-active")} onClick={() => setTab("dictionary")}>Data dictionary</button><button className="buddy-document-copy" onClick={() => onCopy(content, tab === "quality" ? "Quality report" : "Data dictionary")}><Copy size={15} />Copy</button></div><pre className="buddy-document-preview">{content}</pre></article><aside className="buddy-document-side"><DataBuddyMascot mood="success" size="medium" decorative /><p className="buddy-accent-script">The clearest handoff is the one someone can check.</p><h3>Ready for the next person.</h3><p>Use this as a transparent companion to the cleaned file. It names what was found without claiming more than the checks can show.</p><button className="buddy-outline-action" onClick={() => onCopy(`${quality}\n\n${dictionary}`, "Complete documentation")}><Copy size={16} />Copy all documentation</button></aside></section>
  </>;
}
