"""
Symposium – Symposium Coordinator Management Portal
Sir Issac Newton College of Engineering and Technology
Flask Backend Application
"""

import os
import json
import uuid
from datetime import datetime
from flask import (
    Flask, render_template, request, jsonify,
    send_from_directory
)
from werkzeug.utils import secure_filename

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx', 'txt'}

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'sincet-Symposium-secret-key-2026-prod')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max

# ----------------- Helper Functions -----------------

def load_json(filename, default=None):
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return default if default is not None else []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        return default if default is not None else []

def save_json(filename, data):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def log_activity(user_name, role, action, target, sector="General"):
    activities = load_json('activities.json', [])
    new_act = {
        "id": f"act-{uuid.uuid4().hex[:8]}",
        "user_name": user_name,
        "role": role,
        "action": action,
        "target": target,
        "sector": sector,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    activities.insert(0, new_act)
    # Keep last 50 activities
    save_json('activities.json', activities[:50])

# ----------------- Page Routes -----------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('index.html')

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ----------------- Auth API -----------------

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    # Authentication is intentionally disabled for this project.
    return jsonify({
        "authenticated": True,
        "user": {
            "id": "public-user",
            "coordinator_id": None,
            "name": "Symposium Coordinator",
            "email": "",
            "role": "Admin",
            "department": "",
            "sector_id": "all"
        }
    })

@app.route('/api/auth/login', methods=['POST'])
def login():
    # Authentication is intentionally disabled.
    return jsonify({
        "success": True,
        "message": "Authentication is disabled. The portal is open.",
        "user": {
            "id": "public-user",
            "coordinator_id": None,
            "name": "Symposium Coordinator",
            "email": "",
            "role": "Admin",
            "department": "",
            "sector_id": "all"
        }
    })


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    return jsonify({"success": True, "message": "Authentication is disabled."})


@app.route('/api/auth/change-password', methods=['POST'])
def change_password():
    return jsonify({
        "success": True,
        "message": "Password management is disabled because authentication is disabled."
    })


# ----------------- Dashboard & Stats API -----------------

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    coordinators = load_json('coordinators.json', [])
    sectors = load_json('sectors.json', [])
    works = load_json('works.json', [])
    activities = load_json('activities.json', [])

    active_coords = [c for c in coordinators if c.get('status') != 'Removed']
    total_admins = len([c for c in active_coords if c.get('role') == 'Admin'])
    total_staff = len([c for c in active_coords if c.get('role') == 'Staff Coordinator'])
    total_students = len([c for c in active_coords if c.get('role') == 'Student Coordinator'])
    
    total_works = len(works)
    pending_works = len([w for w in works if w.get('status') == 'Pending'])
    in_progress_works = len([w for w in works if w.get('status') == 'In Progress'])
    completed_works = len([w for w in works if w.get('status') == 'Completed'])

    # Sector summary
    sector_summary = []
    for sec in sectors:
        sec_works = [w for w in works if w.get('sector_id') == sec['id']]
        sec_coords = [c for c in active_coords if c.get('sector_id') == sec['id']]
        sec_staff = [c for c in sec_coords if c.get('role') == 'Staff Coordinator']
        sec_students = [c for c in sec_coords if c.get('role') == 'Student Coordinator']
        
        c_completed = len([w for w in sec_works if w.get('status') == 'Completed'])
        c_pending = len([w for w in sec_works if w.get('status') == 'Pending'])
        c_in_progress = len([w for w in sec_works if w.get('status') == 'In Progress'])

        sector_summary.append({
            "id": sec['id'],
            "name": sec['name'],
            "color": sec.get('color', '#4f46e5'),
            "icon": sec.get('icon', 'folder'),
            "staff_coordinator": sec_staff[0]['name'] if sec_staff else sec.get('staff_coordinator_name', 'Not Assigned'),
            "student_count": len(sec_students),
            "total_works": len(sec_works),
            "completed_works": c_completed,
            "pending_works": c_pending,
            "in_progress_works": c_in_progress
        })

    # Upcoming deadlines (sorted)
    pending_and_progress = [w for w in works if w.get('status') != 'Completed']
    pending_and_progress.sort(key=lambda x: x.get('deadline', '9999-12-31'))

    return jsonify({
        "metrics": {
            "total_admins": total_admins,
            "total_staff": total_staff,
            "total_students": total_students,
            "total_sectors": len(sectors),
            "total_works": total_works,
            "pending_works": pending_works,
            "in_progress_works": in_progress_works,
            "completed_works": completed_works
        },
        "recent_activities": activities[:10],
        "upcoming_deadlines": pending_and_progress[:6],
        "sector_summary": sector_summary
    })

# ----------------- Coordinators API -----------------

@app.route('/api/coordinators', methods=['GET'])
def get_coordinators():
    coordinators = load_json('coordinators.json', [])
    # Return non-removed coordinators
    active = [c for c in coordinators if c.get('status') != 'Removed']
    return jsonify(active)

@app.route('/api/coordinators', methods=['POST'])
def add_coordinator():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    role = data.get('role', 'Student Coordinator')
    department = data.get('department', '').strip()
    id_number = data.get('id_number', '').strip()
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip().lower()
    sector_id = data.get('sector_id', '')
    sector_name = data.get('sector', '').strip()
    status = data.get('status', 'Active')

    if not name or not email or not phone:
        return jsonify({"error": "Name, email, and phone number are required"}), 400

    coordinators = load_json('coordinators.json', [])
    sectors = load_json('sectors.json', [])

    # Check duplicate email
    if any(c.get('email', '').lower() == email and c.get('status') != 'Removed' for c in coordinators):
        return jsonify({"error": "A coordinator with this email already exists"}), 400

    if sector_id and not sector_name:
        sec = next((s for s in sectors if s['id'] == sector_id), None)
        if sec:
            sector_name = sec['name']

    # Auto avatar color
    colors = ['#4f46e5', '#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1', '#0284c7']
    avatar_color = colors[len(coordinators) % len(colors)]

    new_id = f"coord-{uuid.uuid4().hex[:6]}"
    new_coord = {
        "id": new_id,
        "name": name,
        "role": role,
        "department": department,
        "id_number": id_number,
        "phone": phone,
        "email": email,
        "sector": sector_name or "General",
        "sector_id": sector_id or "all",
        "status": status,
        "avatar_color": avatar_color,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }

    coordinators.append(new_coord)
    save_json('coordinators.json', coordinators)

    # Also create user credentials if not present
    users = load_json('users.json', [])
    if not any(u.get('email', '').lower() == email for u in users):
        default_pwd = 'staff123' if role == 'Staff Coordinator' else ('admin123' if role == 'Admin' else 'student123')
        users.append({
            "id": f"usr-{uuid.uuid4().hex[:6]}",
            "coordinator_id": new_id,
            "email": email,
            "password_hash": hash_password(default_pwd),
            "plain_hint": default_pwd,
            "role": role,
            "name": name,
            "department": department,
            "sector_id": sector_id or "all"
        })
        save_json('users.json', users)

    log_activity('Symposium Coordinator', "Admin", f"Added coordinator {name}", f"Role: {role}", sector_name)

    return jsonify({"success": True, "coordinator": new_coord, "message": "Coordinator added successfully"})

@app.route('/api/coordinators/<coord_id>', methods=['PUT'])
def update_coordinator(coord_id):
    data = request.get_json() or {}
    coordinators = load_json('coordinators.json', [])
    coord = next((c for c in coordinators if c['id'] == coord_id), None)

    if not coord:
        return jsonify({"error": "Coordinator not found"}), 404

    sectors = load_json('sectors.json', [])
    sector_id = data.get('sector_id', coord.get('sector_id'))
    sector_name = data.get('sector', coord.get('sector'))

    if sector_id and sector_id != coord.get('sector_id'):
        sec = next((s for s in sectors if s['id'] == sector_id), None)
        if sec:
            sector_name = sec['name']

    coord['name'] = data.get('name', coord['name']).strip()
    coord['role'] = data.get('role', coord['role'])
    coord['department'] = data.get('department', coord.get('department', '')).strip()
    coord['id_number'] = data.get('id_number', coord.get('id_number', '')).strip()
    coord['phone'] = data.get('phone', coord.get('phone', '')).strip()
    coord['email'] = data.get('email', coord['email']).strip().lower()
    coord['sector'] = sector_name
    coord['sector_id'] = sector_id
    coord['status'] = data.get('status', coord.get('status', 'Active'))
    coord['updated_at'] = datetime.utcnow().isoformat() + "Z"

    save_json('coordinators.json', coordinators)

    # Sync with users.json
    users = load_json('users.json', [])
    user = next((u for u in users if u.get('coordinator_id') == coord_id or u.get('email', '').lower() == coord['email']), None)
    if user:
        user['name'] = coord['name']
        user['role'] = coord['role']
        user['department'] = coord['department']
        user['sector_id'] = coord['sector_id']
        save_json('users.json', users)

    log_activity('Symposium Coordinator', "Admin", f"Updated coordinator details for {coord['name']}", f"Role: {coord['role']}", coord['sector'])

    return jsonify({"success": True, "coordinator": coord, "message": "Coordinator updated successfully"})

@app.route('/api/coordinators/<coord_id>', methods=['DELETE'])
def remove_coordinator(coord_id):
    coordinators = load_json('coordinators.json', [])
    coord = next((c for c in coordinators if c['id'] == coord_id), None)

    if not coord:
        return jsonify({"error": "Coordinator not found"}), 404

    # Do not permanently delete immediately - mark as Removed for safety
    coord['status'] = 'Removed'
    coord['removed_at'] = datetime.utcnow().isoformat() + "Z"
    save_json('coordinators.json', coordinators)

    log_activity('Symposium Coordinator', "Admin", f"Removed coordinator {coord['name']}", f"Role: {coord['role']}", coord.get('sector'))

    return jsonify({"success": True, "message": f"Coordinator {coord['name']} has been removed safely."})

# ----------------- Sectors API -----------------

@app.route('/api/sectors', methods=['GET'])
def get_sectors():
    sectors = load_json('sectors.json', [])
    coordinators = load_json('coordinators.json', [])
    works = load_json('works.json', [])

    active_coords = [c for c in coordinators if c.get('status') != 'Removed']

    results = []
    for s in sectors:
        s_coords = [c for c in active_coords if c.get('sector_id') == s['id']]
        staff = [c for c in s_coords if c.get('role') == 'Staff Coordinator']
        students = [c for c in s_coords if c.get('role') == 'Student Coordinator']
        s_works = [w for w in works if w.get('sector_id') == s['id']]

        results.append({
            **s,
            "staff_coordinator_name": staff[0]['name'] if staff else s.get('staff_coordinator_name', 'Not Assigned'),
            "staff_coordinator": staff[0] if staff else None,
            "student_coordinators": students,
            "student_count": len(students),
            "total_works": len(s_works),
            "completed_works": len([w for w in s_works if w.get('status') == 'Completed']),
            "pending_works": len([w for w in s_works if w.get('status') == 'Pending']),
            "in_progress_works": len([w for w in s_works if w.get('status') == 'In Progress']),
            "works": s_works
        })

    return jsonify(results)

@app.route('/api/sectors/<sector_id>', methods=['GET'])
def get_sector_detail(sector_id):
    sectors = load_json('sectors.json', [])
    coordinators = load_json('coordinators.json', [])
    works = load_json('works.json', [])

    sec = next((s for s in sectors if s['id'] == sector_id or s.get('slug') == sector_id), None)
    if not sec:
        return jsonify({"error": "Sector not found"}), 404

    active_coords = [c for c in coordinators if c.get('status') != 'Removed']
    s_coords = [c for c in active_coords if c.get('sector_id') == sec['id']]
    staff = [c for c in s_coords if c.get('role') == 'Staff Coordinator']
    students = [c for c in s_coords if c.get('role') == 'Student Coordinator']
    s_works = [w for w in works if w.get('sector_id') == sec['id']]

    # Sort works by deadline
    s_works.sort(key=lambda x: x.get('deadline', '9999-12-31'))

    return jsonify({
        **sec,
        "staff_coordinator": staff[0] if staff else None,
        "staff_coordinators": staff,
        "student_coordinators": students,
        "works": s_works,
        "metrics": {
            "total_works": len(s_works),
            "completed": len([w for w in s_works if w.get('status') == 'Completed']),
            "pending": len([w for w in s_works if w.get('status') == 'Pending']),
            "in_progress": len([w for w in s_works if w.get('status') == 'In Progress'])
        }
    })

@app.route('/api/sectors', methods=['POST'])
def add_sector():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    color = data.get('color', '#3b82f6')
    icon = data.get('icon', 'folder')
    staff_coordinator_id = data.get('staff_coordinator_id', '')

    if not name:
        return jsonify({"error": "Sector name is required"}), 400

    sectors = load_json('sectors.json', [])
    coordinators = load_json('coordinators.json', [])

    staff_name = "Not Assigned"
    if staff_coordinator_id:
        st = next((c for c in coordinators if c['id'] == staff_coordinator_id), None)
        if st:
            staff_name = st['name']

    new_id = f"sec-{uuid.uuid4().hex[:6]}"
    slug = name.lower().replace("coordinator", "").replace("coordination", "").strip().replace(" ", "-")

    new_sec = {
        "id": new_id,
        "name": name,
        "slug": slug or f"sector-{len(sectors)+1}",
        "description": description,
        "color": color,
        "icon": icon,
        "staff_coordinator_id": staff_coordinator_id,
        "staff_coordinator_name": staff_name,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }

    sectors.append(new_sec)
    save_json('sectors.json', sectors)

    log_activity('Symposium Coordinator', "Admin", f"Created new sector: {name}", "Sector Management", name)

    return jsonify({"success": True, "sector": new_sec, "message": "Sector added successfully"})

@app.route('/api/sectors/<sector_id>', methods=['PUT'])
def update_sector(sector_id):
    data = request.get_json() or {}
    sectors = load_json('sectors.json', [])
    sec = next((s for s in sectors if s['id'] == sector_id), None)

    if not sec:
        return jsonify({"error": "Sector not found"}), 404

    coordinators = load_json('coordinators.json', [])
    staff_id = data.get('staff_coordinator_id', sec.get('staff_coordinator_id'))
    staff_name = sec.get('staff_coordinator_name', 'Not Assigned')

    if staff_id:
        st = next((c for c in coordinators if c['id'] == staff_id), None)
        if st:
            staff_name = st['name']
            # update coordinator's sector
            st['sector_id'] = sector_id
            st['sector'] = data.get('name', sec['name'])
            save_json('coordinators.json', coordinators)

    sec['name'] = data.get('name', sec['name']).strip()
    sec['description'] = data.get('description', sec.get('description', '')).strip()
    sec['color'] = data.get('color', sec.get('color', '#3b82f6'))
    sec['icon'] = data.get('icon', sec.get('icon', 'folder'))
    sec['staff_coordinator_id'] = staff_id
    sec['staff_coordinator_name'] = staff_name

    save_json('sectors.json', sectors)

    log_activity('Symposium Coordinator', "Admin", f"Updated sector {sec['name']}", "Sector Management", sec['name'])

    return jsonify({"success": True, "sector": sec, "message": "Sector updated successfully"})

@app.route('/api/sectors/<sector_id>', methods=['DELETE'])
def delete_sector(sector_id):
    sectors = load_json('sectors.json', [])
    sec = next((s for s in sectors if s['id'] == sector_id), None)

    if not sec:
        return jsonify({"error": "Sector not found"}), 404

    sectors = [s for s in sectors if s['id'] != sector_id]
    save_json('sectors.json', sectors)

    log_activity('Symposium Coordinator', "Admin", f"Removed sector {sec['name']}", "Sector Management", sec['name'])

    return jsonify({"success": True, "message": f"Sector {sec['name']} deleted successfully"})

# ----------------- Works Management API -----------------

@app.route('/api/works', methods=['GET'])
def get_works():
    works = load_json('works.json', [])
    sector_id = request.args.get('sector_id')
    status = request.args.get('status')
    priority = request.args.get('priority')
    assigned_to = request.args.get('assigned_to')

    filtered = works
    if sector_id:
        filtered = [w for w in filtered if w.get('sector_id') == sector_id]
    if status:
        filtered = [w for w in filtered if w.get('status') == status]
    if priority:
        filtered = [w for w in filtered if w.get('priority') == priority]
    if assigned_to:
        filtered = [w for w in filtered if w.get('assigned_to_id') == assigned_to]

    # Sort by deadline
    filtered.sort(key=lambda x: x.get('deadline', '9999-12-31'))
    return jsonify(filtered)

@app.route('/api/works/my-works', methods=['GET'])
def get_my_works():
    # Authentication is disabled, so there is no individual user context.
    # Return all works for compatibility with the existing frontend.
    works = load_json('works.json', [])
    works.sort(key=lambda x: x.get('deadline', '9999-12-31'))
    return jsonify(works)

@app.route('/api/works', methods=['POST'])
def add_work():
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    sector_id = data.get('sector_id', '').strip()
    assigned_to_id = data.get('assigned_to_id', '').strip()
    start_date = data.get('start_date', datetime.utcnow().strftime('%Y-%m-%d'))
    deadline = data.get('deadline', '').strip()
    priority = data.get('priority', 'Medium')
    status = data.get('status', 'Pending')

    if not title or not sector_id or not assigned_to_id or not deadline:
        return jsonify({"error": "Title, Sector, Assigned Coordinator, and Deadline are required"}), 400

    sectors = load_json('sectors.json', [])
    coordinators = load_json('coordinators.json', [])

    sec = next((s for s in sectors if s['id'] == sector_id), None)
    coord = next((c for c in coordinators if c['id'] == assigned_to_id and c.get('status') != 'Removed'), None)

    if not sec:
        return jsonify({"error": "Selected sector is invalid"}), 400
    if not coord:
        return jsonify({"error": "Selected coordinator is invalid"}), 400

    # Validate that coordinator belongs to this sector or is Admin
    if coord.get('sector_id') != 'all' and coord.get('sector_id') != sector_id:
        return jsonify({"error": f"{coord['name']} does not belong to {sec['name']}"}), 400

    new_id = f"work-{uuid.uuid4().hex[:6]}"
    new_work = {
        "id": new_id,
        "title": title,
        "description": description,
        "sector_id": sector_id,
        "sector_name": sec['name'],
        "assigned_to_id": assigned_to_id,
        "assigned_to_name": coord['name'],
        "assigned_to_role": coord.get('role', 'Student Coordinator'),
        "created_by": "Symposium Coordinator",
        "start_date": start_date,
        "deadline": deadline,
        "priority": priority,
        "status": status,
        "completion_notes": "",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z"
    }

    works = load_json('works.json', [])
    works.append(new_work)
    save_json('works.json', works)

    log_activity(
        'Symposium Coordinator',
        'Admin',
        f"Assigned work '{title}' to {coord['name']}",
        f"Priority: {priority} | Due: {deadline}",
        sec['name']
    )

    return jsonify({"success": True, "work": new_work, "message": "Work created and assigned successfully"})

@app.route('/api/works/<work_id>', methods=['PUT'])
def update_work(work_id):
    data = request.get_json() or {}
    works = load_json('works.json', [])
    work = next((w for w in works if w['id'] == work_id), None)

    if not work:
        return jsonify({"error": "Work task not found"}), 404

    # Staff or Admin can edit full work details
    coordinators = load_json('coordinators.json', [])
    sectors = load_json('sectors.json', [])

    if 'sector_id' in data and data['sector_id'] != work['sector_id']:
        sec = next((s for s in sectors if s['id'] == data['sector_id']), None)
        if sec:
            work['sector_id'] = sec['id']
            work['sector_name'] = sec['name']

    if 'assigned_to_id' in data and data['assigned_to_id'] != work['assigned_to_id']:
        coord = next((c for c in coordinators if c['id'] == data['assigned_to_id']), None)
        if coord:
            work['assigned_to_id'] = coord['id']
            work['assigned_to_name'] = coord['name']
            work['assigned_to_role'] = coord.get('role', 'Student Coordinator')

    work['title'] = data.get('title', work['title']).strip()
    work['description'] = data.get('description', work.get('description', '')).strip()
    work['start_date'] = data.get('start_date', work.get('start_date'))
    work['deadline'] = data.get('deadline', work.get('deadline'))
    work['priority'] = data.get('priority', work.get('priority', 'Medium'))
    work['status'] = data.get('status', work.get('status', 'Pending'))
    if 'completion_notes' in data:
        work['completion_notes'] = data.get('completion_notes', '')
    work['updated_at'] = datetime.utcnow().isoformat() + "Z"

    save_json('works.json', works)

    log_activity('Symposium Coordinator', 'Admin', f"Updated work '{work['title']}'", f"Assigned: {work['assigned_to_name']}", work.get('sector_name'))

    return jsonify({"success": True, "work": work, "message": "Work updated successfully"})

@app.route('/api/works/<work_id>/status', methods=['PATCH', 'POST'])
def quick_status_update(work_id):
    data = request.get_json() or {}
    new_status = data.get('status')
    notes = data.get('completion_notes', '')

    if new_status not in ['Pending', 'In Progress', 'Completed']:
        return jsonify({"error": "Invalid status value"}), 400

    works = load_json('works.json', [])
    work = next((w for w in works if w['id'] == work_id), None)

    if not work:
        return jsonify({"error": "Work not found"}), 404

    work['status'] = new_status
    if notes:
        work['completion_notes'] = notes
    work['updated_at'] = datetime.utcnow().isoformat() + "Z"
    save_json('works.json', works)

    log_activity('Symposium Coordinator', 'Admin', f"Marked as {new_status}:", work['title'], work.get('sector_name'))

    return jsonify({"success": True, "work": work, "message": f"Status changed to {new_status}"})

@app.route('/api/works/<work_id>', methods=['DELETE'])
def delete_work(work_id):
    works = load_json('works.json', [])
    work = next((w for w in works if w['id'] == work_id), None)

    if not work:
        return jsonify({"error": "Work not found"}), 404

    works = [w for w in works if w['id'] != work_id]
    save_json('works.json', works)

    log_activity('Symposium Coordinator', 'Admin', f"Deleted work:", work['title'], work.get('sector_name'))

    return jsonify({"success": True, "message": f"Work '{work['title']}' removed successfully"})

# ----------------- Resources & Brochure API -----------------

@app.route('/api/resources', methods=['GET'])
def get_resources():
    resources = load_json('resources.json', [])
    return jsonify(resources)

@app.route('/api/resources', methods=['POST'])
def add_resource():
    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    res_type = request.form.get('type', 'Important Document')
    external_url = request.form.get('external_url', '').strip()
    is_brochure = request.form.get('is_brochure', 'false').lower() == 'true'

    file_url = ""
    file_size = "External Link"

    if 'file' in request.files:
        file = request.files['file']
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            unique_name = f"{uuid.uuid4().hex[:8]}_{filename}"
            save_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
            file.save(save_path)
            file_url = f"/uploads/{unique_name}"
            size_bytes = os.path.getsize(save_path)
            file_size = f"{round(size_bytes / 1024, 1)} KB" if size_bytes < 1024*1024 else f"{round(size_bytes / (1024*1024), 2)} MB"

    if not title:
        return jsonify({"error": "Resource title is required"}), 400

    if not file_url and not external_url:
        return jsonify({"error": "Either upload a file or provide an external link"}), 400

    resources = load_json('resources.json', [])
    new_res = {
        "id": f"res-{uuid.uuid4().hex[:6]}",
        "title": title,
        "description": description,
        "type": res_type,
        "file_url": file_url,
        "external_url": external_url,
        "is_brochure": is_brochure,
        "size": file_size,
        "uploaded_by": 'Symposium Coordinator',
        "created_at": datetime.utcnow().isoformat() + "Z"
    }

    if is_brochure:
        for r in resources:
            r['is_brochure'] = False
        # Update settings.json brochure
        settings = load_json('settings.json', {})
        settings['brochure_title'] = title
        if file_url:
            settings['brochure_file'] = file_url
        save_json('settings.json', settings)

    resources.insert(0, new_res)
    save_json('resources.json', resources)

    log_activity('Symposium Coordinator', "Admin", f"Added resource: {title}", f"Type: {res_type}", "Resources")

    return jsonify({"success": True, "resource": new_res, "message": "Resource added successfully"})

@app.route('/api/resources/brochure', methods=['POST'])
def upload_brochure():
    title = request.form.get('title', 'XENO \'26 Official Event Brochure & Schedule').strip()
    
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file format. Please upload PDF, PNG or JPG."}), 400

    filename = secure_filename(file.filename)
    unique_name = f"brochure_{uuid.uuid4().hex[:6]}_{filename}"
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
    file.save(save_path)
    file_url = f"/uploads/{unique_name}"
    size_bytes = os.path.getsize(save_path)
    file_size = f"{round(size_bytes / 1024, 1)} KB" if size_bytes < 1024*1024 else f"{round(size_bytes / (1024*1024), 2)} MB"

    settings = load_json('settings.json', {})
    settings['brochure_title'] = title
    settings['brochure_file'] = file_url
    save_json('settings.json', settings)

    # Update brochure in resources
    resources = load_json('resources.json', [])
    for r in resources:
        if r.get('is_brochure'):
            r['is_brochure'] = False

    brochure_res = {
        "id": f"res-brochure-{uuid.uuid4().hex[:4]}",
        "title": title,
        "description": "Official color symposium brochure with event tracks, rules, schedule, prizes, and contact numbers.",
        "type": "PDF Document",
        "file_url": file_url,
        "external_url": "",
        "is_brochure": True,
        "size": file_size,
        "uploaded_by": 'Symposium Coordinator',
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    resources.insert(0, brochure_res)
    save_json('resources.json', resources)

    log_activity('Symposium Coordinator', "Admin", "Uploaded and replaced Symposium Brochure", title, "Resources")

    return jsonify({"success": True, "brochure": brochure_res, "message": "Symposium brochure uploaded successfully"})

@app.route('/api/resources/<res_id>', methods=['DELETE'])
def delete_resource(res_id):
    resources = load_json('resources.json', [])
    res = next((r for r in resources if r['id'] == res_id), None)

    if not res:
        return jsonify({"error": "Resource not found"}), 404

    resources = [r for r in resources if r['id'] != res_id]
    save_json('resources.json', resources)

    log_activity('Symposium Coordinator', "Admin", f"Deleted resource: {res['title']}", f"Type: {res.get('type')}", "Resources")

    return jsonify({"success": True, "message": f"Resource '{res['title']}' deleted successfully"})

# ----------------- Settings & Registration Link API -----------------

@app.route('/api/settings', methods=['GET'])
def get_settings():
    settings = load_json('settings.json', {})
    return jsonify(settings)

@app.route('/api/settings', methods=['PUT', 'POST'])
def update_settings():
    data = request.get_json() or {}
    settings = load_json('settings.json', {})

    for k, v in data.items():
        settings[k] = v

    save_json('settings.json', settings)
    log_activity('Symposium Coordinator', "Admin", "Updated symposium settings and configuration", "System Settings", "Settings")

    return jsonify({"success": True, "settings": settings, "message": "Settings updated successfully"})

@app.route('/api/settings/registration', methods=['POST', 'PUT'])
def update_registration_link():
    data = request.get_json() or {}
    url = data.get('registration_url', '').strip()
    status = data.get('registration_status', 'Open')
    deadline = data.get('registration_deadline', '')

    settings = load_json('settings.json', {})
    settings['registration_url'] = url
    settings['registration_status'] = status
    if deadline:
        settings['registration_deadline'] = deadline
    save_json('settings.json', settings)

    log_activity('Symposium Coordinator', "Admin", f"Updated Registration URL ({status})", url or "None", "Registration")

    return jsonify({"success": True, "settings": settings, "message": "Registration link updated successfully"})

# ----------------- Server Start -----------------

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    print(f"Starting Symposium Flask Application on http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)