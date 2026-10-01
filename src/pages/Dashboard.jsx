// web/src/pages/Dashboard.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

// existing pages we already have
import AccountingDashboard from './AccountingDashboard.jsx';
import RecruitmentDashboard from './RecruitmentDashboard.jsx';
import MGDashboard from './MGDashboard.jsx';
import CoordinatorDashboard from './CoordinatorDashboard.jsx';
import HeadOfCreativeDashboard from './HeadOfCreativeDashboard.jsx';

// new lightweight dashboards below
import AdminOverview from './dash/AdminOverview.jsx';
import AdmissionDashboard from './dash/AdmissionDashboard.jsx';
import DMDashboard from './dash/DMDashboard.jsx';
import MyLite from './dash/MyLite.jsx';
import SeminarNoticeBoard from '../components/SeminarNoticeBoard.jsx';

// Every role's dashboard gets the seminar notice board on top
export default function Dashboard() {
  return (
    <>
      <SeminarNoticeBoard />
      <RoleDashboard />
    </>
  );
}

function RoleDashboard() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === 'SuperAdmin' || role === 'Admin') return <AdminOverview />;
  if (role === 'Accountant') return <AccountingDashboard />;
  if (role === 'Recruitment') return <RecruitmentDashboard />;
  if (role === 'MotionGraphics') return <MGDashboard />;
  if (role === 'Admission') return <AdmissionDashboard />;
  if (role === 'DigitalMarketing') return <DMDashboard />;
  if (role === 'HeadOfCreative') return <HeadOfCreativeDashboard />;
  if (role === 'Coordinator') return <CoordinatorDashboard />;
  if (role === 'ITAdmin') return <MyLite />;  // Simple dashboard for IT Admin

  // default fallback
  return <MyLite />;
}
