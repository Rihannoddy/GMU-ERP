import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  Calendar,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareHeart,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  UserCircle,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { ModuleId, NotificationItem, UserRole } from '../../types/erp';
import { Modal } from '../ui/Modal';

interface NavItem {
  id: ModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'faculty', 'student'] }],
  },
  {
    heading: 'Academic',
    items: [
      { id: 'students', label: 'Students', icon: Users, roles: ['admin', 'faculty'] },
      { id: 'faculty', label: 'Faculty', icon: GraduationCap, roles: ['admin', 'faculty', 'student'] },
      { id: 'academics', label: 'Departments & Courses', icon: BookOpen, roles: ['admin', 'faculty', 'student'] },
      { id: 'attendance', label: 'Attendance', icon: ClipboardCheck, roles: ['admin', 'faculty', 'student'] },
      { id: 'performance', label: 'Performance', icon: TrendingUp, roles: ['admin', 'faculty', 'student'] },
    ],
  },
  {
    heading: 'AI Intelligence',
    items: [
      { id: 'campus-ai', label: 'Campus AI Assistant', icon: Bot, roles: ['admin', 'faculty', 'student'] },
      { id: 'academic-assist', label: 'Academic Assistance', icon: Sparkles, roles: ['admin', 'faculty', 'student'] },
      { id: 'content-gen', label: 'AI Content Generator', icon: FileText, roles: ['admin', 'faculty'] },
      { id: 'feedback', label: 'Feedback Analysis', icon: MessageSquareHeart, roles: ['admin', 'faculty', 'student'] },
      { id: 'career-guidance', label: 'Career Guidance', icon: Briefcase, roles: ['admin', 'student'] },
    ],
  },
  {
    heading: 'Campus Operations',
    items: [
      { id: 'events', label: 'Events', icon: Calendar, roles: ['admin', 'faculty', 'student'] },
      { id: 'resources', label: 'Resources', icon: Building2, roles: ['admin', 'faculty', 'student'] },
      { id: 'announcements', label: 'Announcements', icon: Megaphone, roles: ['admin', 'faculty', 'student'] },
    ],
  },
  {
    heading: 'Insights',
    items: [{ id: 'reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['admin', 'faculty'] }],
  },
  {
    heading: 'Administration',
    items: [
      { id: 'user-management', label: 'User Management', icon: UserCog, roles: ['admin'] },
      { id: 'system-settings', label: 'System Settings', icon: Settings, roles: ['admin'] },
    ],
  },
];

export const MODULE_META: Record<ModuleId, { title: string; breadcrumb: string; description: string }> = {
  dashboard: {
    title: 'Institutional Workspace',
    breadcrumb: 'Overview / Dashboard',
    description: 'Real-time academic operations, metrics, and role-specific priorities.',
  },
  students: {
    title: 'Student Management',
    breadcrumb: 'Academic / Students',
    description: 'Student directory, enrollment records, academic history, and individual profiles.',
  },
  faculty: {
    title: 'Faculty Directory & Workload',
    breadcrumb: 'Academic / Faculty',
    description: 'Academic staff profiles, subject allocations, and weekly teaching schedules.',
  },
  academics: {
    title: 'Departments & Course Catalog',
    breadcrumb: 'Academic / Departments & Courses',
    description: 'University departments, degree programs, semester structure, and subject mappings.',
  },
  attendance: {
    title: 'Attendance & AI Analysis',
    breadcrumb: 'Academic / Attendance',
    description: 'Subject-wise attendance tracking, threshold monitoring, and AI pattern insights.',
  },
  performance: {
    title: 'Student Performance Analysis',
    breadcrumb: 'Academic / Performance',
    description: 'Assessment marks entry, grade calculations, and AI academic recommendations.',
  },
  'campus-ai': {
    title: 'Campus AI Assistant',
    breadcrumb: 'AI Intelligence / Campus AI Assistant',
    description: 'Context-aware assistant for academic, administrative, and campus inquiries.',
  },
  'academic-assist': {
    title: 'AI Academic Assistance',
    breadcrumb: 'AI Intelligence / Academic Assistance',
    description: 'Generate study notes, topic summaries, practice quizzes, and descriptive questions.',
  },
  'content-gen': {
    title: 'AI Content Generator',
    breadcrumb: 'AI Intelligence / AI Content Generator',
    description: 'Draft assignments, department notices, announcements, and academic reports.',
  },
  feedback: {
    title: 'Feedback & AI Sentiment Analysis',
    breadcrumb: 'AI Intelligence / Feedback Analysis',
    description: 'Campus feedback collection, sentiment breakdown, and institutional improvement themes.',
  },
  'career-guidance': {
    title: 'Career Guidance Studio',
    breadcrumb: 'AI Intelligence / Career Guidance',
    description: 'Advisory career roadmaps, role recommendations, skill gaps, and certification paths.',
  },
  events: {
    title: 'Campus Events & Calendar',
    breadcrumb: 'Campus Operations / Events',
    description: 'University symposia, workshops, cultural programs, and capacity-managed registration.',
  },
  resources: {
    title: 'Campus Resource Management',
    breadcrumb: 'Campus Operations / Resources',
    description: 'Classrooms, laboratories, equipment inventory, and conflict-checked room bookings.',
  },
  announcements: {
    title: 'Announcements & Notices',
    breadcrumb: 'Campus Operations / Announcements',
    description: 'Official institutional bulletins, exam advisories, and role-targeted notices.',
  },
  reports: {
    title: 'Reports & Analytics',
    breadcrumb: 'Insights / Reports & Analytics',
    description: 'Filterable institutional datasets with CSV export and print-ready formatting.',
  },
  'user-management': {
    title: 'User & Access Management',
    breadcrumb: 'Administration / User Management',
    description: 'Manage platform user accounts, role assignments, and account activation status.',
  },
  'system-settings': {
    title: 'System Settings & Audit Log',
    breadcrumb: 'Administration / System Settings',
    description: 'Configure institutional benchmarks, academic cycle, and review security audit logs.',
  },
  profile: {
    title: 'Profile & Account Settings',
    breadcrumb: 'Account / Profile',
    description: 'Manage your university identity details and review role permissions.',
  },
};

export function ErpLayout({
  activeModule,
  onNavigate,
  children,
}: {
  activeModule: ModuleId;
  onNavigate: (m: ModuleId) => void;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ type: string; id: number; title: string; subtitle: string; module: ModuleId }>>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const data = await apiFetch<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [activeModule]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await apiFetch<{ results: any[] }>(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchResults(res.results);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const markRead = async (n: NotificationItem) => {
    if (!n.is_read) {
      await apiFetch(`/notifications/${n.id}/read`, { method: 'PATCH' });
      loadNotifications();
    }
    setNotifOpen(false);
    if (n.link_module) onNavigate(n.link_module);
  };

  const markAllRead = async () => {
    await apiFetch('/notifications/read-all', { method: 'PATCH' });
    loadNotifications();
  };

  const roleLabel = user?.role === 'admin' ? 'Administrator' : user?.role === 'faculty' ? 'Faculty' : 'Student';
  const meta = MODULE_META[activeModule];

  const allAllowedModules = NAV_GROUPS.flatMap((g) =>
    g.items.filter((it) => user && it.roles.includes(user.role))
  );

  const renderNavContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-[#172332] text-white select-none">
      <div className="h-16 px-3.5 flex items-center justify-between border-b border-white/10 shrink-0">
        <button
          type="button"
          onClick={() => {
            onNavigate('dashboard');
            if (isMobile) setMobileOpen(false);
          }}
          className="flex items-center gap-2.5 text-left min-w-0"
        >
          <img
            src="/assets/aistudio/gmu-logo_77c534fb.png"
            alt="GM University Logo"
            className="w-9 h-9 rounded-md object-cover border border-[#D4A545]/50 bg-[#541B1E] shrink-0"
          />
          {(!collapsed || isMobile) && (
            <div className="min-w-0">
              <span className="font-display text-sm font-semibold tracking-tight block truncate text-white leading-tight">
                GMU ERP Management
              </span>
              <span className="text-[10px] text-[#E8C574] block truncate">GM University</span>
            </div>
          )}
        </button>

        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-white/70 hover:text-white rounded"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 text-white/60 hover:text-white rounded hover:bg-white/10 transition-colors hidden lg:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5">
        {NAV_GROUPS.map((group) => {
          const allowedItems = group.items.filter((it) => user && it.roles.includes(user.role));
          if (allowedItems.length === 0) return null;
          return (
            <div key={group.heading}>
              {(!collapsed || isMobile) && (
                <p className="px-3 mb-1.5 text-[11px] font-semibold tracking-wider text-white/45 uppercase">
                  {group.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {allowedItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigate(item.id);
                        if (isMobile) setMobileOpen(false);
                      }}
                      title={collapsed && !isMobile ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-[#D99A32] text-[#172332] font-semibold'
                          : 'text-white/80 hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 shrink-0 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            onNavigate('profile');
            if (isMobile) setMobileOpen(false);
          }}
          className="flex-1 min-w-0 flex items-center gap-2.5 p-2 rounded-md hover:bg-white/8 transition-colors text-left"
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/20"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {user?.full_name.slice(0, 2).toUpperCase()}
            </div>
          )}
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-[11px] text-white/60 truncate">{roleLabel}</p>
            </div>
          )}
        </button>
        {(!collapsed || isMobile) && (
          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            aria-label="Sign out"
            className="p-2 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 no-print ${
          collapsed ? 'w-[70px]' : 'w-[256px]'
        }`}
      >
        <div className={`fixed top-0 bottom-0 left-0 z-30 transition-all duration-200 ${collapsed ? 'w-[70px]' : 'w-[256px]'}`}>
          {renderNavContent(false)}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-[#172332]/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-[264px] max-w-[85vw] h-full z-10">{renderNavContent(true)}</div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-[#E5E9EF] px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-md border border-[#E5E9EF] text-[#202B38] hover:bg-[#F5F6F8]"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-[#738091] min-w-0">
              {activeModule !== 'dashboard' && (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard')}
                    className="hover:text-[#202B38] font-medium transition-colors whitespace-nowrap"
                  >
                    Home
                  </button>
                  <span aria-hidden="true">/</span>
                </>
              )}
              <p className="truncate font-medium text-[#202B38] sm:text-[#738091]">{meta.breadcrumb}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Mobile Search Button */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="md:hidden p-2 rounded-md text-[#738091] hover:text-[#202B38] hover:bg-[#F5F6F8] transition-colors"
              aria-label="Search GMU ERP"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Global Search */}
            <div ref={searchRef} className="relative hidden md:block w-72">
              <Search className="w-4 h-4 text-[#738091] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search or jump to module... (Ctrl+K)"
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F5F6F8] border border-[#E5E9EF] rounded-md text-[#202B38] placeholder:text-[#738091] focus:outline-none focus:bg-white focus:border-[#D99A32]"
              />
              {searchOpen && (
                <div className="absolute right-0 left-0 mt-1.5 bg-white border border-[#E5E9EF] rounded-md shadow-lg py-1.5 z-40 max-h-80 overflow-y-auto">
                  {searchQuery.trim().length < 2 ? (
                    <div className="py-1">
                      <p className="px-3 py-1 text-[11px] font-semibold text-[#738091]">Quick Jump to Module</p>
                      {allAllowedModules
                        .filter((m) =>
                          !searchQuery.trim()
                            ? true
                            : m.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
                        )
                        .slice(0, 6)
                        .map((m) => {
                          const Icon = m.icon;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSearchOpen(false);
                                setSearchQuery('');
                                onNavigate(m.id);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-[#F5F6F8] flex items-center gap-2.5 text-xs text-[#202B38]"
                            >
                              <Icon className="w-3.5 h-3.5 text-[#D99A32] shrink-0" />
                              <span className="truncate font-medium">{m.label}</span>
                            </button>
                          );
                        })}
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="px-3 py-2.5 text-xs text-[#738091]">No matching campus records found.</p>
                  ) : (
                    searchResults.map((r, idx) => (
                      <button
                        key={`${r.type}-${r.id}-${idx}`}
                        type="button"
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery('');
                          onNavigate(r.module);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-[#F5F6F8] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#202B38] truncate">{r.title}</p>
                          <p className="text-[11px] text-[#738091] truncate">{r.subtitle}</p>
                        </div>
                        <span className="text-[11px] font-medium text-[#477BAA] shrink-0">{r.type}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Help */}
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#738091] hover:text-[#202B38] hover:bg-[#F5F6F8] transition-colors"
              aria-label="Help and quick guide"
              title="Quick Guide"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden xl:inline">Guide</span>
            </button>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 rounded-md text-[#738091] hover:text-[#202B38] hover:bg-[#F5F6F8] transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#D99A32] text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E5E9EF] rounded-lg shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[#E5E9EF] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#202B38]">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#477BAA] hover:underline"
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#E5E9EF]">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-[#738091] text-center">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => markRead(n)}
                          className={`w-full text-left px-4 py-3 hover:bg-[#F5F6F8] transition-colors ${
                            !n.is_read ? 'bg-[#D99A32]/5' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-[#202B38] truncate">{n.title}</span>
                            {!n.is_read && <span className="text-[10px] font-semibold text-[#D99A32] shrink-0">New</span>}
                          </div>
                          <p className="text-[11px] text-[#738091] mt-0.5 line-clamp-2">{n.message}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((o) => !o)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-md border border-[#E5E9EF] hover:bg-[#F5F6F8] transition-colors"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <UserCircle className="w-5 h-5 text-[#738091]" />
                )}
                <span className="text-xs font-medium text-[#202B38] hidden sm:inline whitespace-nowrap">
                  {user?.full_name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#738091]" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E5E9EF] rounded-lg shadow-lg py-1.5 z-40">
                  <div className="px-3.5 py-2 border-b border-[#E5E9EF]">
                    <p className="text-xs font-semibold text-[#202B38] truncate">{user?.full_name}</p>
                    <p className="text-[11px] text-[#738091] truncate">{user?.email}</p>
                    <p className="text-[11px] font-medium text-[#D99A32] mt-0.5">{roleLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onNavigate('profile');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-[#202B38] hover:bg-[#F5F6F8] flex items-center gap-2"
                  >
                    <UserCircle className="w-3.5 h-3.5 text-[#738091]" />
                    <span>Profile &amp; Account Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-[#D9534F] hover:bg-[#F5F6F8] flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Search Modal */}
      <Modal
        open={mobileSearchOpen}
        onClose={() => setMobileSearchOpen(false)}
        title="Search GMU ERP Management"
        subtitle="Find students, courses, events, or jump to any module."
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#738091] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type a student, course, or event name..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F5F6F8] border border-[#E5E9EF] rounded-md text-[#202B38] focus:outline-none focus:bg-white focus:border-[#D99A32]"
            />
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-[#E5E9EF]">
            {searchQuery.trim().length < 2 ? (
              allAllowedModules.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMobileSearchOpen(false);
                      setSearchQuery('');
                      onNavigate(m.id);
                    }}
                    className="w-full py-2.5 px-2 text-left hover:bg-[#F5F6F8] flex items-center gap-2.5 text-xs text-[#202B38]"
                  >
                    <Icon className="w-4 h-4 text-[#D99A32]" />
                    <span className="font-medium">{m.label}</span>
                  </button>
                );
              })
            ) : searchResults.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#738091]">No matching campus records found.</p>
            ) : (
              searchResults.map((r, idx) => (
                <button
                  key={`${r.type}-${r.id}-${idx}`}
                  type="button"
                  onClick={() => {
                    setMobileSearchOpen(false);
                    setSearchQuery('');
                    onNavigate(r.module);
                  }}
                  className="w-full py-2.5 px-2 text-left hover:bg-[#F5F6F8] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#202B38] truncate">{r.title}</p>
                    <p className="text-[11px] text-[#738091] truncate">{r.subtitle}</p>
                  </div>
                  <span className="text-[11px] font-medium text-[#477BAA] shrink-0">{r.type}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Help Modal */}
      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="GMU ERP Management — Quick Guide"
        subtitle={`Signed in as ${roleLabel} (${user?.email})`}
      >
        <div className="space-y-4 text-xs text-[#202B38] leading-relaxed">
          <div>
            <h4 className="font-semibold text-sm mb-1">Your Workspace Capabilities</h4>
            <p className="text-[#738091]">
              {user?.role === 'admin' &&
                'Administrators have complete institution-wide access to student & faculty records, departments, attendance & performance analytics, resource inventory, events, reports, user roles, and system settings.'}
              {user?.role === 'faculty' &&
                'Faculty members can mark subject attendance, record internal/external marks, publish assignments, book classrooms/labs, view department directories, and use AI teaching tools.'}
              {user?.role === 'student' &&
                'Students can track personal attendance and marks, submit campus feedback, register for events, use the Campus AI Assistant, generate study notes & quizzes, and explore career guidance.'}
            </p>
          </div>
          <div className="border-t border-[#E5E9EF] pt-3">
            <h4 className="font-semibold text-sm mb-2">Quick Jump Shortcuts</h4>
            <div className="grid grid-cols-2 gap-2">
              {allAllowedModules.slice(0, 6).map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setHelpOpen(false);
                      onNavigate(m.id);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#F5F6F8] hover:bg-[#E5E9EF]/70 text-left transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 text-[#D99A32] shrink-0" />
                    <span className="font-medium truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-t border-[#E5E9EF] pt-3">
            <h4 className="font-semibold text-sm mb-1">Helpful Tips</h4>
            <p className="text-[#738091]">
              Press <span className="font-mono font-medium text-[#202B38]">Ctrl+K</span> anytime to search students, courses, and events or jump straight to any module. All AI outputs visibly indicate whether they use Live Gemini AI or Demo Mode.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
