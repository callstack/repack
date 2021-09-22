import * as React from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';

interface Props {
  to: string;
  label: string;
  icon?: React.ReactElement;
}

export function NavLink({ to, label, icon }: Props) {
  return (
    <RouterNavLink
      exact
      to={to}
      className="px-2 py-2 my-1 text-lg rounded-sm text-gray-300 tracking-wide hover:text-gray-200 hover:bg-dark-300 flex flex-row items-center"
      activeClassName="bg-dark-400 font-bold hover:bg-dark-400"
    >
      {icon}
      {label}
    </RouterNavLink>
  );
}
