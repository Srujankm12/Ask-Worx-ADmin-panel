import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  PhoneCall,
  MessageSquare,
  LogOut,
  Cpu,
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

  const NavItem = ({ item }) => (
    <NavLink
      to={item.to}
      onClick={() => window.innerWidth < 1024 && setCollapsed(true)}
      className={({ isActive }) =>
        `nav-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0 py-6 mb-2' : ''}`
      }
      title={collapsed ? item.label : ''}
    >
      <item.icon className={`w-5 h-5 opacity-80 shrink-0 ${collapsed ? 'scale-[1.3] text-white' : ''}`} />
      {!collapsed && <span className="text-[11px] uppercase tracking-widest animate-in whitespace-nowrap font-black">{item.label}</span>}
    </NavLink>
  );

  return (
    <aside
      className={`fixed lg:relative inset-y-0 left-0 bg-[#020617] transition-all duration-500 z-50 flex flex-col overflow-hidden shadow-2xl lg:shadow-none
        ${collapsed ? 'w-0 -translate-x-full lg:w-24 lg:translate-x-0' : 'w-72 translate-x-0'}`}
    >
      <div className={`flex items-center gap-4 transition-all duration-500 overflow-hidden ${collapsed ? 'pt-10 px-0 justify-center' : 'p-10'}`}>
        <img 
          src="/logo.png" 
          alt="Logo" 
          className={`transition-all duration-500 object-contain ${collapsed ? 'w-10 h-10' : 'w-12 h-12'}`} 
        />
        {!collapsed && (
          <div className="animate-in whitespace-nowrap">
            <h1 className="font-black text-2xl leading-none text-white tracking-tighter uppercase">ASKworX</h1>
          </div>
        )}
      </div>

      <nav className="flex-1 mt-6 overflow-y-auto no-scrollbar">
        <div className="px-6 mb-4">
          {!collapsed && <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Core Systems</p>}
          {mainItems.map((item) => <NavItem key={item.to} item={item} />)}
        </div>

        <div className="px-6 mt-8">
          {!collapsed && <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Team Hub</p>}
          {employeeItems.map((item) => <NavItem key={item.to} item={item} />)}
        </div>
      </nav>

      <div className={`transition-all duration-500 ${collapsed ? 'p-0 pb-12 flex justify-center' : 'p-10'}`}>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-4 text-slate-500 hover:text-white transition-all text-left font-black text-[10px] uppercase tracking-[0.2em] ${collapsed ? 'justify-center border-t border-white/5 pt-10 w-full' : 'w-full'}`}
          title={collapsed ? 'Exit' : ''}
        >
          <LogOut className={`w-5 h-5 shrink-0 ${collapsed ? 'scale-[1.3] text-red-400' : ''}`} />
          {!collapsed && <span className="whitespace-nowrap">Exit Session</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
