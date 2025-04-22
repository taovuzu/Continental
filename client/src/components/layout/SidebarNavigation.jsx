import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  VideoCameraIcon, 
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const SidebarNavigation = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const navigationItems = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: HomeIcon, 
      current: location.pathname === '/dashboard' 
    },
    { 
      name: 'Video Meetings', 
      href: '/conference', 
      icon: VideoCameraIcon, 
      current: location.pathname.startsWith('/conference') 
    },
    { 
      name: 'Collaboration Hub', 
      href: '/collaboration', 
      icon: ChatBubbleLeftRightIcon, 
      current: location.pathname === '/collaboration' 
    },
    { 
      name: 'Groups', 
      href: '/groups', 
      icon: UserGroupIcon, 
      current: location.pathname === '/groups' 
    },
    { 
      name: 'Settings', 
      href: '/settings', 
      icon: Cog6ToothIcon, 
      current: location.pathname === '/settings' 
    },
  ];

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isCollapsed && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setIsCollapsed(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`${
        isCollapsed ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:transform-none`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CV</span>
            </div>
            <span className="text-lg font-bold text-gradient">Continental</span>
          </div>
          <button
            onClick={toggleSidebar}
            className="lg:hidden rounded-md p-1 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      item.current
                        ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile toggle button - desktop only when collapsed */}
        <div className="absolute top-4 -right-3 lg:hidden">
          <button
            onClick={toggleSidebar}
            className="bg-white rounded-full p-1 shadow-lg border border-gray-200"
          >
            {isCollapsed ? (
              <Bars3Icon className="h-5 w-5 text-gray-600" />
            ) : (
              <XMarkIcon className="h-5 w-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default SidebarNavigation;
