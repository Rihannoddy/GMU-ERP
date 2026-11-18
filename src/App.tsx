/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ModuleId, UserRole } from './types/erp';
import { LoginPage } from './pages/LoginPage';
import { ErpLayout, NAV_GROUPS } from './components/layout/ErpLayout';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { FacultyPage } from './pages/FacultyPage';
import { AcademicsPage } from './pages/AcademicsPage';
import { AttendancePage } from './pages/AttendancePage';
import { PerformancePage } from './pages/PerformancePage';
import { CampusAiPage } from './pages/CampusAiPage';
import { AcademicAssistPage } from './pages/AcademicAssistPage';
import { ContentGeneratorPage } from './pages/ContentGeneratorPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { EventsPage } from './pages/EventsPage';
import { CareerGuidancePage } from './pages/CareerGuidancePage';
import { ResourcesPage } from './pages/ResourcesPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { ProfilePage } from './pages/ProfilePage';

function isModuleAllowed(moduleId: ModuleId, role: UserRole): boolean {
  if (moduleId === 'profile') return true;
  for (const g of NAV_GROUPS) {
    const found = g.items.find((i) => i.id === moduleId);
    if (found) return found.roles.includes(role);
  }
  return false;
}

function AppRouter() {
  const { user, loading } = useAuth();
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');

  useEffect(() => {
    if (user && !isModuleAllowed(activeModule, user.role)) {
      setActiveModule('dashboard');
    }
  }, [user, activeModule]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6F8] flex items-center justify-center">
        <div className="text-center space-y-3">
          <img
            src="/assets/aistudio/gmu-logo_77c534fb.png"
            alt="GM University Logo"
            className="w-14 h-14 rounded-lg object-cover mx-auto border border-[#D4A545]/50 shadow-sm bg-[#541B1E]"
          />
          <div className="w-6 h-6 border-2 border-[#D99A32] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-[#738091]">Loading GMU ERP Management...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const navigate = (m: ModuleId) => {
    if (!isModuleAllowed(m, user.role)) {
      setActiveModule('dashboard');
      return;
    }
    setActiveModule(m);
  };

  const renderModule = () => {
    if (!isModuleAllowed(activeModule, user.role)) {
      return (
        <div className="bg-white border border-[#E5E9EF] rounded-lg p-8 text-center">
          <h2 className="text-base font-semibold text-[#202B38]">Access Restricted</h2>
          <p className="text-xs text-[#738091] mt-1">
            Your current role ({user.role}) is not authorized to open this module.
          </p>
          <button
            type="button"
            onClick={() => setActiveModule('dashboard')}
            className="mt-4 px-4 py-2 text-xs font-medium bg-[#D99A32] text-white rounded-md"
          >
            Return to Dashboard
          </button>
        </div>
      );
    }

    switch (activeModule) {
      case 'dashboard':
        return <DashboardPage onNavigate={navigate} />;
      case 'students':
        return <StudentsPage />;
      case 'faculty':
        return <FacultyPage />;
      case 'academics':
        return <AcademicsPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'performance':
        return <PerformancePage />;
      case 'campus-ai':
        return <CampusAiPage />;
      case 'academic-assist':
        return <AcademicAssistPage />;
      case 'content-gen':
        return <ContentGeneratorPage />;
      case 'feedback':
        return <FeedbackPage />;
      case 'career-guidance':
        return <CareerGuidancePage />;
      case 'events':
        return <EventsPage />;
      case 'resources':
        return <ResourcesPage />;
      case 'announcements':
        return <AnnouncementsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'user-management':
        return <AdminSettingsPage mode="users" />;
      case 'system-settings':
        return <AdminSettingsPage mode="settings" />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <DashboardPage onNavigate={navigate} />;
    }
  };

  return (
    <ErpLayout activeModule={activeModule} onNavigate={navigate}>
      {renderModule()}
    </ErpLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ToastProvider>
  );
}
