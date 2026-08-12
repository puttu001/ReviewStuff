import { NavLink } from 'react-router-dom';
import { HomeIcon, ListIcon, PlusIcon } from './Icons';
import './BottomNav.css';

const links = [
  { to: '/', label: 'Home', Icon: HomeIcon, end: true },
  { to: '/save', label: 'Save', Icon: PlusIcon },
  { to: '/items', label: 'Items', Icon: ListIcon },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {links.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="bottom-nav__link">
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
