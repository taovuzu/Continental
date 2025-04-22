import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logoutUser } from '../../store/authSlice.js';
import Button from '../common/Button.jsx';

const TopNavigationBar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector(state => state.auth);

  console.log('🔵 TopNavigationBar: Current auth state:', { isAuthenticated, user });

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CV</span>
              </div>
              <span className="text-xl font-bold text-gradient">Continental</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {user?.username || 'User'}
                  </span>
                </div>
                <Button variant="ghost" onClick={handleLogout} size="small">
                  Sign Out
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login">
                  <Button variant="ghost" size="small">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="small">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopNavigationBar;
