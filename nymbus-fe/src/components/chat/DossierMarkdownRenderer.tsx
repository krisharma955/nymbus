"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Globe,
  Quote,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Compass,
  Building2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { ReportCitationResponse, VerificationStatus } from "@/types/nymbus";
import { CitationBadge } from "./CitationBadge";

interface DossierMarkdownRendererProps {
  content: string;
  citationMap: Map<string, ReportCitationResponse>;
  onCitationClick: (evidenceId: string, citation?: ReportCitationResponse) => void;
  parentTitle?: string;
}

interface ParsedFinding {
  claim: string;
  status: VerificationStatus;
  confidence?: number;
  passage?: string;
  citationLabel?: string;
  citation?: ReportCitationResponse;
}

interface ParsedSource {
  index: number;
  title: string;
  url: string;
  domain?: string;
  sourceType?: string;
}

/**
 * Cleanly renders inline markdown:
 * - [1], [2], [C1] -> Interactive CitationBadge
 * - [Text](url) -> Interactive styled external link
 * - **bold** -> Bold span
 * - *italic* or _italic_ -> Italic span
 * - `code` -> Monospace code pill
 */
export function renderInlineContent(
  text: string,
  citationMap: Map<string, ReportCitationResponse>,
  onCitationClick: (evidenceId: string, citation?: ReportCitationResponse) => void
): React.ReactNode {
  if (!text) return null;

  // Split tokens by:
  // 1. Bracketed citations like [1], [2], [cit-1], [C1]
  // 2. Markdown links like [Link Text](https://...)
  // 3. Bold like **text**
  // 4. Inline code like `code`
  // 5. Italics like *text* or _text_
  const tokenRegex =
    /(\[[A-Za-z0-9_-]+\]|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`|(?:\b_[^_]+_\b|\*[^*]+\*))/g;

  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // 1. Check Citation match like [1] or [cit-1]
    const citationMatch = part.match(/^\[([A-Za-z0-9_-]+)\]$/);
    if (citationMatch) {
      const citation = citationMap.get(part);
      if (citation) {
        return (
          <CitationBadge
            key={`cit-${index}`}
            label={part}
            evidenceId={citation.evidenceId}
            status={citation.verificationStatus}
            confidence={Number(citation.confidenceScore)}
            onClick={(id) => onCitationClick(id, citation)}
          />
        );
      }
    }

    // 2. Check Markdown Link like [Title](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      return (
        <a
          key={`link-${index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#D4A373] hover:text-[#E8BD90] hover:underline font-medium transition-colors"
        >
          <span>{label}</span>
          <ExternalLink className="w-3 h-3 inline-block shrink-0 opacity-70" />
        </a>
      );
    }

    // 3. Check Bold like **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={`bold-${index}`} className="font-semibold text-[#F8FAFC]">
          {renderInlineContent(inner, citationMap, onCitationClick)}
        </strong>
      );
    }

    // 4. Check Inline Code like `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={`code-${index}`}
          className="px-1.5 py-0.5 rounded bg-[#161B26] border border-[#1C202A] font-mono text-xs text-[#D4A373] tracking-wide"
        >
          {inner}
        </code>
      );
    }

    // 5. Check Italics like *text* or _text_
    if (
      (part.startsWith("*") && part.endsWith("*") && part.length >= 2) ||
      (part.startsWith("_") && part.endsWith("_") && part.length >= 2)
    ) {
      const inner = part.slice(1, -1);
      return (
        <em key={`em-${index}`} className="italic text-slate-300">
          {renderInlineContent(inner, citationMap, onCitationClick)}
        </em>
      );
    }

    return <span key={`txt-${index}`}>{part}</span>;
  });
}

/**
 * Finding Card for structured findings
 */
function FindingCard({
  finding,
  index,
  citationMap,
  onCitationClick,
}: {
  finding: ParsedFinding;
  index: number;
  citationMap: Map<string, ReportCitationResponse>;
  onCitationClick: (evidenceId: string, citation?: ReportCitationResponse) => void;
}) {
  const [passageExpanded, setPassageExpanded] = useState<boolean>(false);

  const isVerified = finding.status === "VERIFIED";
  const isRefuted = finding.status === "REFUTED";
  const confidencePercent =
    finding.confidence !== undefined
      ? (finding.confidence * 100).toFixed(1)
      : null;

  // Split title prefix if format is "Title: Details"
  const colonIndex = finding.claim.indexOf(":");
  const hasPrefix = colonIndex > 0 && colonIndex < 80;
  const prefix = hasPrefix ? finding.claim.slice(0, colonIndex).trim() : null;
  const body = hasPrefix ? finding.claim.slice(colonIndex + 1).trim() : finding.claim;

  const isLongPassage = (finding.passage?.length || 0) > 280;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        isVerified
          ? "bg-[#0E121A] border-[#1C202A] hover:border-[#D4A373]/30"
          : isRefuted
          ? "bg-rose-950/20 border-rose-900/40"
          : "bg-[#0E121A] border-[#1C202A]"
      }`}
    >
      {/* Finding Header Bar */}
      <div className="px-4 py-2.5 bg-[#121622] border-b border-[#1C202A] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-[#1A202E] text-[#94A3B8] font-mono font-semibold text-[10px]">
            FINDING #{String(index + 1).padStart(2, "0")}
          </span>

          {isVerified ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>VERIFIED</span>
              {confidencePercent && (
                <span className="text-emerald-500/70">· {confidencePercent}%</span>
              )}
            </span>
          ) : isRefuted ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/40 border border-rose-500/30 text-rose-300 font-mono text-[11px] font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>REFUTED</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>UNVERIFIED</span>
            </span>
          )}
        </div>

        {/* Citation Pill trigger */}
        {finding.citationLabel && (
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#94A3B8]">
            <span className="text-slate-500">Provenance:</span>
            {finding.citation ? (
              <CitationBadge
                label={finding.citationLabel}
                evidenceId={finding.citation.evidenceId}
                status={finding.citation.verificationStatus}
                confidence={Number(finding.citation.confidenceScore)}
                onClick={(id) => onCitationClick(id, finding.citation)}
              />
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-[#161B26] text-[#D4A373] border border-[#D4A373]/20">
                {finding.citationLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Finding Claim Content */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="text-sm sm:text-base leading-relaxed text-[#F8FAFC]">
          {prefix && (
            <span className="font-semibold text-[#D4A373] mr-2">
              {prefix}:
            </span>
          )}
          <span className="text-slate-200">
            {renderInlineContent(body, citationMap, onCitationClick)}
          </span>
        </div>

        {/* Verbatim Supporting Evidence Drawer / Quote */}
        {finding.passage && (
          <div className="mt-3 rounded-lg bg-[#090C12] border border-[#1A1F2C] overflow-hidden">
            <div className="px-3 py-1.5 bg-[#0D1119] border-b border-[#1A1F2C] flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
              <div className="flex items-center gap-1.5 text-[#D4A373]">
                <Quote className="w-3 h-3" />
                <span className="uppercase tracking-wider font-semibold text-[10px]">
                  Verbatim Source Evidence
                </span>
              </div>
              {isLongPassage && (
                <button
                  type="button"
                  onClick={() => setPassageExpanded((prev) => !prev)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <span>{passageExpanded ? "Collapse" : "Expand passage"}</span>
                  {passageExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>

            <div className="p-3.5 text-xs text-slate-300 font-mono leading-relaxed relative">
              <span className="text-[#D4A373] text-sm select-none font-bold mr-1">&ldquo;</span>
              <span>
                {isLongPassage && !passageExpanded
                  ? finding.passage.slice(0, 260) + "..."
                  : finding.passage}
              </span>
              <span className="text-[#D4A373] text-sm select-none font-bold ml-1">&rdquo;</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Recommendation Callout
 */
function RecommendationCard({
  text,
  index,
  citationMap,
  onCitationClick,
}: {
  text: string;
  index: number;
  citationMap: Map<string, ReportCitationResponse>;
  onCitationClick: (evidenceId: string, citation?: ReportCitationResponse) => void;
}) {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-[#111622] to-[#0D1017] border border-[#D4A373]/25 flex items-start gap-3.5 text-sm transition-all hover:border-[#D4A373]/45 shadow-sm">
      <div className="p-2 rounded-lg bg-[#D4A373]/10 text-[#D4A373] shrink-0 mt-0.5 border border-[#D4A373]/20">
        <Compass className="w-4 h-4" />
      </div>
      <div className="space-y-1 overflow-hidden flex-1">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[#D4A373] font-semibold">
          Actionable Directive #{index + 1}
        </div>
        <p className="text-slate-200 leading-relaxed">
          {renderInlineContent(text, citationMap, onCitationClick)}
        </p>
      </div>
    </div>
  );
}

/**
 * References & Sources Consulted Grid
 */
function SourcesGrid({
  sources,
}: {
  sources: ParsedSource[];
}) {
  const getTypeBadge = (type?: string) => {
    switch (type?.toUpperCase()) {
      case "GOVERNMENT":
        return {
          icon: Building2,
          color: "bg-sky-950/40 text-sky-400 border-sky-500/30",
        };
      case "RESEARCH_PAPER":
        return {
          icon: GraduationCap,
          color: "bg-purple-950/40 text-purple-400 border-purple-500/30",
        };
      case "INDUSTRY_REPORT":
        return {
          icon: Sparkles,
          color: "bg-amber-950/40 text-amber-400 border-amber-500/30",
        };
      default:
        return {
          icon: Globe,
          color: "bg-emerald-950/40 text-emerald-400 border-emerald-500/30",
        };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
      {sources.map((src) => {
        const typeInfo = getTypeBadge(src.sourceType);
        const TypeIcon = typeInfo.icon;

        return (
          <a
            key={src.index}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3.5 rounded-xl bg-[#0D1017] border border-[#1C202A] hover:border-[#D4A373]/40 hover:bg-[#121622] transition-all flex flex-col justify-between gap-3 group"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 overflow-hidden">
                <span className="w-5 h-5 rounded-md bg-[#161B26] text-[#94A3B8] font-mono text-[10px] flex items-center justify-center shrink-0 border border-[#1C202A] mt-0.5">
                  {src.index}
                </span>
                <span className="text-xs font-medium text-[#F8FAFC] group-hover:text-[#D4A373] transition-colors line-clamp-2 leading-snug">
                  {src.title}
                </span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#D4A373] shrink-0 transition-colors" />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-[#1C202A]/60">
              <span className="text-slate-400 truncate max-w-[150px]">
                {src.domain || new URL(src.url).hostname}
              </span>
              {src.sourceType && (
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded border text-[9px] font-semibold ${typeInfo.color}`}
                >
                  <TypeIcon className="w-2.5 h-2.5" />
                  <span>{src.sourceType}</span>
                </span>
              )}
            </div>
          </a>
        );
      })}
    </div>
  );
}

/**
 * Code Block with Copy Button
 */
function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl bg-[#090B10] border border-[#1C202A] overflow-hidden font-mono text-xs shadow-lg">
      <div className="px-4 py-2 bg-[#10131A] border-b border-[#1C202A] flex items-center justify-between text-slate-400">
        <span className="text-[11px] text-[#D4A373] uppercase tracking-wider font-semibold">
          {lang || "CODE"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#161B26] hover:bg-[#1E2433] text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-slate-200 leading-relaxed scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Markdown Table Renderer
 */
function MarkdownTable({
  tableLines,
  citationMap,
  onCitationClick,
}: {
  tableLines: string[];
  citationMap: Map<string, ReportCitationResponse>;
  onCitationClick: (evidenceId: string, citation?: ReportCitationResponse) => void;
}) {
  if (tableLines.length < 2) return null;

  const parseCells = (line: string) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

  const headerCells = parseCells(tableLines[0]);
  const dataLines = tableLines.slice(1).filter((l) => !l.match(/^\|?[-:\s|]+\|?$/));

  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-[#1C202A] bg-[#0A0D14] shadow-md scrollbar-thin">
      <table className="w-full text-left text-xs text-slate-300">
        <thead className="bg-[#121622] text-[#F8FAFC] font-mono text-[11px] uppercase tracking-wider border-b border-[#1C202A]">
          <tr>
            {headerCells.map((cell, i) => (
              <th key={i} className="px-4 py-3 font-semibold">
                {renderInlineContent(cell, citationMap, onCitationClick)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1C202A]/80 font-sans">
          {dataLines.map((line, rIdx) => {
            const cells = parseCells(line);
            return (
              <tr
                key={rIdx}
                className="hover:bg-[#121622]/60 transition-colors even:bg-[#0E1119]"
              >
                {cells.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-2.5 leading-relaxed">
                    {renderInlineContent(cell, citationMap, onCitationClick)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Main Dossier Markdown Renderer
 */
export function DossierMarkdownRenderer({
  content,
  citationMap,
  onCitationClick,
  parentTitle,
}: DossierMarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split("\n");
  const renderedElements: React.ReactNode[] = [];

  let lineIdx = 0;
  let blockKey = 0;

  // Helper to normalize heading strings for deduplication against parent section title
  const normalizeForComparison = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const parentTitleNorm = parentTitle ? normalizeForComparison(parentTitle) : "";

  while (lineIdx < lines.length) {
    const rawLine = lines[lineIdx];
    const trimmed = rawLine.trim();

    // 1. Skip Empty Lines
    if (!trimmed) {
      lineIdx++;
      continue;
    }

    // 2. Code Block
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      lineIdx++;
      const codeLines: string[] = [];
      while (lineIdx < lines.length && !lines[lineIdx].trim().startsWith("```")) {
        codeLines.push(lines[lineIdx]);
        lineIdx++;
      }
      if (lineIdx < lines.length) lineIdx++; // consume closing ```
      renderedElements.push(
        <CodeBlock key={`code-${blockKey++}`} code={codeLines.join("\n")} lang={lang} />
      );
      continue;
    }

    // 3. Markdown Table (starts and ends with '|')
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [];
      while (
        lineIdx < lines.length &&
        lines[lineIdx].trim().startsWith("|") &&
        lines[lineIdx].trim().endsWith("|")
      ) {
        tableLines.push(lines[lineIdx]);
        lineIdx++;
      }
      renderedElements.push(
        <MarkdownTable
          key={`tbl-${blockKey++}`}
          tableLines={tableLines}
          citationMap={citationMap}
          onCitationClick={onCitationClick}
        />
      );
      continue;
    }

    // 4. Structured Finding Block (- **Core Finding:** ...)
    if (trimmed.startsWith("- **Core Finding:**") || trimmed.startsWith("* **Core Finding:**")) {
      const findingList: ParsedFinding[] = [];

      while (lineIdx < lines.length) {
        const curTrim = lines[lineIdx].trim();
        if (
          curTrim.startsWith("- **Core Finding:**") ||
          curTrim.startsWith("* **Core Finding:**")
        ) {
          // Extract claim
          const claim = curTrim.replace(/^[-*]\s+\*\*Core Finding:\*\*\s*/, "").trim();

          // Check if there is an embedded citation label in the claim (e.g. [1])
          let citLabel: string | undefined;
          const citMatch = claim.match(/\[([A-Za-z0-9_-]+)\]/);
          if (citMatch) {
            citLabel = citMatch[0];
          }

          let status: VerificationStatus = "VERIFIED";
          let confidence: number | undefined = undefined;
          let passage: string | undefined = undefined;

          lineIdx++;

          // Look ahead for sub-bullets
          while (lineIdx < lines.length) {
            const subLine = lines[lineIdx].trim();
            if (
              subLine.startsWith("- **Verification Status:**") ||
              subLine.startsWith("* **Verification Status:**")
            ) {
              const statusText = subLine
                .replace(/^[-*]\s+\*\*Verification Status:\*\*\s*/, "")
                .trim();
              if (statusText.includes("VERIFIED")) status = "VERIFIED";
              else if (statusText.includes("REFUTED")) status = "REFUTED";
              else if (statusText.includes("INCONCLUSIVE")) status = "INCONCLUSIVE";

              const confMatch = statusText.match(/Confidence:\s*([0-9.]+)/i);
              if (confMatch) {
                confidence = parseFloat(confMatch[1]);
              }
              lineIdx++;
            } else if (
              subLine.startsWith("- **Supporting Source Text:**") ||
              subLine.startsWith("* **Supporting Source Text:**")
            ) {
              let pText = subLine
                .replace(/^[-*]\s+\*\*Supporting Source Text:\*\*\s*/, "")
                .trim();
              // Remove surrounding quotes / markdown italics _"..."_ or "_"
              pText = pText.replace(/^[_"']+|[_"']+$/g, "").trim();
              passage = pText;
              lineIdx++;
            } else if (subLine.startsWith("- **Core Finding:**") || subLine.startsWith("* **Core Finding:**")) {
              break;
            } else if (subLine.startsWith("- ") || subLine.startsWith("#") || subLine.match(/^\d+\./)) {
              break;
            } else if (!subLine) {
              lineIdx++;
            } else {
              // Append to passage or claim if continuation line
              lineIdx++;
            }
          }

          findingList.push({
            claim,
            status,
            confidence,
            passage,
            citationLabel: citLabel,
            citation: citLabel ? citationMap.get(citLabel) : undefined,
          });
        } else {
          break;
        }
      }

      renderedElements.push(
        <div key={`findings-group-${blockKey++}`} className="space-y-4 my-4">
          {findingList.map((f, fIdx) => (
            <FindingCard
              key={fIdx}
              finding={f}
              index={fIdx}
              citationMap={citationMap}
              onCitationClick={onCitationClick}
            />
          ))}
        </div>
      );
      continue;
    }

    // 5. Actionable Recommendation Block (- **Recommendation:** ...)
    if (trimmed.startsWith("- **Recommendation:**") || trimmed.startsWith("* **Recommendation:**")) {
      const recList: string[] = [];
      while (
        lineIdx < lines.length &&
        (lines[lineIdx].trim().startsWith("- **Recommendation:**") ||
          lines[lineIdx].trim().startsWith("* **Recommendation:**"))
      ) {
        const text = lines[lineIdx]
          .trim()
          .replace(/^[-*]\s+\*\*Recommendation:\*\*\s*/, "")
          .trim();
        recList.push(text);
        lineIdx++;
      }

      renderedElements.push(
        <div key={`rec-group-${blockKey++}`} className="space-y-2.5 my-3">
          {recList.map((recText, rIdx) => (
            <RecommendationCard
              key={rIdx}
              text={recText}
              index={rIdx}
              citationMap={citationMap}
              onCitationClick={onCitationClick}
            />
          ))}
        </div>
      );
      continue;
    }

    // 6. Numbered References & Sources Section (1. [Title](url) — **domain** (TYPE))
    const refMatch = trimmed.match(/^(\d+)\.\s+\[([^\]]+)\]\(([^)]+)\)(.*)$/);
    if (refMatch) {
      const parsedSources: ParsedSource[] = [];

      while (lineIdx < lines.length) {
        const curLine = lines[lineIdx].trim();
        const m = curLine.match(/^(\d+)\.\s+\[([^\]]+)\]\(([^)]+)\)(.*)$/);
        if (m) {
          const num = parseInt(m[1], 10);
          const title = m[2];
          const url = m[3];
          const rest = m[4] || "";

          // Extract domain e.g. — **domain**
          const domMatch = rest.match(/—\s*\*\*([^*]+)\*\*/);
          const domain = domMatch ? domMatch[1] : undefined;

          // Extract type e.g. (WEBSITE) or (GOVERNMENT)
          const typeMatch = rest.match(/\(([A-Z_]+)\)/);
          const sourceType = typeMatch ? typeMatch[1] : undefined;

          parsedSources.push({
            index: num,
            title,
            url,
            domain,
            sourceType,
          });
          lineIdx++;
        } else if (!curLine) {
          lineIdx++;
        } else {
          break;
        }
      }

      renderedElements.push(
        <SourcesGrid key={`sources-grid-${blockKey++}`} sources={parsedSources} />
      );
      continue;
    }

    // 7. Headings (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();

      // Deduplicate if heading equals parent title
      const headingNorm = normalizeForComparison(headingText);
      if (parentTitleNorm && (headingNorm === parentTitleNorm || parentTitleNorm.includes(headingNorm))) {
        lineIdx++;
        continue;
      }

      lineIdx++;

      if (level === 1) {
        renderedElements.push(
          <h1
            key={`h1-${blockKey++}`}
            className="text-lg sm:text-xl font-bold text-[#F8FAFC] tracking-tight pb-2 border-b border-[#1C202A] mt-5 mb-3 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-[#D4A373]" />
            <span>{renderInlineContent(headingText, citationMap, onCitationClick)}</span>
          </h1>
        );
      } else if (level === 2) {
        renderedElements.push(
          <h2
            key={`h2-${blockKey++}`}
            className="text-base sm:text-lg font-semibold text-[#F8FAFC] tracking-tight pb-1.5 border-b border-[#1C202A]/70 mt-5 mb-2.5 flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373]/80" />
            <span>{renderInlineContent(headingText, citationMap, onCitationClick)}</span>
          </h2>
        );
      } else if (level === 3) {
        renderedElements.push(
          <h3
            key={`h3-${blockKey++}`}
            className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#D4A373] mt-4 mb-2 flex items-center gap-1.5"
          >
            <span className="text-slate-500 font-mono">›</span>
            <span>{renderInlineContent(headingText, citationMap, onCitationClick)}</span>
          </h3>
        );
      } else {
        renderedElements.push(
          <h4
            key={`h4-${blockKey++}`}
            className="text-xs font-semibold text-slate-300 uppercase tracking-wide mt-3 mb-1.5"
          >
            {renderInlineContent(headingText, citationMap, onCitationClick)}
          </h4>
        );
      }
      continue;
    }

    // 8. Blockquote (> ...)
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (lineIdx < lines.length && lines[lineIdx].trim().startsWith(">")) {
        quoteLines.push(lines[lineIdx].trim().replace(/^>\s*/, ""));
        lineIdx++;
      }
      renderedElements.push(
        <blockquote
          key={`quote-${blockKey++}`}
          className="my-3 pl-4 py-2 border-l-2 border-[#D4A373] bg-[#D4A373]/5 rounded-r-lg text-sm text-slate-300 italic leading-relaxed"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx}>{renderInlineContent(ql, citationMap, onCitationClick)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 9. Standard Bullet List (- or *)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const listItems: string[] = [];
      while (
        lineIdx < lines.length &&
        (lines[lineIdx].trim().startsWith("- ") || lines[lineIdx].trim().startsWith("* "))
      ) {
        listItems.push(lines[lineIdx].trim().replace(/^[-*]\s+/, ""));
        lineIdx++;
      }
      renderedElements.push(
        <ul key={`ul-${blockKey++}`} className="space-y-2 my-2.5 pl-1">
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="flex items-start gap-2.5 text-sm text-slate-300 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373] mt-2 shrink-0 shadow-[0_0_4px_#D4A373]" />
              <div className="flex-1">
                {renderInlineContent(item, citationMap, onCitationClick)}
              </div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 10. Standard Numbered List (1. ...)
    if (trimmed.match(/^\d+\.\s+/)) {
      const listItems: string[] = [];
      while (lineIdx < lines.length && lines[lineIdx].trim().match(/^\d+\.\s+/)) {
        listItems.push(lines[lineIdx].trim().replace(/^\d+\.\s+/, ""));
        lineIdx++;
      }
      renderedElements.push(
        <ol key={`ol-${blockKey++}`} className="space-y-2 my-2.5 pl-1">
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="flex items-start gap-2.5 text-sm text-slate-300 leading-relaxed">
              <span className="px-1.5 py-0.5 rounded bg-[#161B26] text-[#94A3B8] font-mono text-[10px] font-semibold mt-0.5 shrink-0 border border-[#1C202A]">
                {itemIdx + 1}
              </span>
              <div className="flex-1">
                {renderInlineContent(item, citationMap, onCitationClick)}
              </div>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 11. Regular Paragraph
    renderedElements.push(
      <p key={`p-${blockKey++}`} className="text-sm sm:text-base text-slate-300 leading-relaxed my-2 font-sans">
        {renderInlineContent(trimmed, citationMap, onCitationClick)}
      </p>
    );
    lineIdx++;
  }

  return <div className="space-y-3">{renderedElements}</div>;
}
