import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import Login from './pages/Login';
import CEODashboard from './pages/CEODashboard';
import AttendanceTaker from './pages/AttendanceTaker';
import EmployeeDashboard from './pages/EmployeeDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  if (loading) return <div className="app-container"><div className="content">Loading...</div></div>;

  return (
    <div className="app-container">
      <AnimatePresence>
        {user && (
          <motion.header 
            className="header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div>
              <img src="/logo.png" alt="Chills Logo" style={{height: '64px', objectFit: 'contain', display: 'block'}} />
            </div>
            <button onClick={handleLogout} className="logout-btn" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <LogOut size={16} /> Logout
            </button>
          </motion.header>
        )}
      </AnimatePresence>
      
      <div className="content">
        <Routes>
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
          
          <Route path="/" element={
            !user ? <Navigate to="/login" /> :
            user.role === 'ceo' ? <CEODashboard /> :
            user.role === 'attendance_taker' ? <AttendanceTaker /> :
            <EmployeeDashboard user={user} />
          } />
        </Routes>
      </div>
    </div>
  );
}
