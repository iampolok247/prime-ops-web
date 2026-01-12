// Adding notes parameter to updateLeadStatus
// web/src/lib/api.js

// FORCE PRODUCTION API URL - Simple approach
const getApiBase = () => {
  // For production builds, always use production API
  if (import.meta.env.PROD) {
    console.log("[API] Production build - using production API");
    return "http://31.97.228.226:5000";
  }

  // For development, use localhost
  console.log("[API] Development mode - using localhost");
  return "http://localhost:5001";
};

// Wrapper fetch that automatically includes auth token
async function authFetch(url, options = {}) {
  const token = localStorage.getItem("auth_token");
  const headers = { ...options.headers };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  console.log("[API] Fetching:", url);

  try {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers,
    });
    console.log("[API] Response status:", response.status, "for", url);
    return response;
  } catch (error) {
    console.error("[API] Fetch FAILED:", error.message, "for", url);
    throw error;
  }
}

async function handleJson(res, defaultMsg) {
  console.log('[handleJson] Processing response:', res.status, res.ok);
  if (!res.ok) {
    console.log('[handleJson] Response NOT OK, reading error...');
    let errBody = {};
    try {
      errBody = await res.json();
    } catch (_) {}
    const msg =
      errBody?.message || errBody?.code || `${defaultMsg} (${res.status})`;
    console.error('[handleJson] Throwing error:', msg);
    throw new Error(msg);
  }
  let data = {};
  try {
    console.log('[handleJson] Response OK, parsing JSON...');
    data = await res.json();
    console.log('[handleJson] JSON parsed successfully:', data);
  } catch (err) {
    console.warn('[handleJson] Failed to parse JSON:', err.message);
  }
  console.log('[handleJson] Returning data:', data);
  return data;
}

// ---------- (Optional) shared formatters you may use in UI ----------
export function fmtBDT(n) {
  try {
    return new Intl.NumberFormat("bn-BD", {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 0,
    }).format(n || 0);
  } catch {
    return `৳${Number(n || 0).toLocaleString("bn-BD")}`;
  }
}

// English formatted BDT (use Latin digits)
export function fmtBDTEn(n) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 0,
    }).format(n || 0);
  } catch {
    return `৳${Number(n || 0).toLocaleString("en-US")}`;
  }
}

export function fmtDate(d) {
  const dt = d ? new Date(d) : new Date();
  const DD = String(dt.getDate()).padStart(2, "0");
  const MM = String(dt.getMonth() + 1).padStart(2, "0");
  const YYYY = dt.getFullYear();
  return `${DD}.${MM}.${YYYY}`;
}

export const api = {
  // ---- authFetch utility (for direct API calls) ----
  authFetch,

  // ---- small helpers ----
  _normalizeDate(d) {
    if (!d) return "";
    // already ISO YYYY-MM-DD?
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
    // handle DD/MM/YYYY (used in UI)
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    // last resort
    const dt = new Date(d);
    if (!isNaN(dt)) {
      const DD = String(dt.getDate()).padStart(2, "0");
      const MM = String(dt.getMonth() + 1).padStart(2, "0");
      const YYYY = dt.getFullYear();
      return `${YYYY}-${MM}-${DD}`;
    }
    return d;
  },

  // ---- Auth ----
  async login(email, password) {
    const res = await authFetch(`${getApiBase()}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleJson(res, "Login failed");
    if (!data || typeof data !== "object")
      throw new Error("Invalid login response");
    return data;
  },
  async me() {
    const res = await authFetch(`${getApiBase()}/api/auth/me`);
    const data = await handleJson(res, "Auth check failed");
    if (!data || typeof data !== "object")
      throw new Error("Invalid /me response");
    return data;
  },
  async logout() {
    const res = await authFetch(`${getApiBase()}/api/auth/logout`, {
      method: "POST",
    });
    return handleJson(res, "Logout failed");
  },
  async updateMe(payload) {
    const res = await authFetch(`${getApiBase()}/api/auth/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await handleJson(res, "Update failed");
    if (!data || typeof data !== "object")
      throw new Error("Invalid update response");
    return data;
  },

  // ---- Users ----
  async listUsers() {
    const res = await authFetch(`${getApiBase()}/api/users`);
    return handleJson(res, "Load users failed");
  },
  async listUsersPublic() {
    // lightweight list for dropdowns; backend returns { users }
    const res = await authFetch(`${getApiBase()}/api/users/list`, {
      credentials: "include",
    });
    return handleJson(res, "Load public users failed");
  },
  async listAdmissionUsers() {
    const res = await authFetch(`${getApiBase()}/api/users/admission`, {
      credentials: "include",
    });
    return handleJson(res, "Load admission users failed");
  },
  async createUser(payload) {
    const res = await authFetch(`${getApiBase()}/api/users`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Create user failed");
  },
  async updateUser(id, payload) {
    const res = await authFetch(`${getApiBase()}/api/users/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Update user failed");
  },
  async deleteUser(id) {
    const res = await authFetch(`${getApiBase()}/api/users/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete user failed");
  },
  async reorderUsers(orders) {
    const res = await authFetch(`${getApiBase()}/api/users/reorder`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders })
    });
    return handleJson(res, 'Reorder users failed');
  },

  // ---- Tasks ----
  async listAllTasks(status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await authFetch(`${getApiBase()}/api/tasks${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load tasks failed");
  },
  async listMyTasks(status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await authFetch(`${getApiBase()}/api/tasks/my${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load my tasks failed");
  },
  async assignTask(payload) {
    const res = await authFetch(`${getApiBase()}/api/tasks/assign`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Assign task failed");
  },
  async addSelfTask(payload) {
    const res = await authFetch(`${getApiBase()}/api/tasks/self`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Add self task failed");
  },
  async updateTaskStatus(id, status) {
    const res = await authFetch(`${getApiBase()}/api/tasks/${id}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return handleJson(res, "Update task status failed");
  },
  async updateTask(id, payload) {
    const res = await authFetch(`${getApiBase()}/api/tasks/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Update task failed");
  },
  async deleteTask(id) {
    const res = await authFetch(`${getApiBase()}/api/tasks/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete task failed");
  },
  async addTaskComment(id, payload) {
    const res = await authFetch(`${getApiBase()}/api/tasks/${id}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Add comment failed");
  },
  async addTaskAttachment(id, payload) {
    const res = await authFetch(`${getApiBase()}/api/tasks/${id}/attachments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Add attachment failed");
  },
  async updateChecklistItem(taskId, itemId, completed) {
    const res = await authFetch(
      `${getApiBase()}/api/tasks/${taskId}/checklist/${itemId}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      }
    );
    return handleJson(res, "Update checklist failed");
  },
  async updateBoardPosition(id, payload) {
    const res = await authFetch(
      `${getApiBase()}/api/tasks/${id}/board-position`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    return handleJson(res, "Update board position failed");
  },

  // ---- Courses ----
  async listCourses() {
    const res = await authFetch(`${getApiBase()}/api/courses`, {
      credentials: "include",
    });
    return handleJson(res, "Load courses failed");
  },
  async createCourse(payload) {
    const res = await authFetch(`${getApiBase()}/api/courses`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Create course failed");
  },
  async updateCourse(id, payload) {
    const res = await authFetch(`${getApiBase()}/api/courses/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Update course failed");
  },
  async deleteCourse(id) {
    const res = await authFetch(`${getApiBase()}/api/courses/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete course failed");
  },

  // ---- Leads (DM & SA/Admin view) ----
  async listLeads(status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await authFetch(`${getApiBase()}/api/leads${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load leads failed");
  },
  async getTodayAssignments() {
    const res = await authFetch(`${getApiBase()}/api/leads/today-assignments`, {
      credentials: "include",
    });
    return handleJson(res, "Load today assignments failed");
  },
  async getLeadHistory(id) {
    const res = await authFetch(`${getApiBase()}/api/leads/${id}/history`, {
      credentials: "include",
    });
    return handleJson(res, "Load lead history failed");
  },
  async assignLead(id, assignedTo) {
    const res = await authFetch(`${getApiBase()}/api/leads/${id}/assign`, {
      method: "POST", // must be POST to match backend
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedTo }),
    });
    return handleJson(res, "Assign lead failed");
  },
  async bulkAssignLeads(leadIds, assignedTo) {
    const res = await authFetch(`${getApiBase()}/api/leads/bulk-assign`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds, assignedTo }),
    });
    return handleJson(res, "Bulk assign failed");
  },
  async createLead(payload) {
    const res = await authFetch(`${getApiBase()}/api/leads`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Create lead failed");
  },
  async bulkUploadLeads(csvText) {
    const res = await authFetch(`${getApiBase()}/api/leads/bulk`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvText }),
    });
    return handleJson(res, "Bulk upload failed");
  },
  async updateLead(id, payload) {
    const res = await authFetch(`${getApiBase()}/api/leads/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Update lead failed");
  },
  async deleteLead(id) {
    const res = await authFetch(`${getApiBase()}/api/leads/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete lead failed");
  },

  // ---- Admission pipeline ----
  async listAdmissionLeads(status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await authFetch(`${getApiBase()}/api/admission/leads${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load admission leads failed");
  },
  async updateLeadStatus(
    id,
    status,
    notes,
    courseId,
    batchId,
    nextFollowUpDate
  ) {
    console.log('[updateLeadStatus] Starting with params:', { id, status, notes, courseId, batchId, nextFollowUpDate });
    const body = { status };
    if (notes !== undefined && notes !== null) body.notes = notes;
    if (courseId !== undefined && courseId !== null) body.courseId = courseId;
    if (batchId !== undefined && batchId !== null) body.batchId = batchId;
    if (
      nextFollowUpDate !== undefined &&
      nextFollowUpDate !== null &&
      nextFollowUpDate !== ""
    )
      body.nextFollowUpDate = nextFollowUpDate;
    console.log('[updateLeadStatus] Request body:', body);
    // Use POST to avoid environments that block PATCH in CORS/proxies
    const res = await authFetch(
      `${getApiBase()}/api/admission/leads/${id}/status`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    console.log('[updateLeadStatus] Received response, calling handleJson...');
    const result = await handleJson(res, "Update lead status failed");
    console.log('[updateLeadStatus] handleJson returned:', result);
    return result;
  },
  async undoAdmission(id) {
    const res = await authFetch(
      `${getApiBase()}/api/admission/leads/${id}/undo-admission`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      }
    );
    return handleJson(res, "Undo admission failed");
  },
  async addLeadFollowUp(id, { note, nextFollowUpDate, priority }) {
    const res = await authFetch(
      `${getApiBase()}/api/admission/leads/${id}/follow-up`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, nextFollowUpDate, priority }),
      }
    );
    return handleJson(res, "Add follow-up failed");
  },

  // ---- Admission fees ----
  async listAdmissionFees() {
    const res = await authFetch(`${getApiBase()}/api/admission/fees`, {
      credentials: "include",
    });
    return handleJson(res, "Load fees failed");
  },
  async checkAdmissionFeeStatus(leadId) {
    const res = await authFetch(`${getApiBase()}/api/admission/fees/status/${leadId}`, {
      credentials: "include",
    });
    return handleJson(res, "Check fee status failed");
  },
  async createAdmissionFee(payload) {
    const res = await authFetch(`${getApiBase()}/api/admission/fees`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Create fee failed");
  },
  async getAdmissionFollowUpNotifications() {
    const res = await authFetch(
      `${getApiBase()}/api/admission/follow-up-notifications`,
      { credentials: "include" }
    );
    return handleJson(res, "Load follow-up notifications failed");
  },
  async getAdmissionReports(userId, from, to) {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    const q = params.toString() ? `?${params.toString()}` : "";
    const res = await authFetch(`${getApiBase()}/api/admission/reports${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load admission reports failed");
  },

  // New: Admission metrics (server aggregated counts for counseling & follow-ups)
  async getAdmissionMetrics(userId, from, to) {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    const q = params.toString() ? `?${params.toString()}` : "";
    const res = await authFetch(`${getApiBase()}/api/reports/admission-metrics${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load admission metrics failed");
  },

  // Download CSV for admission metrics (Admin/SuperAdmin only)
  async downloadAdmissionMetricsCSV(userId, from, to) {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    params.append("format", "csv");
    const q = params.toString() ? `?${params.toString()}` : "";
    const res = await authFetch(`${getApiBase()}/api/reports/admission-metrics${q}`, {
      credentials: "include",
    });
    if (!res.ok) {
      // try to parse JSON error
      let errBody = {};
      try { errBody = await res.json(); } catch(_) {}
      const msg = errBody?.message || `Download failed (${res.status})`;
      throw new Error(msg);
    }
    // return blob for caller to handle download
    const blob = await res.blob();
    return blob;
  },

  // ---- Accounting (Accountant/Admin/SA) ----
  async listFeesForApproval(status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await authFetch(`${getApiBase()}/api/accounting/fees${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load fees failed");
  },
  async approveFee(id) {
    const res = await authFetch(
      `${getApiBase()}/api/accounting/fees/${id}/approve`,
      {
        method: "PATCH",
        credentials: "include",
      }
    );
    return handleJson(res, "Approve failed");
  },
  async rejectFee(id) {
    const res = await authFetch(
      `${getApiBase()}/api/accounting/fees/${id}/reject`,
      {
        method: "PATCH",
        credentials: "include",
      }
    );
    return handleJson(res, "Reject failed");
  },
  async cancelFee(id, reason) {
    const res = await authFetch(
      `${getApiBase()}/api/accounting/fees/${id}/cancel`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      }
    );
    return handleJson(res, "Cancel failed");
  },

  async listIncome() {
    const res = await authFetch(`${getApiBase()}/api/accounting/income`, {
      credentials: "include",
    });
    return handleJson(res, "Load income failed");
  },
  async addIncome(payload) {
    const res = await authFetch(`${getApiBase()}/api/accounting/income`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Add income failed");
  },
  async updateIncome(id, payload) {
    const res = await authFetch(`${getApiBase()}/api/accounting/income/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Update income failed");
  },
  async deleteIncome(id) {
    const res = await authFetch(`${getApiBase()}/api/accounting/income/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete income failed");
  },

  async listExpenses() {
    const res = await authFetch(`${getApiBase()}/api/accounting/expense`, {
      credentials: "include",
    });
    return handleJson(res, "Load expenses failed");
  },
  async addExpense(payload) {
    const res = await authFetch(`${getApiBase()}/api/accounting/expense`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Add expense failed");
  },
  async updateExpense(id, payload) {
    const res = await authFetch(`${getApiBase()}/api/accounting/expense/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Update expense failed");
  },
  async deleteExpense(id) {
    const res = await authFetch(
      `${getApiBase()}/api/accounting/expense/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    return handleJson(res, "Delete expense failed");
  },

  // ---- Due Collections ----
  async getDueCollections(status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await authFetch(
      `${getApiBase()}/api/accounting/due-collections${q}`,
      { credentials: "include" }
    );
    return handleJson(res, "Load due collections failed");
  },
  async approveDueCollection(id, reviewNote) {
    const res = await authFetch(
      `${getApiBase()}/api/accounting/due-collections/${id}/approve`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNote: reviewNote || "" }),
      }
    );
    return handleJson(res, "Approve due collection failed");
  },
  async rejectDueCollection(id, reviewNote) {
    const res = await authFetch(
      `${getApiBase()}/api/accounting/due-collections/${id}/reject`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNote: reviewNote || "" }),
      }
    );
    return handleJson(res, "Reject due collection failed");
  },

  async accountingSummary(from, to) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const q = params.toString() ? `?${params.toString()}` : "";
    const res = await authFetch(`${getApiBase()}/api/accounting/summary${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load summary failed");
  },

  // =========================================================
  // ================== Recruitment (Updated) ================
  // =========================================================

  // ---- Dashboard Stats ----
  async getRecruitmentStats() {
    const res = await authFetch(`${getApiBase()}/api/recruitment/stats`, {
      credentials: "include",
    });
    return handleJson(res, "Load recruitment stats failed");
  },
  // keep old name as alias to avoid breaking existing imports
  async getRecruitmentSummary() {
    return this.getRecruitmentStats();
  },

  // ---- Employers CRUD ----
  async listEmployers() {
    const res = await authFetch(`${getApiBase()}/api/recruitment/employers`, {
      credentials: "include",
    });
    return handleJson(res, "Load employers failed");
  },
  async createEmployer(payload) {
    const res = await authFetch(`${getApiBase()}/api/recruitment/employers`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Create employer failed");
  },
  async updateEmployer(id, payload) {
    const res = await authFetch(
      `${getApiBase()}/api/recruitment/employers/${id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    return handleJson(res, "Update employer failed");
  },
  async deleteEmployer(id) {
    const res = await authFetch(
      `${getApiBase()}/api/recruitment/employers/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    return handleJson(res, "Delete employer failed");
  },

  // ---- Job Positions CRUD ----
  async listJobs() {
    const res = await authFetch(`${getApiBase()}/api/recruitment/jobs`, {
      credentials: "include",
    });
    return handleJson(res, "Load jobs failed");
  },
  async createJob(payload) {
    const res = await authFetch(`${getApiBase()}/api/recruitment/jobs`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Create job failed");
  },
  async updateJob(id, payload) {
    const res = await authFetch(`${getApiBase()}/api/recruitment/jobs/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Update job failed");
  },
  async deleteJob(id) {
    const res = await authFetch(`${getApiBase()}/api/recruitment/jobs/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete job failed");
  },

  // ---- Candidates CRUD + Recruit Action ----
  async listCandidates(status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await authFetch(
      `${getApiBase()}/api/recruitment/candidates${q}`,
      { credentials: "include" }
    );
    return handleJson(res, "Load candidates failed");
  },
  async createCandidate(payload) {
    const res = await authFetch(`${getApiBase()}/api/recruitment/candidates`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Create candidate failed");
  },
  async updateCandidate(id, payload) {
    const res = await authFetch(
      `${getApiBase()}/api/recruitment/candidates/${id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    return handleJson(res, "Update candidate failed");
  },
  async deleteCandidate(id) {
    const res = await authFetch(
      `${getApiBase()}/api/recruitment/candidates/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    return handleJson(res, "Delete candidate failed");
  },
  async recruitCandidate(id, payload) {
    const res = await authFetch(
      `${getApiBase()}/api/recruitment/candidates/${id}/recruit`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), // { employerId, jobId, date }
      }
    );
    return handleJson(res, "Recruit candidate failed");
  },

  // ---- Recruited List (alias via status filter) ----
  async listRecruited() {
    return this.listCandidates("recruited");
  },

  // ---- Recruitment Income ----
  async listRecIncome() {
    const res = await authFetch(`${getApiBase()}/api/recruitment/income`, {
      credentials: "include",
    });
    return handleJson(res, "Load recruitment income failed");
  },
  async addRecIncome(payload) {
    const body = { ...payload, date: this._normalizeDate(payload?.date) };
    const res = await authFetch(`${getApiBase()}/api/recruitment/income`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handleJson(res, "Add recruitment income failed");
  },
  async approveRecIncome(id) {
    const res = await authFetch(
      `${getApiBase()}/api/recruitment/income/${id}/approve`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      }
    );
    return handleJson(res, "Approve recruitment income failed");
  },
  async rejectRecIncome(id, reason) {
    const res = await authFetch(
      `${getApiBase()}/api/recruitment/income/${id}/reject`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }
    );
    return handleJson(res, "Reject recruitment income failed");
  },
  async deleteRecIncome(id) {
    const res = await authFetch(
      `${getApiBase()}/api/recruitment/income/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    return handleJson(res, "Delete recruitment income failed");
  },
  async updateRecIncome(id, payload) {
    const res = await fetch(`${BASE}/api/recruitment/income/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Update recruitment income failed");
  },

  // ---- Recruitment Expenses ----
  async listRecExpense() {
    const res = await authFetch(`${getApiBase()}/api/recruitment/expenses`, {
      credentials: "include",
    });
    return handleJson(res, "Load recruitment expenses failed");
  },
  async addRecExpense(payload) {
    const body = { ...payload, date: this._normalizeDate(payload?.date) };
    const res = await authFetch(`${getApiBase()}/api/recruitment/expenses`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handleJson(res, "Add recruitment expense failed");
  },
  async deleteRecExpense(id) {
    const res = await authFetch(
      `${getApiBase()}/api/recruitment/expenses/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    return handleJson(res, "Delete recruitment expense failed");
  },
  async updateRecExpense() {
    throw new Error(
      "updateRecExpense is not supported by the backend (use add/delete)."
    );
  },

  // =========================================================
  // ================== Digital Marketing (FIX) ==============
  // =========================================================
  // DMExpense, SocialMetrics, SEOWork

  // ---- DM Costs / Expense ----
  async listDMCosts(date, channel) {
    const params = new URLSearchParams();
    if (date) params.set("date", this._normalizeDate(date));
    if (channel) params.set("channel", channel);
    const q = params.toString() ? `?${params.toString()}` : "";
    const res = await authFetch(`${getApiBase()}/api/dm/expense${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load DM costs failed");
  },
  async addDMCost(payload) {
    const body = { ...payload, date: this._normalizeDate(payload?.date) };
    const res = await authFetch(`${getApiBase()}/api/dm/expense`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), // { date, channel, purpose, amount }
    });
    return handleJson(res, "Add DM cost failed");
  },
  async deleteDMCost(id) {
    const res = await authFetch(`${getApiBase()}/api/dm/expense/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete DM cost failed");
  },

  // ---- DM Campaigns (Meta Ads / LinkedIn Ads) ----
  async listDMCampaigns(platform, from, to) {
    const params = new URLSearchParams();
    if (platform) params.append("platform", platform);
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    const q = params.toString() ? `?${params.toString()}` : "";
    const res = await authFetch(`${getApiBase()}/api/dm/campaigns${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load DM campaigns failed");
  },

  async createDMCampaign(payload) {
    const res = await authFetch(`${getApiBase()}/api/dm/campaigns`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Create DM campaign failed");
  },

  async updateDMCampaign(id, payload) {
    const res = await authFetch(`${getApiBase()}/api/dm/campaigns/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Update DM campaign failed");
  },

  async deleteDMCampaign(id) {
    const res = await authFetch(`${getApiBase()}/api/dm/campaigns/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete DM campaign failed");
  },

  async getDMCampaignsSummary(platform, from, to) {
    const params = new URLSearchParams();
    if (platform) params.append("platform", platform);
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    const q = params.toString() ? `?${params.toString()}` : "";
    const res = await authFetch(`${getApiBase()}/api/dm/campaigns/summary/metrics${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load DM campaigns summary failed");
  },

  // ---- Social Media Metrics ----
  // Try /api/dm/social; if 404, retry /api/dm/social-metrics
  async listSocial(date) {
    const q = date
      ? `?date=${encodeURIComponent(this._normalizeDate(date))}`
      : "";
    let res = await authFetch(`${getApiBase()}/api/dm/social${q}`, {
      credentials: "include",
    });
    if (!res.ok && res.status === 404) {
      res = await authFetch(`${getApiBase()}/api/dm/social-metrics${q}`, {
        credentials: "include",
      });
    }
    return handleJson(res, "Load social metrics failed");
  },
  async addSocial(payload) {
    // Server expects a payload like { metrics: { ... } } and currently exposes a PUT /api/dm/social
    const bodyMetrics = { ...payload };
    // frontend form includes a date field but server stores metrics object; remove date from metrics
    if (bodyMetrics.date) delete bodyMetrics.date;
    const body = { metrics: bodyMetrics };

    let res = await authFetch(`${getApiBase()}/api/dm/social`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok && res.status === 404) {
      // fallback if older route exists
      res = await authFetch(`${getApiBase()}/api/dm/social-metrics`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    return handleJson(res, "Add social metrics failed");
  },
  async deleteSocial(id) {
    let res = await authFetch(`${getApiBase()}/api/dm/social/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok && res.status === 404) {
      res = await authFetch(`${getApiBase()}/api/dm/social-metrics/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
    }
    return handleJson(res, "Delete social metrics failed");
  },

  // ---- SEO Work Reports ----
  async listSEO(date) {
    const q = date
      ? `?date=${encodeURIComponent(this._normalizeDate(date))}`
      : "";
    const res = await authFetch(`${getApiBase()}/api/dm/seo${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load SEO reports failed");
  },
  async createSEO(payload) {
    const body = { ...payload, date: this._normalizeDate(payload?.date) };
    const res = await authFetch(`${getApiBase()}/api/dm/seo`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handleJson(res, "Create SEO report failed");
  },
  async deleteSEO(id) {
    const res = await authFetch(`${getApiBase()}/api/dm/seo/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete SEO report failed");
  },

  // ===== Aliases for backward compatibility =====
  // Employers
  async addEmployer(payload) {
    return this.createEmployer(payload);
  },
  async editEmployer(id, payload) {
    return this.updateEmployer(id, payload);
  },
  async removeEmployer(id) {
    return this.deleteEmployer(id);
  },
  // Jobs
  async addJob(payload) {
    return this.createJob(payload);
  },
  async editJob(id, payload) {
    return this.updateJob(id, payload);
  },
  async removeJob(id) {
    return this.deleteJob(id);
  },
  // Candidates
  async addCandidate(payload) {
    return this.createCandidate(payload);
  },
  async editCandidate(id, payload) {
    return this.updateCandidate(id, payload);
  },
  async removeCandidate(id) {
    return this.deleteCandidate(id);
  },
  // Recruitment Income/Expense
  async removeRecIncome(id) {
    return this.deleteRecIncome(id);
  },
  async removeRecExpense(id) {
    return this.deleteRecExpense(id);
  },
  // DM aliases (so your UI calls keep working)
  async createDMCost(payload) {
    return this.addDMCost(payload);
  },
  async createSocial(payload) {
    return this.addSocial(payload);
  },
  async updateSocial(payload) {
    return this.addSocial(payload);
  },

  // ================== Motion Graphics ==================
  async mgStats() {
    const res = await authFetch(`${getApiBase()}/api/mg/stats`, {
      credentials: "include",
    });
    return handleJson(res, "Load MG stats failed");
  },
  async listMGWorks(params = {}) {
    const u = new URLSearchParams();
    if (params.date) u.set("date", params.date); // expect YYYY-MM-DD; UI helper will convert
    if (params.status) u.set("status", params.status);
    const q = u.toString() ? `?${u.toString()}` : "";
    const res = await authFetch(`${getApiBase()}/api/mg/works${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load MG works failed");
  },
  async createMGWork(payload) {
    const res = await authFetch(`${getApiBase()}/api/mg/works`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Create MG work failed");
  },
  async updateMGWork(id, payload) {
    const res = await authFetch(`${getApiBase()}/api/mg/works/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Update MG work failed");
  },
  async deleteMGWork(id) {
    const res = await authFetch(`${getApiBase()}/api/mg/works/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete MG work failed");
  },

  // ---- Consolidated Reports (Phase 8) ----
  async reportsOverview(from, to) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const q = params.toString() ? `?${params.toString()}` : "";
    const res = await authFetch(`${getApiBase()}/api/reports/overview${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load consolidated report failed");
  },

  // ================== Messages / Chat ==================
  async getConversations() {
    const res = await authFetch(`${getApiBase()}/api/messages/conversations`, {
      credentials: "include",
    });
    return handleJson(res, "Load conversations failed");
  },
  async getMessages(userId, params = {}) {
    const u = new URLSearchParams();
    if (params.limit) u.set("limit", params.limit);
    if (params.before) u.set("before", params.before);
    const q = u.toString() ? `?${u.toString()}` : "";
    const res = await authFetch(`${getApiBase()}/api/messages/${userId}${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load messages failed");
  },
  async sendMessage(payload) {
    const res = await authFetch(`${getApiBase()}/api/messages/send`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Send message failed");
  },
  async markMessagesAsRead(userId) {
    const res = await authFetch(`${getApiBase()}/api/messages/${userId}/read`, {
      method: "PATCH",
      credentials: "include",
    });
    return handleJson(res, "Mark messages as read failed");
  },
  async deleteMessage(messageId) {
    const res = await authFetch(`${getApiBase()}/api/messages/${messageId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete message failed");
  },
  async getUnreadMessageCount() {
    const res = await authFetch(`${getApiBase()}/api/messages/unread/count`, {
      credentials: "include",
    });
    return handleJson(res, "Get unread count failed");
  },

  // ---- Admission Targets ----
  async setAdmissionTarget(payload) {
    const res = await authFetch(`${getApiBase()}/api/admission-targets`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Set admission target failed");
  },
  async getAdmissionTargets(month) {
    const res = await authFetch(
      `${getApiBase()}/api/admission-targets?month=${month}`,
      { credentials: "include" }
    );
    return handleJson(res, "Get admission targets failed");
  },
  async getAllAdmissionTargets() {
    const res = await authFetch(`${getApiBase()}/api/admission-targets/all`, {
      credentials: "include",
    });
    return handleJson(res, "Get all admission targets failed");
  },
  async deleteAdmissionTarget(id) {
    const res = await authFetch(`${getApiBase()}/api/admission-targets/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete admission target failed");
  },

  // ---- Targets (New Unified System) ----
  async setTarget(payload) {
    const res = await authFetch(`${getApiBase()}/api/targets`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Set target failed");
  },
  async getTargets(month, targetType, assignedTo) {
    let url = `${getApiBase()}/api/targets?month=${month}`;
    if (targetType) url += `&targetType=${targetType}`;
    if (assignedTo) url += `&assignedTo=${assignedTo}`;
    const res = await authFetch(url, { credentials: "include" });
    return handleJson(res, "Get targets failed");
  },
  async getAllTargets() {
    const res = await authFetch(`${getApiBase()}/api/targets/all`, {
      credentials: "include",
    });
    return handleJson(res, "Get all targets failed");
  },
  async deleteTarget(id) {
    const res = await authFetch(`${getApiBase()}/api/targets/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete target failed");
  },
  async getTeamMembers(role) {
    let url = `${getApiBase()}/api/targets/team-members`;
    if (role) url += `?role=${role}`;
    const res = await authFetch(url, { credentials: "include" });
    return handleJson(res, "Get team members failed");
  },

  // ---- Batches ----
  async listBatches(status, category) {
    let url = `${getApiBase()}/api/batches`;
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (category) params.append("category", category);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await authFetch(url, { credentials: "include" });
    return handleJson(res, "Load batches failed");
  },
  async getBatch(id) {
    const res = await authFetch(`${getApiBase()}/api/batches/${id}`, {
      credentials: "include",
    });
    return handleJson(res, "Load batch failed");
  },
  async getBatchReport(id) {
    const res = await authFetch(`${getApiBase()}/api/batches/${id}/report`, {
      credentials: "include",
    });
    return handleJson(res, "Load batch report failed");
  },
  async createBatch(payload) {
    const res = await authFetch(`${getApiBase()}/api/batches`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Create batch failed");
  },
  async updateBatch(id, payload) {
    const res = await authFetch(`${getApiBase()}/api/batches/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Update batch failed");
  },
  async deleteBatch(id) {
    const res = await authFetch(`${getApiBase()}/api/batches/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete batch failed");
  },
  async addStudentToBatch(batchId, leadId) {
    const res = await authFetch(
      `${getApiBase()}/api/batches/${batchId}/add-student`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      }
    );
    return handleJson(res, "Add student to batch failed");
  },

  // ---- Coordinator ----
  async getStudentsWithDues() {
    const res = await authFetch(
      `${getApiBase()}/api/coordinator/students-with-dues`,
      { credentials: "include" }
    );
    return handleJson(res, "Load students with dues failed");
  },
  async getPaymentNotifications() {
    const res = await authFetch(
      `${getApiBase()}/api/coordinator/payment-notifications`,
      { credentials: "include" }
    );
    return handleJson(res, "Load payment notifications failed");
  },
  async getStudentHistory(admissionFeeId) {
    const res = await authFetch(
      `${getApiBase()}/api/coordinator/student-history/${admissionFeeId}`,
      { credentials: "include" }
    );
    return handleJson(res, "Load student history failed");
  },
  async addFollowUp(payload) {
    const res = await authFetch(
      `${getApiBase()}/api/coordinator/add-follow-up`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    return handleJson(res, "Add follow-up failed");
  },
  async updatePaymentDate(admissionFeeId, nextPaymentDate) {
    const res = await authFetch(
      `${getApiBase()}/api/coordinator/update-payment-date/${admissionFeeId}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextPaymentDate }),
      }
    );
    return handleJson(res, "Update payment date failed");
  },
  async getCoordinatorDashboardStats() {
    const res = await authFetch(
      `${getApiBase()}/api/coordinator/dashboard-stats`,
      { credentials: "include" }
    );
    return handleJson(res, "Load dashboard stats failed");
  },
  async updateAdmissionFeePayment(payload) {
    const res = await authFetch(`${getApiBase()}/api/coordinator/collect-due`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Collect due payment failed");
  },

  // ---- Leave Applications ----
  async createLeaveApplication(payload) {
    const res = await authFetch(`${getApiBase()}/api/leave`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Submit leave application failed");
  },
  async getMyLeaveApplications() {
    const res = await authFetch(`${getApiBase()}/api/leave/my-applications`, {
      credentials: "include",
    });
    return handleJson(res, "Load leave applications failed");
  },
  async getAllLeaveApplications(status) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const res = await authFetch(`${getApiBase()}/api/leave${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load leave applications failed");
  },
  async approveLeaveApplication(id, reviewNote) {
    const res = await authFetch(`${getApiBase()}/api/leave/${id}/approve`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewNote }),
    });
    return handleJson(res, "Approve leave failed");
  },
  async rejectLeaveApplication(id, reviewNote) {
    const res = await authFetch(`${getApiBase()}/api/leave/${id}/reject`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewNote }),
    });
    return handleJson(res, "Reject leave failed");
  },
  async getHandoverRequests() {
    const res = await authFetch(`${getApiBase()}/api/leave/handover-requests`, {
      credentials: "include",
    });
    return handleJson(res, "Load handover requests failed");
  },
  async acceptHandover(id, handoverNote) {
    const res = await authFetch(
      `${getApiBase()}/api/leave/${id}/handover/accept`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handoverNote }),
      }
    );
    return handleJson(res, "Accept handover failed");
  },
  async denyHandover(id, handoverNote) {
    const res = await authFetch(
      `${getApiBase()}/api/leave/${id}/handover/deny`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handoverNote }),
      }
    );
    return handleJson(res, "Deny handover failed");
  },
  async updateLeaveApplication(id, payload) {
    const res = await authFetch(`${getApiBase()}/api/leave/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Update leave application failed");
  },
  async deleteLeaveApplication(id) {
    const res = await authFetch(`${getApiBase()}/api/leave/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete leave application failed");
  },

  // ---- TA/DA Applications ----
  async createTADAApplication(payload) {
    const res = await authFetch(`${getApiBase()}/api/tada`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Submit TA/DA application failed");
  },
  async getMyTADAApplications() {
    const res = await authFetch(`${getApiBase()}/api/tada/my-applications`, {
      credentials: "include",
    });
    return handleJson(res, "Load TA/DA applications failed");
  },
  async getAdminTADAApplications(adminStatus) {
    const q = adminStatus
      ? `?adminStatus=${encodeURIComponent(adminStatus)}`
      : "";
    const res = await authFetch(`${getApiBase()}/api/tada/admin${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load TA/DA applications failed");
  },
  async getAccountantTADAApplications(paymentStatus) {
    const q = paymentStatus
      ? `?paymentStatus=${encodeURIComponent(paymentStatus)}`
      : "";
    const res = await authFetch(`${getApiBase()}/api/tada/accountant${q}`, {
      credentials: "include",
    });
    return handleJson(res, "Load TA/DA applications failed");
  },
  async approveTADAApplication(id, adminReviewNote) {
    const res = await authFetch(`${getApiBase()}/api/tada/${id}/approve`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminReviewNote }),
    });
    return handleJson(res, "Approve TA/DA failed");
  },
  async rejectTADAApplication(id, adminReviewNote) {
    const res = await authFetch(`${getApiBase()}/api/tada/${id}/reject`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminReviewNote }),
    });
    return handleJson(res, "Reject TA/DA failed");
  },
  async payTADAApplication(id, paymentNote) {
    const res = await authFetch(`${getApiBase()}/api/tada/${id}/pay`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentNote }),
    });
    return handleJson(res, "Process payment failed");
  },
  async updateTADAApplication(id, payload) {
    const res = await authFetch(`${getApiBase()}/api/tada/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Update TA/DA application failed");
  },
  async deleteTADAApplication(id) {
    const res = await authFetch(`${getApiBase()}/api/tada/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete TA/DA application failed");
  },

  // ---- Notifications ----
  async getNotifications(isRead, limit = 50) {
    const params = new URLSearchParams();
    if (isRead !== undefined) params.append("isRead", isRead);
    params.append("limit", limit);
    const res = await authFetch(`${getApiBase()}/api/notifications?${params}`, {
      credentials: "include",
    });
    return handleJson(res, "Load notifications failed");
  },
  async getUnreadCount() {
    const res = await authFetch(
      `${getApiBase()}/api/notifications/unread-count`,
      { credentials: "include" }
    );
    return handleJson(res, "Load unread count failed");
  },
  async markNotificationRead(id) {
    const res = await authFetch(
      `${getApiBase()}/api/notifications/${id}/read`,
      {
        method: "PATCH",
        credentials: "include",
      }
    );
    return handleJson(res, "Mark notification read failed");
  },
  async markAllNotificationsRead() {
    const res = await authFetch(
      `${getApiBase()}/api/notifications/mark-all-read`,
      {
        method: "PATCH",
        credentials: "include",
      }
    );
    return handleJson(res, "Mark all notifications read failed");
  },
  async deleteNotification(id) {
    const res = await authFetch(`${getApiBase()}/api/notifications/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete notification failed");
  },

  // ---- Bank Management ----
  async getBankBalances() {
    const res = await authFetch(`${getApiBase()}/api/bank/balances`, {
      credentials: "include",
    });
    return handleJson(res, "Load bank balances failed");
  },
  async getBankTransactions(filters = {}) {
    const params = new URLSearchParams();
    if (filters.from) params.append("from", filters.from);
    if (filters.to) params.append("to", filters.to);
    if (filters.type) params.append("type", filters.type);
    const res = await authFetch(`${getApiBase()}/api/bank/transactions?${params}`, {
      credentials: "include",
    });
    return handleJson(res, "Load bank transactions failed");
  },
  async depositToBank(payload) {
    const res = await authFetch(`${getApiBase()}/api/bank/deposit`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Deposit to bank failed");
  },
  async withdrawFromBank(payload) {
    const res = await authFetch(`${getApiBase()}/api/bank/withdraw`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleJson(res, "Withdraw from bank failed");
  },
  async deleteBankTransaction(id) {
    const res = await authFetch(`${getApiBase()}/api/bank/transactions/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleJson(res, "Delete bank transaction failed");
  },
};
