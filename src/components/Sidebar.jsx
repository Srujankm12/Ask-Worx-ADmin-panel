import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  PhoneCall,
  MessageSquare,
  LogOut,
  Radio,
  ClipboardCheck,
  BookOpen,
  BarChart3,
  CalendarRange,
  Clock,
  Megaphone,
  UserCircle,
  Settings2
} from 'lucide-react';

const Sidebar = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('askworx_token');
    navigate('/login');
  };

  const mainItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/config', icon: Settings2, label: 'Bot Brain' },
    { to: '/campaigns', icon: Radio, label: 'Campaigns' },
    { to: '/leads', icon: UserPlus, label: 'Leads' },
    { to: '/callbacks', icon: PhoneCall, label: 'Callbacks' },
    { to: '/contacts', icon: Users, label: 'Contacts' },
    { to: '/messages', icon: MessageSquare, label: 'Messages' },
  ];

  const employeeItems = [
    { to: '/employees', icon: UserCircle, label: 'Employees' },
    { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
    { to: '/work-plans', icon: BookOpen, label: 'Work Plans' },
    { to: '/eod-reports', icon: BarChart3, label: 'EOD Reports' },
    { to: '/leave-requests', icon: CalendarRange, label: 'Leaves' },
    { to: '/reminders', icon: Clock, label: 'Reminders' },
    { to: '/announcements', icon: Megaphone, label: 'Broadcast' },
  ];

  // Nav item styling lives here (not in a separate .nav-link CSS class) so
  // the active/hover states stay wired to the same design tokens as the
  // rest of the CRM: primary-light background + primary text when active.
  const NavItem = ({ item }) => (
    <NavLink
      to={item.to}
      onClick={() => window.innerWidth < 1024 && setCollapsed(true)}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg mb-1 transition-colors ${
          collapsed ? 'justify-center px-0 py-3' : 'px-4 py-2.5'
        } ${
          isActive
            ? 'bg-primary-light text-primary font-medium'
            : 'text-text-secondary hover:bg-background hover:text-text-primary'
        }`
      }
      title={collapsed ? item.label : ''}
    >
      <item.icon className="w-[18px] h-[18px] shrink-0" />
      {!collapsed && (
        <span className="text-sm whitespace-nowrap">{item.label}</span>
      )}
    </NavLink>
  );

  return (
    <aside
      className={`fixed lg:relative inset-y-0 left-0 bg-white border-r border-border transition-all duration-300 z-50 flex flex-col overflow-hidden shadow-sm lg:shadow-none
        ${collapsed ? 'w-0 -translate-x-full lg:w-20 lg:translate-x-0' : 'w-64 translate-x-0'}`}
    >
      <div className={`flex items-center gap-3 h-16 border-b border-border transition-all duration-300 overflow-hidden ${collapsed ? 'px-0 justify-center' : 'px-6'}`}>
        <img
          src="/logo.png"
          alt="Logo"
          className={`transition-all duration-300 object-contain ${collapsed ? 'w-8 h-8' : 'w-9 h-9'}`}
        />
        {!collapsed && (
          <h1 className="font-bold text-lg leading-none text-text-primary whitespace-nowrap">
            ASKworX
          </h1>
        )}
      </div>

      <nav className="flex-1 mt-4 overflow-y-auto no-scrollbar">
        <div className="px-3 mb-6">
          {!collapsed && (
            <p className="px-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-2">
              Core Systems
            </p>
          )}
          {mainItems.map((item) => <NavItem key={item.to} item={item} />)}
        </div>

        <div className="px-3">
          {!collapsed && (
            <p className="px-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-2">
              Team Hub
            </p>
          )}
          {employeeItems.map((item) => <NavItem key={item.to} item={item} />)}
        </div>
      </nav>

      <div className={`border-t border-border transition-all duration-300 ${collapsed ? 'py-4 flex justify-center' : 'p-4'}`}>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 text-text-secondary hover:text-danger transition-colors text-sm font-medium ${
            collapsed ? 'justify-center' : 'w-full px-3 py-2'
          }`}
          title={collapsed ? 'Exit' : ''}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Exit Session</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;