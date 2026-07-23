"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectItem } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@/components/ui/Modal";
import { Plus, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";

export default function AdminTasksBoard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);

  // Fixed Tasks State
  const [fixedTasks, setFixedTasks] = useState<any[]>([]);
  const [fixedTasksModalOpen, setFixedTasksModalOpen] = useState(false);
  const [newFixedTitle, setNewFixedTitle] = useState("");
  const [newFixedDesc, setNewFixedDesc] = useState("");
  const [newFixedPriority, setNewFixedPriority] = useState("MEDIUM");
  const [newFixedCategory, setNewFixedCategory] = useState("General");
  const [newFixedAssignedDesignation, setNewFixedAssignedDesignation] = useState("ALL");
  const [fixedSubmitLoading, setFixedSubmitLoading] = useState(false);

  // Modal Control
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignCategory, setAssignCategory] = useState("General");
  const [assignPriority, setAssignPriority] = useState("MEDIUM");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchFixedTasks = async () => {
    try {
      const res = await fetch("/api/admin/fixed-tasks");
      if (res.ok) {
        const data = await res.json();
        setFixedTasks(data.fixedTasks || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasksAndEmployees = async () => {
    try {
      const [tasksRes, empRes] = await Promise.all([
        fetch(`/api/admin/tasks?date=${filterDate}`),
        fetch("/api/admin/employees"),
      ]);

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.tasks || []);
      }
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees((empData.users || []).filter((e: any) => e.role === "EMPLOYEE"));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch task metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndEmployees();
    fetchFixedTasks();
  }, [filterDate]);

  const handleCreateFixedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFixedTitle) return;

    setFixedSubmitLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/fixed-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newFixedTitle,
          description: newFixedDesc,
          priority: newFixedPriority,
          category: newFixedCategory,
          assignedDesignation: newFixedAssignedDesignation,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create fixed task.");
      } else {
        setSuccess("Daily fixed task created and auto-assigned for future check-ins!");
        setNewFixedTitle("");
        setNewFixedDesc("");
        setNewFixedPriority("MEDIUM");
        setNewFixedCategory("General");
        setNewFixedAssignedDesignation("ALL");
        await fetchFixedTasks();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to add fixed task.");
    } finally {
      setFixedSubmitLoading(false);
    }
  };

  const handleDeleteFixedTask = async (id: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/fixed-tasks/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete fixed task.");
      } else {
        setSuccess("Fixed task deleted successfully.");
        await fetchFixedTasks();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to delete fixed task.");
    }
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle || selectedEmployees.length === 0) {
      setError("Task title and at least one employee assignment are required.");
      return;
    }

    setSubmitLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: assignTitle,
          description: assignDesc,
          category: assignCategory,
          priority: assignPriority,
          employeeIds: selectedEmployees,
          date: filterDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to assign tasks.");
      } else {
        setSuccess(data.message || "Task assigned successfully!");
        setAssignTitle("");
        setAssignDesc("");
        setAssignCategory("General");
        setAssignPriority("MEDIUM");
        setSelectedEmployees([]);
        onClose();
        await fetchTasksAndEmployees();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during task assignment.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to approve task.");
      } else {
        setSuccess("Task approved successfully!");
        await fetchTasksAndEmployees();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while approving task.");
    }
  };

  const handleRequestRevision = async (taskId: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to request revision.");
      } else {
        setSuccess("Task sent back to employee for revision.");
        await fetchTasksAndEmployees();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while requesting revision.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-zinc-550 font-semibold flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading tasks board...</span>
        </div>
      </div>
    );
  }

  const reviewTasks = tasks.filter((t) => t.status === "WAITING_FOR_REVIEW");
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "PENDING" || t.status === "NOT_STARTED");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED");
  const approvedTasks = tasks.filter((t) => t.status === "APPROVED");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">Task Management</h1>
          <p className="text-zinc-550 font-medium mt-1">
            Assign tasks to employees and review daily deliverables.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-44 h-11"
          />
          <Button
            onClick={() => setFixedTasksModalOpen(true)}
            className="border border-zinc-200 bg-white text-zinc-900 font-semibold shadow-sm hover:bg-zinc-100"
            startContent={<Plus className="h-4 w-4 text-zinc-550" />}
          >
            Manage Fixed Tasks
          </Button>
          <Button
            onClick={onOpen}
            className="bg-zinc-900 text-white font-semibold shadow-sm hover:bg-zinc-800"
            startContent={<Plus className="h-4 w-4" />}
          >
            Assign Task
          </Button>
        </div>
      </div>

      {error && (
        <Alert color="danger" startContent={<AlertCircle className="h-5 w-5" />}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert color="success" startContent={<CheckCircle className="h-5 w-5" />}>
          {success}
        </Alert>
      )}

      {/* Task board columns */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Waiting Review Column */}
        <Card className="border border-purple-100 shadow-sm bg-purple-50/10">
          <CardHeader className="pb-2 border-b border-purple-100/60 bg-purple-50/40 flex justify-between items-center px-4 py-3">
            <h3 className="font-extrabold text-purple-900 text-sm flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-550 animate-pulse" />
              <span>Review Needed</span>
            </h3>
            <span className="text-xs font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md">
              {reviewTasks.length}
            </span>
          </CardHeader>
          <CardBody className="p-3 space-y-3 overflow-y-auto max-h-[600px]">
            {reviewTasks.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-8 font-medium">No tasks submitted for review.</p>
            ) : (
              reviewTasks.map((task) => (
                <div key={task._id} className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-3 shadow-xs hover:shadow-sm transition-all">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-extrabold text-zinc-900 text-sm leading-tight">{task.title}</h4>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-purple-50 border border-purple-100 text-purple-700 rounded-md px-2 py-0.5 whitespace-nowrap">
                        Review
                      </span>
                    </div>
                    {task.description && <p className="text-xs text-zinc-550 leading-relaxed font-medium">{task.description}</p>}
                    
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {task.priority && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          task.priority === "HIGH" ? "bg-red-50 text-red-700 border border-red-100" :
                          task.priority === "MEDIUM" ? "bg-amber-50 text-amber-800 border border-amber-100" :
                          "bg-zinc-100 text-zinc-650 border border-zinc-200"
                        }`}>
                          {task.priority}
                        </span>
                      )}
                      {task.category && (
                        <span className="text-[9px] font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-md border border-zinc-200">
                          {task.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100">
                    <div className="flex items-center gap-1.5">
                      <div className="h-6 w-6 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-[10px] font-extrabold text-purple-800 uppercase">
                        {task.userName ? task.userName.charAt(0) : "E"}
                      </div>
                      <span className="text-[10px] font-extrabold text-zinc-700 truncate max-w-[80px]">{task.userName}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        className="px-2.5 py-1 text-[10px] font-bold text-zinc-650 h-7 border-zinc-250 rounded-lg"
                        startContent={<RefreshCw className="h-3 w-3" />}
                        onClick={() => handleRequestRevision(task._id)}
                      >
                        Revision
                      </Button>
                      <Button
                        className="px-2.5 py-1 text-[10px] font-bold text-white h-7 rounded-lg"
                        startContent={<CheckCircle className="h-3 w-3" />}
                        onClick={() => handleApproveTask(task._id)}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* In Progress Column */}
        <Card className="border border-amber-100 shadow-sm bg-amber-50/10">
          <CardHeader className="pb-2 border-b border-amber-100/60 bg-amber-50/40 flex justify-between items-center px-4 py-3">
            <h3 className="font-extrabold text-amber-900 text-sm flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>In Progress / Logged</span>
            </h3>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md">
              {inProgressTasks.length}
            </span>
          </CardHeader>
          <CardBody className="p-3 space-y-3 overflow-y-auto max-h-[600px]">
            {inProgressTasks.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-8 font-medium">No tasks in progress.</p>
            ) : (
              inProgressTasks.map((task) => (
                <div key={task._id} className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-3 shadow-xs hover:shadow-sm transition-all">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-extrabold text-zinc-900 text-sm leading-tight">{task.title}</h4>
                      <span className={`text-[9px] font-black uppercase tracking-wider rounded-md px-2 py-0.5 whitespace-nowrap ${
                        task.status === "PENDING" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                        task.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                        "bg-zinc-100 text-zinc-500 border border-zinc-200"
                      }`}>
                        {task.status === "NOT_STARTED" ? "Not started" : task.status.toLowerCase()}
                      </span>
                    </div>
                    {task.description && <p className="text-xs text-zinc-550 leading-relaxed font-medium">{task.description}</p>}
                    
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {task.priority && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          task.priority === "HIGH" ? "bg-red-50 text-red-700 border border-red-100" :
                          task.priority === "MEDIUM" ? "bg-amber-50 text-amber-800 border border-amber-100" :
                          "bg-zinc-100 text-zinc-650 border border-zinc-200"
                        }`}>
                          {task.priority}
                        </span>
                      )}
                      {task.category && (
                        <span className="text-[9px] font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-md border border-zinc-200">
                          {task.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2.5 border-t border-zinc-100">
                    <div className="h-6 w-6 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-[10px] font-extrabold text-amber-800 uppercase">
                      {task.userName ? task.userName.charAt(0) : "E"}
                    </div>
                    <span className="text-[10px] font-extrabold text-zinc-700 truncate">{task.userName}</span>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Completed Column */}
        <Card className="border border-emerald-100 shadow-sm bg-emerald-50/10">
          <CardHeader className="pb-2 border-b border-emerald-100/60 bg-emerald-50/40 flex justify-between items-center px-4 py-3">
            <h3 className="font-extrabold text-emerald-905 text-sm flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Completed Log</span>
            </h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md">
              {completedTasks.length}
            </span>
          </CardHeader>
          <CardBody className="p-3 space-y-3 overflow-y-auto max-h-[600px]">
            {completedTasks.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-8 font-medium">No completed tasks yet.</p>
            ) : (
              completedTasks.map((task) => (
                <div key={task._id} className="p-4 bg-white border border-zinc-200 rounded-2xl space-y-3 shadow-xs hover:shadow-sm transition-all border-emerald-200 bg-emerald-50/5">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-extrabold text-zinc-900 text-sm leading-tight">{task.title}</h4>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-md px-2 py-0.5 whitespace-nowrap">
                        Completed
                      </span>
                    </div>
                    {task.description && <p className="text-xs text-zinc-550 leading-relaxed font-medium">{task.description}</p>}
                    
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {task.priority && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          task.priority === "HIGH" ? "bg-red-50 text-red-700 border border-red-100" :
                          task.priority === "MEDIUM" ? "bg-amber-50 text-amber-800 border border-amber-100" :
                          "bg-zinc-100 text-zinc-650 border border-zinc-200"
                        }`}>
                          {task.priority}
                        </span>
                      )}
                      {task.category && (
                        <span className="text-[9px] font-bold bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-md border border-zinc-200">
                          {task.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2.5 border-t border-zinc-100">
                    <div className="h-6 w-6 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-[10px] font-extrabold text-emerald-800 uppercase">
                      {task.userName ? task.userName.charAt(0) : "E"}
                    </div>
                    <span className="text-[10px] font-extrabold text-zinc-700 truncate">{task.userName}</span>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Approved Column */}
        <Card className="border border-zinc-200 shadow-sm bg-zinc-50/50">
          <CardHeader className="pb-2 border-b border-zinc-200/60 bg-zinc-50 flex justify-between items-center px-4 py-3">
            <h3 className="font-extrabold text-zinc-900 text-sm flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
              <span>Approved Feed</span>
            </h3>
            <span className="text-xs font-bold text-zinc-550 bg-white border border-zinc-200 px-2 py-0.5 rounded-md">
              {approvedTasks.length}
            </span>
          </CardHeader>
          <CardBody className="p-3 space-y-3 overflow-y-auto max-h-[600px]">
            {approvedTasks.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-8 font-medium">No approved tasks yet.</p>
            ) : (
              approvedTasks.map((task) => (
                <div key={task._id} className="p-4 bg-white border border-zinc-100 rounded-2xl space-y-2.5 shadow-xs opacity-75 border-zinc-200 bg-zinc-50/20">
                  <div className="space-y-1">
                    <h4 className="font-bold text-zinc-800 text-xs flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      <span className="line-through decoration-zinc-400">{task.title}</span>
                    </h4>
                    {task.description && <p className="text-[11px] text-zinc-450 leading-relaxed font-semibold italic">{task.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-100">
                    <div className="h-5 w-5 rounded-full bg-zinc-200 flex items-center justify-center text-[9px] font-extrabold text-zinc-600 uppercase">
                      {task.userName ? task.userName.charAt(0) : "E"}
                    </div>
                    <span className="text-[9px] font-extrabold text-zinc-500 truncate">{task.userName}</span>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Task Assignment Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
        <ModalContent>
          <form onSubmit={handleBulkAssign}>
            <ModalHeader>Assign Task to Employees</ModalHeader>
            <ModalBody className="space-y-4">
              <Input
                label="Task Title"
                placeholder="Enter task name"
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                required
              />

              <Textarea
                label="Description"
                placeholder="Specific instructions or guidelines..."
                value={assignDesc}
                onChange={(e) => setAssignDesc(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Category"
                  placeholder="e.g. Design, Video Editor"
                  value={assignCategory}
                  onChange={(e) => setAssignCategory(e.target.value)}
                />

                <Select
                  label="Priority"
                  value={assignPriority}
                  onChange={(e) => setAssignPriority(e.target.value)}
                >
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </Select>
              </div>

              {/* Multi-select employees */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Assign To (Select multiple)</label>
                <div className="border border-zinc-200 rounded-xl p-3 max-h-[160px] overflow-y-auto space-y-1.5 bg-white">
                  {employees.map((emp) => {
                    const isSelected = selectedEmployees.includes(emp._id);
                    return (
                      <div
                        key={emp._id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedEmployees(selectedEmployees.filter((id) => id !== emp._id));
                          } else {
                            setSelectedEmployees([...selectedEmployees, emp._id]);
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border text-xs font-medium ${
                          isSelected
                            ? "bg-zinc-950 border-zinc-950 text-white"
                            : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        <div>
                          <div className="font-bold">{emp.name}</div>
                          <div className={`text-[10px] ${isSelected ? "text-zinc-300" : "text-zinc-450"}`}>
                            {emp.designation || emp.email}
                          </div>
                        </div>
                        {isSelected && <span className="text-[10px] font-bold">Selected</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={submitLoading}>
                Assign Task
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Daily Fixed Tasks Management Modal */}
      <Modal isOpen={fixedTasksModalOpen} onOpenChange={setFixedTasksModalOpen} size="lg">
        <ModalContent>
          <div className="p-6 space-y-6 text-zinc-900">
            <div className="flex justify-between items-center border-b border-zinc-200 pb-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Manage Daily Fixed Tasks</h2>
                <p className="text-xs text-zinc-500 font-medium">These tasks are automatically generated for all employees daily.</p>
              </div>
              <button
                onClick={() => setFixedTasksModalOpen(false)}
                className="text-zinc-450 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>

            {/* List of current fixed tasks */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Current Daily Fixed Tasks</h3>
              {fixedTasks.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No daily fixed tasks defined yet.</p>
              ) : (
                <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-200 bg-white overflow-hidden max-h-[220px] overflow-y-auto">
                  {fixedTasks.map((task) => (
                    <div key={task._id} className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-50 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-zinc-800">{task.title}</span>
                          <span className={`text-[9px] font-bold px-1.5 rounded-md ${
                            task.priority === "HIGH" ? "bg-red-50 text-red-700 border border-red-100" :
                            task.priority === "MEDIUM" ? "bg-amber-50 text-amber-800 border border-amber-100" :
                            "bg-zinc-100 text-zinc-650 border border-zinc-200"
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-[9px] font-bold bg-[#FAF6F0] border border-[#E8DFD3] text-[#8C7A6B] px-1.5 py-0.5 rounded-md">
                            Role: {task.assignedDesignation === "ALL" ? "All" : task.assignedDesignation}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-[10px] text-zinc-400 leading-normal font-medium">{task.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteFixedTask(task._id)}
                        className="text-red-650 hover:text-red-800 text-[11px] font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form to create new daily fixed task */}
            <form onSubmit={handleCreateFixedTask} className="border-t border-zinc-200 pt-4 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Add New Daily Fixed Task</h3>
              
              <Input
                label="Task Title *"
                placeholder="e.g. Log client report updates"
                value={newFixedTitle}
                onChange={(e) => setNewFixedTitle(e.target.value)}
                required
              />

              <Textarea
                label="Instructions / Description (Optional)"
                placeholder="e.g. Ensure all client sheets are filled before EOD"
                value={newFixedDesc}
                onChange={(e) => setNewFixedDesc(e.target.value)}
              />

              <div className="grid grid-cols-3 gap-4">
                <Select
                  label="Target Designation"
                  value={newFixedAssignedDesignation}
                  onChange={(e) => setNewFixedAssignedDesignation(e.target.value)}
                >
                  <SelectItem value="ALL">All Employees</SelectItem>
                  <SelectItem value="Video Editor">Video Editor</SelectItem>
                  <SelectItem value="Content Writer">Content Writer</SelectItem>
                  <SelectItem value="Graphic Designer">Graphic Designer</SelectItem>
                </Select>

                <Input
                  label="Category"
                  placeholder="e.g. General, Design"
                  value={newFixedCategory}
                  onChange={(e) => setNewFixedCategory(e.target.value)}
                />

                <Select
                  label="Priority"
                  value={newFixedPriority}
                  onChange={(e) => setNewFixedPriority(e.target.value)}
                >
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </Select>
              </div>

              <div className="flex gap-2 justify-end border-t border-zinc-200 pt-3.5">
                <Button
                  variant="outline"
                  onClick={() => setFixedTasksModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  isLoading={fixedSubmitLoading}
                  className="bg-zinc-950 text-white font-bold"
                >
                  Create Fixed Task
                </Button>
              </div>
            </form>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
