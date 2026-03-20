import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './StickyHeader.css';

export default function StickyHeader() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <header className="sticky-header">
      <div className="sticky-header-inner">
        <img
          src={isDark ? '/jale-logo-light.png' : '/jale-logo-dark.png'}
          alt="Jale"
          className="sticky-header-logo"
        />
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
