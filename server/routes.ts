import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db, { logAudit, createNotificationForRole } from './db.ts';
import {
  AuthenticatedRequest,
  loadUserById,
  requireAuth,
  requireRole,
  signToken,
} from './auth.ts';
import {
  analyzeDatasetInsightsAI,
  generateAcademicAssistance,
  generateCampusChatResponse,
  generateCareerGuidanceAI,
  generateUnifiedContent,
  getAiStatus,
} from './aiService.ts';

const router = Router();

function getSetting(key: string, fallback: string): string {
  const row = db.prepare(`SELECT value FROM system_settings WHERE key = ?`).get(key) as { value: string } | undefined;
  return row ? row.value : fallback;
}

function computeGrade(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
}

// ==========================================
// AUTHENTICATION
// ==========================================
router.post('/auth/login', (req, res) => {
  const { email, password, rememberMe } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const userRow = db
    .prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`)
    .get(String(email).trim()) as any;

  if (!userRow) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  if (userRow.status !== 'active') {
    return res.status(403).json({ error: 'This account has been deactivated. Contact the administrator.' });
  }

  const valid = bcrypt.compareSync(String(password), userRow.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const ttlMs = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const token = signToken({ userId: userRow.id, role: userRow.role, exp: Date.now() + ttlMs });
  const authUser = loadUserById(userRow.id);

  res.cookie('sc_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: ttlMs,
    path: '/',
  });

  logAudit(userRow.id, userRow.full_name, userRow.role, 'USER_LOGIN', 'auth', userRow.id, `Signed in via email`);
  return res.json({ user: authUser, token });
});

router.post('/auth/logout', (req: AuthenticatedRequest, res) => {
  res.clearCookie('sc_session', { path: '/' });
  return res.json({ ok: true });
});

router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  return res.json({ user: req.user });
});

router.post('/auth/forgot-password', (req, res) => {
  const { email } = req.body || {};
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid university email address.' });
  }
  return res.json({
    ok: true,
    message: `If an account exists for ${email}, password recovery instructions have been routed to the Campus IT Helpdesk.`,
  });
});

router.put('/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const { full_name } = req.body || {};
  if (!full_name || String(full_name).trim().length < 2) {
    return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
  }
  const cleanName = String(full_name).trim();
  db.prepare(`UPDATE users SET full_name = ? WHERE id = ?`).run(cleanName, req.user!.id);
  if (req.user!.student_id) {
    db.prepare(`UPDATE students SET full_name = ? WHERE id = ?`).run(cleanName, req.user!.student_id);
  }
  if (req.user!.faculty_id) {
    db.prepare(`UPDATE faculty SET full_name = ? WHERE id = ?`).run(cleanName, req.user!.faculty_id);
  }
  return res.json({ user: loadUserById(req.user!.id) });
});

// ==========================================
// GLOBAL SEARCH
// ==========================================
router.get('/search', requireAuth, (req: AuthenticatedRequest, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });
  const like = `%${q}%`;
  const results: Array<{ type: string; id: number; title: string; subtitle: string; module: string }> = [];

  if (req.user!.role !== 'student') {
    const students = db
      .prepare(`SELECT id, full_name, usn FROM students WHERE full_name LIKE ? OR usn LIKE ? LIMIT 5`)
      .all(like, like) as any[];
    students.forEach((s) =>
      results.push({ type: 'Student', id: s.id, title: s.full_name, subtitle: s.usn, module: 'students' })
    );
  }

  const faculty = db
    .prepare(`SELECT id, full_name, designation FROM faculty WHERE full_name LIKE ? OR specialization LIKE ? LIMIT 4`)
    .all(like, like) as any[];
  faculty.forEach((f) =>
    results.push({ type: 'Faculty', id: f.id, title: f.full_name, subtitle: f.designation, module: 'faculty' })
  );

  const courses = db
    .prepare(`SELECT id, name, code FROM courses WHERE name LIKE ? OR code LIKE ? LIMIT 4`)
    .all(like, like) as any[];
  courses.forEach((c) =>
    results.push({ type: 'Course', id: c.id, title: c.name, subtitle: c.code, module: 'academics' })
  );

  const events = db
    .prepare(`SELECT id, title, event_date FROM events WHERE title LIKE ? OR category LIKE ? LIMIT 4`)
    .all(like, like) as any[];
  events.forEach((e) =>
    results.push({ type: 'Event', id: e.id, title: e.title, subtitle: e.event_date, module: 'events' })
  );

  const resources = db
    .prepare(`SELECT id, name, code FROM resources WHERE name LIKE ? OR building LIKE ? LIMIT 4`)
    .all(like, like) as any[];
  resources.forEach((r) =>
    results.push({ type: 'Resource', id: r.id, title: r.name, subtitle: r.code, module: 'resources' })
  );

  return res.json({ results });
});

// ==========================================
// DASHBOARD (ROLE-SPECIFIC)
// ==========================================
router.get('/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
  const deptFilter = req.query.departmentId ? Number(req.query.departmentId) : null;
  const semFilter = req.query.semester ? Number(req.query.semester) : null;
  const threshold = Number(getSetting('attendance_threshold', '75'));

  const announcements = db
    .prepare(
      `SELECT * FROM announcements WHERE target_role IN ('all', ?) ORDER BY is_pinned DESC, created_at DESC LIMIT 5`
    )
    .all(req.user!.role);

  const upcomingEvents = db
    .prepare(
      `SELECT e.*, (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.status = 'registered') as registered_count
       FROM events e WHERE e.status = 'upcoming' ORDER BY e.event_date ASC LIMIT 5`
    )
    .all();

  if (req.user!.role === 'admin') {
    const stuWhere: string[] = [`status = 'active'`];
    const stuParams: any[] = [];
    if (deptFilter) {
      stuWhere.push(`department_id = ?`);
      stuParams.push(deptFilter);
    }
    if (semFilter) {
      stuWhere.push(`semester = ?`);
      stuParams.push(semFilter);
    }
    const stuWhereSql = stuWhere.join(' AND ');

    const totalStudents = (db.prepare(`SELECT COUNT(*) as c FROM students WHERE ${stuWhereSql}`).get(...stuParams) as any).c;
    const totalFaculty = (
      db
        .prepare(`SELECT COUNT(*) as c FROM faculty WHERE status = 'active' ${deptFilter ? 'AND department_id = ?' : ''}`)
        .get(...(deptFilter ? [deptFilter] : [])) as any
    ).c;
    const totalDepartments = (db.prepare(`SELECT COUNT(*) as c FROM departments`).get() as any).c;
    const totalCourses = (
      db
        .prepare(`SELECT COUNT(*) as c FROM courses ${deptFilter ? 'WHERE department_id = ?' : ''}`)
        .get(...(deptFilter ? [deptFilter] : [])) as any
    ).c;
    const upcomingEventsCount = (db.prepare(`SELECT COUNT(*) as c FROM events WHERE status = 'upcoming'`).get() as any).c;
    const pendingFeedback = (db.prepare(`SELECT COUNT(*) as c FROM feedback WHERE status = 'open'`).get() as any).c;
    const availableResources = (db.prepare(`SELECT COUNT(*) as c FROM resources WHERE status = 'available'`).get() as any).c;

    const attQuery = `
      SELECT ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) as avg_att
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE ${stuWhereSql.replace(/\b(status|department_id|semester)\b/g, 's.$1')}
    `;
    const avgAttendance = ((db.prepare(attQuery).get(...stuParams) as any)?.avg_att) ?? 0;

    const deptDistribution = db
      .prepare(
        `SELECT d.id, d.code, d.name, COUNT(s.id) as student_count
         FROM departments d
         LEFT JOIN students s ON s.department_id = d.id AND s.status = 'active'
         GROUP BY d.id
         ORDER BY student_count DESC`
      )
      .all();

    const attendanceByDate = db
      .prepare(
        `SELECT a.date,
                ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / COUNT(*), 1) as rate
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         WHERE 1=1 ${deptFilter ? 'AND s.department_id = ?' : ''}
         GROUP BY a.date
         ORDER BY a.date ASC`
      )
      .all(...(deptFilter ? [deptFilter] : []));

    const performanceByDept = db
      .prepare(
        `SELECT d.code as label, ROUND(AVG(m.total_marks), 1) as avg_score
         FROM marks m
         JOIN students s ON s.id = m.student_id
         JOIN departments d ON d.id = s.department_id
         GROUP BY d.id`
      )
      .all();

    const sentimentDist = db
      .prepare(`SELECT sentiment as label, COUNT(*) as count FROM feedback GROUP BY sentiment`)
      .all();

    const studentsAttention = db
      .prepare(
        `SELECT s.id, s.usn, s.full_name, d.code as dept_code,
                ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id),0), 1) as attendance_pct,
                ROUND(AVG(m.total_marks), 1) as avg_marks
         FROM students s
         JOIN departments d ON d.id = s.department_id
         LEFT JOIN attendance a ON a.student_id = s.id
         LEFT JOIN marks m ON m.student_id = s.id
         WHERE s.status = 'active' ${deptFilter ? 'AND s.department_id = ?' : ''}
         GROUP BY s.id
         HAVING attendance_pct < ? OR avg_marks < 60
         ORDER BY attendance_pct ASC
         LIMIT 6`
      )
      .all(...(deptFilter ? [deptFilter, threshold] : [threshold]));

    const recentActivities = db
      .prepare(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 6`)
      .all();

    const resourcesSummary = db
      .prepare(`SELECT id, name, code, type, building, capacity, status FROM resources ORDER BY id ASC LIMIT 6`)
      .all();

    const openFeedbackList = db
      .prepare(
        `SELECT f.*, d.code as dept_code FROM feedback f LEFT JOIN departments d ON d.id = f.department_id WHERE f.status = 'open' ORDER BY f.created_at DESC LIMIT 4`
      )
      .all();

    return res.json({
      role: 'admin',
      threshold,
      stats: {
        totalStudents,
        totalFaculty,
        totalDepartments,
        totalCourses,
        avgAttendance,
        upcomingEventsCount,
        pendingRequests: pendingFeedback,
        availableResources,
      },
      charts: {
        deptDistribution,
        attendanceByDate,
        performanceByDept,
        sentimentDist,
        enrollmentTrend: [
          { label: '2022-23', value: 1120 },
          { label: '2023-24', value: 1285 },
          { label: '2024-25', value: 1410 },
          { label: '2025-26', value: 1560 },
          { label: '2026-27', value: 1690 + totalStudents },
        ],
      },
      studentsAttention,
      recentActivities,
      openFeedbackList,
      resourcesSummary,
      announcements,
      upcomingEvents,
    });
  }

  if (req.user!.role === 'faculty') {
    const facId = req.user!.faculty_id;
    const assignedSubjects = db
      .prepare(
        `SELECT sub.*, d.code as dept_code, c.name as course_name
         FROM subjects sub
         JOIN departments d ON d.id = sub.department_id
         JOIN courses c ON c.id = sub.course_id
         WHERE sub.faculty_id = ?`
      )
      .all(facId);

    const subjectIds = (assignedSubjects as any[]).map((s) => s.id);
    const placeholders = subjectIds.length ? subjectIds.map(() => '?').join(',') : '-1';

    const classStudents = db
      .prepare(
        `SELECT DISTINCT s.id, s.usn, s.full_name, s.semester, d.code as dept_code,
                ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id),0), 1) as attendance_pct
         FROM students s
         JOIN departments d ON d.id = s.department_id
         JOIN subjects sub ON sub.department_id = s.department_id AND sub.semester = s.semester
         LEFT JOIN attendance a ON a.student_id = s.id AND a.subject_id = sub.id
         WHERE sub.id IN (${placeholders}) AND s.status = 'active'
         GROUP BY s.id
         ORDER BY s.usn ASC`
      )
      .all(...subjectIds);

    const assignments = db
      .prepare(
        `SELECT a.*, sub.code as subject_code, sub.name as subject_name
         FROM assignments a
         JOIN subjects sub ON sub.id = a.subject_id
         WHERE a.faculty_id = ?
         ORDER BY a.due_date ASC`
      )
      .all(facId);

    const myBookings = db
      .prepare(
        `SELECT rb.*, r.name as resource_name, r.building
         FROM resource_bookings rb
         JOIN resources r ON r.id = rb.resource_id
         WHERE rb.booked_by = ? AND rb.status = 'confirmed'
         ORDER BY rb.booking_date ASC LIMIT 5`
      )
      .all(req.user!.id);

    return res.json({
      role: 'faculty',
      threshold,
      assignedSubjects,
      classStudents,
      assignments,
      myBookings,
      announcements,
      upcomingEvents,
    });
  }

  // Student dashboard
  const student = db
    .prepare(
      `SELECT s.*, d.name as department_name, d.code as dept_code, c.name as course_name, c.code as course_code
       FROM students s
       JOIN departments d ON d.id = s.department_id
       JOIN courses c ON c.id = s.course_id
       WHERE s.id = ?`
    )
    .get(req.user!.student_id) as any;

  if (!student) {
    return res.status(404).json({ error: 'Student profile not found.' });
  }

  const subjectAttendance = db
    .prepare(
      `SELECT sub.id, sub.code, sub.name, sub.credits, sub.schedule_slot, f.full_name as faculty_name,
              COUNT(a.id) as total_classes,
              SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as attended_classes,
              ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id),0), 1) as percentage
       FROM subjects sub
       LEFT JOIN faculty f ON f.id = sub.faculty_id
       LEFT JOIN attendance a ON a.subject_id = sub.id AND a.student_id = ?
       WHERE sub.department_id = ? AND sub.semester = ?
       GROUP BY sub.id`
    )
    .all(student.id, student.department_id, student.semester);

  const marks = db
    .prepare(
      `SELECT m.*, sub.code as subject_code, sub.name as subject_name, sub.credits
       FROM marks m
       JOIN subjects sub ON sub.id = m.subject_id
       WHERE m.student_id = ?
       ORDER BY sub.code ASC`
    )
    .all(student.id);

  const assignments = db
    .prepare(
      `SELECT a.*, sub.code as subject_code, sub.name as subject_name
       FROM assignments a
       JOIN subjects sub ON sub.id = a.subject_id
       WHERE sub.department_id = ? AND sub.semester = ?
       ORDER BY a.due_date ASC`
    )
    .all(student.department_id, student.semester);

  const myRegistrations = db
    .prepare(
      `SELECT e.* FROM event_registrations er JOIN events e ON e.id = er.event_id WHERE er.user_id = ? AND er.status = 'registered'`
    )
    .all(req.user!.id);

  return res.json({
    role: 'student',
    threshold,
    student,
    subjectAttendance,
    marks,
    assignments,
    myRegistrations,
    announcements,
    upcomingEvents,
  });
});

// ==========================================
// MODULE 1: STUDENTS
// ==========================================
router.get('/students', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.user!.role === 'student') {
    const mine = db
      .prepare(
        `SELECT s.*, d.name as department_name, d.code as dept_code, c.name as course_name
         FROM students s
         JOIN departments d ON d.id = s.department_id
         JOIN courses c ON c.id = s.course_id
         WHERE s.id = ?`
      )
      .all(req.user!.student_id);
    return res.json({ students: mine });
  }

  const { search = '', departmentId = '', semester = '', status = '' } = req.query;
  const where: string[] = ['1=1'];
  const params: any[] = [];

  if (search) {
    where.push(`(s.full_name LIKE ? OR s.usn LIKE ? OR s.email LIKE ? OR d.name LIKE ? OR c.name LIKE ?)`);
    const q = `%${search}%`;
    params.push(q, q, q, q, q);
  }
  if (departmentId) {
    where.push(`s.department_id = ?`);
    params.push(Number(departmentId));
  }
  if (semester) {
    where.push(`s.semester = ?`);
    params.push(Number(semester));
  }
  if (status) {
    where.push(`s.status = ?`);
    params.push(String(status));
  }

  const students = db
    .prepare(
      `SELECT s.*, d.name as department_name, d.code as dept_code, c.name as course_name, c.code as course_code,
              COALESCE((SELECT ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) FROM attendance a WHERE a.student_id = s.id), 0) as attendance_pct,
              COALESCE((SELECT ROUND(AVG(m.total_marks), 1) FROM marks m WHERE m.student_id = s.id), 0) as avg_marks
       FROM students s
       JOIN departments d ON d.id = s.department_id
       JOIN courses c ON c.id = s.course_id
       WHERE ${where.join(' AND ')}
       ORDER BY s.usn ASC`
    )
    .all(...params);

  return res.json({ students });
});

router.get('/students/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  if (req.user!.role === 'student' && req.user!.student_id !== id) {
    return res.status(403).json({ error: 'Students can only view their own profile.' });
  }

  const student = db
    .prepare(
      `SELECT s.*, d.name as department_name, d.code as dept_code, c.name as course_name, c.code as course_code
       FROM students s
       JOIN departments d ON d.id = s.department_id
       JOIN courses c ON c.id = s.course_id
       WHERE s.id = ?`
    )
    .get(id) as any;

  if (!student) return res.status(404).json({ error: 'Student not found.' });

  const attendanceBySubject = db
    .prepare(
      `SELECT sub.code, sub.name,
              COUNT(a.id) as total_classes,
              SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as attended,
              ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id),0), 1) as percentage
       FROM subjects sub
       LEFT JOIN attendance a ON a.subject_id = sub.id AND a.student_id = ?
       WHERE sub.department_id = ? AND sub.semester = ?
       GROUP BY sub.id`
    )
    .all(id, student.department_id, student.semester);

  const attendanceHistory = db
    .prepare(
      `SELECT a.*, sub.code as subject_code, sub.name as subject_name
       FROM attendance a
       JOIN subjects sub ON sub.id = a.subject_id
       WHERE a.student_id = ?
       ORDER BY a.date DESC LIMIT 25`
    )
    .all(id);

  const marks = db
    .prepare(
      `SELECT m.*, sub.code as subject_code, sub.name as subject_name, sub.credits
       FROM marks m
       JOIN subjects sub ON sub.id = m.subject_id
       WHERE m.student_id = ?`
    )
    .all(id);

  const registrations = student.user_id
    ? db
        .prepare(
          `SELECT e.title, e.category, e.event_date, e.venue, er.registered_at
           FROM event_registrations er
           JOIN events e ON e.id = er.event_id
           WHERE er.user_id = ? AND er.status = 'registered'`
        )
        .all(student.user_id)
    : [];

  return res.json({ student, attendanceBySubject, attendanceHistory, marks, registrations });
});

router.post('/students', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const {
    usn, full_name, email, phone, department_id, course_id, semester,
    academic_year, status, address, guardian_name, guardian_phone,
  } = req.body || {};

  if (!usn || !full_name || !email || !department_id || !course_id || !semester) {
    return res.status(400).json({ error: 'USN, full name, email, department, course, and semester are required.' });
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO students (usn, full_name, email, phone, department_id, course_id, semester, academic_year, status, address, guardian_name, guardian_phone, enrolled_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))`
      )
      .run(
        String(usn).trim().toUpperCase(),
        String(full_name).trim(),
        String(email).trim().toLowerCase(),
        String(phone || '+1 (555) 400-0000').trim(),
        Number(department_id),
        Number(course_id),
        Number(semester),
        String(academic_year || '2026-27'),
        status || 'active',
        address || '',
        guardian_name || '',
        guardian_phone || ''
      );

    logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'STUDENT_CREATE', 'students', result.lastInsertRowid as number, `Created student ${full_name} (${usn})`);
    return res.status(201).json({ id: result.lastInsertRowid });
  } catch (err: any) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'A student with this USN or email already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create student record.' });
  }
});

router.put('/students/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const {
    usn, full_name, email, phone, department_id, course_id, semester,
    academic_year, status, address, guardian_name, guardian_phone,
  } = req.body || {};

  if (!usn || !full_name || !email) {
    return res.status(400).json({ error: 'USN, full name, and email are required.' });
  }

  try {
    db.prepare(
      `UPDATE students
       SET usn = ?, full_name = ?, email = ?, phone = ?, department_id = ?, course_id = ?, semester = ?,
           academic_year = ?, status = ?, address = ?, guardian_name = ?, guardian_phone = ?
       WHERE id = ?`
    ).run(
      String(usn).trim().toUpperCase(),
      String(full_name).trim(),
      String(email).trim().toLowerCase(),
      String(phone || ''),
      Number(department_id),
      Number(course_id),
      Number(semester),
      String(academic_year || '2026-27'),
      status || 'active',
      address || '',
      guardian_name || '',
      guardian_phone || '',
      id
    );
    logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'STUDENT_UPDATE', 'students', id, `Updated student ${full_name}`);
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(400).json({ error: 'Unable to update student record (check duplicate USN/email).' });
  }
});

router.delete('/students/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT full_name, usn FROM students WHERE id = ?`).get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Student not found.' });
  db.prepare(`DELETE FROM students WHERE id = ?`).run(id);
  logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'STUDENT_DELETE', 'students', id, `Removed student ${existing.full_name} (${existing.usn})`);
  return res.json({ ok: true });
});

// ==========================================
// MODULE 2: FACULTY
// ==========================================
router.get('/faculty', requireAuth, (req: AuthenticatedRequest, res) => {
  const faculty = db
    .prepare(
      `SELECT f.*, d.name as department_name, d.code as dept_code,
              (SELECT COUNT(*) FROM subjects sub WHERE sub.faculty_id = f.id) as subject_count,
              (SELECT GROUP_CONCAT(sub.code || ': ' || sub.name, ' | ') FROM subjects sub WHERE sub.faculty_id = f.id) as assigned_subjects_text
       FROM faculty f
       JOIN departments d ON d.id = f.department_id
       ORDER BY f.employee_id ASC`
    )
    .all();
  return res.json({ faculty });
});

router.post('/faculty', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const { employee_id, full_name, email, phone, department_id, designation, specialization, office_room, weekly_hours, status } = req.body || {};
  if (!employee_id || !full_name || !email || !department_id || !designation) {
    return res.status(400).json({ error: 'Employee ID, full name, email, department, and designation are required.' });
  }
  try {
    const r = db
      .prepare(
        `INSERT INTO faculty (employee_id, full_name, email, phone, department_id, designation, specialization, office_room, weekly_hours, status, joined_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))`
      )
      .run(
        String(employee_id).trim().toUpperCase(),
        String(full_name).trim(),
        String(email).trim().toLowerCase(),
        phone || '+1 (555) 234-0000',
        Number(department_id),
        String(designation).trim(),
        specialization || 'General Studies',
        office_room || 'TB-100',
        Number(weekly_hours || 16),
        status || 'active'
      );
    logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'FACULTY_CREATE', 'faculty', r.lastInsertRowid as number, `Added faculty ${full_name}`);
    return res.status(201).json({ id: r.lastInsertRowid });
  } catch {
    return res.status(409).json({ error: 'Faculty Employee ID or email already exists.' });
  }
});

router.put('/faculty/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { employee_id, full_name, email, phone, department_id, designation, specialization, office_room, weekly_hours, status } = req.body || {};
  if (!full_name || !email || !designation) {
    return res.status(400).json({ error: 'Full name, email, and designation are required.' });
  }
  db.prepare(
    `UPDATE faculty SET employee_id=?, full_name=?, email=?, phone=?, department_id=?, designation=?, specialization=?, office_room=?, weekly_hours=?, status=? WHERE id=?`
  ).run(
    String(employee_id).trim().toUpperCase(),
    String(full_name).trim(),
    String(email).trim().toLowerCase(),
    phone || '',
    Number(department_id),
    designation,
    specialization || '',
    office_room || '',
    Number(weekly_hours || 16),
    status || 'active',
    id
  );
  logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'FACULTY_UPDATE', 'faculty', id, `Updated faculty ${full_name}`);
  return res.json({ ok: true });
});

router.delete('/faculty/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare(`DELETE FROM faculty WHERE id = ?`).run(id);
  logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'FACULTY_DELETE', 'faculty', id, `Deleted faculty ID ${id}`);
  return res.json({ ok: true });
});

// ==========================================
// MODULE 3: DEPARTMENTS, COURSES, SUBJECTS
// ==========================================
router.get('/academics/overview', requireAuth, (_req, res) => {
  const departments = db
    .prepare(
      `SELECT d.*,
              (SELECT COUNT(*) FROM students s WHERE s.department_id = d.id AND s.status = 'active') as student_count,
              (SELECT COUNT(*) FROM faculty f WHERE f.department_id = d.id AND f.status = 'active') as faculty_count,
              (SELECT COUNT(*) FROM courses c WHERE c.department_id = d.id) as course_count
       FROM departments d ORDER BY d.code ASC`
    )
    .all();

  const courses = db
    .prepare(
      `SELECT c.*, d.code as dept_code, d.name as department_name,
              (SELECT COUNT(*) FROM students s WHERE s.course_id = c.id AND s.status = 'active') as enrolled_count
       FROM courses c JOIN departments d ON d.id = c.department_id ORDER BY c.code ASC`
    )
    .all();

  const subjects = db
    .prepare(
      `SELECT sub.*, d.code as dept_code, c.code as course_code, f.full_name as faculty_name
       FROM subjects sub
       JOIN departments d ON d.id = sub.department_id
       JOIN courses c ON c.id = sub.course_id
       LEFT JOIN faculty f ON f.id = sub.faculty_id
       ORDER BY sub.semester ASC, sub.code ASC`
    )
    .all();

  return res.json({ departments, courses, subjects });
});

router.post('/departments', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const { code, name, head_name, building, description, established_year } = req.body || {};
  if (!code || !name || !head_name || !building) {
    return res.status(400).json({ error: 'Code, name, department head, and building are required.' });
  }
  try {
    const r = db
      .prepare(`INSERT INTO departments (code, name, head_name, building, description, established_year) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(String(code).trim().toUpperCase(), name.trim(), head_name.trim(), building.trim(), description || '', Number(established_year || 2020));
    logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'DEPT_CREATE', 'departments', r.lastInsertRowid as number, `Created department ${code}`);
    return res.status(201).json({ id: r.lastInsertRowid });
  } catch {
    return res.status(409).json({ error: 'Department code already exists.' });
  }
});

router.put('/departments/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { code, name, head_name, building, description, established_year } = req.body || {};
  db.prepare(`UPDATE departments SET code=?, name=?, head_name=?, building=?, description=?, established_year=? WHERE id=?`)
    .run(String(code).toUpperCase(), name, head_name, building, description || '', Number(established_year || 2020), id);
  return res.json({ ok: true });
});

router.post('/courses', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const { code, name, department_id, credits, duration_semesters, description } = req.body || {};
  if (!code || !name || !department_id) {
    return res.status(400).json({ error: 'Course code, name, and department are required.' });
  }
  try {
    const r = db
      .prepare(`INSERT INTO courses (code, name, department_id, credits, duration_semesters, description) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(String(code).trim(), name.trim(), Number(department_id), Number(credits || 160), Number(duration_semesters || 8), description || '');
    return res.status(201).json({ id: r.lastInsertRowid });
  } catch {
    return res.status(409).json({ error: 'Course code already exists.' });
  }
});

router.put('/courses/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { code, name, department_id, credits, duration_semesters, description } = req.body || {};
  db.prepare(`UPDATE courses SET code=?, name=?, department_id=?, credits=?, duration_semesters=?, description=? WHERE id=?`)
    .run(code, name, Number(department_id), Number(credits), Number(duration_semesters), description || '', id);
  return res.json({ ok: true });
});

router.post('/subjects', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const { code, name, department_id, course_id, semester, credits, faculty_id, schedule_slot } = req.body || {};
  if (!code || !name || !department_id || !course_id) {
    return res.status(400).json({ error: 'Subject code, name, department, and course are required.' });
  }
  try {
    const r = db
      .prepare(`INSERT INTO subjects (code, name, department_id, course_id, semester, credits, faculty_id, schedule_slot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(String(code).toUpperCase(), name.trim(), Number(department_id), Number(course_id), Number(semester || 1), Number(credits || 4), faculty_id ? Number(faculty_id) : null, schedule_slot || 'Mon/Wed 10:00 AM');
    return res.status(201).json({ id: r.lastInsertRowid });
  } catch {
    return res.status(409).json({ error: 'Subject code already exists.' });
  }
});

router.put('/subjects/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { code, name, department_id, course_id, semester, credits, faculty_id, schedule_slot } = req.body || {};
  db.prepare(`UPDATE subjects SET code=?, name=?, department_id=?, course_id=?, semester=?, credits=?, faculty_id=?, schedule_slot=? WHERE id=?`)
    .run(String(code).toUpperCase(), name, Number(department_id), Number(course_id), Number(semester), Number(credits), faculty_id ? Number(faculty_id) : null, schedule_slot || '', id);
  return res.json({ ok: true });
});

// ==========================================
// MODULE 4: ATTENDANCE
// ==========================================
router.get('/attendance', requireAuth, (req: AuthenticatedRequest, res) => {
  const threshold = Number(getSetting('attendance_threshold', '75'));
  const { subjectId, departmentId, semester, date } = req.query;

  if (req.user!.role === 'student') {
    const sid = req.user!.student_id;
    const summary = db
      .prepare(
        `SELECT sub.id as subject_id, sub.code, sub.name,
                COUNT(a.id) as total_classes,
                SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as attended,
                ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id),0), 1) as percentage
         FROM subjects sub
         JOIN students s ON s.id = ? AND s.department_id = sub.department_id AND s.semester = sub.semester
         LEFT JOIN attendance a ON a.subject_id = sub.id AND a.student_id = s.id
         GROUP BY sub.id`
      )
      .all(sid);
    const records = db
      .prepare(
        `SELECT a.*, sub.code as subject_code, sub.name as subject_name
         FROM attendance a JOIN subjects sub ON sub.id = a.subject_id
         WHERE a.student_id = ? ORDER BY a.date DESC LIMIT 50`
      )
      .all(sid);
    return res.json({ threshold, summary, records, studentList: [] });
  }

  const where: string[] = [`s.status = 'active'`];
  const params: any[] = [];
  if (departmentId) {
    where.push(`s.department_id = ?`);
    params.push(Number(departmentId));
  }
  if (semester) {
    where.push(`s.semester = ?`);
    params.push(Number(semester));
  }

  const targetSubjectId = subjectId ? Number(subjectId) : null;
  const targetDate = date ? String(date) : '2026-11-13';

  const studentSummary = db
    .prepare(
      `SELECT s.id as student_id, s.usn, s.full_name, s.semester, d.code as dept_code,
              COUNT(a.id) as total_classes,
              SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as attended,
              COALESCE(ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id),0), 1), 0) as percentage,
              (SELECT a2.status FROM attendance a2 WHERE a2.student_id = s.id ${targetSubjectId ? 'AND a2.subject_id = ?' : ''} AND a2.date = ? LIMIT 1) as day_status
       FROM students s
       JOIN departments d ON d.id = s.department_id
       LEFT JOIN attendance a ON a.student_id = s.id ${targetSubjectId ? 'AND a.subject_id = ?' : ''}
       WHERE ${where.join(' AND ')}
       GROUP BY s.id
       ORDER BY s.usn ASC`
    )
    .all(...(targetSubjectId ? [targetSubjectId, targetDate, targetSubjectId, ...params] : [targetDate, ...params]));

  return res.json({ threshold, studentList: studentSummary, date: targetDate });
});

router.post('/attendance/mark', requireAuth, requireRole('admin', 'faculty'), (req: AuthenticatedRequest, res) => {
  const { subject_id, date, entries } = req.body || {};
  if (!subject_id || !date || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'Subject, date, and attendance entries are required.' });
  }

  if (req.user!.role === 'faculty') {
    const subj = db.prepare(`SELECT faculty_id FROM subjects WHERE id = ?`).get(Number(subject_id)) as any;
    if (subj && subj.faculty_id && subj.faculty_id !== req.user!.faculty_id) {
      return res.status(403).json({ error: 'You are only authorized to mark attendance for your assigned subjects.' });
    }
  }

  const upsert = db.prepare(
    `INSERT INTO attendance (student_id, subject_id, date, status, marked_by, remarks, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(student_id, subject_id, date) DO UPDATE SET
       status = excluded.status,
       marked_by = excluded.marked_by,
       remarks = excluded.remarks,
       updated_at = datetime('now')`
  );

  const tx = db.transaction(() => {
    for (const item of entries) {
      if (!['present', 'absent', 'late'].includes(item.status)) continue;
      upsert.run(Number(item.student_id), Number(subject_id), String(date), item.status, req.user!.id, item.remarks || '');
    }
  });
  tx();

  logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'ATTENDANCE_MARK', 'attendance', subject_id, `Marked attendance on ${date} for ${entries.length} students`);
  return res.json({ ok: true, count: entries.length });
});

// ==========================================
// MODULE 5: MARKS & PERFORMANCE + ASSIGNMENTS
// ==========================================
router.get('/marks', requireAuth, (req: AuthenticatedRequest, res) => {
  const { subjectId, departmentId, semester } = req.query;

  if (req.user!.role === 'student') {
    const rows = db
      .prepare(
        `SELECT m.*, sub.code as subject_code, sub.name as subject_name, sub.credits
         FROM marks m JOIN subjects sub ON sub.id = m.subject_id
         WHERE m.student_id = ? ORDER BY sub.code ASC`
      )
      .all(req.user!.student_id);
    return res.json({ marks: rows });
  }

  const where: string[] = [`1=1`];
  const params: any[] = [];
  if (subjectId) {
    where.push(`m.subject_id = ?`);
    params.push(Number(subjectId));
  }
  if (departmentId) {
    where.push(`s.department_id = ?`);
    params.push(Number(departmentId));
  }
  if (semester) {
    where.push(`s.semester = ?`);
    params.push(Number(semester));
  }

  const rows = db
    .prepare(
      `SELECT m.*, s.usn, s.full_name as student_name, d.code as dept_code, sub.code as subject_code, sub.name as subject_name
       FROM marks m
       JOIN students s ON s.id = m.student_id
       JOIN departments d ON d.id = s.department_id
       JOIN subjects sub ON sub.id = m.subject_id
       WHERE ${where.join(' AND ')}
       ORDER BY s.usn ASC, sub.code ASC`
    )
    .all(...params);

  return res.json({ marks: rows });
});

router.post('/marks', requireAuth, requireRole('admin', 'faculty'), (req: AuthenticatedRequest, res) => {
  const { student_id, subject_id, internal_1, internal_2, assignment_score, external_score } = req.body || {};
  if (!student_id || !subject_id) {
    return res.status(400).json({ error: 'Student and subject are required.' });
  }
  const i1 = Math.min(20, Math.max(0, Number(internal_1 || 0)));
  const i2 = Math.min(20, Math.max(0, Number(internal_2 || 0)));
  const asg = Math.min(20, Math.max(0, Number(assignment_score || 0)));
  const ext = Math.min(40, Math.max(0, Number(external_score || 0)));
  const total = i1 + i2 + asg + ext;
  const grade = computeGrade(total);

  const student = db.prepare(`SELECT semester FROM students WHERE id = ?`).get(Number(student_id)) as any;
  const sem = student?.semester || 5;

  db.prepare(
    `INSERT INTO marks (student_id, subject_id, semester, internal_1, internal_2, assignment_score, external_score, total_marks, max_marks, grade, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 100, ?, ?, datetime('now'))
     ON CONFLICT(student_id, subject_id) DO UPDATE SET
       internal_1 = excluded.internal_1,
       internal_2 = excluded.internal_2,
       assignment_score = excluded.assignment_score,
       external_score = excluded.external_score,
       total_marks = excluded.total_marks,
       grade = excluded.grade,
       updated_by = excluded.updated_by,
       updated_at = datetime('now')`
  ).run(Number(student_id), Number(subject_id), sem, i1, i2, asg, ext, total, grade, req.user!.id);

  logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'MARKS_UPSERT', 'marks', `${student_id}:${subject_id}`, `Saved marks total ${total}/100 (${grade})`);
  return res.json({ ok: true, total_marks: total, grade });
});

router.get('/assignments', requireAuth, (_req, res) => {
  const assignments = db
    .prepare(
      `SELECT a.*, sub.code as subject_code, sub.name as subject_name, f.full_name as faculty_name
       FROM assignments a
       JOIN subjects sub ON sub.id = a.subject_id
       LEFT JOIN faculty f ON f.id = a.faculty_id
       ORDER BY a.due_date ASC`
    )
    .all();
  return res.json({ assignments });
});

router.post('/assignments', requireAuth, requireRole('admin', 'faculty'), (req: AuthenticatedRequest, res) => {
  const { title, subject_id, due_date, max_marks, description } = req.body || {};
  if (!title || !subject_id || !due_date || !description) {
    return res.status(400).json({ error: 'Title, subject, due date, and description are required.' });
  }
  const r = db
    .prepare(`INSERT INTO assignments (title, subject_id, faculty_id, due_date, max_marks, description, status) VALUES (?, ?, ?, ?, ?, ?, 'published')`)
    .run(title.trim(), Number(subject_id), req.user!.faculty_id || null, due_date, Number(max_marks || 20), description.trim());
  return res.status(201).json({ id: r.lastInsertRowid });
});

// ==========================================
// MODULE 8: FEEDBACK & SENTIMENT
// ==========================================
function heuristicSentiment(comment: string, rating: number): { sentiment: 'positive' | 'neutral' | 'negative'; confidence: number; topics: string[] } {
  const lower = comment.toLowerCase();
  const negWords = ['slow', 'broken', 'poor', 'bad', 'stall', 'drop', 'issue', 'delay', 'problem', 'repair', 'dirty', 'noise', 'fail'];
  const posWords = ['great', 'excellent', 'clear', 'helpful', 'well', 'best', 'good', 'smooth', 'love', 'supportive', 'practical'];
  let score = rating >= 4 ? 1 : rating <= 2 ? -1 : 0;
  negWords.forEach((w) => { if (lower.includes(w)) score -= 1; });
  posWords.forEach((w) => { if (lower.includes(w)) score += 1; });

  const topics: string[] = [];
  if (lower.includes('wifi') || lower.includes('network')) topics.push('Campus Wi-Fi');
  if (lower.includes('lab') || lower.includes('workstation') || lower.includes('computer')) topics.push('Lab Equipment');
  if (lower.includes('lecture') || lower.includes('explain') || lower.includes('prof') || lower.includes('teach')) topics.push('Teaching Quality');
  if (lower.includes('schedule') || lower.includes('timetable') || lower.includes('time')) topics.push('Timetable');
  if (lower.includes('library')) topics.push('Library Facilities');
  if (topics.length === 0) topics.push('General Feedback');

  const sentiment = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';
  return { sentiment, confidence: 0.82, topics };
}

router.get('/feedback', requireAuth, (req: AuthenticatedRequest, res) => {
  const { departmentId, category, sentiment } = req.query;
  const where: string[] = ['1=1'];
  const params: any[] = [];

  if (req.user!.role === 'student') {
    where.push(`f.student_id = ?`);
    params.push(req.user!.student_id);
  }
  if (departmentId) {
    where.push(`f.department_id = ?`);
    params.push(Number(departmentId));
  }
  if (category) {
    where.push(`f.category = ?`);
    params.push(String(category));
  }
  if (sentiment) {
    where.push(`f.sentiment = ?`);
    params.push(String(sentiment));
  }

  const items = db
    .prepare(
      `SELECT f.*, d.code as dept_code, d.name as department_name, s.full_name as student_name, s.usn
       FROM feedback f
       LEFT JOIN departments d ON d.id = f.department_id
       LEFT JOIN students s ON s.id = f.student_id
       WHERE ${where.join(' AND ')}
       ORDER BY f.created_at DESC`
    )
    .all(...params)
    .map((row: any) => ({
      ...row,
      topics: JSON.parse(row.topics_json || '[]'),
    }));

  const distribution = db
    .prepare(`SELECT sentiment, COUNT(*) as count FROM feedback GROUP BY sentiment`)
    .all();

  const byDept = db
    .prepare(
      `SELECT COALESCE(d.code, 'GEN') as dept_code,
              SUM(CASE WHEN f.sentiment='positive' THEN 1 ELSE 0 END) as positive,
              SUM(CASE WHEN f.sentiment='neutral' THEN 1 ELSE 0 END) as neutral,
              SUM(CASE WHEN f.sentiment='negative' THEN 1 ELSE 0 END) as negative
       FROM feedback f LEFT JOIN departments d ON d.id = f.department_id
       GROUP BY d.id`
    )
    .all();

  return res.json({ feedback: items, distribution, byDept });
});

router.post('/feedback', requireAuth, (req: AuthenticatedRequest, res) => {
  const { department_id, category, subject_name, rating, comment } = req.body || {};
  if (!category || !comment || String(comment).trim().length < 10) {
    return res.status(400).json({ error: 'Category and detailed feedback comment (min 10 chars) are required.' });
  }
  const numRating = Math.min(5, Math.max(1, Number(rating || 3)));
  const analysis = heuristicSentiment(String(comment), numRating);

  const r = db
    .prepare(
      `INSERT INTO feedback (student_id, department_id, category, subject_name, rating, comment, sentiment, sentiment_confidence, topics_json, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`
    )
    .run(
      req.user!.student_id || null,
      department_id ? Number(department_id) : null,
      String(category),
      subject_name || '',
      numRating,
      String(comment).trim(),
      analysis.sentiment,
      analysis.confidence,
      JSON.stringify(analysis.topics)
    );

  return res.status(201).json({ id: r.lastInsertRowid, sentiment: analysis.sentiment });
});

router.patch('/feedback/:id/status', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!['open', 'reviewed', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid feedback status.' });
  }
  db.prepare(`UPDATE feedback SET status = ? WHERE id = ?`).run(status, id);
  return res.json({ ok: true });
});

// ==========================================
// MODULE 9: EVENTS
// ==========================================
router.get('/events', requireAuth, (req: AuthenticatedRequest, res) => {
  const { category } = req.query;
  const where = category ? `WHERE e.category = ?` : '';
  const events = db
    .prepare(
      `SELECT e.*,
              (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.status = 'registered') as registered_count,
              EXISTS(SELECT 1 FROM event_registrations er WHERE er.event_id = e.id AND er.user_id = ? AND er.status = 'registered') as is_registered
       FROM events e
       ${where}
       ORDER BY e.event_date ASC`
    )
    .all(...(category ? [req.user!.id, String(category)] : [req.user!.id]));

  return res.json({ events });
});

router.post('/events', requireAuth, requireRole('admin', 'faculty'), (req: AuthenticatedRequest, res) => {
  const { title, category, description, event_date, start_time, end_time, venue, capacity, organizer } = req.body || {};
  if (!title || !category || !event_date || !venue || !capacity) {
    return res.status(400).json({ error: 'Title, category, event date, venue, and capacity are required.' });
  }
  const r = db
    .prepare(
      `INSERT INTO events (title, category, description, event_date, start_time, end_time, venue, capacity, organizer, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?)`
    )
    .run(
      title.trim(),
      category,
      description || '',
      event_date,
      start_time || '10:00',
      end_time || '13:00',
      venue.trim(),
      Math.max(1, Number(capacity)),
      organizer || req.user!.full_name,
      req.user!.id
    );
  createNotificationForRole('all', `New Event: ${title}`, `${category} event scheduled for ${event_date} at ${venue}.`, 'Events', 'events');
  logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'EVENT_CREATE', 'events', r.lastInsertRowid as number, `Created event ${title}`);
  return res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/events/:id', requireAuth, requireRole('admin', 'faculty'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { title, category, description, event_date, start_time, end_time, venue, capacity, organizer, status } = req.body || {};
  db.prepare(
    `UPDATE events SET title=?, category=?, description=?, event_date=?, start_time=?, end_time=?, venue=?, capacity=?, organizer=?, status=? WHERE id=?`
  ).run(title, category, description || '', event_date, start_time, end_time, venue, Number(capacity), organizer, status || 'upcoming', id);
  return res.json({ ok: true });
});

router.delete('/events/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare(`DELETE FROM events WHERE id = ?`).run(id);
  logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'EVENT_DELETE', 'events', id, `Deleted event ID ${id}`);
  return res.json({ ok: true });
});

router.post('/events/:id/register', requireAuth, (req: AuthenticatedRequest, res) => {
  const eventId = Number(req.params.id);
  const tx = db.transaction(() => {
    const ev = db.prepare(`SELECT id, title, capacity, status FROM events WHERE id = ?`).get(eventId) as any;
    if (!ev) return { code: 404, error: 'Event not found.' };
    if (ev.status === 'cancelled' || ev.status === 'completed') {
      return { code: 400, error: 'Registration is closed for this event.' };
    }
    const existing = db
      .prepare(`SELECT id, status FROM event_registrations WHERE event_id = ? AND user_id = ?`)
      .get(eventId, req.user!.id) as any;
    if (existing && existing.status === 'registered') {
      return { code: 409, error: 'You are already registered for this event.' };
    }
    const regCount = (
      db.prepare(`SELECT COUNT(*) as c FROM event_registrations WHERE event_id = ? AND status = 'registered'`).get(eventId) as any
    ).c;
    if (regCount >= ev.capacity) {
      return { code: 409, error: 'This event has reached full capacity.' };
    }

    if (existing) {
      db.prepare(`UPDATE event_registrations SET status = 'registered', registered_at = datetime('now') WHERE id = ?`).run(existing.id);
    } else {
      db.prepare(`INSERT INTO event_registrations (event_id, user_id, student_id, status) VALUES (?, ?, ?, 'registered')`).run(
        eventId,
        req.user!.id,
        req.user!.student_id || null
      );
    }
    return { code: 200, title: ev.title };
  });

  const out = tx();
  if (out.code !== 200) return res.status(out.code).json({ error: out.error });
  return res.json({ ok: true, message: `Registered for ${out.title}` });
});

router.delete('/events/:id/register', requireAuth, (req: AuthenticatedRequest, res) => {
  const eventId = Number(req.params.id);
  db.prepare(`UPDATE event_registrations SET status = 'cancelled' WHERE event_id = ? AND user_id = ?`).run(eventId, req.user!.id);
  return res.json({ ok: true });
});

// ==========================================
// MODULE 11: RESOURCES & BOOKINGS
// ==========================================
router.get('/resources', requireAuth, (_req, res) => {
  const resources = db
    .prepare(
      `SELECT r.*,
              (SELECT COUNT(*) FROM resource_bookings rb WHERE rb.resource_id = r.id AND rb.status = 'confirmed') as booking_count
       FROM resources r ORDER BY r.code ASC`
    )
    .all();

  const bookings = db
    .prepare(
      `SELECT rb.*, r.name as resource_name, r.code as resource_code, r.building, u.full_name as booked_by_name, u.role as booked_by_role
       FROM resource_bookings rb
       JOIN resources r ON r.id = rb.resource_id
       JOIN users u ON u.id = rb.booked_by
       ORDER BY rb.booking_date DESC, rb.start_time ASC`
    )
    .all();

  return res.json({ resources, bookings });
});

router.post('/resources', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const { name, code, type, building, capacity, status, specifications } = req.body || {};
  if (!name || !code || !type || !building) {
    return res.status(400).json({ error: 'Name, code, type, and building are required.' });
  }
  try {
    const r = db
      .prepare(`INSERT INTO resources (name, code, type, building, capacity, status, specifications) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(name.trim(), String(code).trim().toUpperCase(), type, building.trim(), Number(capacity || 1), status || 'available', specifications || '');
    logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'RESOURCE_CREATE', 'resources', r.lastInsertRowid as number, `Added resource ${name}`);
    return res.status(201).json({ id: r.lastInsertRowid });
  } catch {
    return res.status(409).json({ error: 'Resource code already exists.' });
  }
});

router.put('/resources/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { name, code, type, building, capacity, status, specifications } = req.body || {};
  db.prepare(`UPDATE resources SET name=?, code=?, type=?, building=?, capacity=?, status=?, specifications=? WHERE id=?`)
    .run(name, String(code).toUpperCase(), type, building, Number(capacity || 1), status, specifications || '', id);
  return res.json({ ok: true });
});

router.delete('/resources/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare(`DELETE FROM resources WHERE id = ?`).run(id);
  return res.json({ ok: true });
});

router.post('/resources/bookings', requireAuth, requireRole('admin', 'faculty'), (req: AuthenticatedRequest, res) => {
  const { resource_id, booking_date, start_time, end_time, purpose } = req.body || {};
  if (!resource_id || !booking_date || !start_time || !end_time || !purpose) {
    return res.status(400).json({ error: 'Resource, date, start time, end time, and purpose are required.' });
  }
  if (start_time >= end_time) {
    return res.status(400).json({ error: 'End time must be later than start time.' });
  }

  const tx = db.transaction(() => {
    const resource = db.prepare(`SELECT id, name, status FROM resources WHERE id = ?`).get(Number(resource_id)) as any;
    if (!resource) return { code: 404, error: 'Resource not found.' };
    if (resource.status !== 'available') {
      return { code: 409, error: `${resource.name} is currently marked as ${resource.status} and cannot be booked.` };
    }

    // Overlap check: (existing.start < new.end) AND (existing.end > new.start)
    const conflict = db
      .prepare(
        `SELECT id, start_time, end_time, purpose FROM resource_bookings
         WHERE resource_id = ? AND booking_date = ? AND status = 'confirmed'
           AND start_time < ? AND end_time > ?`
      )
      .get(Number(resource_id), booking_date, end_time, start_time) as any;

    if (conflict) {
      return {
        code: 409,
        error: `Time-slot conflict: ${resource.name} is already booked from ${conflict.start_time} to ${conflict.end_time} (${conflict.purpose}).`,
      };
    }

    const r = db
      .prepare(
        `INSERT INTO resource_bookings (resource_id, booked_by, booking_date, start_time, end_time, purpose, status)
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`
      )
      .run(Number(resource_id), req.user!.id, booking_date, start_time, end_time, purpose.trim());
    return { code: 201, id: Number(r.lastInsertRowid), name: resource.name };
  });

  const out = tx();
  if (out.code !== 201) return res.status(out.code).json({ error: out.error });
  logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'RESOURCE_BOOK', 'resource_bookings', out.id!, `Booked ${out.name} on ${booking_date} ${start_time}-${end_time}`);
  return res.status(201).json({ id: out.id });
});

router.patch('/resources/bookings/:id/cancel', requireAuth, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const booking = db.prepare(`SELECT * FROM resource_bookings WHERE id = ?`).get(id) as any;
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  if (req.user!.role !== 'admin' && booking.booked_by !== req.user!.id) {
    return res.status(403).json({ error: 'You can only cancel your own bookings.' });
  }
  db.prepare(`UPDATE resource_bookings SET status = 'cancelled' WHERE id = ?`).run(id);
  return res.json({ ok: true });
});

// ==========================================
// MODULE 13: ANNOUNCEMENTS & NOTIFICATIONS
// ==========================================
router.get('/announcements', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows =
    req.user!.role === 'admin'
      ? db.prepare(`SELECT * FROM announcements ORDER BY is_pinned DESC, created_at DESC`).all()
      : db
          .prepare(`SELECT * FROM announcements WHERE target_role IN ('all', ?) ORDER BY is_pinned DESC, created_at DESC`)
          .all(req.user!.role);
  return res.json({ announcements: rows });
});

router.post('/announcements', requireAuth, requireRole('admin', 'faculty'), (req: AuthenticatedRequest, res) => {
  const { title, body, category, target_role, priority, is_pinned } = req.body || {};
  if (!title || !body || !category) {
    return res.status(400).json({ error: 'Title, category, and message body are required.' });
  }
  const roleTarget = req.user!.role === 'faculty' && target_role === 'admin' ? 'all' : target_role || 'all';
  const r = db
    .prepare(
      `INSERT INTO announcements (title, body, category, target_role, priority, author_name, author_id, is_pinned)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(title.trim(), body.trim(), category, roleTarget, priority || 'normal', req.user!.full_name, req.user!.id, is_pinned ? 1 : 0);

  createNotificationForRole(roleTarget, title.trim(), body.trim().slice(0, 110), category, 'announcements');
  return res.status(201).json({ id: r.lastInsertRowid });
});

router.delete('/announcements/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  db.prepare(`DELETE FROM announcements WHERE id = ?`).run(Number(req.params.id));
  return res.json({ ok: true });
});

router.get('/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const notifications = db
    .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`)
    .all(req.user!.id);
  const unreadCount = (db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0`).get(req.user!.id) as any).c;
  return res.json({ notifications, unreadCount });
});

router.patch('/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`).run(Number(req.params.id), req.user!.id);
  return res.json({ ok: true });
});

router.patch('/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`).run(req.user!.id);
  return res.json({ ok: true });
});

// ==========================================
// MODULE 14: REPORTS & ANALYTICS
// ==========================================
router.get('/reports/:type', requireAuth, requireRole('admin', 'faculty'), (req: AuthenticatedRequest, res) => {
  const { type } = req.params;
  const { departmentId, semester } = req.query;

  if (type === 'students') {
    const rows = db
      .prepare(
        `SELECT s.usn, s.full_name, s.email, d.code as department, c.code as course, s.semester, s.academic_year, s.status,
                COALESCE((SELECT ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) FROM attendance a WHERE a.student_id = s.id), 0) as attendance_pct,
                COALESCE((SELECT ROUND(AVG(m.total_marks),1) FROM marks m WHERE m.student_id = s.id), 0) as avg_marks
         FROM students s JOIN departments d ON d.id = s.department_id JOIN courses c ON c.id = s.course_id
         WHERE 1=1 ${departmentId ? 'AND s.department_id = ?' : ''} ${semester ? 'AND s.semester = ?' : ''}
         ORDER BY s.usn`
      )
      .all(...[departmentId ? Number(departmentId) : null, semester ? Number(semester) : null].filter((v) => v !== null));
    return res.json({ rows });
  }

  if (type === 'faculty') {
    const rows = db
      .prepare(
        `SELECT f.employee_id, f.full_name, f.email, d.code as department, f.designation, f.weekly_hours, f.status,
                (SELECT COUNT(*) FROM subjects sub WHERE sub.faculty_id = f.id) as assigned_subjects
         FROM faculty f JOIN departments d ON d.id = f.department_id
         ${departmentId ? 'WHERE f.department_id = ?' : ''}
         ORDER BY f.employee_id`
      )
      .all(...(departmentId ? [Number(departmentId)] : []));
    return res.json({ rows });
  }

  if (type === 'attendance') {
    const rows = db
      .prepare(
        `SELECT s.usn, s.full_name, d.code as department, s.semester, sub.code as subject_code, sub.name as subject_name,
                COUNT(a.id) as total_classes,
                SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as attended,
                ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(a.id),0), 1) as percentage
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         JOIN departments d ON d.id = s.department_id
         JOIN subjects sub ON sub.id = a.subject_id
         WHERE 1=1 ${departmentId ? 'AND s.department_id = ?' : ''} ${semester ? 'AND s.semester = ?' : ''}
         GROUP BY s.id, sub.id
         ORDER BY percentage ASC`
      )
      .all(...[departmentId ? Number(departmentId) : null, semester ? Number(semester) : null].filter((v) => v !== null));
    return res.json({ rows });
  }

  if (type === 'performance') {
    const rows = db
      .prepare(
        `SELECT s.usn, s.full_name, d.code as department, sub.code as subject_code, sub.name as subject_name,
                m.internal_1, m.internal_2, m.assignment_score, m.external_score, m.total_marks, m.grade
         FROM marks m
         JOIN students s ON s.id = m.student_id
         JOIN departments d ON d.id = s.department_id
         JOIN subjects sub ON sub.id = m.subject_id
         WHERE 1=1 ${departmentId ? 'AND s.department_id = ?' : ''} ${semester ? 'AND s.semester = ?' : ''}
         ORDER BY m.total_marks DESC`
      )
      .all(...[departmentId ? Number(departmentId) : null, semester ? Number(semester) : null].filter((v) => v !== null));
    return res.json({ rows });
  }

  if (type === 'events') {
    const rows = db
      .prepare(
        `SELECT e.title, e.category, e.event_date, e.venue, e.capacity,
                (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.status='registered') as registrations,
                e.status
         FROM events e ORDER BY e.event_date ASC`
      )
      .all();
    return res.json({ rows });
  }

  if (type === 'feedback') {
    const rows = db
      .prepare(
        `SELECT f.id, COALESCE(d.code, 'GEN') as department, f.category, f.rating, f.sentiment, f.status, f.comment, f.created_at
         FROM feedback f LEFT JOIN departments d ON d.id = f.department_id ORDER BY f.created_at DESC`
      )
      .all();
    return res.json({ rows });
  }

  if (type === 'resources') {
    const rows = db
      .prepare(
        `SELECT r.code, r.name, r.type, r.building, r.capacity, r.status,
                (SELECT COUNT(*) FROM resource_bookings rb WHERE rb.resource_id = r.id AND rb.status='confirmed') as active_bookings
         FROM resources r ORDER BY r.code`
      )
      .all();
    return res.json({ rows });
  }

  return res.status(400).json({ error: 'Unknown report type.' });
});

// ==========================================
// ADMINISTRATION (USERS, SETTINGS, AUDIT LOGS)
// ==========================================
router.get('/admin/users', requireAuth, requireRole('admin'), (_req, res) => {
  const users = db.prepare(`SELECT id, email, role, full_name, status, created_at FROM users ORDER BY id ASC`).all();
  return res.json({ users });
});

router.post('/admin/users', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const { email, password, role, full_name } = req.body || {};
  if (!email || !password || !role || !full_name) {
    return res.status(400).json({ error: 'Email, password, role, and full name are required.' });
  }
  if (!['admin', 'faculty', 'student'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  try {
    const hash = bcrypt.hashSync(String(password), 10);
    const r = db
      .prepare(`INSERT INTO users (email, password_hash, role, full_name, status) VALUES (?, ?, ?, ?, 'active')`)
      .run(String(email).trim().toLowerCase(), hash, role, String(full_name).trim());
    logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'USER_CREATE', 'users', r.lastInsertRowid as number, `Created ${role} user ${email}`);
    return res.status(201).json({ id: r.lastInsertRowid });
  } catch {
    return res.status(409).json({ error: 'Email already exists.' });
  }
});

router.patch('/admin/users/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { role, status } = req.body || {};
  if (id === req.user!.id && status === 'inactive') {
    return res.status(400).json({ error: 'You cannot deactivate your own active administrator account.' });
  }
  db.prepare(`UPDATE users SET role = COALESCE(?, role), status = COALESCE(?, status) WHERE id = ?`).run(role || null, status || null, id);
  logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'USER_UPDATE', 'users', id, `Updated user role/status`);
  return res.json({ ok: true });
});

router.get('/admin/settings', requireAuth, (_req, res) => {
  const rows = db.prepare(`SELECT key, value FROM system_settings`).all() as Array<{ key: string; value: string }>;
  const settings: Record<string, string> = {};
  rows.forEach((r) => { settings[r.key] = r.value; });
  return res.json({ settings });
});

router.put('/admin/settings', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
  const { institution_name, attendance_threshold, current_academic_year, current_semester } = req.body || {};
  const upsert = db.prepare(`INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`);
  if (institution_name) upsert.run('institution_name', String(institution_name).trim());
  if (attendance_threshold) upsert.run('attendance_threshold', String(Math.min(95, Math.max(50, Number(attendance_threshold)))));
  if (current_academic_year) upsert.run('current_academic_year', String(current_academic_year).trim());
  if (current_semester) upsert.run('current_semester', String(current_semester).trim());
  logAudit(req.user!.id, req.user!.full_name, req.user!.role, 'SETTINGS_UPDATE', 'system_settings', 'global', 'Updated institutional ERP settings');
  return res.json({ ok: true });
});

router.get('/admin/audit-logs', requireAuth, requireRole('admin'), (_req, res) => {
  const logs = db.prepare(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50`).all();
  return res.json({ logs });
});

// ==========================================
// AI SERVICES (MODULES 4,5,6,7,8,10,12)
// ==========================================
router.get('/ai/status', requireAuth, (_req, res) => {
  return res.json(getAiStatus());
});

router.post('/ai/chat', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { message, history = [] } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  let contextSummary = '';
  const upcoming = db
    .prepare(`SELECT title, event_date, venue FROM events WHERE status='upcoming' ORDER BY event_date ASC LIMIT 4`)
    .all() as any[];
  const eventStr = upcoming.map((e) => `${e.title} (${e.event_date}, ${e.venue})`).join('; ');

  if (req.user!.role === 'student' && req.user!.student_id) {
    const att = db
      .prepare(
        `SELECT sub.code, sub.name,
                ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(a.id),0), 1) as pct
         FROM subjects sub
         JOIN students s ON s.id = ? AND s.department_id = sub.department_id AND s.semester = sub.semester
         LEFT JOIN attendance a ON a.subject_id = sub.id AND a.student_id = s.id
         GROUP BY sub.id`
      )
      .all(req.user!.student_id) as any[];
    const marks = db
      .prepare(`SELECT sub.code, m.total_marks, m.grade FROM marks m JOIN subjects sub ON sub.id = m.subject_id WHERE m.student_id = ?`)
      .all(req.user!.student_id) as any[];
    contextSummary = `Student Attendance: ${att.map((a) => `${a.code}: ${a.pct ?? 0}%`).join(', ') || 'No records yet'}.
Student Marks: ${marks.map((m) => `${m.code}: ${m.total_marks}/100 (${m.grade})`).join(', ') || 'No marks yet'}.
Upcoming Events: ${eventStr}.`;
  } else if (req.user!.role === 'faculty' && req.user!.faculty_id) {
    const subs = db.prepare(`SELECT code, name, schedule_slot FROM subjects WHERE faculty_id = ?`).all(req.user!.faculty_id) as any[];
    contextSummary = `Assigned Subjects: ${subs.map((s) => `${s.code} ${s.name} (${s.schedule_slot})`).join('; ') || 'None'}.
Upcoming Events: ${eventStr}.`;
  } else {
    const stuCount = (db.prepare(`SELECT COUNT(*) as c FROM students WHERE status='active'`).get() as any).c;
    const facCount = (db.prepare(`SELECT COUNT(*) as c FROM faculty WHERE status='active'`).get() as any).c;
    const openFb = (db.prepare(`SELECT COUNT(*) as c FROM feedback WHERE status='open'`).get() as any).c;
    contextSummary = `Active Students: ${stuCount}, Active Faculty: ${facCount}, Open Feedback Items: ${openFb}. Upcoming Events: ${eventStr}.`;
  }

  const result = await generateCampusChatResponse({
    role: req.user!.role,
    userName: req.user!.full_name,
    contextSummary,
    message: String(message).trim(),
    history,
  });

  return res.json(result);
});

router.post('/ai/academic-assist', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { subject, topic, semester, difficulty, questionCount, contentType } = req.body || {};
  if (!subject || !topic) {
    return res.status(400).json({ error: 'Subject and topic are required.' });
  }
  const result = await generateAcademicAssistance({
    subject: String(subject),
    topic: String(topic),
    semester: String(semester || '5'),
    difficulty: String(difficulty || 'Intermediate'),
    questionCount: Number(questionCount || 5),
    contentType: String(contentType || 'Study Notes'),
  });
  return res.json(result);
});

router.post('/ai/content-gen', requireAuth, requireRole('admin', 'faculty'), async (req: AuthenticatedRequest, res) => {
  const { contentType, title, subject, audience, tone, keyPoints } = req.body || {};
  if (!contentType || !title) {
    return res.status(400).json({ error: 'Content type and title are required.' });
  }
  const result = await generateUnifiedContent({
    contentType: String(contentType),
    title: String(title),
    subject: String(subject || ''),
    audience: String(audience || 'Students'),
    tone: String(tone || 'Formal Academic'),
    keyPoints: String(keyPoints || ''),
  });
  return res.json(result);
});

router.post('/ai/career-guidance', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { skills, interests, preferredSubjects, strengths } = req.body || {};
  if (!skills && !interests) {
    return res.status(400).json({ error: 'Please enter at least your skills or areas of interest.' });
  }
  let dept = 'Computer Science & Engineering';
  let sem = 5;
  if (req.user!.student_id) {
    const st = db
      .prepare(`SELECT s.semester, d.name as dept FROM students s JOIN departments d ON d.id = s.department_id WHERE s.id = ?`)
      .get(req.user!.student_id) as any;
    if (st) {
      dept = st.dept;
      sem = st.semester;
    }
  }
  const result = await generateCareerGuidanceAI({
    studentName: req.user!.full_name,
    department: dept,
    semester: sem,
    skills: String(skills || ''),
    interests: String(interests || ''),
    preferredSubjects: String(preferredSubjects || ''),
    strengths: String(strengths || ''),
  });
  return res.json(result);
});

router.post('/ai/insights/:domain', requireAuth, async (req: AuthenticatedRequest, res) => {
  const domain = req.params.domain as 'attendance' | 'performance' | 'feedback' | 'institutional';
  if (!['attendance', 'performance', 'feedback', 'institutional'].includes(domain)) {
    return res.status(400).json({ error: 'Invalid analysis domain.' });
  }

  let summaryPayload = '';
  const threshold = Number(getSetting('attendance_threshold', '75'));

  if (domain === 'attendance') {
    const low = db
      .prepare(
        `SELECT s.full_name, s.usn, ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(a.id),0), 1) as pct
         FROM students s JOIN attendance a ON a.student_id = s.id
         GROUP BY s.id HAVING pct < ?`
      )
      .all(threshold) as any[];
    summaryPayload = `Configured threshold: ${threshold}%. Students below threshold (${low.length}): ${low.map((l) => `${l.full_name} (${l.usn}: ${l.pct}%)`).join(', ') || 'None'}.`;
  } else if (domain === 'performance') {
    const stats = db
      .prepare(`SELECT sub.code, ROUND(AVG(m.total_marks),1) as avg_score FROM marks m JOIN subjects sub ON sub.id = m.subject_id GROUP BY sub.id`)
      .all() as any[];
    const support = db
      .prepare(`SELECT s.full_name, ROUND(AVG(m.total_marks),1) as avg_score FROM marks m JOIN students s ON s.id = m.student_id GROUP BY s.id HAVING avg_score < 60`)
      .all() as any[];
    summaryPayload = `Subject averages: ${stats.map((s) => `${s.code}: ${s.avg_score}%`).join(', ')}. Students <60%: ${support.map((s) => `${s.full_name} (${s.avg_score}%)`).join(', ') || 'None'}.`;
  } else if (domain === 'feedback') {
    const dist = db.prepare(`SELECT sentiment, COUNT(*) as c FROM feedback GROUP BY sentiment`).all() as any[];
    const neg = db.prepare(`SELECT category, comment FROM feedback WHERE sentiment = 'negative' LIMIT 4`).all() as any[];
    summaryPayload = `Sentiment counts: ${dist.map((d) => `${d.sentiment}=${d.c}`).join(', ')}. Negative samples: ${neg.map((n) => `[${n.category}] ${n.comment}`).join(' | ')}`;
  } else {
    const stu = (db.prepare(`SELECT COUNT(*) as c FROM students WHERE status='active'`).get() as any).c;
    const avgAtt = ((db.prepare(`SELECT ROUND(100.0 * SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) as p FROM attendance`).get() as any)?.p) ?? 0;
    const openFb = (db.prepare(`SELECT COUNT(*) as c FROM feedback WHERE status='open'`).get() as any).c;
    summaryPayload = `Active students: ${stu}, Campus attendance avg: ${avgAtt}%, Open feedback issues: ${openFb}, Attendance benchmark: ${threshold}%.`;
  }

  const result = await analyzeDatasetInsightsAI({ domain, summaryPayload });
  return res.json(result);
});

router.get('/ai/saved', requireAuth, (req: AuthenticatedRequest, res) => {
  const items = db
    .prepare(`SELECT * FROM ai_content WHERE user_id = ? ORDER BY created_at DESC LIMIT 30`)
    .all(req.user!.id);
  return res.json({ items });
});

router.post('/ai/saved', requireAuth, (req: AuthenticatedRequest, res) => {
  const { tool_type, title, subject, topic, content, model_mode } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required.' });
  const r = db
    .prepare(`INSERT INTO ai_content (user_id, tool_type, title, subject, topic, content, model_mode) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(req.user!.id, tool_type || 'academic', title, subject || '', topic || '', content, model_mode || 'demo');
  return res.status(201).json({ id: r.lastInsertRowid });
});

router.delete('/ai/saved/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare(`DELETE FROM ai_content WHERE id = ? AND user_id = ?`).run(Number(req.params.id), req.user!.id);
  return res.json({ ok: true });
});

export default router;
