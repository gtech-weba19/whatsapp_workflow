import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Lock,
  Users,
  Check,
  CheckSquare,
  Square,
  AlertCircle,
  Loader2,
  X,
  Layers,
  KeyRound,
  Filter,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:8000/api"
).replace(/\/+$/, "");

const getAuthHeaders = () => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("token");
  return {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  };
};

export default function RolesPermissions() {
  const [activeTab, setActiveTab] = useState("roles"); // 'roles' or 'permissions'
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [groupedPermissions, setGroupedPermissions] = useState({});
  const [availableModules, setAvailableModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  // Role Modal State
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [savingRole, setSavingRole] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // Role Delete Modal
  const [deleteRoleModalOpen, setDeleteRoleModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [deletingRole, setDeletingRole] = useState(false);

  // Permission Modal State
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState(null);
  const [savingPerm, setSavingPerm] = useState(false);
  const [isNewModule, setIsNewModule] = useState(false);
  const [permForm, setPermForm] = useState({
    name: "",
    module: "",
    customModule: "",
    slug: "",
    description: "",
  });

  // Permission Delete Modal
  const [deletePermModalOpen, setDeletePermModalOpen] = useState(false);
  const [permToDelete, setPermToDelete] = useState(null);
  const [deletingPerm, setDeletingPerm] = useState(false);

  // Fetch roles and permissions
  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        axios.get(`${API}/roles`, getAuthHeaders()),
        axios.get(`${API}/permissions`, getAuthHeaders()),
      ]);

      if (rolesRes.data?.success) {
        setRoles(rolesRes.data.data || []);
      }
      if (permsRes.data?.success) {
        const perms = permsRes.data.data?.list || [];
        setAllPermissions(perms);
        setGroupedPermissions(permsRes.data.data?.grouped || {});
        setAvailableModules(permsRes.data.data?.modules || []);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to load roles and permissions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter roles by search
  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles;
    const q = search.toLowerCase();
    return roles.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.slug?.toLowerCase().includes(q)
    );
  }, [roles, search]);

  // Filter permissions by search & module
  const filteredPermissions = useMemo(() => {
    let list = allPermissions;

    if (moduleFilter !== "all") {
      list = list.filter((p) => p.module === moduleFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.slug?.toLowerCase().includes(q) ||
          p.module?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allPermissions, search, moduleFilter]);

  // ==========================================
  // ROLE HANDLERS
  // ==========================================
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions([]);
    setRoleModalOpen(true);
  };

  const handleOpenEditRole = (role) => {
    setEditingRole(role);
    setRoleName(role.name || "");
    setRoleDescription(role.description || "");
    const perms = (role.permissions || []).map((p) => p.id);
    setSelectedPermissions(perms);
    setRoleModalOpen(true);
  };

  const handleTogglePermission = (id) => {
    setSelectedPermissions((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleToggleModule = (modulePerms) => {
    const moduleIds = modulePerms.map((p) => p.id);
    const allSelected = moduleIds.every((id) =>
      selectedPermissions.includes(id)
    );

    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((id) => !moduleIds.includes(id))
      );
    } else {
      setSelectedPermissions((prev) => [
        ...new Set([...prev, ...moduleIds]),
      ]);
    }
  };

  const handleSelectAllRolePerms = () => {
    if (selectedPermissions.length === allPermissions.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(allPermissions.map((p) => p.id));
    }
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) {
      toast.warning("Please provide a role name.");
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.warning("Please select at least one permission for this role.");
      return;
    }

    setSavingRole(true);
    try {
      const payload = {
        name: roleName.trim(),
        description: roleDescription.trim(),
        permissions: selectedPermissions,
      };

      if (editingRole) {
        await axios.put(
          `${API}/roles/${editingRole.id}`,
          payload,
          getAuthHeaders()
        );
        toast.success(`Role "${roleName}" updated successfully!`);
      } else {
        await axios.post(`${API}/roles`, payload, getAuthHeaders());
        toast.success(`Role "${roleName}" created successfully!`);
      }

      setRoleModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to save role. Please check input."
      );
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setDeletingRole(true);
    try {
      await axios.delete(
        `${API}/roles/${roleToDelete.id}`,
        getAuthHeaders()
      );
      toast.success(`Role "${roleToDelete.name}" deleted successfully.`);
      setDeleteRoleModalOpen(false);
      setRoleToDelete(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete role.");
    } finally {
      setDeletingRole(false);
    }
  };

  // ==========================================
  // PERMISSION HANDLERS
  // ==========================================
  const handleOpenCreatePerm = () => {
    setEditingPerm(null);
    setIsNewModule(false);
    setPermForm({
      name: "",
      module: availableModules[0] || "Custom",
      customModule: "",
      slug: "",
      description: "",
    });
    setPermModalOpen(true);
  };

  const handleOpenEditPerm = (perm) => {
    setEditingPerm(perm);
    setIsNewModule(false);
    setPermForm({
      name: perm.name || "",
      module: perm.module || "",
      customModule: "",
      slug: perm.slug || "",
      description: perm.description || "",
    });
    setPermModalOpen(true);
  };

  // Auto-generate slug preview
  const handlePermNameChange = (val) => {
    const targetModule = isNewModule
      ? permForm.customModule || "custom"
      : permForm.module || "custom";
    const generatedSlug = `${targetModule.toLowerCase().replace(/[^a-z0-9]/g, "_")}.${val
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")}`;

    setPermForm((prev) => ({
      ...prev,
      name: val,
      slug: editingPerm ? prev.slug : generatedSlug,
    }));
  };

  const handleSavePerm = async (e) => {
    e.preventDefault();
    const finalModule = isNewModule
      ? permForm.customModule.trim()
      : permForm.module.trim();

    if (!finalModule) {
      toast.warning("Please choose or enter a module name.");
      return;
    }

    if (!permForm.name.trim()) {
      toast.warning("Please provide a permission name.");
      return;
    }

    setSavingPerm(true);
    try {
      const payload = {
        name: permForm.name.trim(),
        module: finalModule,
        slug: permForm.slug.trim(),
        description: permForm.description.trim(),
      };

      if (editingPerm) {
        await axios.put(
          `${API}/permissions/${editingPerm.id}`,
          payload,
          getAuthHeaders()
        );
        toast.success(`Permission "${permForm.name}" updated successfully!`);
      } else {
        await axios.post(`${API}/permissions`, payload, getAuthHeaders());
        toast.success(`New permission "${permForm.name}" created and synced!`);
      }

      setPermModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to save permission."
      );
    } finally {
      setSavingPerm(false);
    }
  };

  const handleDeletePerm = async () => {
    if (!permToDelete) return;
    setDeletingPerm(true);
    try {
      await axios.delete(
        `${API}/permissions/${permToDelete.id}`,
        getAuthHeaders()
      );
      toast.success(`Permission "${permToDelete.name}" deleted successfully.`);
      setDeletePermModalOpen(false);
      setPermToDelete(null);
      fetchData();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to delete permission."
      );
    } finally {
      setDeletingPerm(false);
    }
  };

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-100">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Roles & Permissions
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                Control dynamic access, add custom permissions, and customize visibility.
              </p>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenCreatePerm}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2.5 text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-100 focus:outline-none"
          >
            <KeyRound size={17} />
            <span>Add Permission</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateRole}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:scale-[1.02] hover:shadow-lg focus:outline-none"
          >
            <Plus size={18} />
            <span>Create New Role</span>
          </button>
        </div>
      </div>

      {/* TAB SELECTOR */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === "roles"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck size={17} />
          <span>Roles ({roles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("permissions")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
            activeTab === "permissions"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <KeyRound size={17} />
          <span>Permissions ({allPermissions.length})</span>
        </button>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-xs">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === "roles"
                ? "Search roles by title, slug, or description..."
                : "Search permissions by name, code, module..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {activeTab === "permissions" && (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-xs">
            <Filter size={15} className="text-slate-400" />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="text-xs font-semibold text-slate-700 focus:outline-none bg-transparent"
            >
              <option value="all">All Modules ({availableModules.length})</option>
              {availableModules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ROLES TAB                                         */}
      {/* ======================================================== */}
      {activeTab === "roles" && (
        <>
          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-slate-600">
                Loading roles & permissions...
              </p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <ShieldCheck size={36} className="text-slate-300" />
              <h3 className="font-semibold text-slate-700">No Roles Found</h3>
              <p className="text-xs text-slate-500">
                {search
                  ? "No roles match your search keyword."
                  : "No roles created yet. Click 'Create New Role' to get started."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredRoles.map((role) => {
                const isSys = Boolean(role.is_system);
                const userCount = role.users_count || 0;
                const permsCount =
                  role.permissions_count ?? (role.permissions?.length || 0);

                return (
                  <div
                    key={role.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                              isSys
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {isSys ? <Lock size={16} /> : <ShieldCheck size={18} />}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 leading-tight">
                              {role.name}
                            </h3>
                            <span className="font-mono text-[11px] text-slate-400">
                              {role.slug}
                            </span>
                          </div>
                        </div>

                        {isSys ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                            <Lock size={10} /> System
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            Custom
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="mt-3 text-xs text-slate-600 line-clamp-2">
                        {role.description || "No description provided for this role."}
                      </p>

                      {/* Metrics */}
                      <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Users size={14} className="text-slate-400" />
                          <span>{userCount} Users</span>
                        </span>
                        <span className="flex items-center gap-1.5 font-medium">
                          <Layers size={14} className="text-slate-400" />
                          <span>{permsCount} Permissions</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => handleOpenEditRole(role)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-emerald-700"
                      >
                        <Edit2 size={13} />
                        <span>Edit Permissions</span>
                      </button>

                      {!isSys && (
                        <button
                          type="button"
                          onClick={() => {
                            setRoleToDelete(role);
                            setDeleteRoleModalOpen(true);
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100"
                          title="Delete Role"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PERMISSIONS TAB                                   */}
      {/* ======================================================== */}
      {activeTab === "permissions" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-slate-600">
                Loading permissions list...
              </p>
            </div>
          ) : filteredPermissions.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <KeyRound size={36} className="text-slate-300" />
              <h3 className="font-semibold text-slate-700">No Permissions Found</h3>
              <p className="text-xs text-slate-500">
                Click 'Add Permission' to create a custom permission.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Permission Name</th>
                      <th className="px-5 py-3.5">Code / Slug</th>
                      <th className="px-5 py-3.5">Module</th>
                      <th className="px-5 py-3.5">Description</th>
                      <th className="px-5 py-3.5 text-center">Roles Linked</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPermissions.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-5 py-3 font-semibold text-slate-800">
                          {p.name}
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-[11px] rounded-md bg-slate-100 px-2 py-0.5 text-slate-600 border border-slate-200">
                            {p.slug}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-800 border border-emerald-200 text-[10px]">
                            {p.module}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-500 max-w-xs truncate">
                          {p.description || "—"}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 text-[11px] border border-indigo-100">
                            {p.roles_count ?? "—"} roles
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPerm(p)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition"
                              title="Edit Permission"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPermToDelete(p);
                                setDeletePermModalOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                              title="Delete Permission"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* CREATE / EDIT ROLE MODAL                                 */}
      {/* ======================================================== */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingRole ? `Edit Role: ${editingRole.name}` : "Create New Role"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Define name and check the modules and actions this role can perform.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRole} className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {/* Inputs */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Role Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Operations Manager, Support Agent"
                      value={roleName}
                      disabled={editingRole?.slug === "super_admin"}
                      onChange={(e) => setRoleName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-emerald-500 focus:outline-none disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Description
                    </label>
                    <input
                      type="text"
                      placeholder="Brief description of this role's duties..."
                      value={roleDescription}
                      onChange={(e) => setRoleDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Master Permission Toolbar */}
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-emerald-700" />
                    <span className="text-xs font-bold text-slate-800">
                      Permissions ({selectedPermissions.length} / {allPermissions.length} selected)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSelectAllRolePerms}
                    disabled={editingRole?.slug === "super_admin"}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    {selectedPermissions.length === allPermissions.length ? (
                      <>
                        <CheckSquare size={15} />
                        <span>Deselect All</span>
                      </>
                    ) : (
                      <>
                        <Square size={15} />
                        <span>Select All Permissions</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Module-wise Permissions Matrix */}
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([moduleName, perms]) => {
                    const moduleIds = perms.map((p) => p.id);
                    const isAllModuleSelected = moduleIds.every((id) =>
                      selectedPermissions.includes(id)
                    );

                    return (
                      <div
                        key={moduleName}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                      >
                        {/* Module Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-600" />
                            <h4 className="font-bold text-sm text-slate-800">
                              {moduleName}
                            </h4>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {perms.filter((p) => selectedPermissions.includes(p.id)).length} / {perms.length}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleModule(perms)}
                            disabled={editingRole?.slug === "super_admin"}
                            className="text-xs font-semibold text-slate-600 hover:text-emerald-700"
                          >
                            {isAllModuleSelected ? "Uncheck all" : "Check all"}
                          </button>
                        </div>

                        {/* Individual Permission Checkboxes */}
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                          {perms.map((p) => {
                            const isChecked = selectedPermissions.includes(p.id);

                            return (
                              <label
                                key={p.id}
                                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition ${
                                  isChecked
                                    ? "border-emerald-300 bg-emerald-50/50"
                                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={editingRole?.slug === "super_admin"}
                                  onChange={() => handleTogglePermission(p.id)}
                                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div className="min-w-0">
                                  <div className="font-semibold text-xs text-slate-800">
                                    {p.name}
                                  </div>
                                  <div className="font-mono text-[10px] text-slate-400">
                                    {p.slug}
                                  </div>
                                  {p.description && (
                                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                      {p.description}
                                    </div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingRole}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:opacity-90 disabled:opacity-50"
                >
                  {savingRole && <Loader2 size={16} className="animate-spin" />}
                  <span>{editingRole ? "Update Role" : "Create Role"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CREATE / EDIT PERMISSION MODAL                           */}
      {/* ======================================================== */}
      {permModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative flex w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <KeyRound size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingPerm ? "Edit Permission" : "Add New Permission"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Define a module action that can be dynamically granted to roles.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPermModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePerm} className="space-y-4 p-6">
              {/* Module Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Module / Feature <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsNewModule(!isNewModule)}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline"
                  >
                    {isNewModule ? "← Choose existing module" : "+ New module"}
                  </button>
                </div>

                {isNewModule ? (
                  <input
                    type="text"
                    required
                    placeholder="e.g. Analytics, CRM, Billing, Campaigns"
                    value={permForm.customModule}
                    onChange={(e) =>
                      setPermForm((prev) => ({
                        ...prev,
                        customModule: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-indigo-500 focus:outline-none"
                  />
                ) : (
                  <select
                    value={permForm.module}
                    onChange={(e) =>
                      setPermForm((prev) => ({
                        ...prev,
                        module: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-indigo-500 focus:outline-none"
                  >
                    {availableModules.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Permission Name */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Permission Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Export Reports, Delete Journey, Publish Flow"
                  value={permForm.name}
                  onChange={(e) => handlePermNameChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Permission Slug / Code */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Permission Code / Slug <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. reports.export, bots.execute"
                  value={permForm.slug}
                  onChange={(e) =>
                    setPermForm((prev) => ({
                      ...prev,
                      slug: e.target.value,
                    }))
                  }
                  className="w-full font-mono rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 transition focus:border-indigo-500 focus:outline-none bg-slate-50"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  This identifier is used in code guards and API protection.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="What does this permission allow the user to do?"
                  value={permForm.description}
                  onChange={(e) =>
                    setPermForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 transition focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPermModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingPerm}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingPerm && <Loader2 size={16} className="animate-spin" />}
                  <span>{editingPerm ? "Update Permission" : "Save Permission"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ROLE CONFIRMATION MODAL */}
      {deleteRoleModalOpen && roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="rounded-xl bg-rose-100 p-2.5">
                <AlertCircle size={24} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">
                Delete Role?
              </h3>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Are you sure you want to delete the role{" "}
              <strong className="text-slate-900">{roleToDelete.name}</strong>?
              Users assigned to this role must be reassigned first.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteRoleModalOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingRole}
                onClick={handleDeleteRole}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-rose-700 disabled:opacity-50"
              >
                {deletingRole && <Loader2 size={16} className="animate-spin" />}
                <span>Delete Role</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE PERMISSION CONFIRMATION MODAL */}
      {deletePermModalOpen && permToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="rounded-xl bg-rose-100 p-2.5">
                <AlertCircle size={24} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">
                Delete Permission?
              </h3>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Are you sure you want to delete permission{" "}
              <strong className="text-slate-900">{permToDelete.name}</strong> (
              <span className="font-mono text-xs">{permToDelete.slug}</span>)?
              It will be unlinked from all roles.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletePermModalOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingPerm}
                onClick={handleDeletePerm}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-rose-700 disabled:opacity-50"
              >
                {deletingPerm && <Loader2 size={16} className="animate-spin" />}
                <span>Delete Permission</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
