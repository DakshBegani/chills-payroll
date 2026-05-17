import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Minus, Clock, Calendar, Search as SearchIcon, Home, Edit3, ChevronDown, ChevronUp, Sun } from 'lucide-react';
import { getApiUrl } from '../config';

export default function AttendanceTaker() {
  const API_URL = getApiUrl();
  const [employees, setEmployees] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState({});

  // Navigation State
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'attendance', 'manual'
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Attendance State
  const [bulkAttendance, setBulkAttendance] = useState({});
  const [localSelection, setLocalSelection] = useState({}); // pending selection before submit

  // Manual Entry State
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualSearch, setManualSearch] = useState('');
  const [selectedManualEmp, setSelectedManualEmp] = useState(null);

  // Stats Modal State
  const [statsModal, setStatsModal] = useState(null);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [expandAbsent, setExpandAbsent] = useState(false);

  const fetchEmployees = async () => {
    const res = await fetch(`${getApiUrl()}/api/users`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if(res.ok) setEmployees(await res.json());
  };

  useEffect(() => {
    fetchEmployees();
  }, [activeTab]);

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await fetch(`${getApiUrl()}/api/attendance?start_date=${date}&end_date=${date}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if(res.ok) {
        const data = await res.json();
        const map = {};
        data.forEach(log => {
          map[log.user_id] = log.status;
        });
        setLogs(map);
      }
    };
    if (date) fetchLogs();
  }, [date]);

  const markAttendance = async (userId, status) => {
    await fetch(`${getApiUrl()}/api/attendance`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify({ user_id: userId, date, status })
    });
    setLogs(prev => ({...prev, [userId]: status}));
  };

  const fetchStats = async (emp) => {
    setStatsModal(emp);
    setEmployeeStats(null);
    setExpandAbsent(false);
    
    const end = new Date().toISOString().split('T')[0];
    const start = '2024-01-01'; // Fetch all history
    const res = await fetch(`${getApiUrl()}/api/attendance?start_date=${start}&end_date=${end}&user_id=${emp.id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) setEmployeeStats(await res.json());
  };

  const fixAbsent = async (userId, absentDate) => {
    if (!window.confirm(`Are you sure you want to mark this employee as PRESENT for ${absentDate}?`)) return;

    await fetch(`${getApiUrl()}/api/attendance`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify({ user_id: userId, date: absentDate, status: 'present' })
    });
    // Update locally
    setEmployeeStats(prev => prev.map(l => l.date === absentDate ? {...l, status: 'present'} : l));
  };

  const submitManualEntry = async (status) => {
    if (!selectedManualEmp) return alert("Please select an employee first.");
    if (!window.confirm(`Mark ${selectedManualEmp.name} as ${status.toUpperCase()} for ${formatIndianDate(manualDate)}?`)) return;

    await fetch(`${getApiUrl()}/api/attendance`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify({ user_id: selectedManualEmp.id, date: manualDate, status })
    });
    
    alert(`Successfully marked as ${status}!`);
    setManualSearch('');
    setSelectedManualEmp(null);
  };

  const submitAttendance = async (userId) => {
    const status = localSelection[userId];
    if (!status) return;

    const today = new Date().toISOString().split('T')[0];
    try {
      await fetch(`${getApiUrl()}/api/attendance`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ user_id: userId, date: today, status })
      });
      // Move from pending to confirmed (frozen)
      setBulkAttendance(prev => ({...prev, [userId]: status}));
      setLocalSelection(prev => { const next = {...prev}; delete next[userId]; return next; });
    } catch (err) {
      console.error(err);
      alert('Failed to save attendance. Please try again.');
    }
  };



  const formatIndianDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const filteredEmployees = employees.filter(e => e.role === 'employee' && (e.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      
      <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <motion.div key="home" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
            <h2 className="card-title" style={{marginBottom: '1.25rem', fontSize: '1.5rem', fontWeight: 800}}>Team Directory</h2>

            <div className="search-wrapper" style={{marginBottom: '1.5rem'}}>
              <SearchIcon size={20} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search employees..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{paddingBottom: '6rem'}}>
              {filteredEmployees.length === 0 ? <p className="text-light text-center" style={{padding: '3rem 0'}}>No employees found.</p> : null}
              {filteredEmployees.map(emp => (
                <div key={emp.id} className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => fetchStats(emp)}>
                  <div>
                    <h3 style={{fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.15rem'}}>
                      {emp.name}
                    </h3>
                    {emp.role !== 'employee' && (
                      <p style={{fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase'}}>
                        {emp.role.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                  <button style={{background:'#f4f5f7', border:'none', cursor:'pointer', padding: '0.75rem 1rem', borderRadius: '9999px', color:'var(--text-dark)', fontWeight: 600, fontSize: '0.875rem'}}>
                    View Stats
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'attendance' && (
          <motion.div key="attendance" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h2 style={{fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px'}}>Quick Attendance</h2>
              <span style={{fontSize: '0.875rem', color: 'var(--text-light)', fontWeight: 600}}>{formatIndianDate(new Date().toISOString().split('T')[0])}</span>
            </div>

            <div style={{paddingBottom: '5rem'}}>
              {employees
                .filter(e => e.role === 'employee')
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map(emp => {
                const status = bulkAttendance[emp.id];
                const isAbsent = status === 'absent';
                const isPresent = status === 'present';
                const isHalfDay = status === 'half-day';
                
                return (
                  <div key={emp.id} className="card" style={{ 
                    padding: '1rem 1.25rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                    background: isAbsent ? '#fff0f0' : isPresent ? '#f0fff4' : isHalfDay ? '#fff8eb' : 'var(--card-bg)',
                    border: isAbsent ? '1px solid #ffcaca' : isPresent ? '1px solid #c6f6d5' : isHalfDay ? '1px solid #f6e0b5' : '1px solid transparent',
                    transition: 'all 0.2s'
                  }}>
                    <div>
                      <h3 style={{fontWeight: 700, color: isAbsent ? 'var(--danger)' : isPresent ? 'var(--success)' : isHalfDay ? '#b8860b' : 'var(--text-dark)', marginBottom: '0.15rem', textTransform: 'capitalize'}}>
                        {emp.name}
                      </h3>
                      {emp.role !== 'employee' && (
                        <p style={{fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase'}}>
                          {emp.role.replace('_', ' ')}
                        </p>
                      )}
                    </div>
                    <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                      {status ? (
                        /* FROZEN: row already submitted */
                        <div style={{
                          padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                          background: isPresent ? 'var(--success)' : isHalfDay ? '#f59e0b' : 'var(--danger)',
                          color: 'white', display: 'flex', alignItems: 'center', gap: '0.25rem'
                        }}>
                          {isPresent && <><Check size={14} strokeWidth={3} /> Present</>}
                          {isHalfDay && <><Sun size={14} strokeWidth={3} /> Half Day</>}
                          {isAbsent && <><X size={14} strokeWidth={3} /> Absent</>}
                          {status === 'leave' && <><Calendar size={14} strokeWidth={3} /> Leave</>}
                        </div>
                      ) : (
                        /* PENDING: selecting but not yet submitted */
                        <>
                          {(['present', 'half-day', 'absent']).map(s => {
                            const sel = localSelection[emp.id] === s;
                            const icon = s === 'present' ? <Check size={18} strokeWidth={sel ? 3 : 2} /> : s === 'half-day' ? <Sun size={18} strokeWidth={sel ? 3 : 2} /> : <X size={18} strokeWidth={sel ? 3 : 2} />;
                            const activeColor = s === 'present' ? 'var(--success)' : s === 'half-day' ? '#f59e0b' : 'var(--danger)';
                            return (
                              <button
                                key={s}
                                onClick={() => setLocalSelection(prev => ({ ...prev, [emp.id]: prev[emp.id] === s ? null : s }))}
                                style={{
                                  width: '40px', height: '40px', borderRadius: '50%', border: sel ? `2px solid ${activeColor}` : '2px solid transparent', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: sel ? activeColor : '#f4f5f7',
                                  color: sel ? 'white' : 'var(--text-light)',
                                  transition: 'all 0.18s',
                                  transform: sel ? 'scale(1.1)' : 'scale(1)'
                                }}
                                title={`Mark ${s.replace('-', ' ')}`}
                              >
                                {icon}
                              </button>
                            );
                          })}
                          {localSelection[emp.id] && (
                            <button
                              onClick={() => submitAttendance(emp.id)}
                              style={{
                                padding: '0.4rem 0.9rem', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                                background: 'var(--accent)', color: 'white', fontSize: '0.75rem', fontWeight: 800,
                                transition: 'all 0.18s', boxShadow: '0 2px 8px rgba(99,102,241,0.3)'
                              }}
                              title="Confirm and lock attendance"
                            >
                              Submit
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>


          </motion.div>
        )}

        {activeTab === 'manual' && (
          <motion.div key="manual" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <h2 style={{fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.5px'}}>Manual Correction</h2>
            
            <div className="card" style={{padding: '1.5rem'}}>
              
              {!selectedManualEmp && (
                <div>
                  <label style={{display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem'}}>1. Select Employee</label>
                  <div className="search-wrapper" style={{marginBottom: 0}}>
                    <SearchIcon size={20} className="search-icon" />
                    <input 
                      type="text" 
                      placeholder="Type a name to search..." 
                      value={manualSearch}
                      onChange={(e) => setManualSearch(e.target.value)}
                    />
                  </div>
                  
                  {manualSearch && (
                    <div style={{background: '#fafafa', borderRadius: '12px', marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)'}}>
                      {employees.filter(e => e.role === 'employee' && (e.name || '').toLowerCase().includes(manualSearch.toLowerCase())).map(emp => (
                        <div 
                          key={emp.id} 
                          style={{padding: '1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600}}
                          onClick={() => { setSelectedManualEmp(emp); setManualSearch(''); }}
                        >
                          {emp.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedManualEmp ? (
                <div style={{background: '#fafafa', padding: '1rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                  <div>
                    <p style={{fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase'}}>Selected Employee</p>
                    <p style={{fontWeight: 800, fontSize: '1.125rem'}}>{selectedManualEmp.name}</p>
                  </div>
                  <button onClick={() => setSelectedManualEmp(null)} style={{background: 'white', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'}}>
                    Change
                  </button>
                </div>
              ) : null}

              <motion.div style={{opacity: selectedManualEmp ? 1 : 0.4, pointerEvents: selectedManualEmp ? 'auto' : 'none', transition: 'all 0.3s'}}>
                <div className="form-group" style={{marginTop: '1.5rem'}}>
                  <label>2. Select Date</label>
                  <input 
                    type="date" 
                    value={manualDate} 
                    onChange={e => setManualDate(e.target.value)} 
                    disabled={!selectedManualEmp}
                  />
                </div>

                <label style={{display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', marginTop: '1.5rem'}}>3. Overwrite Status</label>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                  <button className="btn" style={{background: 'var(--success)', display: 'flex', gap: '0.5rem'}} onClick={() => submitManualEntry('present')} disabled={!selectedManualEmp}>
                    <Check size={18}/> Mark as Present
                  </button>
                  <button className="btn" style={{background: '#f59e0b', display: 'flex', gap: '0.5rem', color: 'white'}} onClick={() => submitManualEntry('half-day')} disabled={!selectedManualEmp}>
                    <Sun size={18}/> Mark as Half Day
                  </button>
                  <button className="btn" style={{background: 'var(--danger)', display: 'flex', gap: '0.5rem'}} onClick={() => submitManualEntry('absent')} disabled={!selectedManualEmp}>
                    <Minus size={18}/> Mark as Absent
                  </button>
                  <button className="btn" style={{background: 'var(--info)', display: 'flex', gap: '0.5rem'}} onClick={() => submitManualEntry('leave')} disabled={!selectedManualEmp}>
                    <Calendar size={18}/> Mark as Leave
                  </button>
                </div>
              </motion.div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Modal */}
      <AnimatePresence>
        {statsModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem'}}
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="card" style={{width: '100%', maxWidth: '400px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto'}}
            >
              <div className="flex-between mb-4">
                <div>
                  <h3 className="card-title" style={{fontSize: '1.25rem', marginBottom: 0}}>{statsModal.name}</h3>
                  <p style={{fontSize: '0.875rem', color: 'var(--text-light)', fontWeight: 500, textTransform: 'capitalize'}}>{statsModal.role.replace('_', ' ')}</p>
                </div>
                <button onClick={() => setStatsModal(null)} style={{background: '#f4f5f7', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%'}}>
                  <X size={18}/>
                </button>
              </div>
              
              {employeeStats ? (() => {
                const presentCount = employeeStats.filter(l => l.status === 'present').length;
                const leaveCount = employeeStats.filter(l => l.status === 'leave').length;
                const absentLogs = employeeStats.filter(l => l.status === 'absent');
                const absentCount = absentLogs.length;
                const monthlySalary = Number(statsModal.salary || 0);
                const dailyRate = monthlySalary / 30;
                const totalPayout = presentCount * dailyRate;

                return (
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--accent)', color: 'white', padding: '1rem', borderRadius: '16px', marginBottom: '0.5rem' }}>
                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.9, textTransform: 'uppercase' }}>Total Payout</p>
                          <p style={{ fontWeight: 800, fontSize: '1.5rem' }}>₹{totalPayout.toLocaleString('en-IN')}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.9, textTransform: 'uppercase' }}>Monthly Salary</p>
                          <p style={{ fontWeight: 700 }}>₹{monthlySalary.toLocaleString('en-IN')}</p>
                          <p style={{ fontSize: '0.65rem', opacity: 0.8 }}>Daily: ₹{dailyRate.toFixed(0)}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', padding: '1rem', borderRadius: '16px' }}>
                        <span className="badge badge-present">Present</span>
                        <span style={{fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-dark)'}}>{presentCount} <span style={{fontSize: '0.875rem', color: 'var(--text-light)', fontWeight: 500}}>days</span></span>
                      </div>

                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', padding: '1rem', borderRadius: '16px'}}>
                        <span className="badge badge-leave">Leave</span>
                        <span style={{fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-dark)'}}>{leaveCount} <span style={{fontSize: '0.875rem', color: 'var(--text-light)', fontWeight: 500}}>days</span></span>
                      </div>

                      <div style={{background: '#fafafa', padding: '1rem', borderRadius: '16px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span className="badge badge-absent">Absent</span>
                          <span style={{fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-dark)'}}>{absentCount} <span style={{fontSize: '0.875rem', color: 'var(--text-light)', fontWeight: 500}}>days</span></span>
                        </div>
                        
                        {absentCount > 0 && (
                          <button 
                            style={{marginTop: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-light)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', padding: 0}}
                            onClick={() => setExpandAbsent(!expandAbsent)}
                          >
                            {expandAbsent ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {expandAbsent ? 'Hide dates' : 'View missed dates'}
                          </button>
                        )}

                        <AnimatePresence>
                          {expandAbsent && absentCount > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                              style={{marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}
                            >
                              {absentLogs.map(log => (
                                <div key={log.date} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                  <span style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dark)'}}>{formatIndianDate(log.date)}</span>
                                  <button 
                                    className="btn btn-accent"
                                    style={{padding: '0.35rem 0.75rem', width: 'auto', fontSize: '0.75rem', borderRadius: '8px'}}
                                    onClick={() => fixAbsent(statsModal.id, log.date)}
                                  >
                                    Mark Present
                                  </button>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>
                  </div>
                );
              })() : <div style={{textAlign: 'center', padding: '2rem 0', color: 'var(--text-light)'}}>Loading...</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <div className="nav-icon"><Home size={24} /></div>
          <span style={{fontSize: '0.75rem', fontWeight: 600, marginTop: '4px'}}>Home</span>
        </button>
        <button className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
          <div className="nav-icon"><Check size={24} /></div>
          <span style={{fontSize: '0.75rem', fontWeight: 600, marginTop: '4px'}}>Attendance</span>
        </button>
        <button className={`nav-item ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')}>
          <div className="nav-icon"><Edit3 size={24} /></div>
          <span style={{fontSize: '0.75rem', fontWeight: 600, marginTop: '4px'}}>Manual</span>
        </button>
      </div>

    </motion.div>
  );
}
