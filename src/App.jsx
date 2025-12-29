// web/src/App.jsx
import React, { useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import Topbar from './components/Topbar.jsx';
import Sidebar from './components/Sidebar.jsx';

import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import AssignTasks from './pages/AssignTasks.jsx';
import MyTasks from './pages/MyTasks.jsx';
import TasksKanban from './pages/TasksKanban.jsx';
import Employees from './pages/Employees.jsx';
import Courses from './pages/Courses.jsx';
import ReportsView from './pages/ReportsView.jsx';
import LeadsCenterView from './pages/LeadsCenterView.jsx';

import LeadEntry from './pages/LeadEntry.jsx';
import LeadsCenter from './pages/LeadsCenter.jsx';
import DMMetrics from './pages/DMMetrics.jsx';
import DMDashboard from './pages/dash/DMDashboard.jsx';

import AdmissionPipeline from './pages/AdmissionPipeline.jsx';
import AdmissionFees from './pages/AdmissionFees.jsx';
import AdmissionMetrics from './pages/AdmissionMetrics.jsx';

import AccountingDashboard from './pages/AccountingDashboard.jsx';
import FeesApproval from './pages/FeesApproval.jsx';
import DueCollectionApproval from './pages/DueCollectionApproval.jsx';
import IncomePage from './pages/Income.jsx';
import ExpensePage from './pages/Expense.jsx';
import BankManage from './pages/BankManage.jsx';
import AdmissionDashboard from './pages/dash/AdmissionDashboard.jsx';
import EmployeeBank from './pages/employee/EmployeeBank.jsx';
import EmployeeSalary from './pages/employee/EmployeeSalary.jsx';

// === Recruitment pages ===
import RecruitmentDashboard from './pages/RecruitmentDashboard.jsx';
import Candidates from './pages/Candidates.jsx';
import JobPositions from './pages/JobPositions.jsx';
import Employers from './pages/Employers.jsx';
import RecruitIncome from './pages/RecruitIncome.jsx';
import RecruitExpenses from './pages/RecruitExpenses.jsx';

// === Motion Graphics pages ===
import MGDashboard from './pages/MGDashboard.jsx';
import MGProduction from './pages/MGProduction.jsx';

// === Coordinator pages ===
import CoordinatorDashboard from './pages/CoordinatorDashboard.jsx';
import DueFeesCollection from './pages/DueFeesCollection.jsx';
import PaymentNotifications from './pages/PaymentNotifications.jsx';

// === Leave & TA/DA pages ===
import MyApplications from './pages/MyApplications.jsx';
import AdminApprovals from './pages/AdminApprovals.jsx';
import TADAPayments from './pages/TADAPayments.jsx';
import Notifications from './pages/Notifications.jsx';

import Messages from './pages/Messages.jsx';
import TaskReport from './pages/TaskReport.jsx';
import AdminTaskReport from './pages/AdminTaskReport.jsx';
import Targets from './pages/Targets.jsx';
import MyTargets from './pages/MyTargets.jsx';
import Batches from './pages/Batches.jsx';

import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Activity from './pages/Activity.jsx';

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#f7f9fc]">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 md:p-6 flex-1 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-tasks" element={<MyTasks />} />
          <Route path="/tasks-board" element={<TasksKanban />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/task-report" element={<TaskReport />} />

          {/* My Applications - All employees except SuperAdmin */}
          <Route element={<RoleRoute roles={['Admin', 'Accountant', 'Admission', 'Recruitment', 'DigitalMarketing', 'MotionGraphics', 'Coordinator']} />}>
            <Route path="/my-applications" element={<MyApplications />} />
          </Route>

          {/* Notifications - All authenticated users */}
          <Route path="/notifications" element={<Notifications />} />

          {/* SA/Admin */}
          <Route element={<RoleRoute roles={['SuperAdmin', 'Admin']} />}>
            <Route path="/assign-tasks" element={<AssignTasks />} />
            <Route path="/reports-view" element={<ReportsView />} />
            <Route path="/admin-task-report" element={<AdminTaskReport />} />
            <Route path="/admission-targets" element={<Targets />} />
            <Route path="/admin/approvals" element={<AdminApprovals />} />
          </Route>

          {/* SA/Admin/ITAdmin */}
          <Route element={<RoleRoute roles={['SuperAdmin', 'Admin', 'ITAdmin']} />}>
            <Route path="/employees" element={<Employees />} />
            <Route path="/leads-center-view" element={<LeadsCenterView />} />
            <Route path="/batches" element={<Batches />} />
          </Route>

          {/* Courses - viewable by all except Accountant */}
          <Route element={<RoleRoute roles={['SuperAdmin', 'Admin', 'ITAdmin', 'DigitalMarketing', 'Admission', 'Recruitment', 'MotionGraphics']} />}>
            <Route path="/courses" element={<Courses />} />
          </Route>

          {/* Digital Marketing */}
          <Route element={<RoleRoute roles={['DigitalMarketing']} />}>
            <Route path="/lead-entry" element={<LeadEntry />} />
            <Route path="/leads-center" element={<LeadsCenter />} />
            <Route path="/dm-metrics" element={<DMMetrics />} />
          </Route>

          {/* Digital Marketing dashboard (viewable by DM + Admin/SA) */}
          <Route element={<RoleRoute roles={['DigitalMarketing','Admin','SuperAdmin']} />}>
            <Route path="/dm/dashboard" element={<DMDashboard />} />
          </Route>

          {/* Admission */}
         <Route element={<RoleRoute roles={['Admission','Admin','SuperAdmin','ITAdmin']} />}>
         <Route path="/admission/dashboard" element={<AdmissionDashboard />} />   {/* <-- NEW */}
         <Route path="/admission/metrics" element={<AdmissionMetrics />} />
         <Route path="/my-targets" element={<MyTargets />} />
         <Route path="/admission/assigned" element={<AdmissionPipeline />} />
         <Route path="/admission/counseling" element={<AdmissionPipeline />} />
         <Route path="/admission/follow-up" element={<AdmissionPipeline />} />
         <Route path="/admission/admitted" element={<AdmissionPipeline />} />
         <Route path="/admission/not-interested" element={<AdmissionPipeline />} />
         {/* Removed legacy Not Admitted route */}
         <Route path="/admission/fees" element={<AdmissionFees />} />
</Route>

          {/* Accountant */}
          <Route element={<RoleRoute roles={['Accountant','Admin','SuperAdmin','ITAdmin']} />}>
            <Route path="/accounting/dashboard" element={<AccountingDashboard />} />
            <Route path="/accounting/fees" element={<FeesApproval />} />
            <Route path="/accounting/due-collections" element={<DueCollectionApproval />} />
            <Route path="/accounting/income" element={<IncomePage />} />
            <Route path="/accounting/expense" element={<ExpensePage />} />
            <Route path="/accounting/bank-manage" element={<BankManage />} />
            <Route path="/accounting/tada-payments" element={<TADAPayments />} />
          </Route>

          {/* Employee Accounts - visible to SuperAdmin, Admin and Accountant */}
          <Route element={<RoleRoute roles={['SuperAdmin','Admin','Accountant']} />}>
            <Route path="/employee-accounts/bank" element={<EmployeeBank />} />
            <Route path="/employee-accounts/salary" element={<EmployeeSalary />} />
          </Route>

          {/* Motion Graphics */}
          <Route element={<RoleRoute roles={['MotionGraphics','Admin','SuperAdmin']} />}>
            <Route path="/mg/dashboard" element={<MGDashboard />} />
            <Route path="/mg/production" element={<MGProduction />} />
          </Route>

          {/* Recruitment */}
          <Route element={<RoleRoute roles={['Recruitment','Admin','SuperAdmin']} />}>
            <Route path="/recruitment" element={<RecruitmentDashboard />} />
            <Route path="/recruitment/candidates" element={<Candidates />} />
            <Route path="/recruitment/jobs" element={<JobPositions />} />
            <Route path="/recruitment/employers" element={<Employers />} />
            <Route path="/recruitment/expenses" element={<RecruitExpenses />} />
          </Route>

          <Route element={<RoleRoute roles={['Recruitment','Accountant']} />}>
            <Route path="/recruitment/income" element={<RecruitIncome />} />
          </Route>

          {/* IT Admin - Activity Tracking */}
          <Route element={<RoleRoute roles={['ITAdmin','Admin','SuperAdmin']} />}>
            <Route path="/activity" element={<Activity />} />
          </Route>

          {/* Coordinator */}
          <Route element={<RoleRoute roles={['Coordinator','Admin','SuperAdmin']} />}>
            <Route path="/coordinator/dashboard" element={<CoordinatorDashboard />} />
            <Route path="/coordinator/due-fees" element={<DueFeesCollection />} />
            <Route path="/coordinator/notifications" element={<PaymentNotifications />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
