"use client";

import {
  ArrowLeft,
  GitBranch,
  Loader2,
  MoreVertical,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

interface Employee {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  jobTitle: string | null;
  role: string;
  avatar: string | null;
  isAdmin: boolean;
  canEditCompany: boolean;
  status: string;
  createdAt: string;
  isManager?: boolean;
  managerId?: string | null;
  managerName?: string | null;
}

export default function ManageEmployeesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  /* ── Manager Hierarchy state ──────────────────────────────────── */
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [isAssigningManager, setIsAssigningManager] = useState(false);
  const [showOrgChart, setShowOrgChart] = useState(false);

  // Filter managers (employees who are admins/managers or marked as manager)
  const availableManagers = employees.filter(
    (e) =>
      (e.isManager || e.isAdmin || e.role === "admin" || e.role === "owner") &&
      e.status === "active"
  );

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await fetch("/api/trades/company/employees");
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("No company found");
          router.push("/trades/profile");
          return;
        }
        throw new Error("Failed to load employees");
      }
      const data = await res.json();
      setEmployees(data.employees || []);
      setIsAdmin(data.isAdmin);
      setCurrentUserId(data.currentUserId);
    } catch (error) {
      logger.error("Failed to load employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (employeeId: string, currentIsAdmin: boolean) => {
    setUpdating(employeeId);
    try {
      const res = await fetch("/api/trades/company/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          isAdmin: !currentIsAdmin,
          role: !currentIsAdmin ? "admin" : "member",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      toast.success(!currentIsAdmin ? "Admin access granted" : "Admin access revoked");
      loadEmployees();
    } catch (error) {
      toast.error(error.message || "Failed to update permissions");
    } finally {
      setUpdating(null);
    }
  };

  const toggleEditAccess = async (employeeId: string, currentCanEdit: boolean) => {
    setUpdating(employeeId);
    try {
      const res = await fetch("/api/trades/company/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          canEditCompany: !currentCanEdit,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      toast.success(!currentCanEdit ? "Edit access granted" : "Edit access revoked");
      loadEmployees();
    } catch (error) {
      toast.error(error.message || "Failed to update permissions");
    } finally {
      setUpdating(null);
    }
  };

  /* ── Manager Hierarchy handlers ───────────────────────────────── */

  const openManagerDialog = (emp: Employee) => {
    setSelectedEmployee(emp);
    setSelectedManagerId(emp.managerId || "none");
    setManagerDialogOpen(true);
  };

  const handleAssignManager = async () => {
    if (!selectedEmployee) return;
    setIsAssigningManager(true);
    try {
      const res = await fetch("/api/trades/company/seats/assign-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedEmployee.id,
          managerId: selectedManagerId === "none" ? null : selectedManagerId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const managerName =
          selectedManagerId === "none"
            ? null
            : employees.find((e) => e.id === selectedManagerId)?.firstName;
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === selectedEmployee.id
              ? {
                  ...e,
                  managerId: selectedManagerId === "none" ? null : selectedManagerId,
                  managerName,
                }
              : e
          )
        );
        toast.success(data.message || "Manager updated successfully");
        setManagerDialogOpen(false);
      } else {
        toast.error(data.error || "Failed to assign manager");
      }
    } catch (err) {
      logger.error("Assign manager error:", err);
      toast.error("Failed to assign manager");
    } finally {
      setIsAssigningManager(false);
    }
  };

  const handleToggleManager = async (emp: Employee, makeManager: boolean) => {
    setUpdating(emp.id);
    try {
      const res = await fetch("/api/trades/company/seats/assign-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: emp.id,
          makeManager,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === emp.id
              ? { ...e, isManager: makeManager, role: makeManager ? "manager" : "member" }
              : e
          )
        );
        toast.success(
          data.message || `${emp.firstName} is now a ${makeManager ? "manager" : "member"}`
        );
      } else {
        toast.error(data.error || "Failed to update role");
      }
    } catch (err) {
      logger.error("Toggle manager error:", err);
      toast.error("Failed to update role");
    } finally {
      setUpdating(null);
    }
  };

  const removeEmployee = async (employeeId: string, name: string) => {
    setUpdating(employeeId);
    try {
      const res = await fetch(`/api/trades/company/employees?employeeId=${employeeId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove");
      }

      toast.success(`${name} removed from company`);
      setDeleteTarget(null);
      loadEmployees();
    } catch (error) {
      toast.error(error.message || "Failed to remove employee");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
        <div className="max-w-md text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h1 className="mb-2 text-xl font-semibold text-gray-900">Admin Access Required</h1>
          <p className="mb-4 text-gray-600">
            Only company admins can manage employees and permissions.
          </p>
          <Link href="/trades/profile">
            <Button>Back to Profile</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/trades/company">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Employees</h1>
            <p className="text-sm text-gray-600">Assign admin roles and permissions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="mx-auto mb-2 h-6 w-6 text-blue-600" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {employees.length}
              </p>
              <p className="text-xs text-slate-500">Total Employees</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-green-600" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {employees.filter((e) => e.isAdmin).length}
              </p>
              <p className="text-xs text-slate-500">Admins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <GitBranch className="mx-auto mb-2 h-6 w-6 text-purple-600" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {employees.filter((e) => e.isManager).length}
              </p>
              <p className="text-xs text-slate-500">Managers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <UserCheck className="mx-auto mb-2 h-6 w-6 text-amber-600" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {employees.filter((e) => e.status === "active").length}
              </p>
              <p className="text-xs text-slate-500">Active</p>
            </CardContent>
          </Card>
        </div>

        {/* Org Chart Toggle */}
        {employees.length > 1 && (
          <div className="mb-6 rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800 dark:bg-purple-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Team Hierarchy</p>
                  <p className="text-xs text-slate-500">
                    Assign managers using the ⋮ menu on each employee
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowOrgChart(!showOrgChart)}>
                {showOrgChart ? "Hide" : "Show"} Org Chart
              </Button>
            </div>

            {showOrgChart && (
              <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                {/* Managers with their reports */}
                {availableManagers.map((manager) => {
                  const reports = employees.filter((e) => e.managerId === manager.id);
                  const displayName =
                    `${manager.firstName || ""} ${manager.lastName || ""}`.trim() || "Unknown";
                  return (
                    <div
                      key={manager.id}
                      className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-800 dark:bg-purple-950/30"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={manager.avatar || undefined} />
                          <AvatarFallback className="bg-purple-600 text-xs text-white">
                            {(manager.firstName?.[0] || "") + (manager.lastName?.[0] || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {displayName}
                          </p>
                          <p className="text-xs text-purple-600">
                            {manager.isManager ? "Manager" : "Admin"} · {reports.length} direct
                            report{reports.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      {reports.length > 0 && (
                        <div className="ml-6 mt-2 space-y-1 border-l-2 border-purple-200 pl-4 dark:border-purple-700">
                          {reports.map((report) => (
                            <div key={report.id} className="flex items-center gap-2 text-sm">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={report.avatar || undefined} />
                                <AvatarFallback className="bg-blue-500 text-xs text-white">
                                  {(report.firstName?.[0] || "") + (report.lastName?.[0] || "")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-slate-700 dark:text-slate-300">
                                {`${report.firstName || ""} ${report.lastName || ""}`.trim()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unassigned employees */}
                {(() => {
                  const unassigned = employees.filter(
                    (e) =>
                      !e.managerId &&
                      !e.isManager &&
                      !e.isAdmin &&
                      e.role !== "owner" &&
                      e.status === "active"
                  );
                  if (unassigned.length === 0) return null;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="mb-2 text-sm font-medium text-slate-500">
                        Unassigned ({unassigned.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {unassigned.map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-800"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-slate-400 text-[10px] text-white">
                                {e.firstName?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            {`${e.firstName || ""} ${e.lastName?.[0] || ""}`.trim()}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Employee List */}
        <Card>
          <CardHeader>
            <CardTitle>Employees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {employees.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="text-lg font-medium">No employees yet</p>
                <p className="mt-1 text-sm">
                  Invite team members to join your company and manage them here.
                </p>
              </div>
            ) : (
              employees.map((employee) => {
                const displayName =
                  `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
                  employee.email ||
                  "Unknown";
                const initials =
                  (employee.firstName?.[0] || "") + (employee.lastName?.[0] || "") || "?";
                const isOwner = employee.role === "owner";
                const isSelf = employee.id === currentUserId;

                return (
                  <div
                    key={employee.id}
                    className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4"
                  >
                    {/* Avatar */}
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-lg font-bold text-white">
                      {employee.avatar ? (
                        <img
                          src={employee.avatar}
                          alt={displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white">{displayName}</p>
                        {isOwner && <Badge className="bg-purple-100 text-purple-700">Owner</Badge>}
                        {employee.isManager && !isOwner && (
                          <Badge className="bg-violet-100 text-violet-700">
                            <GitBranch className="mr-1 h-3 w-3" />
                            Manager
                          </Badge>
                        )}
                        {employee.isAdmin && !isOwner && (
                          <Badge className="bg-green-100 text-green-700">Admin</Badge>
                        )}
                        {isSelf && (
                          <Badge variant="outline" className="text-blue-600">
                            You
                          </Badge>
                        )}
                        {employee.status === "pending" && (
                          <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                        )}
                        {employee.status === "active" && !isOwner && (
                          <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500">
                          {employee.jobTitle || employee.role}
                        </p>
                        {employee.managerName && (
                          <span className="text-xs text-slate-400">→ {employee.managerName}</span>
                        )}
                      </div>
                    </div>

                    {/* Three-dot dropdown for non-owner, non-self */}
                    {!isOwner && !isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {employee.status === "active" && (
                            <>
                              <DropdownMenuItem onClick={() => openManagerDialog(employee)}>
                                <UserCog className="mr-2 h-4 w-4" />
                                Assign Manager
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleManager(employee, !employee.isManager)}
                              >
                                <GitBranch className="mr-2 h-4 w-4" />
                                {employee.isManager ? "Remove Manager Role" : "Make Manager"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => toggleAdmin(employee.id, employee.isAdmin)}
                                disabled={updating === employee.id}
                              >
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                {employee.isAdmin ? "Revoke Admin" : "Grant Admin"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleEditAccess(employee.id, employee.canEditCompany)
                                }
                                disabled={updating === employee.id}
                              >
                                <User className="mr-2 h-4 w-4" />
                                {employee.canEditCompany
                                  ? "Revoke Edit Access"
                                  : "Grant Edit Access"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeleteTarget({ id: employee.id, name: displayName })}
                            disabled={updating === employee.id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Employee
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Invite Link */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">Invite New Employees</p>
                <p className="text-sm text-gray-500">
                  Employees can join your company during their profile setup.
                </p>
              </div>
              <Link href="/trades/company/invite">
                <Button>
                  <User className="mr-2 h-4 w-4" />
                  Create Invite
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Employee Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Employee"
        description="This will remove the employee from your company. They will lose access to all company resources. This cannot be undone."
        itemLabel={deleteTarget?.name}
        showArchive={false}
        deleteLabel="Remove Employee"
        onConfirmDelete={() =>
          deleteTarget ? removeEmployee(deleteTarget.id, deleteTarget.name) : Promise.resolve()
        }
      />

      {/* Manager Assignment Dialog */}
      <Dialog open={managerDialogOpen} onOpenChange={setManagerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Manager</DialogTitle>
            <DialogDescription>
              Select a manager for{" "}
              {selectedEmployee
                ? `${selectedEmployee.firstName || ""} ${selectedEmployee.lastName || ""}`.trim() ||
                  selectedEmployee.email
                : "this employee"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Manager</SelectItem>
                {availableManagers
                  .filter((m) => m.id !== selectedEmployee?.id)
                  .map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {`${manager.firstName || ""} ${manager.lastName || ""}`.trim() ||
                        manager.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {availableManagers.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">
                No managers available. Promote a team member to manager first using the ⋮ menu.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManagerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignManager} disabled={isAssigningManager}>
              {isAssigningManager ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
