import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Menu, User } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Callbacks from './pages/Callbacks';
import Contacts from './pages/Contacts';
import Messages from './pages/Messages';
import Campaigns from './pages/Campaigns';

// Internal Management Pages
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import WorkPlans from './pages/WorkPlans';
import EODReports from './pages/EODReports';
import LeaveRequests from './pages/LeaveRequests';
import Reminders from './pages/Reminders';
import Announcements from './pages/Announcements';
import BotConfig from './pages/BotConfig';

const ProtectedRoute = ({ children }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const token = localStorage.getItem('askworx_token');

  if (!token) return <Navigate to="/login" />;

  return (
    <div className="flex h-screen bg-[#F8F9FB] overflow-hidden text-slate-950">
      {/* Mobile Sidebar Overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setCollapsed(true)}
        ></div>
      )}

      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-500">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-6 lg:px-10 shrink-0 z-30">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-3 hover:bg-slate-50 rounded-2xl transition-all active:scale-90"
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <div className="hidden sm:block">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 block mb-0.5">Control Center</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Authenticated</p>
              <p className="text-xs font-bold text-slate-900">Admin Session</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
              <User className="w-5 h-5" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative bg-[#F8F9FB] no-scrollbar">
          <div className="animate-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
        <Route path="/callbacks" element={<ProtectedRoute><Callbacks /></ProtectedRoute>} />
        <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
        <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
        
        {/* Internal Management Routes */}
        <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
        <Route path="/work-plans" element={<ProtectedRoute><WorkPlans /></ProtectedRoute>} />
        <Route path="/eod-reports" element={<ProtectedRoute><EODReports /></ProtectedRoute>} />
        <Route path="/leave-requests" element={<ProtectedRoute><LeaveRequests /></ProtectedRoute>} />
        <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
        <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
        <Route path="/config" element={<ProtectedRoute><BotConfig /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
