import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  Firestore,
} from "firebase/firestore";
import fs from "fs";
import path from "path";

// Load configuration
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (e) {
    console.error("Error reading firebase-applet-config.json:", e);
  }
}

// Initialize Firebase App
const app =
  getApps().length === 0
    ? initializeApp({
        apiKey: firebaseConfig.apiKey || "AIzaSyBWU0afftIiCAcoOf6Wp1FTcxCY1div4YY",
        authDomain: firebaseConfig.authDomain || "gen-lang-client-0344878272.firebaseapp.com",
        projectId: firebaseConfig.projectId || "gen-lang-client-0344878272",
        storageBucket: firebaseConfig.storageBucket || "gen-lang-client-0344878272.firebasestorage.app",
        appId: firebaseConfig.appId || "1:606894076809:web:7bebc0efcd3443958ca758",
      })
    : getApp();

const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
export const db: Firestore = getFirestore(app, databaseId);

const DATA_DIR = path.join(process.cwd(), "data");

function loadLocalJson<T>(filename: string, defaultValue: T): T {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8")) as T;
  } catch (err) {
    return defaultValue;
  }
}

function saveLocalJson(filename: string, data: unknown): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Failed to save local backup for ${filename}:`, err);
  }
}

// ----------------- Seeding Logic -----------------
let isSeeded = false;

export async function seedFirestoreIfEmpty(): Promise<void> {
  if (isSeeded) return;
  try {
    console.log("Checking Firestore cloud database collections for initialization...");

    // Check Settings
    const settingsDocRef = doc(db, "settings", "general");
    const settingsSnap = await getDoc(settingsDocRef);
    if (!settingsSnap.exists()) {
      const localSettings = loadLocalJson<any>("settings.json", {
        college_name: "Sir Issac Newton College of Engineering and Technology",
        college_short: "SINCET",
        symposium_name: "XENO 2K26",
        symposium_theme: "National Level Technical Symposium – Dept of CSE, AI&DS, IT, CSE(AIML)",
        event_date: "2026-09-12",
        venue: "Main Auditorium, SINCET Campus",
        registration_url: "https://forms.gle/XykE24Ahw1uJ3qBc6",
        registration_status: "Open",
        registration_deadline: "2026-09-07",
        contact_email: "symposium@sincet.edu.in",
        emergency_helpline: "+91 8807722484",
        brochure_title: "XENO '26 Official Event Brochure & Schedule",
        brochure_file: "/uploads/1787584680885-962287431.jpeg",
      });
      await setDoc(settingsDocRef, localSettings);
      console.log("Seeded settings into Firestore collection 'settings'");
    }

    // Check Coordinators
    const coordsSnap = await getDocs(collection(db, "coordinators"));
    if (coordsSnap.empty) {
      const localCoords = loadLocalJson<any[]>("coordinators.json", []);
      for (const item of localCoords) {
        if (item.id) {
          await setDoc(doc(db, "coordinators", item.id), item);
        }
      }
      console.log(`Seeded ${localCoords.length} coordinators into Firestore collection 'coordinators'`);
    }

    // Check Sectors
    const sectorsSnap = await getDocs(collection(db, "sectors"));
    if (sectorsSnap.empty) {
      const localSectors = loadLocalJson<any[]>("sectors.json", []);
      for (const item of localSectors) {
        if (item.id) {
          await setDoc(doc(db, "sectors", item.id), item);
        }
      }
      console.log(`Seeded ${localSectors.length} sectors into Firestore collection 'sectors'`);
    }

    // Check Works / Tasks
    const worksSnap = await getDocs(collection(db, "works"));
    if (worksSnap.empty) {
      const localWorks = loadLocalJson<any[]>("works.json", []);
      for (const item of localWorks) {
        if (item.id) {
          await setDoc(doc(db, "works", item.id), item);
        }
      }
      console.log(`Seeded ${localWorks.length} works into Firestore collection 'works'`);
    }

    // Check Resources
    const resSnap = await getDocs(collection(db, "resources"));
    if (resSnap.empty) {
      const localRes = loadLocalJson<any[]>("resources.json", []);
      for (const item of localRes) {
        if (item.id) {
          await setDoc(doc(db, "resources", item.id), item);
        }
      }
      console.log(`Seeded ${localRes.length} resources into Firestore collection 'resources'`);
    }

    // Check Activities
    const actSnap = await getDocs(collection(db, "activities"));
    if (actSnap.empty) {
      const localActs = loadLocalJson<any[]>("activities.json", []);
      for (const item of localActs) {
        if (item.id) {
          await setDoc(doc(db, "activities", item.id), item);
        }
      }
      console.log(`Seeded ${localActs.length} activities into Firestore collection 'activities'`);
    }

    isSeeded = true;
    console.log("Firestore cloud database successfully synchronized.");
  } catch (err) {
    console.warn("Firestore seed note / fallback enabled:", err);
  }
}

// ----------------- Settings Operations -----------------

export async function getCloudSettings(): Promise<any> {
  try {
    const snap = await getDoc(doc(db, "settings", "general"));
    if (snap.exists()) {
      const data = snap.data();
      saveLocalJson("settings.json", data);
      return data;
    }
  } catch (err) {
    console.error("Firestore getCloudSettings error:", err);
  }
  return loadLocalJson<any>("settings.json", {});
}

export async function updateCloudSettings(data: any): Promise<any> {
  const current = await getCloudSettings();
  const updated = { ...current, ...data };
  try {
    await setDoc(doc(db, "settings", "general"), updated, { merge: true });
  } catch (err) {
    console.error("Firestore updateCloudSettings error:", err);
  }
  saveLocalJson("settings.json", updated);
  return updated;
}

// ----------------- Coordinators Operations -----------------

export async function getCloudCoordinators(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, "coordinators"));
    if (!snap.empty) {
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      saveLocalJson("coordinators.json", list);
      return list.filter((c) => c.status !== "Removed");
    }
  } catch (err) {
    console.error("Firestore getCloudCoordinators error:", err);
  }
  const local = loadLocalJson<any[]>("coordinators.json", []);
  return local.filter((c) => c.status !== "Removed");
}

export async function addCloudCoordinator(coord: any): Promise<any> {
  try {
    await setDoc(doc(db, "coordinators", coord.id), coord);
  } catch (err) {
    console.error("Firestore addCloudCoordinator error:", err);
  }
  const local = loadLocalJson<any[]>("coordinators.json", []);
  local.push(coord);
  saveLocalJson("coordinators.json", local);
  return coord;
}

export async function updateCloudCoordinator(id: string, updates: any): Promise<any> {
  let updatedDoc: any = null;
  try {
    await setDoc(doc(db, "coordinators", id), updates, { merge: true });
    const snap = await getDoc(doc(db, "coordinators", id));
    if (snap.exists()) updatedDoc = snap.data();
  } catch (err) {
    console.error("Firestore updateCloudCoordinator error:", err);
  }
  const local = loadLocalJson<any[]>("coordinators.json", []);
  const idx = local.findIndex((c) => c.id === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...updates };
    saveLocalJson("coordinators.json", local);
    if (!updatedDoc) updatedDoc = local[idx];
  }
  return updatedDoc;
}

export async function deleteCloudCoordinator(id: string): Promise<boolean> {
  try {
    await setDoc(doc(db, "coordinators", id), { status: "Removed" }, { merge: true });
  } catch (err) {
    console.error("Firestore deleteCloudCoordinator error:", err);
  }
  const local = loadLocalJson<any[]>("coordinators.json", []);
  const idx = local.findIndex((c) => c.id === id);
  if (idx !== -1) {
    local[idx].status = "Removed";
    saveLocalJson("coordinators.json", local);
  }
  return true;
}

// ----------------- Sectors Operations -----------------

export async function getCloudSectors(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, "sectors"));
    if (!snap.empty) {
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      saveLocalJson("sectors.json", list);
      return list;
    }
  } catch (err) {
    console.error("Firestore getCloudSectors error:", err);
  }
  return loadLocalJson<any[]>("sectors.json", []);
}

export async function getCloudSectorById(sectorId: string): Promise<any> {
  try {
    const snap = await getDoc(doc(db, "sectors", sectorId));
    if (snap.exists()) return snap.data();
  } catch (err) {
    console.error("Firestore getCloudSectorById error:", err);
  }
  const local = loadLocalJson<any[]>("sectors.json", []);
  return local.find((s) => s.id === sectorId) || null;
}

export async function addCloudSector(sector: any): Promise<any> {
  try {
    await setDoc(doc(db, "sectors", sector.id), sector);
  } catch (err) {
    console.error("Firestore addCloudSector error:", err);
  }
  const local = loadLocalJson<any[]>("sectors.json", []);
  local.push(sector);
  saveLocalJson("sectors.json", local);
  return sector;
}

export async function updateCloudSector(id: string, updates: any): Promise<any> {
  let updatedDoc: any = null;
  try {
    await setDoc(doc(db, "sectors", id), updates, { merge: true });
    const snap = await getDoc(doc(db, "sectors", id));
    if (snap.exists()) updatedDoc = snap.data();
  } catch (err) {
    console.error("Firestore updateCloudSector error:", err);
  }
  const local = loadLocalJson<any[]>("sectors.json", []);
  const idx = local.findIndex((s) => s.id === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...updates };
    saveLocalJson("sectors.json", local);
    if (!updatedDoc) updatedDoc = local[idx];
  }
  return updatedDoc;
}

export async function deleteCloudSector(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "sectors", id));
  } catch (err) {
    console.error("Firestore deleteCloudSector error:", err);
  }
  const local = loadLocalJson<any[]>("sectors.json", []);
  const filtered = local.filter((s) => s.id !== id);
  saveLocalJson("sectors.json", filtered);
  return true;
}

// ----------------- Works / Tasks Operations -----------------

export async function getCloudWorks(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, "works"));
    if (!snap.empty) {
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      saveLocalJson("works.json", list);
      return list;
    }
  } catch (err) {
    console.error("Firestore getCloudWorks error:", err);
  }
  return loadLocalJson<any[]>("works.json", []);
}

export async function addCloudWork(work: any): Promise<any> {
  try {
    await setDoc(doc(db, "works", work.id), work);
  } catch (err) {
    console.error("Firestore addCloudWork error:", err);
  }
  const local = loadLocalJson<any[]>("works.json", []);
  local.unshift(work);
  saveLocalJson("works.json", local);
  return work;
}

export async function updateCloudWork(id: string, updates: any): Promise<any> {
  let updatedDoc: any = null;
  try {
    await setDoc(doc(db, "works", id), updates, { merge: true });
    const snap = await getDoc(doc(db, "works", id));
    if (snap.exists()) updatedDoc = snap.data();
  } catch (err) {
    console.error("Firestore updateCloudWork error:", err);
  }
  const local = loadLocalJson<any[]>("works.json", []);
  const idx = local.findIndex((w) => w.id === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...updates, updated_at: new Date().toISOString() };
    saveLocalJson("works.json", local);
    if (!updatedDoc) updatedDoc = local[idx];
  }
  return updatedDoc;
}

export async function deleteCloudWork(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "works", id));
  } catch (err) {
    console.error("Firestore deleteCloudWork error:", err);
  }
  const local = loadLocalJson<any[]>("works.json", []);
  const filtered = local.filter((w) => w.id !== id);
  saveLocalJson("works.json", filtered);
  return true;
}

// ----------------- Resources Operations -----------------

export async function getCloudResources(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, "resources"));
    if (!snap.empty) {
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      saveLocalJson("resources.json", list);
      return list;
    }
  } catch (err) {
    console.error("Firestore getCloudResources error:", err);
  }
  return loadLocalJson<any[]>("resources.json", []);
}

export async function addCloudResource(resItem: any): Promise<any> {
  try {
    await setDoc(doc(db, "resources", resItem.id), resItem);
  } catch (err) {
    console.error("Firestore addCloudResource error:", err);
  }
  const local = loadLocalJson<any[]>("resources.json", []);
  local.unshift(resItem);
  saveLocalJson("resources.json", local);
  return resItem;
}

export async function updateCloudResource(id: string, updates: any): Promise<any> {
  let updatedDoc: any = null;
  try {
    await setDoc(doc(db, "resources", id), updates, { merge: true });
    const snap = await getDoc(doc(db, "resources", id));
    if (snap.exists()) updatedDoc = snap.data();
  } catch (err) {
    console.error("Firestore updateCloudResource error:", err);
  }
  const local = loadLocalJson<any[]>("resources.json", []);
  const idx = local.findIndex((r) => r.id === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...updates };
    saveLocalJson("resources.json", local);
    if (!updatedDoc) updatedDoc = local[idx];
  }
  return updatedDoc;
}

export async function deleteCloudResource(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "resources", id));
  } catch (err) {
    console.error("Firestore deleteCloudResource error:", err);
  }
  const local = loadLocalJson<any[]>("resources.json", []);
  const filtered = local.filter((r) => r.id !== id);
  saveLocalJson("resources.json", filtered);
  return true;
}

// ----------------- Activities Operations -----------------

export async function getCloudActivities(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, "activities"));
    if (!snap.empty) {
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      list.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
      saveLocalJson("activities.json", list.slice(0, 50));
      return list;
    }
  } catch (err) {
    console.error("Firestore getCloudActivities error:", err);
  }
  return loadLocalJson<any[]>("activities.json", []);
}

export async function logCloudActivity(
  userName: string,
  role: string,
  action: string,
  target: string,
  sector = "General"
): Promise<any> {
  const newAct = {
    id: `act-${Math.random().toString(36).substring(2, 10)}`,
    user_name: userName,
    role,
    action,
    target,
    sector,
    timestamp: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, "activities", newAct.id), newAct);
  } catch (err) {
    console.error("Firestore logCloudActivity error:", err);
  }

  const local = loadLocalJson<any[]>("activities.json", []);
  local.unshift(newAct);
  saveLocalJson("activities.json", local.slice(0, 50));
  return newAct;
}
