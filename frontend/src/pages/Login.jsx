import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X } from 'lucide-react';
import { getApiUrl, setApiUrl, getDefaultApiUrl } from '../config';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [serverIp, setServerIp] = useState(getApiUrl());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const res = await fetch(`${getApiUrl()}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setApiUrl(serverIp);
    setShowSettings(false);
    // Reload page to apply new URL cleanly across all components
    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <motion.div 
        style={{ width: '100%', maxWidth: '380px' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <motion.img 
            src="/logo.png" 
            alt="Chills Logo"
            style={{ height: '140px', marginBottom: '1.5rem', objectFit: 'contain' }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: '0.5rem', color: 'var(--text-dark)' }}>
            Welcome back.
          </h2>
          <p className="text-light" style={{ fontSize: '1rem' }}>Enter your details to proceed.</p>
        </div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ color: 'var(--danger)', background: '#ffe3e3', padding: '1rem', borderRadius: '16px', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 600 }}
          >
            {error}
          </motion.div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{color: 'var(--text-light)', fontWeight: 500}}>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required 
              disabled={isSubmitting}
            />
          </div>
          <div className="form-group" style={{marginBottom: '2rem'}}>
            <label style={{color: 'var(--text-light)', fontWeight: 500}}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
              required 
              disabled={isSubmitting}
            />
          </div>
          <button 
            type="submit" 
            className="btn" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Verifying...' : 'Continue'}
          </button>
        </form>
      </motion.div>

      {/* Settings Button */}
      <button 
        onClick={() => setShowSettings(true)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          color: 'var(--text-light)'
        }}
      >
        <Settings size={24} />
      </button>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="card"
              style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}
            >
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Network Settings</h3>
                <button 
                  onClick={() => setShowSettings(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-light)' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveSettings}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>Server IP Address</label>
                  <input 
                    type="text" 
                    value={serverIp}
                    onChange={(e) => setServerIp(e.target.value)}
                    placeholder="http://192.168.x.x:5001"
                    required
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                    Enter the exact local IP address of the Windows computer running the Chills Payroll Server. Include 'http://' and the ':5001' port.
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn" style={{ flex: 1 }}>Save & Reload</button>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ flex: 1, borderRadius: '9999px' }}
                    onClick={() => setServerIp(getDefaultApiUrl())}
                  >
                    Reset Default
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
