import bcrypt from 'bcryptjs';
import db from './db.ts';

export function seedDatabaseIfEmpty() {
  const existingUsers = db.prepare(`SELECT COUNT(*) as count FROM users`).get() as { count: number };
  if (existingUsers.count > 0) {
    // Migrate default seed institution branding if still set to the previous placeholder
    db.prepare(`UPDATE system_settings SET value = 'GM University' WHERE key = 'institution_name' AND value = 'Northbridge University'`).run();
    db.prepare(`UPDATE events SET title = 'GMU Winter Hackathon 2026' WHERE title = 'Northbridge Winter Hackathon 2026'`).run();
    return;
  }

  const runSeed = db.transaction(() => {
    const adminHash = bcrypt.hashSync('Admin@123', 10);
    const facultyHash = bcrypt.hashSync('Faculty@123', 10);
    const studentHash = bcrypt.hashSync('Student@123', 10);

    const insertUser = db.prepare(
      `INSERT INTO users (email, password_hash, role, full_name, avatar_url, status) VALUES (?, ?, ?, ?, ?, 'active')`
    );

    const adminId = insertUser.run(
      'admin@smartcampus.edu',
      adminHash,
      'admin',
      'Dr. Eleanor Vance',
      '/src/assets/images/avatar_admin_1795016756499.jpg'
    ).lastInsertRowid as number;

    const fac1UserId = insertUser.run(
      'faculty@smartcampus.edu',
      facultyHash,
      'faculty',
      'Prof. Clara Sterling',
      '/src/assets/images/avatar_faculty_1795016756068.jpg'
    ).lastInsertRowid as number;

    const fac2UserId = insertUser.run(
      'r.iyer@smartcampus.edu',
      facultyHash,
      'faculty',
      'Dr. Rajesh Iyer',
      null
    ).lastInsertRowid as number;

    const fac3UserId = insertUser.run(
      'm.chen@smartcampus.edu',
      facultyHash,
      'faculty',
      'Dr. Marcus Chen',
      null
    ).lastInsertRowid as number;

    const stu1UserId = insertUser.run(
      'student@smartcampus.edu',
      studentHash,
      'student',
      'Maya Lin',
      '/src/assets/images/avatar_student_1795016756264.jpg'
    ).lastInsertRowid as number;

    const stu2UserId = insertUser.run(
      'arjun.mehta@smartcampus.edu',
      studentHash,
      'student',
      'Arjun Mehta',
      null
    ).lastInsertRowid as number;

    // System Settings
    const setSetting = db.prepare(`INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)`);
    setSetting.run('institution_name', 'GM University');
    setSetting.run('attendance_threshold', '75');
    setSetting.run('current_academic_year', '2026-27');
    setSetting.run('current_semester', '5');

    // Departments
    const insertDept = db.prepare(
      `INSERT INTO departments (code, name, head_name, building, description, established_year) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const cseId = insertDept.run(
      'CSE',
      'Computer Science & Engineering',
      'Dr. Clara Sterling',
      'Turing Academic Block',
      'Core computing systems, software architecture, distributed systems, and intelligent applications.',
      2008
    ).lastInsertRowid as number;
    const dsaiId = insertDept.run(
      'DSAI',
      'Data Science & Artificial Intelligence',
      'Dr. Rajesh Iyer',
      'Shannon Innovation Wing',
      'Statistical modeling, machine learning, natural language processing, and data engineering.',
      2019
    ).lastInsertRowid as number;
    const eceId = insertDept.run(
      'ECE',
      'Electronics & Communication',
      'Dr. Marcus Chen',
      'Maxwell Engineering Hall',
      'VLSI design, embedded systems, signal processing, and wireless communication networks.',
      2006
    ).lastInsertRowid as number;
    const meId = insertDept.run(
      'ME',
      'Mechanical Engineering',
      'Prof. Vikram Kulkarni',
      'Babbage Workshop Complex',
      'Thermodynamics, robotics, precision manufacturing, and sustainable energy systems.',
      2004
    ).lastInsertRowid as number;
    const bbaId = insertDept.run(
      'MBA',
      'School of Management & Analytics',
      'Dr. Hannah Abbott',
      'Keynes Executive Center',
      'Operations strategy, financial analytics, organizational leadership, and enterprise management.',
      2012
    ).lastInsertRowid as number;

    // Courses
    const insertCourse = db.prepare(
      `INSERT INTO courses (code, name, department_id, credits, duration_semesters, description) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const btechCseId = insertCourse.run(
      'B.Tech-CSE',
      'B.Tech in Computer Science & Engineering',
      cseId,
      160,
      8,
      'Four-year undergraduate engineering curriculum covering algorithms, OS, databases, and cloud systems.'
    ).lastInsertRowid as number;
    const btechDsId = insertCourse.run(
      'B.Tech-DSAI',
      'B.Tech in Data Science & AI',
      dsaiId,
      160,
      8,
      'Four-year undergraduate program focused on machine learning, data pipelines, and applied AI.'
    ).lastInsertRowid as number;
    const btechEceId = insertCourse.run(
      'B.Tech-ECE',
      'B.Tech in Electronics & Communication',
      eceId,
      160,
      8,
      'Undergraduate curriculum in microelectronics, embedded controllers, and communication protocols.'
    ).lastInsertRowid as number;
    const btechMeId = insertCourse.run(
      'B.Tech-ME',
      'B.Tech in Mechanical Engineering',
      meId,
      160,
      8,
      'Design, thermal sciences, CAD/CAM, and autonomous mechatronic systems.'
    ).lastInsertRowid as number;
    const mbaAnalyticsId = insertCourse.run(
      'MBA-BA',
      'MBA in Business Analytics',
      bbaId,
      96,
      4,
      'Graduate management degree combining corporate strategy with quantitative decision modeling.'
    ).lastInsertRowid as number;

    // Faculty
    const insertFaculty = db.prepare(
      `INSERT INTO faculty (user_id, employee_id, full_name, email, phone, department_id, designation, specialization, office_room, weekly_hours, status, avatar_url, joined_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const f1Id = insertFaculty.run(
      fac1UserId,
      'FAC-1042',
      'Prof. Clara Sterling',
      'faculty@smartcampus.edu',
      '+1 (555) 234-8810',
      cseId,
      'Associate Professor',
      'Distributed Systems & Database Internals',
      'TB-304',
      16,
      'active',
      '/src/assets/images/avatar_faculty_1795016756068.jpg',
      '2018-08-15'
    ).lastInsertRowid as number;
    const f2Id = insertFaculty.run(
      fac2UserId,
      'FAC-1089',
      'Dr. Rajesh Iyer',
      'r.iyer@smartcampus.edu',
      '+1 (555) 234-8824',
      dsaiId,
      'Professor & HOD',
      'Machine Learning & Neural Architectures',
      'SI-201',
      14,
      'active',
      null,
      '2015-01-10'
    ).lastInsertRowid as number;
    const f3Id = insertFaculty.run(
      fac3UserId,
      'FAC-1105',
      'Dr. Marcus Chen',
      'm.chen@smartcampus.edu',
      '+1 (555) 234-8840',
      eceId,
      'Professor & HOD',
      'Embedded Systems & IoT Networks',
      'ME-112',
      15,
      'active',
      null,
      '2016-07-01'
    ).lastInsertRowid as number;
    const f4Id = insertFaculty.run(
      null,
      'FAC-1130',
      'Prof. Vikram Kulkarni',
      'v.kulkarni@smartcampus.edu',
      '+1 (555) 234-8855',
      meId,
      'Associate Professor',
      'Mechatronics & Thermal Fluid Design',
      'BW-205',
      18,
      'active',
      null,
      '2019-09-01'
    ).lastInsertRowid as number;
    const f5Id = insertFaculty.run(
      null,
      'FAC-1148',
      'Dr. Hannah Abbott',
      'h.abbott@smartcampus.edu',
      '+1 (555) 234-8872',
      bbaId,
      'Professor',
      'Operations Research & Quantitative Finance',
      'KE-402',
      12,
      'active',
      null,
      '2017-02-20'
    ).lastInsertRowid as number;
    const f6Id = insertFaculty.run(
      null,
      'FAC-1174',
      'Prof. Nadia Al-Mansoor',
      'n.almansoor@smartcampus.edu',
      '+1 (555) 234-8891',
      cseId,
      'Assistant Professor',
      'Cloud Security & Computer Networks',
      'TB-218',
      16,
      'active',
      null,
      '2022-01-18'
    ).lastInsertRowid as number;

    // Subjects
    const insertSubj = db.prepare(
      `INSERT INTO subjects (code, name, department_id, course_id, semester, credits, faculty_id, schedule_slot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const subDbms = insertSubj.run('CS501', 'Database Management Systems', cseId, btechCseId, 5, 4, f1Id, 'Mon/Wed 09:30 AM').lastInsertRowid as number;
    const subAlgo = insertSubj.run('CS502', 'Design & Analysis of Algorithms', cseId, btechCseId, 5, 4, f1Id, 'Tue/Thu 11:00 AM').lastInsertRowid as number;
    const subOs = insertSubj.run('CS503', 'Operating Systems & Kernel Design', cseId, btechCseId, 5, 4, f6Id, 'Mon/Fri 02:00 PM').lastInsertRowid as number;
    const subNet = insertSubj.run('CS504', 'Computer Networks & Security', cseId, btechCseId, 5, 3, f6Id, 'Wed/Fri 11:00 AM').lastInsertRowid as number;
    const subMl = insertSubj.run('AI501', 'Applied Machine Learning', dsaiId, btechDsId, 5, 4, f2Id, 'Mon/Wed 11:00 AM').lastInsertRowid as number;
    const subNlp = insertSubj.run('AI502', 'Natural Language Processing', dsaiId, btechDsId, 5, 4, f2Id, 'Tue/Thu 02:00 PM').lastInsertRowid as number;
    const subVlsi = insertSubj.run('EC501', 'Digital VLSI Design', eceId, btechEceId, 5, 4, f3Id, 'Mon/Thu 09:30 AM').lastInsertRowid as number;
    const subEmb = insertSubj.run('EC502', 'Embedded Real-Time Systems', eceId, btechEceId, 5, 4, f3Id, 'Tue/Fri 10:30 AM').lastInsertRowid as number;
    const subRob = insertSubj.run('ME501', 'Industrial Robotics & Control', meId, btechMeId, 5, 4, f4Id, 'Mon/Wed 01:30 PM').lastInsertRowid as number;
    const subOps = insertSubj.run('MB301', 'Predictive Supply Chain Analytics', bbaId, mbaAnalyticsId, 3, 4, f5Id, 'Tue/Thu 09:30 AM').lastInsertRowid as number;

    // Students (16 realistic students)
    const insertStudent = db.prepare(
      `INSERT INTO students (user_id, usn, full_name, email, phone, department_id, course_id, semester, academic_year, status, avatar_url, address, guardian_name, guardian_phone, enrolled_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '2026-27', ?, ?, ?, ?, ?, ?)`
    );

    const studentsList: Array<{
      id: number;
      deptId: number;
      sem: number;
      attPattern: 'high' | 'mid' | 'low';
      perfTier: 'top' | 'solid' | 'support';
    }> = [];

    const s1 = insertStudent.run(
      stu1UserId, '1NB24CS042', 'Maya Lin', 'student@smartcampus.edu', '+1 (555) 401-2201',
      cseId, btechCseId, 5, 'active', '/src/assets/images/avatar_student_1795016756264.jpg',
      '412 Elmwood Terrace, Suite 4B', 'David Lin', '+1 (555) 401-9900', '2024-08-01'
    ).lastInsertRowid as number;
    studentsList.push({ id: s1, deptId: cseId, sem: 5, attPattern: 'high', perfTier: 'top' });

    const s2 = insertStudent.run(
      stu2UserId, '1NB24CS011', 'Arjun Mehta', 'arjun.mehta@smartcampus.edu', '+1 (555) 401-2202',
      cseId, btechCseId, 5, 'active', null,
      '88 Oakridge Ave', 'Suresh Mehta', '+1 (555) 401-9902', '2024-08-01'
    ).lastInsertRowid as number;
    studentsList.push({ id: s2, deptId: cseId, sem: 5, attPattern: 'low', perfTier: 'support' });

    const extraStudents = [
      { usn: '1NB24CS018', name: 'Sofia Rodriguez', email: 'sofia.r@smartcampus.edu', dept: cseId, course: btechCseId, sem: 5, att: 'high' as const, perf: 'top' as const },
      { usn: '1NB24CS027', name: 'Liam O\'Connor', email: 'liam.oc@smartcampus.edu', dept: cseId, course: btechCseId, sem: 5, att: 'mid' as const, perf: 'solid' as const },
      { usn: '1NB24CS035', name: 'Priya Nair', email: 'priya.nair@smartcampus.edu', dept: cseId, course: btechCseId, sem: 5, att: 'high' as const, perf: 'top' as const },
      { usn: '1NB24CS054', name: 'Ethan Brooks', email: 'ethan.b@smartcampus.edu', dept: cseId, course: btechCseId, sem: 5, att: 'low' as const, perf: 'support' as const },
      { usn: '1NB24CS063', name: 'Zara Khan', email: 'zara.k@smartcampus.edu', dept: cseId, course: btechCseId, sem: 5, att: 'mid' as const, perf: 'solid' as const },
      { usn: '1NB24CS071', name: 'Noah Kim', email: 'noah.kim@smartcampus.edu', dept: cseId, course: btechCseId, sem: 5, att: 'high' as const, perf: 'solid' as const },
      { usn: '1NB24AI004', name: 'Aanya Sharma', email: 'aanya.s@smartcampus.edu', dept: dsaiId, course: btechDsId, sem: 5, att: 'high' as const, perf: 'top' as const },
      { usn: '1NB24AI015', name: 'Lucas Fernandez', email: 'lucas.f@smartcampus.edu', dept: dsaiId, course: btechDsId, sem: 5, att: 'low' as const, perf: 'support' as const },
      { usn: '1NB24AI022', name: 'Chloe Dubois', email: 'chloe.d@smartcampus.edu', dept: dsaiId, course: btechDsId, sem: 5, att: 'mid' as const, perf: 'solid' as const },
      { usn: '1NB24EC009', name: 'Rohan Deshmukh', email: 'rohan.d@smartcampus.edu', dept: eceId, course: btechEceId, sem: 5, att: 'high' as const, perf: 'solid' as const },
      { usn: '1NB24EC019', name: 'Elena Petrova', email: 'elena.p@smartcampus.edu', dept: eceId, course: btechEceId, sem: 5, att: 'mid' as const, perf: 'top' as const },
      { usn: '1NB24ME006', name: 'Daniel Adeyemi', email: 'daniel.a@smartcampus.edu', dept: meId, course: btechMeId, sem: 5, att: 'high' as const, perf: 'solid' as const },
      { usn: '1NB25MB003', name: 'Olivia Bennett', email: 'olivia.b@smartcampus.edu', dept: bbaId, course: mbaAnalyticsId, sem: 3, att: 'high' as const, perf: 'top' as const },
      { usn: '1NB25MB012', name: 'Kabir Malhotra', email: 'kabir.m@smartcampus.edu', dept: bbaId, course: mbaAnalyticsId, sem: 3, att: 'mid' as const, perf: 'solid' as const },
    ];

    extraStudents.forEach((st, idx) => {
      const sid = insertStudent.run(
        null, st.usn, st.name, st.email, `+1 (555) 402-${2300 + idx}`,
        st.dept, st.course, st.sem, 'active', null,
        `${120 + idx * 7} Campus Residence Hall`, `Parent of ${st.name.split(' ')[0]}`, `+1 (555) 409-${1100 + idx}`, '2024-08-01'
      ).lastInsertRowid as number;
      studentsList.push({ id: sid, deptId: st.dept, sem: st.sem, attPattern: st.att, perfTier: st.perf });
    });

    // Attendance dates (12 class dates across Oct-Nov 2026)
    const dates = [
      '2026-10-19', '2026-10-21', '2026-10-23', '2026-10-26',
      '2026-10-28', '2026-10-30', '2026-11-02', '2026-11-04',
      '2026-11-06', '2026-11-09', '2026-11-11', '2026-11-13',
    ];

    const insertAtt = db.prepare(
      `INSERT INTO attendance (student_id, subject_id, date, status, marked_by, remarks) VALUES (?, ?, ?, ?, ?, ?)`
    );

    const subjectByDept: Record<number, number[]> = {
      [cseId]: [subDbms, subAlgo, subOs, subNet],
      [dsaiId]: [subMl, subNlp],
      [eceId]: [subVlsi, subEmb],
      [meId]: [subRob],
      [bbaId]: [subOps],
    };

    for (const st of studentsList) {
      const subs = subjectByDept[st.deptId] || [subDbms];
      for (const subId of subs) {
        dates.forEach((dt, dIdx) => {
          let status: 'present' | 'absent' | 'late' = 'present';
          if (st.attPattern === 'high') {
            status = (dIdx + st.id + subId) % 11 === 0 ? 'absent' : 'present';
          } else if (st.attPattern === 'mid') {
            status = (dIdx + st.id) % 5 === 0 ? 'absent' : (dIdx + subId) % 9 === 0 ? 'late' : 'present';
          } else {
            // low ~60-66%
            status = (dIdx + st.id) % 3 === 0 || (dIdx + subId) % 7 === 0 ? 'absent' : 'present';
          }
          insertAtt.run(st.id, subId, dt, status, fac1UserId, status === 'absent' ? 'Unexcused absence' : '');
        });
      }
    }

    // Marks
    const insertMarks = db.prepare(
      `INSERT INTO marks (student_id, subject_id, semester, internal_1, internal_2, assignment_score, external_score, total_marks, max_marks, grade, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 100, ?, ?)`
    );

    function computeGrade(total: number) {
      if (total >= 90) return 'A+';
      if (total >= 80) return 'A';
      if (total >= 70) return 'B+';
      if (total >= 60) return 'B';
      if (total >= 50) return 'C';
      return 'D';
    }

    for (const st of studentsList) {
      const subs = subjectByDept[st.deptId] || [subDbms];
      subs.forEach((subId, sIdx) => {
        let i1 = 18, i2 = 18, asg = 17, ext = 35;
        if (st.perfTier === 'top') {
          i1 = 18 + ((st.id + sIdx) % 3); // 18-20 (out of 20)
          i2 = 17 + ((st.id + sIdx) % 4); // 17-20 (out of 20)
          asg = 18 + (sIdx % 3); // 18-20 (out of 20)
          ext = 34 + ((st.id + sIdx) % 6); // 34-39 (out of 40)
        } else if (st.perfTier === 'solid') {
          i1 = 14 + ((st.id + sIdx) % 4);
          i2 = 15 + ((st.id + sIdx) % 3);
          asg = 15 + (sIdx % 4);
          ext = 28 + ((st.id + sIdx) % 6);
        } else {
          i1 = 9 + ((st.id + sIdx) % 4);
          i2 = 10 + ((st.id + sIdx) % 3);
          asg = 11 + (sIdx % 3);
          ext = 19 + ((st.id + sIdx) % 5);
        }
        const total = i1 + i2 + asg + ext;
        insertMarks.run(st.id, subId, st.sem, i1, i2, asg, ext, total, computeGrade(total), fac1UserId);
      });
    }

    // Assignments
    const insertAsg = db.prepare(
      `INSERT INTO assignments (title, subject_id, faculty_id, due_date, max_marks, description, status) VALUES (?, ?, ?, ?, ?, ?, 'published')`
    );
    insertAsg.run(
      'B+ Tree Indexing & Query Cost Optimization',
      subDbms,
      f1Id,
      '2026-11-28',
      20,
      'Design a disk-backed B+ tree index simulator and compare range-scan I/O cost against hash indexing.'
    );
    insertAsg.run(
      'Dynamic Programming & Graph Shortest Paths Lab',
      subAlgo,
      f1Id,
      '2026-12-03',
      20,
      'Implement Dijkstra and Bellman-Ford with path reconstruction and benchmark runtime on sparse vs dense graphs.'
    );
    insertAsg.run(
      'Virtual Memory Page Replacement Simulator',
      subOs,
      f6Id,
      '2026-12-06',
      25,
      'Simulate FIFO, LRU, and Clock replacement policies under realistic memory trace workloads.'
    );

    // Feedback
    const insertFb = db.prepare(
      `INSERT INTO feedback (student_id, department_id, category, subject_name, rating, comment, sentiment, sentiment_confidence, topics_json, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertFb.run(
      s1, cseId, 'Academic Teaching', 'Database Management Systems', 5,
      'Prof. Sterling explains query execution plans and normalization with crystal-clear real-world schemas. Lab sessions are well paced.',
      'positive', 0.94, JSON.stringify(['Teaching Clarity', 'Lab Sessions', 'Course Materials']), 'reviewed'
    );
    insertFb.run(
      s2, cseId, 'Laboratory Facilities', 'Operating Systems & Kernel Design', 2,
      'Workstations in Turing Lab 2 frequently stall during kernel compilation and projector calibration in TB-304 needs repair.',
      'negative', 0.89, JSON.stringify(['Lab Workstations', 'Projector Hardware', 'Infrastructure']), 'open'
    );
    insertFb.run(
      studentsList[3].id, cseId, 'Timetable & Scheduling', 'Computer Networks & Security', 3,
      'Back-to-back afternoon labs leave only 10 minutes to walk across campus buildings. A 20-minute buffer would help.',
      'neutral', 0.78, JSON.stringify(['Schedule Gaps', 'Campus Transit']), 'open'
    );
    insertFb.run(
      studentsList[8].id, dsaiId, 'Academic Teaching', 'Applied Machine Learning', 5,
      'Hands-on notebooks and weekly office hours have significantly improved our understanding of gradient boosting.',
      'positive', 0.92, JSON.stringify(['Hands-on Labs', 'Faculty Support']), 'resolved'
    );
    insertFb.run(
      studentsList[5].id, cseId, 'Campus Wi-Fi & IT', 'General Campus Services', 2,
      'Wi-Fi drops intermittently in the library atrium between 1 PM and 3 PM during peak study hours.',
      'negative', 0.91, JSON.stringify(['Campus Wi-Fi', 'Library Connectivity']), 'open'
    );
    insertFb.run(
      studentsList[11].id, eceId, 'Events & Workshops', 'Embedded Real-Time Systems', 4,
      'The FPGA hardware prototyping seminar was practical and well-organized; more kit stations would make it even better.',
      'positive', 0.84, JSON.stringify(['Workshops', 'Hardware Kits']), 'reviewed'
    );

    // Events
    const insertEvent = db.prepare(
      `INSERT INTO events (title, category, description, event_date, start_time, end_time, venue, capacity, organizer, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?)`
    );
    const ev1 = insertEvent.run(
      'Annual AI & Systems Research Symposium',
      'Seminars',
      'Keynote panels and paper presentations from faculty researchers and senior honors students on trustworthy enterprise AI.',
      '2026-11-24', '09:30', '16:30', 'Main Auditorium', 180, 'Office of Academic Research', adminId
    ).lastInsertRowid as number;
    const ev2 = insertEvent.run(
      'Cloud-Native Architecture Hands-On Workshop',
      'Workshops',
      'Practical 3-hour engineering workshop on container orchestration, observability, and distributed SQL.',
      '2026-11-27', '14:00', '17:00', 'Shannon Seminar Hall B', 45, 'Dept. of Computer Science', adminId
    ).lastInsertRowid as number;
    const ev3 = insertEvent.run(
      'GMU Winter Hackathon 2026',
      'Technical',
      '24-hour interdisciplinary collegiate software and hardware build sprint focused on campus sustainability.',
      '2026-12-04', '09:00', '18:00', 'Innovation Atrium', 120, 'ACM & IEEE Student Chapters', adminId
    ).lastInsertRowid as number;
    const ev4 = insertEvent.run(
      'Inter-Departmental Athletics & Track Meet',
      'Sports',
      'Annual track, badminton, and relay tournament across all five university academic departments.',
      '2026-12-09', '08:30', '17:30', 'University Sports Complex', 250, 'Directorate of Student Athletics', adminId
    ).lastInsertRowid as number;
    const ev5 = insertEvent.run(
      'Winter Cultural & Performing Arts Evening',
      'Cultural',
      'Classical music, contemporary theatre, and international student showcase celebrating campus diversity.',
      '2026-12-12', '17:30', '21:00', 'Grand Amphitheatre', 300, 'Student Cultural Council', adminId
    ).lastInsertRowid as number;
    const ev6 = insertEvent.run(
      'Curriculum Advisory & Industry Readiness Conclave',
      'Academic',
      'Academic senate review and career placement readiness briefing for fifth-semester engineering cohorts.',
      '2026-12-15', '10:00', '13:00', 'Keynes Executive Hall', 80, 'Career & Placement Cell', adminId
    ).lastInsertRowid as number;

    // Seed some event registrations (Maya is registered for ev1, not yet for ev2/ev3)
    const insertReg = db.prepare(
      `INSERT INTO event_registrations (event_id, user_id, student_id, status) VALUES (?, ?, ?, 'registered')`
    );
    insertReg.run(ev1, stu1UserId, s1);
    insertReg.run(ev2, stu2UserId, s2);
    insertReg.run(ev3, stu2UserId, s2);

    // Resources
    const insertResource = db.prepare(
      `INSERT INTO resources (name, code, type, building, capacity, status, specifications) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const res1 = insertResource.run('Lecture Hall TB-101', 'RES-TB101', 'Classroom', 'Turing Academic Block', 70, 'available', 'Dual 4K laser projectors, lecture capture mic, tiered seating').lastInsertRowid as number;
    const res2 = insertResource.run('Systems & Database Lab 2', 'RES-LAB02', 'Laboratory', 'Turing Academic Block', 48, 'available', '48 Linux/Windows dual-boot workstations, 10GbE LAN').lastInsertRowid as number;
    const res3 = insertResource.run('Shannon Seminar Hall B', 'RES-SHB', 'Seminar Hall', 'Shannon Innovation Wing', 120, 'available', 'Acoustic paneling, stage audio, hybrid conferencing array').lastInsertRowid as number;
    const res4 = insertResource.run('AI Compute & GPU Cluster Lab', 'RES-AILAB', 'Laboratory', 'Shannon Innovation Wing', 36, 'available', '36 workstations + local inference cluster nodes').lastInsertRowid as number;
    const res5 = insertResource.run('Portable Laser Projector Unit #4', 'RES-PROJ04', 'Projector', 'Central Media Store', 1, 'available', '5000 lumens WUXGA HDMI/USB-C wireless cast').lastInsertRowid as number;
    const res6 = insertResource.run('VLSI & FPGA Prototyping Lab', 'RES-ECLAB', 'Laboratory', 'Maxwell Engineering Hall', 40, 'maintenance', 'Oscilloscope benches undergoing annual calibration').lastInsertRowid as number;
    const res7 = insertResource.run('Main University Auditorium', 'RES-AUD01', 'Seminar Hall', 'Central Administrative Wing', 400, 'available', 'Full theatrical lighting, Dolby line-array audio, live stream deck').lastInsertRowid as number;
    const res8 = insertResource.run('Executive Conference Room KE-105', 'RES-KE105', 'Classroom', 'Keynes Executive Center', 28, 'available', 'Interactive 86-inch display, boardroom seating').lastInsertRowid as number;

    // Resource Bookings
    const insertBooking = db.prepare(
      `INSERT INTO resource_bookings (resource_id, booked_by, booking_date, start_time, end_time, purpose, status) VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`
    );
    insertBooking.run(res1, fac1UserId, '2026-11-20', '09:30', '11:00', 'CS501 Database Indexing Lecture');
    insertBooking.run(res2, fac1UserId, '2026-11-20', '14:00', '16:00', 'CS501 Query Optimization Lab');
    insertBooking.run(res3, adminId, '2026-11-27', '13:30', '17:30', 'Cloud-Native Architecture Hands-On Workshop');
    insertBooking.run(res4, fac2UserId, '2026-11-21', '10:00', '12:30', 'AI501 Model Training Practicum');
    insertBooking.run(res7, adminId, '2026-11-24', '09:00', '17:00', 'Annual AI & Systems Research Symposium');

    // Announcements
    const insertAnn = db.prepare(
      `INSERT INTO announcements (title, body, category, target_role, priority, author_name, author_id, is_pinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertAnn.run(
      'End-Semester Practical Examination Schedule Published',
      'All fifth-semester laboratory assessments will run from December 8 to December 14, 2026. Students must carry valid university ID cards and completed lab journals.',
      'Examinations', 'all', 'important', 'Dr. Eleanor Vance', adminId, 1
    );
    insertAnn.run(
      'Minimum Attendance Advisory (75% Policy Benchmark)',
      'Students whose cumulative subject attendance is below 75% as of November 25 must meet their respective faculty advisors to review make-up lab schedules.',
      'Academic Policy', 'student', 'urgent', 'Office of the Dean of Academics', adminId, 1
    );
    insertAnn.run(
      'Faculty Internal Marks Lock Deadline: November 30',
      'Course coordinators are requested to finalize Internal Assessment 1, Internal Assessment 2, and Assignment scores in the Performance module before 5:00 PM on November 30.',
      'Faculty Notice', 'faculty', 'important', 'Dr. Eleanor Vance', adminId, 0
    );
    insertAnn.run(
      'Annual AI & Systems Research Symposium Open for Registration',
      'Seats are filling fast for the November 24 keynote symposium at the Main Auditorium. Register directly via the Campus Events module.',
      'Campus Events', 'all', 'normal', 'Office of Academic Research', adminId, 0
    );

    // Notifications for demo accounts
    const insertNotif = db.prepare(
      `INSERT INTO notifications (user_id, title, message, category, is_read, link_module) VALUES (?, ?, ?, ?, ?, ?)`
    );
    insertNotif.run(adminId, '3 Students Flagged Below 75% Attendance', 'AI Attendance Analysis detected 3 students requiring advisor follow-up.', 'Attendance', 0, 'attendance');
    insertNotif.run(adminId, 'New Negative Feedback Reported', 'Workstation and Wi-Fi issues logged in CSE Feedback queue.', 'Feedback', 0, 'feedback');
    insertNotif.run(fac1UserId, 'Internal Marks Deadline Approaching', 'CS501 & CS502 internal assessment entries due Nov 30.', 'Academics', 0, 'performance');
    insertNotif.run(fac1UserId, 'Lab Booking Confirmed', 'Systems & Database Lab 2 reserved for Nov 20, 14:00–16:00.', 'Resources', 1, 'resources');
    insertNotif.run(stu1UserId, 'Assignment Due: B+ Tree Indexing', 'CS501 assignment submission closes on Nov 28, 2026.', 'Assignments', 0, 'performance');
    insertNotif.run(stu1UserId, 'Event Reminder: Research Symposium', 'You are registered for the Annual AI & Systems Symposium on Nov 24.', 'Events', 0, 'events');

    // Audit Logs
    const insertAudit = db.prepare(
      `INSERT INTO audit_logs (user_id, actor_name, actor_role, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    insertAudit.run(adminId, 'Dr. Eleanor Vance', 'admin', 'SYSTEM_INIT', 'system', '1', 'Initialized GM University academic cycle 2026-27');
    insertAudit.run(fac1UserId, 'Prof. Clara Sterling', 'faculty', 'ATTENDANCE_BATCH', 'attendance', 'CS501', 'Recorded attendance for 8 students in CS501');
    insertAudit.run(adminId, 'Dr. Eleanor Vance', 'admin', 'EVENT_CREATE', 'events', String(ev1), 'Published Annual AI & Systems Research Symposium');
  });

  runSeed();
}
