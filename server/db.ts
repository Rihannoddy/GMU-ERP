import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'smartcampus.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'faculty', 'student')),
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    head_name TEXT NOT NULL,
    building TEXT NOT NULL,
    description TEXT NOT NULL,
    established_year INTEGER NOT NULL DEFAULT 2010
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    credits INTEGER NOT NULL DEFAULT 160,
    duration_semesters INTEGER NOT NULL DEFAULT 8,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS faculty (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    employee_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    designation TEXT NOT NULL,
    specialization TEXT NOT NULL,
    office_room TEXT NOT NULL,
    weekly_hours INTEGER NOT NULL DEFAULT 16,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'on_leave', 'inactive')),
    avatar_url TEXT,
    joined_date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    credits INTEGER NOT NULL DEFAULT 4,
    faculty_id INTEGER REFERENCES faculty(id) ON DELETE SET NULL,
    schedule_slot TEXT NOT NULL DEFAULT 'Mon/Wed 10:00 AM'
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    usn TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    semester INTEGER NOT NULL,
    academic_year TEXT NOT NULL DEFAULT '2026-27',
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'graduated')),
    avatar_url TEXT,
    address TEXT NOT NULL DEFAULT '',
    guardian_name TEXT NOT NULL DEFAULT '',
    guardian_phone TEXT NOT NULL DEFAULT '',
    enrolled_date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late')),
    marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    remarks TEXT DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, subject_id, date)
  );

  CREATE TABLE IF NOT EXISTS marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    semester INTEGER NOT NULL,
    internal_1 REAL NOT NULL DEFAULT 0,
    internal_2 REAL NOT NULL DEFAULT 0,
    assignment_score REAL NOT NULL DEFAULT 0,
    external_score REAL NOT NULL DEFAULT 0,
    total_marks REAL NOT NULL DEFAULT 0,
    max_marks REAL NOT NULL DEFAULT 100,
    grade TEXT NOT NULL DEFAULT 'B',
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(student_id, subject_id)
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    faculty_id INTEGER REFERENCES faculty(id) ON DELETE SET NULL,
    due_date TEXT NOT NULL,
    max_marks INTEGER NOT NULL DEFAULT 25,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft', 'published', 'closed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    subject_name TEXT DEFAULT '',
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    sentiment TEXT NOT NULL DEFAULT 'neutral' CHECK(sentiment IN ('positive', 'neutral', 'negative')),
    sentiment_confidence REAL NOT NULL DEFAULT 0.75,
    topics_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'reviewed', 'resolved')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('Academic', 'Cultural', 'Technical', 'Sports', 'Workshops', 'Seminars')),
    description TEXT NOT NULL,
    event_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    venue TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 100,
    organizer TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS event_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'registered' CHECK(status IN ('registered', 'cancelled')),
    registered_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(event_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('Classroom', 'Laboratory', 'Seminar Hall', 'Projector', 'Computer', 'Library Resource', 'Equipment')),
    building TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'maintenance', 'retired')),
    specifications TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS resource_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    booked_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'cancelled', 'completed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL,
    target_role TEXT NOT NULL DEFAULT 'all' CHECK(target_role IN ('all', 'student', 'faculty', 'admin')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal', 'important', 'urgent')),
    author_name TEXT NOT NULL,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    link_module TEXT DEFAULT 'dashboard',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ai_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tool_type TEXT NOT NULL,
    title TEXT NOT NULL,
    subject TEXT DEFAULT '',
    topic TEXT DEFAULT '',
    content TEXT NOT NULL,
    model_mode TEXT NOT NULL DEFAULT 'demo',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT DEFAULT '',
    details TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export function logAudit(
  userId: number | null,
  actorName: string,
  actorRole: string,
  action: string,
  entityType: string,
  entityId: string | number,
  details: string
) {
  db.prepare(
    `INSERT INTO audit_logs (user_id, actor_name, actor_role, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, actorName, actorRole, action, entityType, String(entityId), details);
}

export function createNotificationForRole(
  targetRole: 'all' | 'student' | 'faculty' | 'admin',
  title: string,
  message: string,
  category: string,
  linkModule: string
) {
  const users =
    targetRole === 'all'
      ? (db.prepare(`SELECT id FROM users WHERE status = 'active'`).all() as { id: number }[])
      : (db.prepare(`SELECT id FROM users WHERE role = ? AND status = 'active'`).all(targetRole) as { id: number }[]);

  const stmt = db.prepare(
    `INSERT INTO notifications (user_id, title, message, category, link_module) VALUES (?, ?, ?, ?, ?)`
  );
  const insertMany = db.transaction((rows: { id: number }[]) => {
    for (const u of rows) {
      stmt.run(u.id, title, message, category, linkModule);
    }
  });
  insertMany(users);
}

export default db;
