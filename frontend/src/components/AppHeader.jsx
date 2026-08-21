import { Link } from 'react-router-dom';
import { MoonIcon, SunIcon, UserIcon } from './Icons';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';
import './AppHeader.css';

export default function AppHeader({ title = 'ReviewStuff' }) {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();

  return (
    <header className="app-header">
      <span className="app-header__title">{title}</span>
      <div className="app-header__actions">
        <button
          className="app-header__button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
        </button>
        <Link className="app-header__button" to="/account" aria-label="Account">
          {user?.picture ? (
            <img
              className="app-header__avatar"
              src={user.picture}
              alt=""
              referrerPolicy="no-referrer"
            />
          ) : (
            <UserIcon />
          )}
        </Link>
      </div>
    </header>
  );
}
