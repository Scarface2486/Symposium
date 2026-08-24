# SympoFlow – Symposium Coordinator Management Portal

**Institution:** Sir Issac Newton College of Engineering and Technology  
**Symposium:** XENO 2026 – National Level Technical Symposium  
**Tech Stack:** Python 3, Flask, HTML5, CSS3, Vanilla JavaScript (Zero external frontend frameworks)

---

## 🌟 Executive Summary

**SympoFlow** is a centralized, production-grade symposium management system engineered for **Sir Issac Newton College of Engineering and Technology**. It streamlines the coordination of administrative conveners, faculty staff in-charges, student sector leads, tasks, schedules, contact channels, and official symposium publications.

---

## 🎯 Architecture & Tech Stack

- **Backend:** Python Flask with session authentication and SHA-256 password hashing.
- **Frontend:** Pure Semantic HTML5, Custom Design System CSS3, and Modular Vanilla JavaScript (`fetch` API).
- **Data Layer:** Flat-file JSON persistence engine (`data/*.json`) with automated activity logging.
- **File Storage:** Local uploads repository for official PDF brochures, contest guidelines, and media assets.

---

## 🚀 Key Modules & Features

### 1. Executive Dashboard
- **8 Live Core Metrics:** Total Admins, Total Staff Coordinators, Total Student Coordinators, Total Sectors, Total Works, Pending Works, In Progress Works, Completed Works.
- **Urgent Deadlines & Activity Stream:** Real-time chronological audit trail and pending countdowns.
- **Sector Performance Summary:** Completion progress bars for every functional committee.

### 2. Coordinator Directory & Hierarchy
- **Three-Tier Role Architecture:** Admin (Conveners), Staff Coordinator (Faculty In-Charges), Student Coordinator (Department & Sector Organizers).
- **Filter & Search Engine:** Instant keyword filtering across names, register IDs, departments, phone numbers, and sectors.
- **Safe Soft-Delete:** Multi-step confirmation dialog safeguarding contact histories and past records.

### 3. Sector & Committee Management
- **Pre-Configured Sectors:** Technical, Food & Refreshments, Stage & Audio/Visual, Reception & Hospitality, Media & Design, Certificate & Memento, Discipline & Transport.
- **Sector Drilldown Views:** Detailed breakdown of Staff In-Charge, Student Members, and Sector-specific tasks.

### 4. Work & Task Delegation Engine
- **Dynamic Sector-to-Coordinator Filtering:** Selecting a sector dynamically filters and populates *only* coordinators belonging to that sector, completely preventing accidental cross-sector misassignment.
- **Priority Matrix:** Critical, High, Medium, Low.
- **Lifecycle Tracking:** Pending ➔ In Progress ➔ Completed with completion notes.

### 5. "My Works" Personalized Portal
- Dedicated interface for the logged-in coordinator displaying their own tasks, due dates, and quick status toggles.

### 6. Centralized Contact Directory
- Instant direct action triggers:
  - 📞 **Direct Call** (`tel:`)
  - ✉️ **Direct Email** (`mailto:`)
  - 📋 **Copy Phone Number** (Clipboard with Toast)
  - 📋 **Copy Email Address** (Clipboard with Toast)

### 7. Official Resources & Registration Hub
- Official PDF Brochure download and interactive viewer.
- Participant Registration Link manager with "Register Now ↗" portal redirection.
- Central repository for Google Forms, scheduling spreadsheets, and contest rules.

---

## 🔑 Demo Access Credentials

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Admin Convener** | Dr. R. Sundaram | `admin@sincet.edu.in` | `admin123` |
| **Staff In-Charge (Stage)** | Dr. M. Kavitha | `kavitha.ece@sincet.edu.in` | `staff123` |
| **Technical Student Lead** | Anand Kumar | `anand.cse@sincet.edu.in` | `student123` |
| **Food Committee Lead** | Ramesh V | `ramesh.mech@sincet.edu.in` | `student123` |

---

## ⚙️ Running Locally with Python / Flask

```bash
# Install dependencies
pip install -r requirements.txt

# Launch Flask application
python app.py
```

Portal will be live at `http://localhost:3000`.
