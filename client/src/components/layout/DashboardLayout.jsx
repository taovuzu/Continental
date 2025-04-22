import React from 'react';
import SidebarNavigation from './SidebarNavigation.jsx';

const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <SidebarNavigation />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-screen">
          <main className="flex-1 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
