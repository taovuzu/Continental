import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';

import { store } from './store/index.js';
import { validateToken } from './store/authSlice.js';

// Layout Components
import NavigationLayout from './components/layout/NavigationLayout.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import MeetingLayout from './components/layout/MeetingLayout.jsx';

// Page Components
import LandingPage from './pages/LandingPage.jsx';
import UserDashboard from './pages/UserDashboard.jsx';
import VideoConferenceRoom from './pages/VideoConferenceRoom.jsx';
import CollaborationHub from './pages/CollaborationHub.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';

// Public Route Component (redirects authenticated users)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading, tokenValidated } = useSelector(state => state.auth);
  
  console.log('🔵 PublicRoute: Auth state:', { isAuthenticated, isLoading, tokenValidated });
  
  if (isLoading && !tokenValidated) {
    console.log('🔵 PublicRoute: Showing loading spinner');
    return <LoadingSpinner />;
  }
  
  console.log('🔵 PublicRoute: isAuthenticated:', isAuthenticated, 'rendering:', isAuthenticated ? 'Navigate to /dashboard' : 'children');
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

// Private Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, tokenValidated } = useSelector(state => state.auth);
  
  console.log('🔵 ProtectedRoute: Auth state:', { isAuthenticated, isLoading, tokenValidated });
  
  if (isLoading && !tokenValidated) {
    console.log('🔵 ProtectedRoute: Showing loading spinner');
    return <LoadingSpinner />;
  }
  
  console.log('🔵 ProtectedRoute: isAuthenticated:', isAuthenticated, 'rendering:', isAuthenticated ? 'children' : 'Navigate to /');
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

// Main App Component
const AppContent = () => {
  const dispatch = useDispatch();
  const { token, isLoading, tokenValidated, isAuthenticated, user } = useSelector(state => state.auth);

  console.log('🔵 App: Initial auth state:', { token, isLoading, tokenValidated, isAuthenticated, user });

  useEffect(() => {
    if (token && !tokenValidated) {
      console.log('🔵 App: Validating token:', token);
      dispatch(validateToken());
    }
  }, [dispatch, token, tokenValidated]);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100">
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/" 
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            } 
          />
          
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <UserDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/conference/:roomId"
            element={
              <ProtectedRoute>
                <MeetingLayout>
                  <VideoConferenceRoom />
                </MeetingLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/collaboration"
            element={
              <ProtectedRoute>
                <NavigationLayout>
                  <CollaborationHub />
                </NavigationLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

// Root App Component with Provider
const App = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;