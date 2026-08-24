import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";
import {
  seedFirestoreIfEmpty,
  getCloudCoordinators,
  addCloudCoordinator,
  updateCloudCoordinator,
  deleteCloudCoordinator,
  getCloudSectors,
  getCloudSectorById,
  addCloudSector,
  updateCloudSector,
  deleteCloudSector,
  getCloudWorks,
  addCloudWork,
  updateCloudWork,
  deleteCloudWork,
  getCloudResources,
  addCloudResource,
  updateCloudResource,
  deleteCloudResource,
  getCloudSettings,
  updateCloudSettings,
  getCloudActivities,
  logCloudActivity,
} from "./src/firebase/db";

const app = express();
const PORT = 3000;

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 16 * 1024 * 1024 } });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser("sincet-sympoflow-secret-key-2026-prod"));

// Serve static assets and uploads
app.use("/static", express.static(path.join(process.cwd(), "static")));
app.use("/uploads", express.static(UPLOAD_DIR));

// Seed Firestore on startup
seedFirestoreIfEmpty().catch((err) => console.error("Firestore startup sync error:", err));

// Active session / user helper (Open Access - No Auth or Role restrictions)
interface SessionUser {
  id: string;
  coordinator_id?: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  sector_id?: string;
}

const defaultPortalUser: SessionUser = {
  id: "coord-1",
  coordinator_id: "coord-1",
  name: "Symposium Coordinator",
  email: "symposium@sincet.edu.in",
  role: "Coordinator",
  department: "SINCET",
  sector_id: "all",
};

// Open access middleware - attaches default user without any auth restrictions
function openAccessMiddleware(req: Request, res: Response, next: NextFunction) {
  (req as any).user = defaultPortalUser;
  next();
}
app.use(openAccessMiddleware);

// ----------------- Open Auth Endpoints (for compatibility) -----------------

app.get("/api/auth/me", (req: Request, res: Response) => {
  return res.json({ authenticated: true, user: defaultPortalUser });
});

app.post("/api/auth/login", (req: Request, res: Response) => {
  return res.json({
    success: true,
    message: "Open access mode enabled",
    user: defaultPortalUser,
  });
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
  return res.json({ success: true, message: "Logged out" });
});

app.post("/api/auth/change-password", (req: Request, res: Response) => {
  return res.json({ success: true, message: "Authentication disabled in open access mode" });
});

// ----------------- Dashboard & Stats -----------------

app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
  try {
    const [coordinators, sectors, works, activities] = await Promise.all([
      getCloudCoordinators(),
      getCloudSectors(),
      getCloudWorks(),
      getCloudActivities(),
    ]);

    const activeCoords = coordinators.filter((c) => c.status !== "Removed");
    const total_admins = activeCoords.filter((c) => c.role === "Admin").length;
    const total_staff = activeCoords.filter((c) => c.role === "Staff Coordinator").length;
    const total_students = activeCoords.filter((c) => c.role === "Student Coordinator").length;

    const total_works = works.length;
    const pending_works = works.filter((w) => w.status === "Pending").length;
    const in_progress_works = works.filter((w) => w.status === "In Progress").length;
    const completed_works = works.filter((w) => w.status === "Completed").length;

    const sector_summary = sectors.map((sec) => {
      const secWorks = works.filter((w) => w.sector_id === sec.id);
      const secCoords = activeCoords.filter((c) => c.sector_id === sec.id);
      const secStaff = secCoords.filter((c) => c.role === "Staff Coordinator");
      const secStudents = secCoords.filter((c) => c.role === "Student Coordinator");

      return {
        id: sec.id,
        name: sec.name,
        color: sec.color || "#4f46e5",
        icon: sec.icon || "folder",
        staff_coordinator: secStaff[0]?.name || sec.staff_coordinator_name || "Not Assigned",
        student_count: secStudents.length,
        total_works: secWorks.length,
        completed_works: secWorks.filter((w) => w.status === "Completed").length,
        pending_works: secWorks.filter((w) => w.status === "Pending").length,
        in_progress_works: secWorks.filter((w) => w.status === "In Progress").length,
      };
    });

    const pendingAndProgress = works.filter((w) => w.status !== "Completed");
    pendingAndProgress.sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));

    return res.json({
      metrics: {
        total_admins,
        total_staff,
        total_students,
        total_sectors: sectors.length,
        total_works,
        pending_works,
        in_progress_works,
        completed_works,
      },
      recent_activities: activities.slice(0, 10),
      upcoming_deadlines: pendingAndProgress.slice(0, 6),
      sector_summary,
    });
  } catch (err: any) {
    console.error("Dashboard stats error:", err);
    return res.status(500).json({ error: "Failed to load dashboard metrics" });
  }
});

// ----------------- Coordinators Endpoints -----------------

app.get("/api/coordinators", async (req: Request, res: Response) => {
  try {
    const coordinators = await getCloudCoordinators();
    return res.json(coordinators);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch coordinators" });
  }
});

app.post("/api/coordinators", async (req: Request, res: Response) => {
  const { name, role, department, id_number, phone, email, sector_id, sector, status } = req.body || {};
  if (!name || !email || !phone) {
    return res.status(400).json({ error: "Name, email, and phone number are required" });
  }

  try {
    const [coordinators, sectors] = await Promise.all([getCloudCoordinators(), getCloudSectors()]);

    if (coordinators.some((c) => c.email.toLowerCase() === email.trim().toLowerCase() && c.status !== "Removed")) {
      return res.status(400).json({ error: "A coordinator with this email already exists" });
    }

    let finalSectorName = sector || "General";
    if (sector_id && (!sector || sector === "")) {
      const sec = sectors.find((s) => s.id === sector_id);
      if (sec) finalSectorName = sec.name;
    }

    const colors = ["#4f46e5", "#f59e0b", "#3b82f6", "#10b981", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#6366f1", "#0284c7"];
    const avatar_color = colors[coordinators.length % colors.length];

    const newId = `coord-${crypto.randomBytes(3).toString("hex")}`;
    const newCoord = {
      id: newId,
      name: name.trim(),
      role: role || "Student Coordinator",
      department: (department || "").trim(),
      id_number: (id_number || "").trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      sector: finalSectorName,
      sector_id: sector_id || "all",
      status: status || "Active",
      avatar_color,
      created_at: new Date().toISOString(),
    };

    await addCloudCoordinator(newCoord);
    await logCloudActivity(name, role || "Coordinator", `Added coordinator ${name}`, `Role: ${role}`, finalSectorName);

    return res.json({ success: true, coordinator: newCoord, message: "Coordinator added successfully" });
  } catch (err: any) {
    console.error("Add coordinator error:", err);
    return res.status(500).json({ error: "Failed to create coordinator in Cloud Firestore" });
  }
});

app.put("/api/coordinators/:coord_id", async (req: Request, res: Response) => {
  const coordId = req.params.coord_id;
  try {
    const [coordinators, sectors] = await Promise.all([getCloudCoordinators(), getCloudSectors()]);
    const coord = coordinators.find((c) => c.id === coordId);

    if (!coord) {
      return res.status(404).json({ error: "Coordinator not found" });
    }

    const { name, role, department, id_number, phone, email, sector_id, sector, status } = req.body || {};

    let finalSectorName = sector || coord.sector;
    if (sector_id && sector_id !== coord.sector_id) {
      const sec = sectors.find((s) => s.id === sector_id);
      if (sec) finalSectorName = sec.name;
    }

    const updates: any = {
      name: name !== undefined ? name.trim() : coord.name,
      role: role || coord.role,
      department: department !== undefined ? department.trim() : coord.department,
      id_number: id_number !== undefined ? id_number.trim() : coord.id_number,
      phone: phone !== undefined ? phone.trim() : coord.phone,
      email: email !== undefined ? email.trim().toLowerCase() : coord.email,
      sector: finalSectorName,
      sector_id: sector_id || coord.sector_id,
      status: status || coord.status,
      updated_at: new Date().toISOString(),
    };

    const updated = await updateCloudCoordinator(coordId, updates);
    await logCloudActivity(updates.name, updates.role, `Updated coordinator ${updates.name}`, `Role: ${updates.role}`, updates.sector);

    return res.json({ success: true, coordinator: updated, message: "Coordinator updated successfully" });
  } catch (err) {
    console.error("Update coordinator error:", err);
    return res.status(500).json({ error: "Failed to update coordinator" });
  }
});

app.delete("/api/coordinators/:coord_id", async (req: Request, res: Response) => {
  const coordId = req.params.coord_id;
  try {
    const coordinators = await getCloudCoordinators();
    const coord = coordinators.find((c) => c.id === coordId);

    if (!coord) {
      return res.status(404).json({ error: "Coordinator not found" });
    }

    await deleteCloudCoordinator(coordId);
    await logCloudActivity("Portal", "Coordinator", `Removed coordinator ${coord.name}`, `Role: ${coord.role}`, coord.sector);

    return res.json({ success: true, message: `Coordinator ${coord.name} removed successfully` });
  } catch (err) {
    console.error("Delete coordinator error:", err);
    return res.status(500).json({ error: "Failed to remove coordinator" });
  }
});

// ----------------- Sectors Endpoints -----------------

app.get("/api/sectors", async (req: Request, res: Response) => {
  try {
    const [sectors, coordinators, works] = await Promise.all([
      getCloudSectors(),
      getCloudCoordinators(),
      getCloudWorks(),
    ]);

    const activeCoords = coordinators.filter((c) => c.status !== "Removed");

    const results = sectors.map((s) => {
      const sCoords = activeCoords.filter((c) => c.sector_id === s.id);
      const staff = sCoords.filter((c) => c.role === "Staff Coordinator");
      const students = sCoords.filter((c) => c.role === "Student Coordinator");
      const sWorks = works.filter((w) => w.sector_id === s.id);

      return {
        ...s,
        staff_coordinator_name: staff[0]?.name || s.staff_coordinator_name || "Not Assigned",
        staff_coordinator: staff[0] || null,
        student_coordinators: students,
        student_count: students.length,
        total_works: sWorks.length,
        completed_works: sWorks.filter((w) => w.status === "Completed").length,
        pending_works: sWorks.filter((w) => w.status === "Pending").length,
        in_progress_works: sWorks.filter((w) => w.status === "In Progress").length,
        works: sWorks,
      };
    });

    return res.json(results);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch sectors" });
  }
});

app.get("/api/sectors/:sector_id", async (req: Request, res: Response) => {
  const sectorId = req.params.sector_id;
  try {
    const [sectors, coordinators, works] = await Promise.all([
      getCloudSectors(),
      getCloudCoordinators(),
      getCloudWorks(),
    ]);

    const sec = sectors.find((s) => s.id === sectorId || s.slug === sectorId);
    if (!sec) {
      return res.status(404).json({ error: "Sector not found" });
    }

    const activeCoords = coordinators.filter((c) => c.status !== "Removed");
    const sCoords = activeCoords.filter((c) => c.sector_id === sec.id);
    const staff = sCoords.filter((c) => c.role === "Staff Coordinator");
    const students = sCoords.filter((c) => c.role === "Student Coordinator");
    const sWorks = works.filter((w) => w.sector_id === sec.id);

    sWorks.sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));

    return res.json({
      ...sec,
      staff_coordinator: staff[0] || null,
      staff_coordinators: staff,
      student_coordinators: students,
      works: sWorks,
      metrics: {
        total_works: sWorks.length,
        completed: sWorks.filter((w) => w.status === "Completed").length,
        pending: sWorks.filter((w) => w.status === "Pending").length,
        in_progress: sWorks.filter((w) => w.status === "In Progress").length,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch sector details" });
  }
});

app.post("/api/sectors", async (req: Request, res: Response) => {
  const { name, description, color, icon, staff_coordinator_id } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "Sector name is required" });
  }

  try {
    const [sectors, coordinators] = await Promise.all([getCloudSectors(), getCloudCoordinators()]);

    let staffName = "Not Assigned";
    if (staff_coordinator_id) {
      const st = coordinators.find((c) => c.id === staff_coordinator_id);
      if (st) staffName = st.name;
    }

    const newId = `sec-${crypto.randomBytes(3).toString("hex")}`;
    const slug = name.toLowerCase().replace(/coordinator|coordination/g, "").trim().replace(/\s+/g, "-") || `sec-${sectors.length + 1}`;

    const newSec = {
      id: newId,
      name: name.trim(),
      slug,
      description: (description || "").trim(),
      color: color || "#3b82f6",
      icon: icon || "folder",
      staff_coordinator_id: staff_coordinator_id || "",
      staff_coordinator_name: staffName,
      created_at: new Date().toISOString(),
    };

    await addCloudSector(newSec);
    await logCloudActivity("Portal", "Coordinator", `Created sector ${name}`, "Sector Management", name);

    return res.json({ success: true, sector: newSec, message: "Sector added successfully" });
  } catch (err) {
    console.error("Add sector error:", err);
    return res.status(500).json({ error: "Failed to create sector" });
  }
});

app.put("/api/sectors/:sector_id", async (req: Request, res: Response) => {
  const sectorId = req.params.sector_id;
  try {
    const [sectors, coordinators] = await Promise.all([getCloudSectors(), getCloudCoordinators()]);
    const sec = sectors.find((s) => s.id === sectorId);

    if (!sec) {
      return res.status(404).json({ error: "Sector not found" });
    }

    const { name, description, color, icon, staff_coordinator_id } = req.body || {};

    let staffName = sec.staff_coordinator_name;
    if (staff_coordinator_id !== undefined) {
      const st = coordinators.find((c) => c.id === staff_coordinator_id);
      staffName = st ? st.name : "Not Assigned";
      if (st) {
        await updateCloudCoordinator(st.id, { sector_id: sectorId, sector: name || sec.name });
      }
    }

    const updates = {
      name: name !== undefined ? name.trim() : sec.name,
      description: description !== undefined ? description.trim() : sec.description,
      color: color || sec.color,
      icon: icon || sec.icon,
      staff_coordinator_id: staff_coordinator_id !== undefined ? staff_coordinator_id : sec.staff_coordinator_id,
      staff_coordinator_name: staffName,
    };

    const updated = await updateCloudSector(sectorId, updates);
    await logCloudActivity("Portal", "Coordinator", `Updated sector ${updated.name}`, "Sector Management", updated.name);

    return res.json({ success: true, sector: updated, message: "Sector updated successfully" });
  } catch (err) {
    console.error("Update sector error:", err);
    return res.status(500).json({ error: "Failed to update sector" });
  }
});

app.delete("/api/sectors/:sector_id", async (req: Request, res: Response) => {
  const sectorId = req.params.sector_id;
  try {
    const sectors = await getCloudSectors();
    const sec = sectors.find((s) => s.id === sectorId);

    if (!sec) {
      return res.status(404).json({ error: "Sector not found" });
    }

    await deleteCloudSector(sectorId);
    await logCloudActivity("Portal", "Coordinator", `Removed sector ${sec.name}`, "Sector Management", sec.name);

    return res.json({ success: true, message: `Sector ${sec.name} deleted successfully` });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete sector" });
  }
});

// ----------------- Works Endpoints -----------------

app.get("/api/works", async (req: Request, res: Response) => {
  try {
    const works = await getCloudWorks();
    const { sector_id, status, priority, assigned_to } = req.query;

    let filtered = works;
    if (sector_id) filtered = filtered.filter((w) => w.sector_id === sector_id);
    if (status) filtered = filtered.filter((w) => w.status === status);
    if (priority) filtered = filtered.filter((w) => w.priority === priority);
    if (assigned_to) filtered = filtered.filter((w) => w.assigned_to_id === assigned_to);

    filtered.sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
    return res.json(filtered);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch works" });
  }
});

app.get("/api/works/my-works", async (req: Request, res: Response) => {
  try {
    const works = await getCloudWorks();
    const activeWorks = works.filter((w) => w.status !== "Completed");
    const displayWorks = activeWorks.length > 0 ? activeWorks : works;
    displayWorks.sort((a, b) => (a.deadline || "").localeCompare(b.deadline || ""));
    return res.json(displayWorks);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch works" });
  }
});

app.post("/api/works", async (req: Request, res: Response) => {
  const { title, description, sector_id, assigned_to_id, start_date, deadline, priority, status } = req.body || {};
  if (!title || !sector_id || !assigned_to_id || !deadline) {
    return res.status(400).json({ error: "Title, Sector, Assigned Coordinator, and Deadline are required" });
  }

  try {
    const [sectors, coordinators] = await Promise.all([getCloudSectors(), getCloudCoordinators()]);

    const sec = sectors.find((s) => s.id === sector_id);
    const coord = coordinators.find((c) => c.id === assigned_to_id && c.status !== "Removed");

    if (!sec) return res.status(400).json({ error: "Selected sector is invalid" });
    if (!coord) return res.status(400).json({ error: "Selected coordinator is invalid" });

    if (coord.sector_id !== "all" && coord.sector_id !== sector_id) {
      return res.status(400).json({ error: `${coord.name} does not belong to ${sec.name}` });
    }

    const newId = `work-${crypto.randomBytes(3).toString("hex")}`;
    const newWork = {
      id: newId,
      title: title.trim(),
      description: (description || "").trim(),
      sector_id,
      sector_name: sec.name,
      assigned_to_id,
      assigned_to_name: coord.name,
      assigned_to_role: coord.role || "Student Coordinator",
      created_by: "Coordinator",
      start_date: start_date || new Date().toISOString().split("T")[0],
      deadline,
      priority: priority || "Medium",
      status: status || "Pending",
      completion_notes: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await addCloudWork(newWork);

    await logCloudActivity(
      "Portal",
      "Coordinator",
      `Assigned work '${title}' to ${coord.name}`,
      `Priority: ${priority || "Medium"} | Due: ${deadline}`,
      sec.name
    );

    return res.json({ success: true, work: newWork, message: "Work created and assigned successfully" });
  } catch (err) {
    console.error("Add work error:", err);
    return res.status(500).json({ error: "Failed to create work" });
  }
});

app.put("/api/works/:work_id", async (req: Request, res: Response) => {
  const workId = req.params.work_id;
  try {
    const [works, sectors, coordinators] = await Promise.all([
      getCloudWorks(),
      getCloudSectors(),
      getCloudCoordinators(),
    ]);

    const work = works.find((w) => w.id === workId);
    if (!work) {
      return res.status(404).json({ error: "Work task not found" });
    }

    const { title, description, sector_id, assigned_to_id, start_date, deadline, priority, status, completion_notes } = req.body || {};

    const updates: any = {};
    if (sector_id && sector_id !== work.sector_id) {
      const sec = sectors.find((s) => s.id === sector_id);
      if (sec) {
        updates.sector_id = sec.id;
        updates.sector_name = sec.name;
      }
    }

    if (assigned_to_id && assigned_to_id !== work.assigned_to_id) {
      const coord = coordinators.find((c) => c.id === assigned_to_id);
      if (coord) {
        updates.assigned_to_id = coord.id;
        updates.assigned_to_name = coord.name;
        updates.assigned_to_role = coord.role;
      }
    }

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (start_date) updates.start_date = start_date;
    if (deadline) updates.deadline = deadline;
    if (priority) updates.priority = priority;
    if (status) updates.status = status;
    if (completion_notes !== undefined) updates.completion_notes = completion_notes;

    const updated = await updateCloudWork(workId, updates);
    await logCloudActivity("Portal", "Coordinator", `Updated work '${updated.title}'`, `Assigned: ${updated.assigned_to_name}`, updated.sector_name);

    return res.json({ success: true, work: updated, message: "Work updated successfully" });
  } catch (err) {
    console.error("Update work error:", err);
    return res.status(500).json({ error: "Failed to update work" });
  }
});

app.post("/api/works/:work_id/status", async (req: Request, res: Response) => {
  const workId = req.params.work_id;
  try {
    const works = await getCloudWorks();
    const work = works.find((w) => w.id === workId);

    if (!work) {
      return res.status(404).json({ error: "Work not found" });
    }

    const { status, completion_notes } = req.body || {};
    if (!["Pending", "In Progress", "Completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updates: any = { status };
    if (completion_notes !== undefined) updates.completion_notes = completion_notes;

    const updated = await updateCloudWork(workId, updates);
    await logCloudActivity("Portal", "Coordinator", `Marked as ${status}:`, work.title, work.sector_name);

    return res.json({ success: true, work: updated, message: `Status changed to ${status}` });
  } catch (err) {
    console.error("Update work status error:", err);
    return res.status(500).json({ error: "Failed to change work status" });
  }
});

app.delete("/api/works/:work_id", async (req: Request, res: Response) => {
  const workId = req.params.work_id;
  try {
    const works = await getCloudWorks();
    const work = works.find((w) => w.id === workId);

    if (!work) {
      return res.status(404).json({ error: "Work not found" });
    }

    await deleteCloudWork(workId);
    await logCloudActivity("Portal", "Coordinator", `Deleted work:`, work.title, work.sector_name);

    return res.json({ success: true, message: `Work '${work.title}' removed successfully` });
  } catch (err) {
    console.error("Delete work error:", err);
    return res.status(500).json({ error: "Failed to delete work" });
  }
});

// ----------------- Resources & Brochure Endpoints -----------------

app.get("/api/resources", async (req: Request, res: Response) => {
  try {
    const resources = await getCloudResources();
    return res.json(resources);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch resources" });
  }
});

app.post("/api/resources", upload.single("file"), async (req: Request, res: Response) => {
  const { title, description, type, external_url, is_brochure } = req.body || {};
  const file = req.file;

  if (!title) {
    return res.status(400).json({ error: "Resource title is required" });
  }

  let fileUrl = "";
  let fileSize = "External Link";

  if (file) {
    fileUrl = `/uploads/${file.filename}`;
    const sizeBytes = file.size;
    fileSize = sizeBytes < 1024 * 1024 ? `${Math.round(sizeBytes / 1024)} KB` : `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (!fileUrl && (!external_url || external_url.trim() === "")) {
    return res.status(400).json({ error: "Either upload a file or provide an external link" });
  }

  try {
    const isBrochureBool = String(is_brochure).toLowerCase() === "true";
    const resources = await getCloudResources();

    if (isBrochureBool) {
      for (const r of resources) {
        if (r.is_brochure) {
          await updateCloudResource(r.id, { is_brochure: false });
        }
      }
      const settingsUpdates: any = { brochure_title: title };
      if (fileUrl) settingsUpdates.brochure_file = fileUrl;
      await updateCloudSettings(settingsUpdates);
    }

    const newRes = {
      id: `res-${crypto.randomBytes(3).toString("hex")}`,
      title: title.trim(),
      description: (description || "").trim(),
      type: type || "Important Document",
      file_url: fileUrl,
      external_url: (external_url || "").trim(),
      is_brochure: isBrochureBool,
      size: fileSize,
      uploaded_by: "Symposium Coordinator",
      created_at: new Date().toISOString(),
    };

    await addCloudResource(newRes);
    await logCloudActivity("Portal", "Coordinator", `Added resource: ${title}`, `Type: ${type || "Document"}`, "Resources");

    return res.json({ success: true, resource: newRes, message: "Resource added successfully" });
  } catch (err) {
    console.error("Add resource error:", err);
    return res.status(500).json({ error: "Failed to add resource" });
  }
});

app.post("/api/resources/brochure", upload.single("file"), async (req: Request, res: Response) => {
  const file = req.file;
  const title = (req.body?.title || "XENO '26 Official Event Brochure & Schedule").trim();

  if (!file) {
    return res.status(400).json({ error: "No file selected for brochure" });
  }

  try {
    const fileUrl = `/uploads/${file.filename}`;
    const sizeBytes = file.size;
    const fileSize = sizeBytes < 1024 * 1024 ? `${Math.round(sizeBytes / 1024)} KB` : `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;

    await updateCloudSettings({
      brochure_title: title,
      brochure_file: fileUrl,
    });

    const resources = await getCloudResources();
    for (const r of resources) {
      if (r.is_brochure) {
        await updateCloudResource(r.id, { is_brochure: false });
      }
    }

    const brochureRes = {
      id: `res-brochure-${crypto.randomBytes(2).toString("hex")}`,
      title,
      description: "Official color symposium brochure with event tracks, rules, schedule, prizes, and contact numbers.",
      type: "PDF Document",
      file_url: fileUrl,
      external_url: "",
      is_brochure: true,
      size: fileSize,
      uploaded_by: "Coordinator",
      created_at: new Date().toISOString(),
    };

    await addCloudResource(brochureRes);
    await logCloudActivity("Portal", "Coordinator", "Uploaded and replaced Symposium Brochure", title, "Resources");

    return res.json({ success: true, brochure: brochureRes, message: "Symposium brochure uploaded successfully" });
  } catch (err) {
    console.error("Upload brochure error:", err);
    return res.status(500).json({ error: "Failed to upload brochure" });
  }
});

app.delete("/api/resources/:res_id", async (req: Request, res: Response) => {
  const resId = req.params.res_id;
  try {
    const resources = await getCloudResources();
    const resItem = resources.find((r) => r.id === resId);

    if (!resItem) {
      return res.status(404).json({ error: "Resource not found" });
    }

    await deleteCloudResource(resId);
    await logCloudActivity("Portal", "Coordinator", `Deleted resource: ${resItem.title}`, `Type: ${resItem.type}`, "Resources");

    return res.json({ success: true, message: `Resource '${resItem.title}' deleted successfully` });
  } catch (err) {
    console.error("Delete resource error:", err);
    return res.status(500).json({ error: "Failed to delete resource" });
  }
});

// ----------------- Settings & Registration Endpoints -----------------

app.get("/api/settings", async (req: Request, res: Response) => {
  try {
    const settings = await getCloudSettings();
    return res.json(settings);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.post("/api/settings", async (req: Request, res: Response) => {
  const data = req.body || {};
  try {
    const settings = await updateCloudSettings(data);
    await logCloudActivity("Portal", "Coordinator", "Updated symposium settings", "System Settings", "Settings");
    return res.json({ success: true, settings, message: "Settings updated successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update settings" });
  }
});

app.post("/api/settings/registration", async (req: Request, res: Response) => {
  const { registration_url, registration_status, registration_deadline } = req.body || {};
  try {
    const updates: any = {};
    if (registration_url !== undefined) updates.registration_url = registration_url.trim();
    if (registration_status) updates.registration_status = registration_status;
    if (registration_deadline) updates.registration_deadline = registration_deadline;

    const settings = await updateCloudSettings(updates);
    await logCloudActivity(
      "Portal",
      "Coordinator",
      `Updated Registration link (${settings.registration_status})`,
      settings.registration_url,
      "Registration"
    );

    return res.json({ success: true, settings, message: "Registration link updated successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update registration link" });
  }
});

// Vite middleware for development & static fallback for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.get("*", (req: Request, res: Response) => {
      const distIndex = path.join(process.cwd(), "dist", "index.html");
      if (fs.existsSync(distIndex)) {
        res.sendFile(distIndex);
      } else {
        res.sendFile(path.join(process.cwd(), "index.html"));
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Symposium Node/Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
