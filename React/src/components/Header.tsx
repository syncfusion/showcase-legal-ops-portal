import { Menu } from 'lucide-react';
import '../styles/Header.css';

interface HeaderProps {
  /** Opens the mobile sidebar. */
  onMenuToggle?: () => void;
}

function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="app-header">
      {/* Mobile menu button. */}
      <button
        type="button"
        className="menu-toggle-btn"
        onClick={onMenuToggle}
        aria-label="Open navigation"
        title="Open navigation"
      >
        <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </header>
  );
}

export default Header;
