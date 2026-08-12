import { MoonIcon, SunIcon } from './Icons';
import { useTheme } from '../hooks/useTheme';
import './AppHeader.css';

export default function AppHeader({ title = 'ReviewStuff' }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="app-header">
      <span className="app-header__title">{title}</span>
      <button
        className="app-header__toggle"
        onClick={toggle}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
      </button>
    </header>
  );
}
