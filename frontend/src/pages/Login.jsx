import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const res = await fetch(`http://192.168.29.128:5001/api/login`, {
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
    </div>
  );
}
