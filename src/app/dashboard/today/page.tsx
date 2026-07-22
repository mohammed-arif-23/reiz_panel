"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectItem } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@/components/ui/Modal";
import { Plus, Trash2, CheckCircle2, AlertCircle, Wifi, WifiOff } from "lucide-react";

export default function TodayTasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [eodSummary, setEodSummary] = useState("");
  const [eodSubmittedAt, setEodSubmittedAt] = useState<string | null>(null);
  const [eodLoading, setEodLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isOnline, setIsOnline] = useState(true);

  // Modal control for adding task
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [addLoading, setAddLoading] = useState(false);

  const fetchTodayData = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "TEMPLATE_MISSING") {
          setError("No sheet template assigned. Please ask your administrator to assign a sheet template first.");
        } else {
          setError(data.error || "Failed to fetch tasks.");
        }
      } else if (data.sheet) {
        // Cache today's sheet
        localStorage.setItem("today-tasks-cache", JSON.stringify(data.sheet));
        
        // Merge with local drafts
        const localAdds = JSON.parse(localStorage.getItem("offline-tasks-drafts-add") || "[]");
        const serverTasks = data.sheet.tasks || [];
        
        // Apply offline status updates to fetched tasks
        const localUpdates = JSON.parse(localStorage.getItem("offline-tasks-drafts-update") || "[]");
        const mergedTasks = serverTasks.map((t: any) => {
          const update = localUpdates.find((u: any) => u.taskId === t._id);
          return update ? { ...t, status: update.status } : t;
        });

        setTasks([...mergedTasks, ...localAdds]);
        setEodSummary(data.sheet.eodSummary || "");
        setEodSubmittedAt(data.sheet.submittedAt);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch today's tasks.");
      
      // Load from offline cache
      const cached = localStorage.getItem("today-tasks-cache");
      if (cached) {
        const cachedSheet = JSON.parse(cached);
        const localAdds = JSON.parse(localStorage.getItem("offline-tasks-drafts-add") || "[]");
        const serverTasks = cachedSheet.tasks || [];
        
        const localUpdates = JSON.parse(localStorage.getItem("offline-tasks-drafts-update") || "[]");
        const mergedTasks = serverTasks.map((t: any) => {
          const update = localUpdates.find((u: any) => u.taskId === t._id);
          return update ? { ...t, status: update.status } : t;
        });

        setTasks([...mergedTasks, ...localAdds]);
        setEodSummary(cachedSheet.eodSummary || "");
        setEodSubmittedAt(cachedSheet.submittedAt);
        setSuccess("Offline: Displaying cached tasks.");
      }
    } finally {
      setLoading(false);
    }
  };

  const syncDrafts = async () => {
    if (!navigator.onLine) return;

    const addedDrafts = JSON.parse(localStorage.getItem("offline-tasks-drafts-add") || "[]");
    const remainingAdds = [];
    let syncedAdds = 0;

    for (const draft of addedDrafts) {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title,
            description: draft.description,
            category: draft.category,
            priority: draft.priority,
            status: draft.status,
          }),
        });
        if (res.ok) {
          syncedAdds++;
        } else {
          remainingAdds.push(draft);
        }
      } catch (err) {
        console.error("Error syncing draft task:", err);
        remainingAdds.push(draft);
      }
    }

    localStorage.setItem("offline-tasks-drafts-add", JSON.stringify(remainingAdds));

    const updatedDrafts = JSON.parse(localStorage.getItem("offline-tasks-drafts-update") || "[]");
    const remainingUpdates = [];
    let syncedUpdates = 0;

    for (const draft of updatedDrafts) {
      try {
        const res = await fetch(`/api/tasks/${draft.taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: draft.status }),
        });
        if (res.ok) {
          syncedUpdates++;
        } else {
          remainingUpdates.push(draft);
        }
      } catch (err) {
        console.error("Error syncing updated draft task status:", err);
        remainingUpdates.push(draft);
      }
    }

    localStorage.setItem("offline-tasks-drafts-update", JSON.stringify(remainingUpdates));

    if (syncedAdds > 0 || syncedUpdates > 0) {
      setSuccess(`Internet connection restored! Synced ${syncedAdds} draft tasks and ${syncedUpdates} task status changes.`);
      await fetchTodayData();
    }
  };

  useEffect(() => {
    fetchTodayData();

    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const goOnline = () => {
        setIsOnline(true);
        syncDrafts();
      };
      const goOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener("online", goOnline);
      window.addEventListener("offline", goOffline);

      // Try initial sync if online
      if (navigator.onLine) {
        syncDrafts();
      }

      return () => {
        window.removeEventListener("online", goOnline);
        window.removeEventListener("offline", goOffline);
      };
    }
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    setAddLoading(true);
    setError("");
    setSuccess("");

    if (!navigator.onLine) {
      const tempId = `temp-${Date.now()}`;
      const newDraft = {
        _id: tempId,
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
        status: "NOT_STARTED",
      };

      const addedDrafts = JSON.parse(localStorage.getItem("offline-tasks-drafts-add") || "[]");
      addedDrafts.push(newDraft);
      localStorage.setItem("offline-tasks-drafts-add", JSON.stringify(addedDrafts));

      setTasks([...tasks, newDraft]);
      setSuccess("Offline: Task draft saved locally. It will sync automatically when your connection returns.");
      setNewTitle("");
      setNewDesc("");
      setNewCategory("General");
      setNewPriority("MEDIUM");
      onClose();
      setAddLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          category: newCategory,
          priority: newPriority,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add task.");
      } else {
        setSuccess("Task added successfully.");
        setNewTitle("");
        setNewDesc("");
        setNewCategory("General");
        setNewPriority("MEDIUM");
        onClose();
        await fetchTodayData();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while adding task.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setError("");
    setSuccess("");

    if (!navigator.onLine) {
      if (taskId.startsWith("temp-")) {
        const addedDrafts = JSON.parse(localStorage.getItem("offline-tasks-drafts-add") || "[]");
        const idx = addedDrafts.findIndex((d: any) => d._id === taskId);
        if (idx !== -1) {
          addedDrafts[idx].status = newStatus;
          localStorage.setItem("offline-tasks-drafts-add", JSON.stringify(addedDrafts));
        }
      } else {
        const updatedDrafts = JSON.parse(localStorage.getItem("offline-tasks-drafts-update") || "[]");
        const filtered = updatedDrafts.filter((d: any) => d.taskId !== taskId);
        filtered.push({ taskId, status: newStatus });
        localStorage.setItem("offline-tasks-drafts-update", JSON.stringify(filtered));
      }

      setTasks(tasks.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));
      setSuccess("Offline: Task status change queued locally.");
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update task status.");
      } else {
        setSuccess("Task status updated successfully.");
        await fetchTodayData();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while updating task status.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (taskId.startsWith("temp-")) {
      const addedDrafts = JSON.parse(localStorage.getItem("offline-tasks-drafts-add") || "[]");
      const filtered = addedDrafts.filter((d: any) => d._id !== taskId);
      localStorage.setItem("offline-tasks-drafts-add", JSON.stringify(filtered));
      setTasks(tasks.filter((t) => t._id !== taskId));
      setSuccess("Local draft task deleted.");
      return;
    }

    if (!confirm("Are you sure you want to delete this task?")) return;

    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete task.");
      } else {
        setSuccess("Task deleted successfully.");
        await fetchTodayData();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while deleting task.");
    }
  };

  const handleSubmitEod = async () => {
    if (!eodSummary) {
      setError("EOD Summary cannot be empty.");
      return;
    }

    setEodLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/tasks/eod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eodSummary }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit EOD Summary.");
      } else {
        setSuccess("EOD Summary submitted successfully.");
        setEodSubmittedAt(data.sheet.submittedAt);
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while submitting EOD summary.");
    } finally {
      setEodLoading(false);
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
          <span>Loading today's tasks...</span>
        </div>
      </div>
    );
  }

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case "HIGH":
        return "text-red-650 bg-red-50 border-red-100";
      case "MEDIUM":
        return "text-amber-600 bg-amber-50 border-amber-100";
      default:
        return "text-blue-600 bg-blue-50 border-blue-100";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">Today's Tasks & Logs</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-zinc-550 font-medium">
              Log your daily activities and update your progress
            </p>
            {isOnline ? (
              <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 font-bold">
                <Wifi className="h-3 w-3" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 font-bold animate-pulse">
                <WifiOff className="h-3 w-3" /> Offline Mode
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={onOpen}
          className="bg-zinc-900 text-white font-semibold shadow-sm hover:bg-zinc-800 self-start sm:self-auto"
          startContent={<Plus className="h-4 w-4" />}
          disabled={!!error && error.includes("template")}
        >
          Add Task
        </Button>
      </div>

      {error && (
        <Alert color="danger" startContent={<AlertCircle className="h-5 w-5" />}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert color="success" startContent={<CheckCircle2 className="h-5 w-5" />}>
          {success}
        </Alert>
      )}

      {/* Task List */}
      <Card className="border border-zinc-200 shadow-sm bg-white">
        <CardHeader className="pb-2 flex justify-between items-center">
          <h2 className="text-lg font-bold text-zinc-955">Logged Tasks</h2>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-150">
            {tasks.length} {tasks.length === 1 ? "Task" : "Tasks"}
          </span>
        </CardHeader>
        <CardBody className="divide-y divide-zinc-100 p-0">
          {tasks.length === 0 ? (
            <div className="text-center py-12 px-4 text-zinc-400 font-semibold">
              No tasks logged for today. Click "Add Task" to get started.
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task._id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-zinc-900 text-base">{task.title}</h3>
                    <span className="text-xs px-2 py-0.5 font-bold text-zinc-550 bg-zinc-105 rounded-md border border-zinc-200">
                      {task.category}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 font-bold border rounded ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task._id.startsWith("temp-") && (
                      <span className="text-[10px] px-1.5 py-0.5 font-bold border rounded bg-zinc-50 border-zinc-250 text-zinc-500 italic">
                        Draft
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-zinc-500 font-medium">{task.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Status</label>
                    <Select
                      aria-label="Change status"
                      value={task.status}
                      className="w-44"
                      disabled={task.status === "APPROVED"}
                      onChange={(e) => handleStatusChange(task._id, e.target.value)}
                    >
                      <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="WAITING_FOR_REVIEW">Waiting Review</SelectItem>
                      {task.status === "APPROVED" && <SelectItem value="APPROVED">Approved</SelectItem>}
                    </Select>
                  </div>

                  <Button
                    variant="light"
                    onClick={() => handleDeleteTask(task._id)}
                    disabled={task.status === "APPROVED"}
                    className="mt-5 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {/* EOD Remarks */}
      {!error?.includes("template") && (
        <Card className="border border-zinc-200 shadow-sm">
          <CardHeader>
            <h2 className="text-lg font-bold text-zinc-950">End-of-Day (EOD) Summary</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Textarea
              label="EOD Remarks"
              placeholder="Summarize your achievements, challenges, and deliverables for today..."
              value={eodSummary}
              onChange={(e) => setEodSummary(e.target.value)}
              minRows={4}
            />

            {eodSubmittedAt && (
              <p className="text-xs text-zinc-400 font-semibold">
                Submitted at: {new Date(eodSubmittedAt).toLocaleString()}
              </p>
            )}

            <Button
              onClick={handleSubmitEod}
              isLoading={eodLoading}
              disabled={!isOnline}
            >
              {!isOnline ? "EOD Submission requires Online Connection" : "Submit EOD Remarks"}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Add Task Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
        <ModalContent>
          <form onSubmit={handleAddTask}>
            <ModalHeader>Add Today's Task</ModalHeader>
            <ModalBody className="space-y-4">
              <Input
                label="Task Title"
                placeholder="Enter task name"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />

              <Textarea
                label="Description"
                placeholder="Details of what needs to be done"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Category"
                  placeholder="e.g. Design, Coding, Admin"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />

                <Select
                  label="Priority"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                >
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </Select>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={addLoading}>
                Add Task
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
