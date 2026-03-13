"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Crown,
  GitBranch,
  GripVertical,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  Search,
  Shield,
  User,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { OrgChartDraggable } from "./OrgChartDraggable";
import { OrgChartDropZone } from "./OrgChartDropZone";
import { OrgChartMemberCard } from "./OrgChartMemberCard";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface HierarchyMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  title: string;
  isAdmin: boolean;
  isOwner: boolean;
  isManager: boolean;
  managerId: string | null;
  avatarUrl: string | null;
  phone: string | null;
  status: string;
}

interface OrgChartFullViewProps {
  initialMembers: HierarchyMember[];
  companyName: string;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function OrgChartFullView({ initialMembers, companyName }: OrgChartFullViewProps) {
  /* ── State ────────────────────────────────────────────────────── */
  const [members, setMembers] = useState<HierarchyMember[]>(initialMembers);
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterCollapsed, setRosterCollapsed] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(members.map((m) => m.id))
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Action dialog state
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    member: HierarchyMember | null;
    type: "add-to-manager" | "promote" | "remove" | "reassign" | null;
    targetManagerId?: string;
  }>({ open: false, member: null, type: null });
  const [selectedManagerForAssign, setSelectedManagerForAssign] = useState<string>("");

  /* ── DnD sensors ──────────────────────────────────────────────── */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  /* ── Derived data ─────────────────────────────────────────────── */
  const admin = useMemo(
    () => members.find((m) => m.isOwner || (m.isAdmin && !members.some((o) => o.isOwner))),
    [members]
  );

  const managers = useMemo(
    () =>
      members.filter(
        (m) => (m.isManager || m.isAdmin) && m.id !== admin?.id && m.status === "active"
      ),
    [members, admin]
  );

  const getDirectReports = useCallback(
    (managerId: string) => members.filter((m) => m.managerId === managerId),
    [members]
  );

  const unassignedMembers = useMemo(
    () =>
      members.filter(
        (m) =>
          !m.managerId && !m.isOwner && !(m.isAdmin && m.id === admin?.id) && m.status === "active"
      ),
    [members, admin]
  );

  const filteredRoster = useMemo(() => {
    const search = rosterSearch.toLowerCase();
    return members
      .filter((m) => m.status === "active" && !m.isOwner)
      .filter(
        (m) =>
          !search ||
          m.name.toLowerCase().includes(search) ||
          m.email.toLowerCase().includes(search) ||
          m.title.toLowerCase().includes(search)
      );
  }, [members, rosterSearch]);

  /* ── API handlers ─────────────────────────────────────────────── */
  const assignManager = async (memberId: string, managerId: string | null) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/trades/company/seats/assign-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, managerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign");

      // Update local state
      const managerName = managerId ? members.find((m) => m.id === managerId)?.name : null;
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, managerId } : m)));
      toast.success(managerId ? `Assigned to ${managerName}` : "Removed from manager");
    } catch (err: any) {
      toast.error(err.message || "Failed to update hierarchy");
    } finally {
      setIsUpdating(false);
    }
  };

  const promoteToManager = async (memberId: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/trades/company/seats/assign-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, makeManager: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to promote");

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, isManager: true, title: "Manager" } : m))
      );
      toast.success("Promoted to Manager!");
    } catch (err: any) {
      toast.error(err.message || "Failed to promote");
    } finally {
      setIsUpdating(false);
    }
  };

  const demoteFromManager = async (memberId: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/trades/company/seats/assign-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, makeManager: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to demote");

      // Also unassign anyone who reported to this manager
      const reports = getDirectReports(memberId);
      for (const report of reports) {
        await assignManager(report.id, null);
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, isManager: false, title: "Team Member" } : m))
      );
      toast.success("Removed manager role");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setIsUpdating(false);
    }
  };

  /* ── DnD handlers ─────────────────────────────────────────────── */
  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!over || !active) return;

    const memberId = active.id as string;
    const targetId = over.id as string;

    // Don't drop on self
    if (memberId === targetId) return;

    // Drop zone can be "manager-{id}" or "unassigned"
    if (targetId === "unassigned") {
      await assignManager(memberId, null);
    } else if (targetId.startsWith("manager-")) {
      const managerId = targetId.replace("manager-", "");
      await assignManager(memberId, managerId);
    } else {
      // Dropped directly on a member card that's a manager
      const targetMember = members.find((m) => m.id === targetId);
      if (
        targetMember &&
        (targetMember.isManager || targetMember.isAdmin || targetMember.isOwner)
      ) {
        await assignManager(memberId, targetId);
      }
    }
  };

  /* ── Tree expand/collapse ─────────────────────────────────────── */
  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedNodes(new Set(members.map((m) => m.id)));
  const collapseAll = () => setExpandedNodes(new Set());

  /* ── Dragging member for overlay ──────────────────────────────── */
  const draggingMember = draggingId ? members.find((m) => m.id === draggingId) : null;

  /* ── Render tree recursively ──────────────────────────────────── */
  const renderBranch = (member: HierarchyMember, depth: number = 0) => {
    const reports = getDirectReports(member.id);
    const isExpanded = expandedNodes.has(member.id);
    const hasReports = reports.length > 0;
    const isManagerOrAdmin = member.isManager || member.isAdmin || member.isOwner;

    return (
      <div key={member.id} className="relative">
        {/* Connector line from parent */}
        {depth > 0 && (
          <div className="absolute -top-4 left-8 h-4 w-px bg-gradient-to-b from-purple-300 to-purple-500 dark:from-purple-700 dark:to-purple-400" />
        )}

        <div className="flex items-start gap-2">
          {/* Expand/Collapse toggle */}
          <div className="flex w-6 flex-shrink-0 items-center justify-center pt-3">
            {hasReports ? (
              <button
                onClick={() => toggleNode(member.id)}
                className="rounded-full p-0.5 text-purple-500 transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/30"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="h-4 w-4" />
            )}
          </div>

          {/* Drop zone wrapper for managers */}
          <div className="flex-1">
            <OrgChartDropZone id={isManagerOrAdmin ? `manager-${member.id}` : member.id}>
              <OrgChartMemberCard
                member={member}
                reportCount={reports.length}
                depth={depth}
                onAction={(type) =>
                  setActionDialog({ open: true, member, type, targetManagerId: undefined })
                }
                isDragTarget={draggingId !== null && draggingId !== member.id && isManagerOrAdmin}
              />
            </OrgChartDropZone>

            {/* Add employee button for managers */}
            {isManagerOrAdmin && isExpanded && (
              <div className="ml-4 mt-1">
                <button
                  onClick={() =>
                    setActionDialog({
                      open: true,
                      member: null,
                      type: "add-to-manager",
                      targetManagerId: member.id,
                    })
                  }
                  className="group flex items-center gap-1.5 rounded-lg border border-dashed border-purple-300 px-2.5 py-1 text-xs text-purple-500 transition-all hover:border-purple-500 hover:bg-purple-50 dark:border-purple-700 dark:hover:border-purple-500 dark:hover:bg-purple-950/30"
                >
                  <Plus className="h-3 w-3 transition-transform group-hover:scale-110" />
                  Add Employee
                </button>
              </div>
            )}

            {/* Direct reports */}
            {isExpanded && hasReports && (
              <div className="relative ml-4 mt-2 space-y-2 border-l-2 border-purple-200/60 pl-4 dark:border-purple-800/40">
                {reports.map((report) => renderBranch(report, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex min-h-[70vh] gap-0 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-white dark:bg-slate-950">
        {/* ── Left: Employee Roster ──────────────────────────────── */}
        <div
          className={`flex flex-col border-r border-[color:var(--border)] bg-slate-50/80 transition-all duration-300 dark:bg-slate-900/60 ${
            rosterCollapsed ? "w-12" : "w-80"
          }`}
        >
          {/* Roster Header */}
          <div className="flex items-center justify-between border-b border-[color:var(--border)] p-3">
            {!rosterCollapsed && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Team Roster
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {members.filter((m) => m.status === "active").length}
                </Badge>
              </div>
            )}
            <button
              onClick={() => setRosterCollapsed(!rosterCollapsed)}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              {rosterCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4 rotate-90" />
              )}
            </button>
          </div>

          {/* Roster Content */}
          {!rosterCollapsed && (
            <>
              {/* Search */}
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search team..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>

              {/* Draggable member list */}
              <div className="flex-1 overflow-y-auto px-3 pb-3">
                <div className="space-y-1.5">
                  {filteredRoster.map((member) => (
                    <OrgChartDraggable key={member.id} id={member.id}>
                      <div
                        className={`group flex cursor-grab items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 transition-all hover:border-blue-200 hover:bg-blue-50/80 active:cursor-grabbing dark:hover:border-blue-800 dark:hover:bg-blue-950/30 ${
                          draggingId === member.id ? "opacity-40" : ""
                        }`}
                      >
                        <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-slate-300 transition-colors group-hover:text-blue-400" />
                        <Avatar className="h-8 w-8 ring-1 ring-white dark:ring-slate-800">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback
                            className={`text-xs text-white ${
                              member.isOwner
                                ? "bg-amber-500"
                                : member.isAdmin
                                  ? "bg-red-500"
                                  : member.isManager
                                    ? "bg-purple-500"
                                    : "bg-blue-500"
                            }`}
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {member.name}
                          </p>
                          <p className="truncate text-[10px] text-slate-500">
                            {member.title}
                            {member.managerId && (
                              <span className="text-slate-400">
                                {" → "}
                                {members.find((m) => m.id === member.managerId)?.name || "Unknown"}
                              </span>
                            )}
                          </p>
                        </div>
                        {member.isOwner && (
                          <Crown className="h-3 w-3 flex-shrink-0 text-amber-500" />
                        )}
                        {!member.isOwner && member.isAdmin && (
                          <Shield className="h-3 w-3 flex-shrink-0 text-red-500" />
                        )}
                        {!member.isOwner && !member.isAdmin && member.isManager && (
                          <GitBranch className="h-3 w-3 flex-shrink-0 text-purple-500" />
                        )}
                      </div>
                    </OrgChartDraggable>
                  ))}

                  {filteredRoster.length === 0 && (
                    <p className="py-4 text-center text-xs text-slate-400">No members found</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Right: Org Chart Canvas ────────────────────────────── */}
        <div className="flex flex-1 flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-[color:var(--border)] bg-white/80 px-4 py-2 backdrop-blur-sm dark:bg-slate-950/80">
            <div className="flex items-center gap-3">
              <Link href="/teams">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Seats
                </Button>
              </Link>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                <GitBranch className="mr-1.5 inline h-4 w-4 text-purple-500" />
                {companyName} Org Chart
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={expandAll}>
                <Maximize2 className="mr-1 h-3 w-3" />
                Expand
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={collapseAll}>
                <Minimize2 className="mr-1 h-3 w-3" />
                Collapse
              </Button>
              <div className="ml-2 flex items-center gap-1 rounded-lg border border-[color:var(--border)] px-1">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                  className="rounded p-1 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="w-10 text-center text-[10px] font-medium text-slate-500">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
                  className="rounded p-1 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-white to-purple-50/30 p-8 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/10">
            <div
              className="mx-auto max-w-4xl space-y-6 transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
            >
              {/* Loading overlay */}
              {isUpdating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-lg dark:bg-slate-900">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                    <span className="text-sm font-medium">Updating hierarchy…</span>
                  </div>
                </div>
              )}

              {/* ── Admin / Owner Node ───────────────────────────── */}
              {admin && (
                <div className="flex flex-col items-center">
                  {/* Crown icon above */}
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30">
                    <Crown className="h-5 w-5 text-white" />
                  </div>

                  <OrgChartDropZone id={`manager-${admin.id}`}>
                    <OrgChartMemberCard
                      member={admin}
                      reportCount={
                        getDirectReports(admin.id).length +
                        managers.filter((m) => !m.managerId || m.managerId === admin.id).length
                      }
                      depth={0}
                      isRoot
                      onAction={(type) =>
                        setActionDialog({
                          open: true,
                          member: admin,
                          type,
                          targetManagerId: undefined,
                        })
                      }
                      isDragTarget={draggingId !== null && draggingId !== admin.id}
                    />
                  </OrgChartDropZone>

                  {/* Expand/Collapse toggle for admin */}
                  <button
                    onClick={() => toggleNode(admin.id)}
                    className="mt-2 flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-600 transition-colors hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-800/40"
                  >
                    {expandedNodes.has(admin.id) ? (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-3 w-3" />
                        Expand
                      </>
                    )}
                  </button>

                  {/* Add Manager button */}
                  <button
                    onClick={() =>
                      setActionDialog({
                        open: true,
                        member: null,
                        type: "promote",
                        targetManagerId: admin.id,
                      })
                    }
                    className="group mt-3 flex items-center gap-1.5 rounded-full border border-dashed border-purple-300 bg-white px-3 py-1.5 text-xs font-medium text-purple-600 shadow-sm transition-all hover:border-purple-500 hover:bg-purple-50 hover:shadow-md dark:border-purple-700 dark:bg-slate-900 dark:hover:border-purple-500 dark:hover:bg-purple-950/30"
                  >
                    <Plus className="h-3 w-3 transition-transform group-hover:rotate-90" />
                    Add Manager
                  </button>

                  {/* Connector to branches */}
                  <div className="mt-3 h-8 w-px bg-gradient-to-b from-purple-400 to-purple-200 dark:from-purple-600 dark:to-purple-800" />
                </div>
              )}

              {/* ── Manager Branches (gated by admin expand/collapse) ── */}
              {(!admin || expandedNodes.has(admin?.id ?? "__none__")) &&
                (() => {
                  // Managers who report to admin or have no manager
                  const topManagers = managers.filter(
                    (m) => !m.managerId || m.managerId === admin?.id
                  );
                  // Direct reports of admin who aren't managers
                  const adminReports = admin
                    ? getDirectReports(admin.id).filter((r) => !r.isManager && !r.isAdmin)
                    : [];

                  if (topManagers.length === 0 && adminReports.length === 0) {
                    return (
                      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-purple-300 bg-purple-50/50 p-8 text-center dark:border-purple-800 dark:bg-purple-950/20">
                        <GitBranch className="mx-auto mb-3 h-8 w-8 text-purple-300 dark:text-purple-700" />
                        <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                          No managers assigned yet
                        </p>
                        <p className="mt-1 text-xs text-purple-500">
                          Drag team members from the roster or click &quot;Add Manager&quot; above
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {topManagers.map((manager) => (
                        <div
                          key={manager.id}
                          className="rounded-2xl border border-purple-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md dark:border-purple-800/40 dark:bg-slate-900/60"
                        >
                          {renderBranch(manager, 0)}
                        </div>
                      ))}

                      {/* Admin's direct non-manager reports */}
                      {adminReports.length > 0 && (
                        <div className="rounded-2xl border border-blue-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-blue-800/40 dark:bg-slate-900/60">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-500">
                            Direct Reports to {admin?.name}
                          </p>
                          <div className="space-y-2">
                            {adminReports.map((report) => renderBranch(report, 0))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {/* ── Unassigned Pool ──────────────────────────────── */}
              {unassignedMembers.length > 0 && (
                <OrgChartDropZone id="unassigned">
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 backdrop-blur-sm transition-colors dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        Unassigned
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {unassignedMembers.length}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {unassignedMembers.map((member) => (
                        <OrgChartDraggable key={member.id} id={member.id}>
                          <div className="group flex cursor-grab items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition-all hover:border-purple-300 hover:bg-purple-50 active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-purple-700 dark:hover:bg-purple-950/20">
                            <Avatar className="h-7 w-7 ring-1 ring-white dark:ring-slate-800">
                              <AvatarImage src={member.avatarUrl || undefined} />
                              <AvatarFallback className="bg-slate-400 text-[10px] text-white">
                                {member.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {member.name}
                              </p>
                              <p className="text-[10px] text-slate-400">{member.title}</p>
                            </div>
                            <GripVertical className="ml-auto h-3 w-3 text-slate-300 group-hover:text-purple-400" />
                          </div>
                        </OrgChartDraggable>
                      ))}
                    </div>
                  </div>
                </OrgChartDropZone>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Drag Overlay ──────────────────────────────────────────── */}
      <DragOverlay>
        {draggingMember && (
          <div className="flex items-center gap-2 rounded-xl border border-purple-300 bg-white px-3 py-2 shadow-xl dark:border-purple-700 dark:bg-slate-900">
            <Avatar className="h-8 w-8">
              <AvatarImage src={draggingMember.avatarUrl || undefined} />
              <AvatarFallback className="bg-purple-500 text-xs text-white">
                {draggingMember.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-bold">{draggingMember.name}</p>
              <p className="text-[10px] text-slate-500">{draggingMember.title}</p>
            </div>
          </div>
        )}
      </DragOverlay>

      {/* ── Action Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => {
          if (!open) setActionDialog({ open: false, member: null, type: null });
        }}
      >
        <DialogContent className="sm:max-w-md">
          {/* ── ADD TO MANAGER ─────────────────────────────── */}
          {actionDialog.type === "add-to-manager" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-purple-500" />
                  Add Employee to{" "}
                  {actionDialog.targetManagerId
                    ? members.find((m) => m.id === actionDialog.targetManagerId)?.name
                    : "Manager"}
                </DialogTitle>
                <DialogDescription>
                  Select a team member to add as a direct report
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Select
                  value={selectedManagerForAssign}
                  onValueChange={setSelectedManagerForAssign}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members
                      .filter(
                        (m) =>
                          m.status === "active" &&
                          !m.isOwner &&
                          m.id !== actionDialog.targetManagerId &&
                          m.managerId !== actionDialog.targetManagerId
                      )
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2">
                            <span>{m.name}</span>
                            <span className="text-xs text-slate-400">{m.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setActionDialog({ open: false, member: null, type: null })}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!selectedManagerForAssign || isUpdating}
                  onClick={async () => {
                    if (actionDialog.targetManagerId && selectedManagerForAssign) {
                      await assignManager(selectedManagerForAssign, actionDialog.targetManagerId);
                      setSelectedManagerForAssign("");
                      setActionDialog({ open: false, member: null, type: null });
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add to Team
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── PROMOTE TO MANAGER ─────────────────────────── */}
          {actionDialog.type === "promote" && !actionDialog.member && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-purple-500" />
                  Create New Manager
                </DialogTitle>
                <DialogDescription>
                  Select a team member to promote to manager status
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Select
                  value={selectedManagerForAssign}
                  onValueChange={setSelectedManagerForAssign}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team member to promote" />
                  </SelectTrigger>
                  <SelectContent>
                    {members
                      .filter(
                        (m) => m.status === "active" && !m.isOwner && !m.isManager && !m.isAdmin
                      )
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} — {m.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setActionDialog({ open: false, member: null, type: null })}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!selectedManagerForAssign || isUpdating}
                  onClick={async () => {
                    if (selectedManagerForAssign) {
                      await promoteToManager(selectedManagerForAssign);
                      // Assign to admin if there's a target manager
                      if (actionDialog.targetManagerId) {
                        await assignManager(selectedManagerForAssign, actionDialog.targetManagerId);
                      }
                      setSelectedManagerForAssign("");
                      setActionDialog({ open: false, member: null, type: null });
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <GitBranch className="mr-2 h-4 w-4" />
                  )}
                  Promote to Manager
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── PROMOTE EXISTING MEMBER ────────────────────── */}
          {actionDialog.type === "promote" && actionDialog.member && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-purple-500" />
                  Promote {actionDialog.member.name}
                </DialogTitle>
                <DialogDescription>
                  {actionDialog.member.isManager
                    ? "This member is already a manager. Would you like to remove their manager status?"
                    : "Promote this team member to manager status. They will keep their current reporting manager (if any)."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setActionDialog({ open: false, member: null, type: null })}
                >
                  Cancel
                </Button>
                <Button
                  disabled={isUpdating}
                  onClick={async () => {
                    if (actionDialog.member) {
                      if (actionDialog.member.isManager) {
                        await demoteFromManager(actionDialog.member.id);
                      } else {
                        await promoteToManager(actionDialog.member.id);
                      }
                      setActionDialog({ open: false, member: null, type: null });
                    }
                  }}
                  className={
                    actionDialog.member.isManager
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-purple-600 hover:bg-purple-700"
                  }
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : actionDialog.member.isManager ? (
                    "Remove Manager Status"
                  ) : (
                    "Promote to Manager"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── REASSIGN ───────────────────────────────────── */}
          {actionDialog.type === "reassign" && actionDialog.member && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Reassign {actionDialog.member.name}
                </DialogTitle>
                <DialogDescription>Move this member to a different manager</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Select
                  value={selectedManagerForAssign || actionDialog.member.managerId || "none"}
                  onValueChange={setSelectedManagerForAssign}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Manager (Unassigned)</SelectItem>
                    {members
                      .filter(
                        (m) =>
                          (m.isManager || m.isAdmin || m.isOwner) &&
                          m.id !== actionDialog.member!.id &&
                          m.status === "active"
                      )
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2">
                            {m.isOwner && <Crown className="h-3 w-3 text-amber-500" />}
                            {m.isManager && !m.isOwner && (
                              <GitBranch className="h-3 w-3 text-purple-500" />
                            )}
                            <span>{m.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setActionDialog({ open: false, member: null, type: null })}
                >
                  Cancel
                </Button>
                <Button
                  disabled={isUpdating}
                  onClick={async () => {
                    if (actionDialog.member) {
                      const newManagerId =
                        selectedManagerForAssign === "none" ? null : selectedManagerForAssign;
                      await assignManager(actionDialog.member.id, newManagerId);
                      setSelectedManagerForAssign("");
                      setActionDialog({ open: false, member: null, type: null });
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Reassign"}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── REMOVE FROM MANAGER ────────────────────────── */}
          {actionDialog.type === "remove" && actionDialog.member && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <X className="h-5 w-5" />
                  Remove {actionDialog.member.name} from Manager
                </DialogTitle>
                <DialogDescription>
                  This will unassign {actionDialog.member.name} from their current manager. They
                  will appear in the unassigned pool.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setActionDialog({ open: false, member: null, type: null })}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={isUpdating}
                  onClick={async () => {
                    if (actionDialog.member) {
                      await assignManager(actionDialog.member.id, null);
                      setActionDialog({ open: false, member: null, type: null });
                    }
                  }}
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Remove from Manager"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
