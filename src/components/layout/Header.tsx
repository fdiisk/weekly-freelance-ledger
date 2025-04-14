
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HomeIcon, ClipboardListIcon, UsersIcon, FileTextIcon } from "lucide-react";

const NavigationItem: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  current: boolean;
}> = ({ to, icon, label, current }) => (
  <Link to={to}>
    <Button
      variant={current ? "default" : "ghost"}
      className="flex items-center gap-2"
    >
      {icon}
      {label}
    </Button>
  </Link>
);

export const Header: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    {
      to: "/",
      icon: <HomeIcon size={18} />,
      label: "Dashboard",
    },
    {
      to: "/work-entries",
      icon: <ClipboardListIcon size={18} />,
      label: "Work Entries",
    },
    {
      to: "/clients",
      icon: <UsersIcon size={18} />,
      label: "Clients",
    },
    {
      to: "/invoices",
      icon: <FileTextIcon size={18} />,
      label: "Invoices",
    },
  ];

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center px-4">
        <div className="mr-4 font-bold text-xl">Freelance Tracker</div>
        <nav className="flex items-center space-x-2 lg:space-x-4">
          {navItems.map((item) => (
            <NavigationItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              current={currentPath === item.to}
            />
          ))}
        </nav>
      </div>
    </header>
  );
};
