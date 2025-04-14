
import React from "react";
import { Header } from "./Header";

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, title, actions }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{title}</h1>
          {actions && <div className="flex space-x-2">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
};

export default PageLayout;
