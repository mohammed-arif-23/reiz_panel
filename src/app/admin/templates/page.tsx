"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectItem } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@/components/ui/Modal";
import { Plus, Edit2, Copy, Trash2, CheckCircle2, AlertCircle, Trash } from "lucide-react";

interface ColumnConfig {
  key: string;
  label: string;
  type: string;
  options?: string[];
  optionsRaw?: string;
}

export default function TemplateBuilder() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [templateName, setTemplateName] = useState("");
  const [assignedRolesRaw, setAssignedRolesRaw] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/admin/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      } else {
        setError("Failed to load templates.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while fetching templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedTemplateId(null);
    setTemplateName("");
    setAssignedRolesRaw("");
    setIsActive(true);
    setColumns([{ key: "videoTitle", label: "Video Title", type: "text" }]);
    onOpen();
  };

  const openEditModal = (template: any) => {
    setIsEditMode(true);
    setSelectedTemplateId(template._id);
    setTemplateName(template.name);
    setAssignedRolesRaw((template.assignedRoles || []).join(", "));
    setIsActive(template.isActive);

    const mappedColumns = template.columns.map((col: any) => ({
      key: col.key,
      label: col.label,
      type: col.type,
      options: col.options || [],
      optionsRaw: (col.options || []).join(", "),
    }));
    setColumns(mappedColumns);
    onOpen();
  };

  const handleDuplicate = async (template: any) => {
    setError("");
    setSuccess("");
    setSubmitLoading(true);

    const dupName = `${template.name} (Copy)`;
    const dupColumns = template.columns.map((col: any) => ({
      key: col.key,
      label: col.label,
      type: col.type,
      options: col.options || [],
    }));

    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dupName,
          columns: dupColumns,
          assignedRoles: template.assignedRoles || [],
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to duplicate template.");
      } else {
        setSuccess(`Template duplicated successfully as ${dupName}!`);
        await fetchTemplates();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during duplication.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAddColumnInput = () => {
    setColumns([...columns, { key: "", label: "", type: "text" }]);
  };

  const handleRemoveColumnInput = (index: number) => {
    const nextCols = [...columns];
    nextCols.splice(index, 1);
    setColumns(nextCols);
  };

  const handleColumnChange = (index: number, field: keyof ColumnConfig, val: any) => {
    const nextCols = [...columns];
    nextCols[index] = {
      ...nextCols[index],
      [field]: val,
    };
    setColumns(nextCols);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName || columns.length === 0) {
      setError("Template name and at least one column are required.");
      return;
    }

    for (const col of columns) {
      if (!col.key || !col.label) {
        setError("All columns must have a key and a label.");
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(col.key)) {
        setError(`Invalid column key: "${col.key}". Key must be alphanumeric (letters, numbers, underscores).`);
        return;
      }
    }

    setSubmitLoading(true);
    setError("");
    setSuccess("");

    const assignedRoles = assignedRolesRaw
      ? assignedRolesRaw.split(",").map((r) => r.trim()).filter(Boolean)
      : [];

    const formattedColumns = columns.map((col) => {
      const options = col.type === "select"
        ? (col.optionsRaw ? col.optionsRaw.split(",").map((o) => o.trim()).filter(Boolean) : col.options || [])
        : [];
      return {
        key: col.key,
        label: col.label,
        type: col.type,
        options,
      };
    });

    const payload = {
      name: templateName,
      columns: formattedColumns,
      assignedRoles,
      isActive,
    };

    const url = isEditMode ? `/api/admin/templates/${selectedTemplateId}` : "/api/admin/templates";
    const method = isEditMode ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save template.");
      } else {
        setSuccess(isEditMode ? "Template updated successfully!" : "Template created successfully!");
        onClose();
        await fetchTemplates();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while saving template.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}"? Historical sheet records using this template config will NOT break, but no new sheets can use it.`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete template.");
      } else {
        setSuccess("Template deleted successfully!");
        await fetchTemplates();
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while deleting template.");
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
          <span>Loading template builder...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">Template Builder</h1>
          <p className="text-zinc-550 font-medium mt-1">
            Build and assign customized sheets with version-safe deliverables columns.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-zinc-900 text-white font-semibold shadow-sm hover:bg-zinc-800 self-start sm:self-auto"
          startContent={<Plus className="h-4 w-4" />}
        >
          Create Template
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

      {/* Templates List */}
      <div className="grid gap-6 md:grid-cols-2">
        {templates.map((temp) => (
          <Card key={temp._id} className="border border-zinc-200 shadow-sm bg-white hover:border-zinc-300 transition-all">
            <CardHeader className="pb-2 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-zinc-900 text-lg">{temp.name}</h3>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                  Assigned Roles: {temp.assignedRoles?.join(", ") || "None"}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                temp.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
              }`}>
                {temp.isActive ? "Active" : "Inactive"}
              </span>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Columns Configuration</h4>
                <div className="flex flex-wrap gap-2">
                  {temp.columns.map((col: any) => (
                    <span key={col.key} className="text-xs font-semibold px-2 py-1 bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-md">
                      {col.label} <span className="text-[10px] text-zinc-400 font-bold">({col.type})</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="h-px bg-zinc-100 w-full" />

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleDuplicate(temp)}
                  className="px-3 py-1.5 text-xs font-bold text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  startContent={<Copy className="h-3.5 w-3.5" />}
                >
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openEditModal(temp)}
                  className="px-3 py-1.5 text-xs font-bold text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  startContent={<Edit2 className="h-3.5 w-3.5" />}
                >
                  Edit
                </Button>
                <Button
                  variant="light"
                  onClick={() => handleDelete(temp._id, temp.name)}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                  startContent={<Trash2 className="h-3.5 w-3.5" />}
                >
                  Delete
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Template Builder Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="xl">
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>
              {isEditMode ? "Edit Deliverables Template" : "Build Deliverables Template"}
            </ModalHeader>
            <ModalBody className="space-y-4 max-h-[60vh] overflow-y-auto">
              <Input
                label="Template Name"
                placeholder="e.g. Graphic Designer Sheet"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                required
              />

              <Input
                label="Assigned Roles / Designations (Comma separated)"
                placeholder="e.g. Graphic Designer, UI Designer"
                value={assignedRolesRaw}
                onChange={(e) => setAssignedRolesRaw(e.target.value)}
              />

              <Select
                label="Active Status"
                value={isActive ? "true" : "false"}
                onChange={(e) => setIsActive(e.target.value === "true")}
              >
                <SelectItem value="true">Active (Available for assign)</SelectItem>
                <SelectItem value="false">Inactive (Hidden)</SelectItem>
              </Select>

              <div className="pt-2">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-zinc-900">Custom Columns Config</h3>
                  <Button
                    variant="outline"
                    onClick={handleAddColumnInput}
                    startContent={<Plus className="h-3.5 w-3.5" />}
                    className="py-1 px-2.5 h-8 text-xs font-bold border-zinc-200 hover:bg-zinc-50"
                  >
                    Add Column
                  </Button>
                </div>

                <div className="space-y-3">
                  {columns.map((col, index) => (
                    <div key={index} className="flex flex-col gap-3 p-3 border border-zinc-200 rounded-xl bg-zinc-50/50">
                      <div className="flex flex-wrap items-center gap-3">
                        <Input
                          label="Unique Key"
                          placeholder="figmaLink"
                          value={col.key}
                          onChange={(e) => handleColumnChange(index, "key", e.target.value)}
                          required
                          className="flex-1 min-w-[120px]"
                        />
                        <Input
                          label="Column Label"
                          placeholder="Figma Link"
                          value={col.label}
                          onChange={(e) => handleColumnChange(index, "label", e.target.value)}
                          required
                          className="flex-1 min-w-[120px]"
                        />
                        <Select
                          label="Field Type"
                          value={col.type}
                          onChange={(e) => handleColumnChange(index, "type", e.target.value)}
                          className="w-36"
                        >
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                        </Select>
                        <Button
                          variant="light"
                          onClick={() => handleRemoveColumnInput(index)}
                          className="mt-5 text-red-550 hover:bg-red-50"
                          disabled={columns.length === 1}
                        >
                          <Trash className="h-4.5 w-4.5" />
                        </Button>
                      </div>

                      {col.type === "select" && (
                        <Input
                          label="Select Options (Comma separated)"
                          placeholder="Poster, Thumbnail, Banner"
                          value={col.optionsRaw}
                          onChange={(e) => handleColumnChange(index, "optionsRaw", e.target.value)}
                          required
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={submitLoading}>
                {isEditMode ? "Save Changes" : "Create Template"}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
