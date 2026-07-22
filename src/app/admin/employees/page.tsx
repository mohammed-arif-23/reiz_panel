"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectItem } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@/components/ui/Modal";
import { Plus, Edit2, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

export default function EmployeesCrud() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal Control
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [designation, setDesignation] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [assignedTemplateId, setAssignedTemplateId] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchEmployeesAndTemplates = async () => {
    try {
      const [empRes, tempRes] = await Promise.all([
        fetch("/api/admin/employees"),
        fetch("/api/admin/templates"),
      ]);

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData.users || []);
      }
      if (tempRes.ok) {
        const tempData = await tempRes.json();
        setTemplates(tempData.templates || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch employees.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesAndTemplates();
  }, []);

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedEmpId(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("EMPLOYEE");
    setDesignation("");
    setStatus("ACTIVE");
    setAssignedTemplateId("");
    onOpen();
  };

  const openEditModal = (emp: any) => {
    setIsEditMode(true);
    setSelectedEmpId(emp._id);
    setName(emp.name);
    setEmail(emp.email);
    setPassword(""); // Leave empty unless resetting
    setRole(emp.role);
    setDesignation(emp.designation || "");
    setStatus(emp.status);
    setAssignedTemplateId(emp.assignedTemplateId?._id || emp.assignedTemplateId || "");
    onOpen();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || (!isEditMode && !password)) {
      setError("Required fields are missing.");
      return;
    }

    setSubmitLoading(true);
    setError("");
    setSuccess("");

    const payload: any = {
      name,
      email,
      role,
      designation,
      status,
      assignedTemplateId: assignedTemplateId || null,
    };

    if (password) {
      payload.password = password;
    }

    const url = isEditMode ? `/api/admin/employees/${selectedEmpId}` : "/api/admin/employees";
    const method = isEditMode ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Operation failed.");
      } else {
        setSuccess(isEditMode ? "Employee updated successfully!" : "Employee created successfully!");
        onClose();
        await fetchEmployeesAndTemplates();
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string, emailStr: string) => {
    if (!confirm(`Are you sure you want to delete employee ${emailStr}?`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/employees/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete employee.");
      } else {
        setSuccess("Employee deleted successfully!");
        await fetchEmployeesAndTemplates();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during deletion.");
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
          <span>Loading employee management...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">Employee Management</h1>
          <p className="text-zinc-550 font-medium mt-1">
            Create, update, and manage employee accounts and deliverable sheets.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-zinc-900 text-white font-semibold shadow-sm hover:bg-zinc-800 self-start sm:self-auto"
          startContent={<Plus className="h-4 w-4" />}
        >
          Add Employee
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

      {/* Employees Table */}
      <Card className="border border-zinc-200 shadow-sm overflow-hidden bg-white">
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold text-zinc-650">Employee Details</th>
                  <th className="py-3 px-4 font-semibold text-zinc-650">System Role</th>
                  <th className="py-3 px-4 font-semibold text-zinc-655">Designation</th>
                  <th className="py-3 px-4 font-semibold text-zinc-650">Assigned Sheet</th>
                  <th className="py-3 px-4 font-semibold text-zinc-650">Status</th>
                  <th className="py-3 px-4 font-semibold text-zinc-650 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900">{emp.name}</div>
                      <div className="text-xs text-zinc-400 font-semibold">{emp.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-zinc-600 text-xs">
                      {emp.role}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600 font-semibold">{emp.designation || "—"}</td>
                    <td className="py-3.5 px-4 text-zinc-650 font-bold text-xs">
                      {emp.assignedTemplateId?.name || (typeof emp.assignedTemplateId === "string" ? "Assigned ID" : "None")}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-xs">
                      <span className={`px-2 py-0.5 rounded border ${
                        emp.status === "ACTIVE"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="light"
                          onClick={() => openEditModal(emp)}
                          className="px-2"
                        >
                          <Edit2 className="h-4 w-4 text-zinc-500" />
                        </Button>
                        <Button
                          size="sm"
                          variant="light"
                          onClick={() => handleDelete(emp._id, emp.email)}
                          className="px-2 text-red-550 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* CRUD Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="md">
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>
              {isEditMode ? "Edit Employee Details" : "Add New Employee"}
            </ModalHeader>
            <ModalBody className="space-y-4">
              <Input
                label="Full Name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                placeholder="john@reizmedia.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label={isEditMode ? "Reset Password (Leave blank to keep current)" : "Password"}
                placeholder="Enter password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEditMode}
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="System Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </Select>

                <Input
                  label="Designation / Title"
                  placeholder="e.g. Video Editor"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Sheet Template"
                  value={assignedTemplateId}
                  onChange={(e) => setAssignedTemplateId(e.target.value)}
                >
                  <SelectItem value="">None</SelectItem>
                  {templates.map((temp) => (
                    <SelectItem key={temp._id} value={temp._id}>{temp.name}</SelectItem>
                  ))}
                </Select>

                <Select
                  label="Account Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </Select>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={submitLoading}>
                {isEditMode ? "Save Changes" : "Create Account"}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
