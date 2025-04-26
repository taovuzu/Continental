import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  VideoCameraIcon, 
  PlusIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import Input from '../components/common/Input.jsx';

const UserDashboard = () => {
  const { user } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [recentRooms] = useState([
    { id: 'abc12', name: 'Team Standup', lastActive: '2 hours ago', participants: 5 },
    { id: 'def34', name: 'Project Review', lastActive: '1 day ago', participants: 8 },
    { id: 'ghi56', name: 'Client Meeting', lastActive: '3 days ago', participants: 3 },
  ]);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    setShowCreateRoomModal(true);
  };

  const joinRoom = (roomId) => {
    console.log('🔵 UserDashboard: Joining room:', roomId);
    navigate(`/conference/${roomId}`);
  };

  const createRoom = async () => {
    try {
      console.log('🔵 UserDashboard: Creating new room');
      const response = await fetch('/api/collaboration/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: `Meeting ${new Date().toLocaleDateString()}`,
          description: 'Quick meeting room'
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data?.data?.room?.roomId) {
        console.log('🟢 UserDashboard: Room created successfully:', data.data.room.roomId);
        joinRoom(data.data.room.roomId);
      } else {
        const errorMessage = data?.message || 'Failed to create room';
        console.error('🔴 UserDashboard: Failed to create room:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('🔴 UserDashboard: Error creating room:', error);
      // Here you could show an error toast or message to the user
      alert('Failed to create room: ' + error.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name || user?.username}!
            </h1>
            <p className="text-gray-600 mt-2">
              Ready to start collaborating? Create or join a meeting instantly.
            </p>
          </div>
          <div className="flex space-x-4">
            <Button variant="outline" onClick={() => setShowCreateRoomModal(true)}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Quick Meeting
            </Button>
            <Button onClick={createRoom}>
              <VideoCameraIcon className="h-5 w-5 mr-2" />
              New Meeting
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickAction
          icon={<VideoCameraIcon className="h-8 w-8 text-blue-600" />}
          title="Start Meeting"
          description="Launch an instant video meeting"
          action={() => handleCreateRoom()}
          bgColor="bg-blue-50"
          textColor="text-blue-600"
        />
        <QuickAction
          icon={<ClipboardDocumentListIcon className="h-8 w-8 text-green-600" />}
          title="Schedule Meeting"
          description="Plan meetings for later"
          action={() => {}}
          bgColor="bg-green-50"
          textColor="text-green-600"
        />
        <QuickAction
          icon={<UserGroupIcon className="h-8 w-8 text-purple-600" />}
          title="Join Team"
          description="Collaborate with your colleagues"
          action={() => {}}
          bgColor="bg-purple-50"
          textColor="text-purple-600"
        />
      </div>

      {/* Recent Rooms */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Meetings</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentRooms.map((room) => (
            <div key={room.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <VideoCameraIcon className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{room.name}</h3>
                    <p className="text-sm text-gray-500">
                      <ClockIcon className="h-4 w-4 inline mr-1" />
                      {room.lastActive} • {room.participants} participants
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="small" onClick={() => joinRoom(room.id)}>
                  Join Again
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Room Modal */}
      <Modal
        isOpen={showCreateRoomModal}
        onClose={() => setShowCreateRoomModal(false)}
        title="Create/Join Meeting"
        size="sm"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <Input
              label="Room ID"
              placeholder="Enter room ID to join existing meeting"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <div className="text-sm text-gray-500">
              Leave empty for instant meeting or enter a 5-character room ID
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setRoomId(generateRoomId())}
            >
              Generate New ID
            </Button>
            <Button 
              className="flex-1"
              onClick={() => {
                const finalRoomId = roomId || generateRoomId();
                joinRoom(finalRoomId);
              }}
            >
              Join Meeting
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const QuickAction = ({ icon, title, description, action, bgColor, textColor }) => {
  return (
    <button
      onClick={action}
      className={`${bgColor} rounded-xl p-6 text-left hover:shadow-md transition-all duration-200 transform hover:-translate-y-1`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`${textColor} p-2 rounded-lg bg-white`}>
          {icon}
        </div>
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
};

export default UserDashboard;
