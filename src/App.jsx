import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Menu, User } from 'lucide-react';
import Sidebar from './components/Sidebar';
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

const Layout = ({ children }) => {
const [collapsed, setCollapsed] = React.useState(false);

return ( <div className="flex h-screen bg-[#F8F9FB] overflow-hidden text-slate-950">

```
  {!collapsed && (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
      onClick={() => setCollapsed(true)}
    />
  )}

  <Sidebar
    collapsed={collapsed}
    setCollapsed={setCollapsed}
  />

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
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 block mb-0.5">
            Control Center
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">

        <div className="text-right hidden md:block">

          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
            Admin Panel
          </p>

          <p className="text-xs font-bold text-slate-900">
            ASKworX
          </p>

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
return ( <Router>


  <Routes>

    <Route
path="/"
      element={
        <Layout>
          <Dashboard />
        </Layout>
      }
    />

    <Route
      path="/leads"
      element={
        <Layout>
          <Leads />
        </Layout>
      }
    />

    <Route
      path="/callbacks"
      element={
        <Layout>
          <Callbacks />
        </Layout>
      }
    />

    <Route
      path="/contacts"
      element={
        <Layout>
          <Contacts />
        </Layout>
      }
    />

    <Route
      path="/messages"
      element={
        <Layout>
          <Messages />
        </Layout>
      }
    />

    <Route
      path="/campaigns"
      element={
        <Layout>
          <Campaigns />
        </Layout>
      }
    />

    <Route
      path="/employees"
      element={
        <Layout>
          <Employees />
        </Layout>
      }
    />

    <Route
      path="/attendance"
      element={
        <Layout>
          <Attendance />
        </Layout>
      }
    />

    <Route
      path="/work-plans"
      element={
        <Layout>
          <WorkPlans />
        </Layout>
      }
    />

    <Route
      path="/eod-reports"
      element={
        <Layout>
          <EODReports />
        </Layout>
      }
    />

    <Route
      path="/leave-requests"
      element={
        <Layout>
          <LeaveRequests />
        </Layout>
      }
    />

    <Route
      path="/reminders"
      element={
        <Layout>
          <Reminders />
        </Layout>
      }
    />

    <Route
      path="/announcements"
      element={
        <Layout>
          <Announcements />
        </Layout>
      }
    />

    <Route
      path="/config"
      element={
        <Layout>
          <BotConfig />
        </Layout>
      }
    />

    <Route
      path="*"
      element={<Navigate to="/" replace />}
    />

  </Routes>

</Router>


);
}

export default App;
