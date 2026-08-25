import { getLoadingStage, loadingStream, type LoadingStage } from "@/lib/loadingStages";
import { cn } from "@/lib/utils";
import { useId } from "react";

export type BuddyMood = "idle" | "working" | "review" | "success" | "loading";

type MascotCopy = { left: string; right: string; mode: string };

const moodCopy: Record<BuddyMood, MascotCopy> = {
  idle: { left: "IDLE", right: "OK_", mode: "MODE: NORMAL" },
  working: { left: "WORK", right: "...", mode: "MODE: FOCUS" },
  review: { left: "CHECK", right: "?", mode: "MODE: REVIEW" },
  success: { left: "DONE", right: "✓", mode: "MODE: CLEAR" },
  loading: { left: "READ", right: "INIT", mode: "READ: INTAKE" },
};

export function DataBuddyMascot({
  mood = "idle",
  size = "large",
  className,
  decorative = false,
  loadingStage,
  fileName,
}: {
  mood?: BuddyMood;
  size?: "small" | "medium" | "large";
  className?: string;
  decorative?: boolean;
  loadingStage?: LoadingStage;
  fileName?: string;
}) {
  const clipSeed = useId().replace(/:/g, "");
  const leftClipId = `buddy-left-lens-${clipSeed}`;
  const rightClipId = `buddy-right-lens-${clipSeed}`;
  const isLoading = mood === "loading" && Boolean(loadingStage);
  const stage = isLoading ? getLoadingStage(loadingStage!) : undefined;
  const copy = stage ? { left: stage.left, right: stage.right, mode: stage.mode } : moodCopy[mood];
  const sizes = { small: "w-[64px]", medium: "w-[128px]", large: "w-[232px] sm:w-[272px]" };
  const visibleStages = isLoading ? loadingStream.slice(0, stage!.index + 1) : [];
  const streamOffset = Math.max(0, visibleStages.length - 1) * -24;

  return <svg className={cn("buddy-mascot shrink-0 overflow-visible", sizes[size], className)} viewBox="0 0 400 520" role={decorative ? undefined : "img"} aria-label={decorative ? undefined : `Data Buddy is ${isLoading ? stage?.title.toLowerCase() : mood}`} aria-hidden={decorative || undefined}>
    <defs><clipPath id={leftClipId}><rect x="122" y="136" width="60" height="46" rx="10" /></clipPath><clipPath id={rightClipId}><rect x="218" y="136" width="60" height="46" rx="10" /></clipPath></defs>
    <g className="buddy-character" transform="translate(0, 10)">
      {isLoading && <g className="buddy-loading-file-tab"><rect x="62" y="310" width="40" height="48" rx="4" className="buddy-white buddy-outline" strokeWidth="3.5" /><line x1="69" y1="323" x2="95" y2="323" className="buddy-muted-line" strokeWidth="2.5" /><text x="82" y="345" className="buddy-file-label">{(fileName?.split(".").pop() ?? "CSV").slice(0, 4).toUpperCase()}</text></g>}
      <path className="buddy-grey buddy-outline" d="M142 375 L134 442 L178 442 L190 405 L210 405 L222 442 L266 442 L258 375 Z" />
      <path className="buddy-black buddy-outline" d="M124 442 C124 430 180 430 180 442 L180 460 C180 472 118 472 124 442 Z" /><path className="buddy-white buddy-outline" strokeWidth="4.5" d="M121 460 L180 460 C180 468 172 472 165 472 L122 472 C117 472 117 466 121 460 Z" />
      <path className="buddy-black buddy-outline" d="M220 442 C220 430 276 430 276 442 L276 460 C276 472 214 472 220 442 Z" /><path className="buddy-white buddy-outline" strokeWidth="4.5" d="M217 460 L276 460 C276 468 268 472 261 472 L218 472 C213 472 213 466 217 460 Z" />
      <path className="buddy-black buddy-outline" d="M126 248 L112 360 C112 376 134 382 200 382 C266 382 288 376 288 360 L274 248 C245 264 155 264 126 248 Z" /><path className="buddy-pocket" d="M142 328 C172 342 228 342 258 328" />
      <path className="buddy-black buddy-outline" d="M124 252 L92 338 C87 352 102 364 114 352 L132 296" /><circle cx="94" cy="354" r="11.5" className="buddy-white buddy-outline" strokeWidth="5.5" />
      <path className="buddy-black buddy-outline" d="M276 252 L308 338 C313 352 298 364 286 352 L268 296" /><circle cx="306" cy="354" r="11.5" className="buddy-white buddy-outline" strokeWidth="5.5" />
      <path className="buddy-white buddy-outline" strokeWidth="5.5" d="M168 244 L200 268 L232 244 C220 236 180 236 168 244 Z" /><path className="buddy-detail" d="M188 260 L186 284 M212 260 L214 284" />
      <g className={cn("buddy-mascot-head", isLoading && "buddy-loading-head")} data-stage={loadingStage}>
        <path className="buddy-grey buddy-outline" strokeWidth="6.5" d="M112 80 L175 80 L194 102 L286 102 C295 102 302 108 302 116 L302 140 L98 140 L98 94 C98 86 104 80 112 80 Z" /><text x="144" y="92" className="buddy-file-label">{fileName ? fileName.slice(0, 12) : "sys_doc.md"}</text>
        <path className="buddy-white buddy-outline" strokeWidth="4.5" d="M124 94 L276 94 L276 115 L124 115 Z" /><line x1="138" y1="104" x2="190" y2="104" className="buddy-muted-line" />
        <rect x="98" y="104" width="204" height="142" rx="16" className="buddy-white buddy-outline" strokeWidth="7" /><circle cx="114" cy="120" r="2.5" className="buddy-corner" /><circle cx="286" cy="120" r="2.5" className="buddy-corner" /><circle cx="114" cy="230" r="2.5" className="buddy-corner" /><circle cx="286" cy="230" r="2.5" className="buddy-corner" />
        <rect x="118" y="132" width="68" height="54" rx="14" className="buddy-white buddy-thick-outline" /><rect x="214" y="132" width="68" height="54" rx="14" className="buddy-white buddy-thick-outline" /><line x1="186" y1="159" x2="214" y2="159" className="buddy-thick-outline" /><line x1="118" y1="159" x2="98" y2="155" className="buddy-side-hinge" /><line x1="282" y1="159" x2="302" y2="155" className="buddy-side-hinge" />
        {isLoading ? <><g clipPath={`url(#${leftClipId})`} transform="translate(152,159)"><g className="buddy-terminal-stream" style={{ transform: `translateY(${streamOffset}px)` }}>{visibleStages.map((item, index) => <text key={item} x="0" y={index * 24} className="buddy-lens-text">{getLoadingStage(item).left}</text>)}</g></g><g clipPath={`url(#${rightClipId})`} transform="translate(248,159)"><g className="buddy-terminal-stream" style={{ transform: `translateY(${streamOffset}px)` }}>{visibleStages.map((item, index) => <text key={item} x="0" y={index * 24} className="buddy-lens-text">{getLoadingStage(item).right}</text>)}</g><text x="19" y="5" className="buddy-lens-text buddy-cursor">_</text></g><g className="buddy-loading-scanline"><line x1="122" y1="159" x2="182" y2="159" /><line x1="218" y1="159" x2="278" y2="159" /></g></> : <><text x="152" y="164" className="buddy-lens-text">{copy.left}</text><text x="248" y="164" className={cn("buddy-lens-text", mood === "idle" && "buddy-cursor")}>{copy.right}</text></>}
        <rect x="132" y="200" width="136" height="24" rx="12" className="buddy-mode-pill" /><text x="200" y="216" className="buddy-mode-text">[ {copy.mode} ]</text>
      </g>
    </g>
  </svg>;
}
