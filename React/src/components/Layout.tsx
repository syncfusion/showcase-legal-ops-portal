import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import SidebarContent from './SidebarContent';
import Header from './Header';
import '../styles/Sidebar.css';

const MOBILE_BREAKPOINT = 768;
const SIDEBAR_COLLAPSED_KEY = 'mlp:sidebar-collapsed';

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
}

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Desktop sidebar state; mobile overlay is not persisted.
  const [isMobile, setIsMobile] = useState<boolean>(() => isMobileViewport());
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Switch between docked sidebar and mobile overlay.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) {
        setMobileOpen(false);
      }
    };
    setIsMobile(mql.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  // Persist desktop collapsed state
  useEffect(() => {
    if (isMobile) return;
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // localStorage unavailable — ignore
    }
  }, [collapsed, isMobile]);

  // Auto-close mobile overlay when route changes
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location.pathname, isMobile]);

  // Lock body scroll while the mobile overlay is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isMobile && mobileOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
    return undefined;
  }, [isMobile, mobileOpen]);

  const toggleDesktopCollapse = () => setCollapsed(prev => !prev);
  const openMobile = () => setMobileOpen(true);
  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="app-container">
      <Header onMenuToggle={isMobile ? openMobile : undefined} />

      <div className="main-content">
        {/* Desktop: docked sidebar. */}
        {!isMobile && (
          <aside
            className={`sidebar-shell${collapsed ? ' is-collapsed' : ''}`}
            aria-label="Primary navigation"
          >
            <SidebarContent
              navigate={navigate}
              currentPath={location.pathname}
              collapsed={collapsed}
              onToggle={toggleDesktopCollapse}
            />
          </aside>
        )}

        <main className="page-container">
          <Outlet />
        </main>

        {/* Mobile: off-canvas drawer with backdrop. CSS-only transitions. */}
        {isMobile && (
          <>
            <div
              className={`sidebar-backdrop${mobileOpen ? ' is-visible' : ''}`}
              onClick={closeMobile}
              aria-hidden="true"
            />
            <aside
              className={`sidebar-shell sidebar-shell--drawer${mobileOpen ? ' is-open' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-label="Primary navigation"
            >
              <SidebarContent
                navigate={navigate}
                currentPath={location.pathname}
                collapsed={false}
                onToggle={closeMobile}
              />
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

export default Layout;
