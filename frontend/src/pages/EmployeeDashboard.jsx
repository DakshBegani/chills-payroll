import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getApiUrl } from '../config';

export default function EmployeeDashboard({ user }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 14);
      
      const res = await fetch(`${getApiUrl()}/api/attendance?start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if(res.ok) setLogs(await res.json());
    };
    fetchLogs();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div 
        className="card" 
        style={{background: 'var(--primary)', color: 'white', border: 'none', marginBottom: '2rem'}}
      >
        <h2 style={{fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem', letterSpacing: '-0.5px'}}>Hi, {user.name}</h2>
        <p style={{opacity: 0.8, fontSize: '0.875rem', fontWeight: 500}}>Your attendance history.</p>
      </div>
      
      {logs.length === 0 ? <p className="text-center text-light" style={{padding: '3rem 0'}}>No recent records found.</p> : null}
      
      <div>
        {logs.map(log => (
          <div key={log.id} className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem'}}>
            <div>
              <p style={{fontWeight: 700, fontSize: '1rem'}}>{log.date}</p>
            </div>
            <span className={`badge badge-${log.status}`}>{log.status}</span>
          </div>
        ))}
      </div>
      
      <div style={{marginTop: '2rem', padding: '1.5rem', textAlign: 'center'}}>
        <p className="text-sm text-light">If you notice a discrepancy, please contact your Administrator.</p>
      </div>
    </motion.div>
  );
}
