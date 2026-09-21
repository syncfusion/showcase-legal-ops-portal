import {
  LayoutDashboard,
  Briefcase,
  FileText,
  CalendarClock,
  FolderOpen,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SidebarContentProps {
  navigate: (path: string) => void;
  currentPath: string;
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

const menuItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/matters', label: 'Matters', icon: Briefcase },
  { path: '/contracts', label: 'Contracts', icon: FileText },
  { path: '/deadlines', label: 'Deadlines', icon: CalendarClock },
  { path: '/documents', label: 'Documents', icon: FolderOpen },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 }
];

function SidebarContent({ navigate, currentPath, collapsed, onToggle }: SidebarContentProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`sidebar-content${collapsed ? ' is-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="sidebar-brand-text">
          <h3>Meridian Legal</h3>
          <p>Contract Portal</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive =
            currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
          return (
            <button
              key={item.path}
              type="button"
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="nav-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-theme-btn"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-pressed={isDark}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? (
            <>
              <Sun size={18} strokeWidth={2} aria-hidden="true" focusable="false" />
              <span className="collapse-label">Light mode</span>
            </>
          ) : (
            <>
              <Moon size={18} strokeWidth={2} aria-hidden="true" focusable="false" />
              <span className="collapse-label">Dark mode</span>
            </>
          )}
        </button>

        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <>
              <ChevronsRight size={18} strokeWidth={2} aria-hidden="true" focusable="false" />
              <span className="collapse-label">Expand</span>
            </>
          ) : (
            <>
              <ChevronsLeft size={18} strokeWidth={2} aria-hidden="true" focusable="false" />
              <span className="collapse-label">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default SidebarContent;
