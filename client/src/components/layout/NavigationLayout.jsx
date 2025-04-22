import React from 'react';
import TopNavigationBar from './TopNavigationBar.jsx';

const NavigationLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigationBar />
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default NavigationLayout;
