/**
 * Pipeline Board — JobNimbus-Style Kanban
 * Clean drag-and-drop pipeline with stage columns.
 * All job categories flow through unified stages.
 */

"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import {
  CreditCard,
  DollarSign,
  FileCheck,
  GripVertical,
  MapPin,
  Plus,
  Search,
  User,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/* ── Types ──────────────────────────────────────────────────── */

interface Job {
  id: string;
  title: string;
  stage: string;
  jobCategory: string;
  value?: number;
  updatedAt: string;
  contacts?: {
    firstName: string;
    lastName: string;
    email?: string;
    city?: string;
    state?: string;
  };
  claimNumber?: string;
  carrier?: string;
}

interface JobsCategoryBoardProps {
  initialJobs: Job[];
}

/* ── Stage columns ──────────────────────────────────────────── */

const STAGES = [
  { id: "new", label: "New", gradient: "from-blue-500 to-blue-600" },
  { id: "qualified", label: "Qualified", gradient: "from-indigo-500 to-indigo-600" },
  { id: "proposal", label: "Proposal", gradient: "from-amber-500 to-amber-600" },
  { id: "negotiation", label: "Negotiation", gradient: "from-orange-500 to-orange-600" },
  { id: "won", label: "Won", gradient: "from-emerald-500 to-emerald-600" },
];

/* ── Category badge config ──────────────────────────────────── */

const CAT: Record<string, { tag: string; cls: string; border: string; Icon: typeof FileCheck }> = {
  claim: {
    tag: "Claim",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    border: "border-l-blue-500",
    Icon: FileCheck,
  },
  repair: {
    tag: "Repair",
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    border: "border-l-slate-400",
    Icon: Wrench,
  },
  out_of_pocket: {
    tag: "OOP",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    border: "border-l-amber-500",
    Icon: DollarSign,
  },
  financed: {
    tag: "Financed",
    cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    border: "border-l-green-500",
    Icon: CreditCard,
  },
};

const FILTERS = [
  { id: "all", label: "All Jobs" },
  { id: "claim", label: "Claims" },
  { id: "repair", label: "Repair" },
  { id: "out_of_pocket", label: "Out of Pocket" },
  { id: "financed", label: "Financed" },
];

/* ── Droppable column ───────────────────────────────────────── */

function StageColumn({ stageId, children }: { stageId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[220px] flex-1 space-y-2 rounded-b-xl border border-t-0 p-2 transition-all ${
        isOver
          ? "border-primary/40 bg-primary/5 ring-2 ring-primary/20"
          : "border-slate-200 bg-white/40 dark:border-slate-700/60 dark:bg-slate-900/20"
      }`}
    >
      {children}
    </div>
  );
}

/* ── Draggable card wrapper ─────────────────────────────────── */

function DraggableJobCard({ job }: { job: Job }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.id,
    data: { job },
  });

  const elRef = useRef<HTMLDivElement | null>(null);
  const setRefs = (n: HTMLDivElement | null) => {
    setNodeRef(n);
    elRef.current = n;
  };

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.style.transform = transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : "";
    el.style.transition = transition ?? "";
  }, [transform, transition]);

  return (
    <div
      ref={setRefs}
      className={isDragging ? "scale-95 opacity-40" : ""}
      {...attributes}
      {...listeners}
    >
      <PipelineCard job={job} />
    </div>
  );
}

/* ── Job card ───────────────────────────────────────────────── */

function PipelineCard({ job }: { job: Job }) {
  const c = CAT[job.jobCategory] ?? CAT.repair;
  const CatIcon = c.Icon;

  const href =
    job.jobCategory === "claim"
      ? `/claims/${job.id}`
      : ["out_of_pocket", "financed", "repair"].includes(job.jobCategory)
        ? `/jobs/retail/${job.id}`
        : `/leads/${job.id}`;

  const name = job.contacts
    ? `${job.contacts.firstName ?? ""} ${job.contacts.lastName ?? ""}`.trim()
    : null;

  const days = Math.floor((Date.now() - new Date(job.updatedAt).getTime()) / 864e5);

  return (
    <Link href={href} className="block">
      <div
        className={`group rounded-lg border ${c.border} cursor-grab border-l-[3px] bg-white p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md active:cursor-grabbing dark:bg-slate-800`}
      >
        <div className="flex items-start justify-between gap-1">
          <p className="truncate text-sm font-medium leading-snug text-slate-900 dark:text-white">
            {job.title || "Untitled"}
          </p>
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {job.claimNumber && <p className="mt-0.5 text-[11px] text-slate-400">#{job.claimNumber}</p>}

        {name && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{name}</span>
          </div>
        )}

        {job.contacts?.city && (
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {job.contacts.city}
              {job.contacts.state ? `, ${job.contacts.state}` : ""}
            </span>
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700/50">
          {job.value && job.value > 0 ? (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ${(job.value / 100).toLocaleString()}
            </span>
          ) : (
            <span className="text-xs text-slate-300">&mdash;</span>
          )}
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-medium ${c.cls}`}
            >
              <CatIcon className="h-2.5 w-2.5" />
              {c.tag}
            </span>
            <span className="text-[10px] text-slate-400">{days === 0 ? "today" : `${days}d`}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Normalize claim statuses to pipeline stages ────────────── */

function norm(stage: string): string {
  const s = stage.toLowerCase();
  if (STAGES.some((st) => st.id === s)) return s;
  // ClaimLifecycleStage enum values (must mirror lifecycleToStage in page.tsx)
  if (["filed"].includes(s)) return "new";
  if (["adjuster_review"].includes(s)) return "qualified";
  if (["build"].includes(s)) return "proposal";
  if (["approved", "appeal"].includes(s)) return "negotiation";
  if (["completed", "depreciation"].includes(s)) return "won";
  // Legacy status-string fallbacks
  if (["draft", "active", "open", "denied"].includes(s)) return "new";
  if (["in_progress", "review"].includes(s)) return "negotiation";
  if (["closed", "paid"].includes(s)) return "won";
  return "new";
}

/* ── Main board ─────────────────────────────────────────────── */

export function JobsCategoryBoard({ initialJobs }: JobsCategoryBoardProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [catFilter, setCatFilter] = useState("all");
  const [query, setQuery] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const visible = jobs.filter((j) => {
    if (catFilter !== "all" && j.jobCategory !== catFilter) return false;
    if (query) {
      const lc = query.toLowerCase();
      if (
        !(j.title ?? "").toLowerCase().includes(lc) &&
        !(j.contacts?.firstName ?? "").toLowerCase().includes(lc) &&
        !(j.contacts?.lastName ?? "").toLowerCase().includes(lc) &&
        !(j.claimNumber ?? "").toLowerCase().includes(lc)
      )
        return false;
    }
    return true;
  });

  const forStage = (sid: string) => visible.filter((j) => norm(j.stage) === sid);

  const onDragStart = (e: DragStartEvent) =>
    setActiveJob(jobs.find((j) => j.id === e.active.id) ?? null);

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveJob(null);
    if (!e.over) return;
    const job = jobs.find((j) => j.id === e.active.id);
    if (!job) return;
    const to = e.over.id.toString();
    if (norm(job.stage) === to) return;

    setJobs((p) => p.map((j) => (j.id === job.id ? { ...j, stage: to } : j)));

    try {
      // Use the unified pipeline/move endpoint — handles stage→status mapping for claims
      const isClaim = job.jobCategory === "claim";
      const body = isClaim ? { claimId: job.id, stage: to } : { leadId: job.id, stage: to };

      const r = await fetch("/api/pipeline/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const errData = await r.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${r.status}`);
      }
      toast.success(`Moved to ${STAGES.find((s) => s.id === to)?.label ?? to}`);
    } catch (err) {
      setJobs((p) => p.map((j) => (j.id === job.id ? job : j)));
      toast.error(err?.message || "Failed to move job");
    }
  };

  return (
    <div>
      {jobs.length === 0 && (
        <div className="mb-6 rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 p-10 text-center dark:border-slate-700 dark:from-slate-800/50 dark:via-slate-900 dark:to-slate-800/50">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
            <DollarSign className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Your Pipeline is Ready
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Create your first claim or lead to start tracking jobs through your pipeline. Drag cards
            between stages to update progress.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/claims/new"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
            >
              <Plus className="h-4 w-4" />
              New Claim
            </Link>
            <Link
              href="/leads/new"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              New Lead
            </Link>
          </div>
        </div>
      )}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setCatFilter(f.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                catFilter === f.id
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs..."
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 520 }}>
          {STAGES.map((stage) => {
            const list = forStage(stage.id);
            const val = list.reduce((s, j) => s + (j.value ?? 0), 0);

            return (
              <div
                key={stage.id}
                className="flex w-[260px] shrink-0 flex-col lg:min-w-[200px] lg:flex-1"
              >
                <div className={`h-1.5 rounded-t-xl bg-gradient-to-r ${stage.gradient}`} />
                <div className="flex items-center justify-between border border-b-0 border-slate-200 bg-white px-3 py-2 dark:border-slate-700/60 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">
                      {stage.label}
                    </span>
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {list.length}
                    </span>
                  </div>
                  {val > 0 && (
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      ${(val / 100).toLocaleString()}
                    </span>
                  )}
                </div>

                <StageColumn stageId={stage.id}>
                  {list.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center opacity-60">
                      <DollarSign className="mb-1 h-6 w-6 text-slate-300 dark:text-slate-600" />
                      <p className="text-xs text-slate-400">Drag jobs here</p>
                    </div>
                  ) : (
                    list.map((j) => <DraggableJobCard key={j.id} job={j} />)
                  )}
                </StageColumn>
              </div>
            );
          })}
        </div>

        <DragOverlay>{activeJob && <PipelineCard job={activeJob} />}</DragOverlay>
      </DndContext>
    </div>
  );
}
