import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { loginUser, registerUser, clearError } from '../store/authSlice.js';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import Modal from '../components/common/Modal.jsx';

const LandingPage = () => {
  console.log('🔵 LandingPage: Component rendered');
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector(state => state.auth);
  
  console.log('🔵 LandingPage: Auth state from selector:', { isLoading, error });
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', firstName: '', lastName: '', password: '' });
  const [registerErrors, setRegisterErrors] = useState({});

  const handleLogin = async (e) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(loginUser(loginForm));
    if (loginUser.fulfilled.match(result)) {
      setShowLoginModal(false);
      setLoginForm({ username: '', password: '' });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    console.log('🔵 LandingPage: Starting registration with form data:', registerForm);
    dispatch(clearError());
    setRegisterErrors({});
    
    // Basic validation
    const validationErrors = {};
    if (!registerForm.username.trim()) validationErrors.username = 'Username is required';
    if (!registerForm.email.trim()) validationErrors.email = 'Email is required';
    if (!registerForm.firstName.trim()) validationErrors.firstName = 'First name is required';
    if (!registerForm.password || registerForm.password.length < 6) {
      validationErrors.password = 'Password must be at least 6 characters';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      console.log('🔴 LandingPage: Validation errors:', validationErrors);
      setRegisterErrors(validationErrors);
      return;
    }
    
    console.log('🟢 LandingPage: Validation passed, dispatching registerUser');
    const result = await dispatch(registerUser(registerForm));
    console.log('🟢 LandingPage: Registration result:', result);
    
    if (registerUser.fulfilled.match(result)) {
      console.log('🟢 LandingPage: Registration successful, closing modal');
      setShowRegisterModal(false);
      setRegisterForm({ username: '', email: '', firstName: '', lastName: '', password: '' });
      // Show success message or auto-login
    } else {
      console.log('🔴 LandingPage: Registration failed:', result.payload);
    }
  };

  const toggleModal = (modalType) => {
    if (modalType === 'login') {
      setShowLoginModal(!showLoginModal);
      dispatch(clearError());
    } else {
      setShowRegisterModal(!showRegisterModal);
      setRegisterErrors({});
      dispatch(clearError());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CV</span>
              </div>
              <span className="text-xl font-bold text-gradient">Continental</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => toggleModal('login')}>
                Sign In
              </Button>
              <Button variant="primary" onClick={() => toggleModal('register')}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 sm:text-6xl">
              Connect,
              <span className="text-gradient"> Collaborate</span>,
              <span className="text-gradient"> Succeed</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
              Experience seamless video conferencing, real-time collaboration, and team communication 
              all in one modern platform designed for the future of work.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="large" onClick={() => toggleModal('register')}>
                Start Your Journey
              </Button>
              <Button variant="outline" size="large" onClick={() => toggleModal('login')}>
                Try Demo
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🎥"
              title="HD Video Meetings"
              description="Crystal clear video quality with advanced noise cancellation and smart camera framing."
            />
            <FeatureCard
              icon="💬"
              title="Real-time Chat"
              description="Instant messaging with file sharing, reactions, and threaded conversations."
            />
            <FeatureCard
              icon="👥"
              title="Team Collaboration"
              description="Share screens, whiteboards, and work together seamlessly with your teams."
            />
          </div>
        </div>
      </main>

      {/* Login Modal */}
      <Modal 
        isOpen={showLoginModal} 
        onClose={() => toggleModal('login')}
        title="Sign In to Continental"
        size="sm"
      >
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Username"
            type="text"
            placeholder="Enter your username"
            value={loginForm.username}
            onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
            required
            error={error?.includes('username') || error?.includes('Invalid') ? 'Invalid credentials' : null}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={loginForm.password}
            onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
            required
          />
          <Button type="submit" className="w-full" loading={isLoading}>
            Sign In
          </Button>
        </form>
      </Modal>

      {/* Register Modal */}
      <Modal 
        isOpen={showRegisterModal} 
        onClose={() => toggleModal('register')}
        title="Join Continental"
        size="sm"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              type="text"
              placeholder="Enter your first name"
              value={registerForm.firstName}
              onChange={(e) => setRegisterForm({...registerForm, firstName: e.target.value})}
              error={registerErrors.firstName}
              required
            />
            <Input
              label="Last Name"
              type="text"
              placeholder="Enter your last name"
              value={registerForm.lastName}
              onChange={(e) => setRegisterForm({...registerForm, lastName: e.target.value})}
              error={registerErrors.lastName}
            />
          </div>
          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            value={registerForm.email}
            onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
            error={registerErrors.email}
            required
          />
          <Input
            label="Username"
            type="text"
            placeholder="Choose a username"
            value={registerForm.username}
            onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
            error={registerErrors.username}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="Create a secure password"
            value={registerForm.password}
            onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
            error={registerErrors.password}
            required
          />
          <Button type="submit" className="w-full" loading={isLoading}>
            Create Account
          </Button>
        </form>
      </Modal>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="card p-8 text-center hover:shadow-xl transition-shadow duration-300">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

export default LandingPage;
