export type UserRole = 'admin' | 'faculty' | 'student';

export type ModuleId =
  | 'dashboard'
  | 'students'
  | 'faculty'
  | 'academics'
  | 'attendance'
  | 'performance'
  | 'campus-ai'
  | 'academic-assist'
  | 'content-gen'
  | 'feedback'
  | 'career-guidance'
  | 'events'
  | 'resources'
  | 'announcements'
  | 'reports'
  | 'user-management'
  | 'system-settings'
  | 'profile';

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
  status: string;
  student_id?: number | null;
  faculty_id?: number | null;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  head_name: string;
  building: string;
  description: string;
  established_year: number;
  student_count?: number;
  faculty_count?: number;
  course_count?: number;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  department_id: number;
  dept_code?: string;
  department_name?: string;
  credits: number;
  duration_semesters: number;
  description: string;
  enrolled_count?: number;
}

export interface Subject {
  id: number;
  code: string;
  name: string;
  department_id: number;
  dept_code?: string;
  course_id: number;
  course_code?: string;
  semester: number;
  credits: number;
  faculty_id: number | null;
  faculty_name?: string | null;
  schedule_slot: string;
}

export interface StudentRecord {
  id: number;
  user_id: number | null;
  usn: string;
  full_name: string;
  email: string;
  phone: string;
  department_id: number;
  department_name?: string;
  dept_code?: string;
  course_id: number;
  course_name?: string;
  course_code?: string;
  semester: number;
  academic_year: string;
  status: 'active' | 'inactive' | 'graduated';
  avatar_url: string | null;
  address: string;
  guardian_name: string;
  guardian_phone: string;
  enrolled_date: string;
  attendance_pct?: number;
  avg_marks?: number;
}

export interface FacultyRecord {
  id: number;
  user_id: number | null;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  department_id: number;
  department_name?: string;
  dept_code?: string;
  designation: string;
  specialization: string;
  office_room: string;
  weekly_hours: number;
  status: 'active' | 'on_leave' | 'inactive';
  avatar_url: string | null;
  joined_date: string;
  subject_count?: number;
  assigned_subjects_text?: string;
}

export interface CampusEvent {
  id: number;
  title: string;
  category: 'Academic' | 'Cultural' | 'Technical' | 'Sports' | 'Workshops' | 'Seminars';
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  capacity: number;
  organizer: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  registered_count: number;
  is_registered?: number | boolean;
}

export interface ResourceItem {
  id: number;
  name: string;
  code: string;
  type: string;
  building: string;
  capacity: number;
  status: 'available' | 'maintenance' | 'retired';
  specifications: string;
  booking_count?: number;
}

export interface ResourceBooking {
  id: number;
  resource_id: number;
  resource_name: string;
  resource_code: string;
  building: string;
  booked_by: number;
  booked_by_name: string;
  booked_by_role: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: 'confirmed' | 'cancelled' | 'completed';
}

export interface AnnouncementItem {
  id: number;
  title: string;
  body: string;
  category: string;
  target_role: 'all' | 'student' | 'faculty' | 'admin';
  priority: 'normal' | 'important' | 'urgent';
  author_name: string;
  is_pinned: number;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  category: string;
  is_read: number;
  link_module: ModuleId;
  created_at: string;
}

export interface FeedbackItem {
  id: number;
  student_id: number | null;
  student_name?: string;
  usn?: string;
  department_id: number | null;
  dept_code?: string;
  department_name?: string;
  category: string;
  subject_name: string;
  rating: number;
  comment: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentiment_confidence: number;
  topics: string[];
  status: 'open' | 'reviewed' | 'resolved';
  created_at: string;
}
