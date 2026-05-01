import { useState, useEffect } from 'react';
import { Eye, Edit2, Download, Plus, Search as SearchIcon, Home, FileText, X, Trash2, ChevronDown, ChevronUp, Edit3, Check, Minus, Calendar, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'http://192.168.29.128:5001';

export default function CEODashboard() {
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);

  // Navigation State
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'search', 'logs', 'manual'
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Entry State
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualSearch, setManualSearch] = useState('');
  const [selectedManualEmp, setSelectedManualEmp] = useState(null);

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);

  // Bulk Attendance State
  const [bulkAttendance, setBulkAttendance] = useState({});

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: null, name: '', username: '', password: '', role: 'employee', salary: 0 });

  // Stats Modal State
  const [statsModal, setStatsModal] = useState(null);
  const [employeeStats, setEmployeeStats] = useState(null);
  const [expandAbsent, setExpandAbsent] = useState(false);

  // History UI State
  const [expandedDate, setExpandedDate] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(null);

  // Payroll Summary State
  const [payrollStartDate, setPayrollStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [payrollEndDate, setPayrollEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPayrollEmps, setSelectedPayrollEmps] = useState(new Set());
  const [payrollSummary, setPayrollSummary] = useState(null);
  const [isLoadingPayroll, setIsLoadingPayroll] = useState(false);
  const [payrollAllLogs, setPayrollAllLogs] = useState([]);

  const fetchEmployees = async () => {
    const res = await fetch(`${API_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) setEmployees(await res.json());
  };

  const fetchLogs = async () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);

    const res = await fetch(`${API_URL}/api/attendance?start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) setLogs(await res.json());
  };

  useEffect(() => {
    fetchEmployees();
    fetchLogs();
  }, []);

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `${API_URL}/api/users/${form.id}` : `${API_URL}/api/users`;

    const payload = { ...form };

    await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    });

    setShowForm(false);
    fetchEmployees();
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;
    await fetch(`${API_URL}/api/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    fetchEmployees();
  };

  const exportData = async (days) => {
    setIsExporting(true);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const res = await fetch(`${API_URL}/api/attendance?start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });

    if (!res.ok) {
      alert('Failed to fetch data. Please try again.');
      setIsExporting(false);
      return;
    }

    const exportLogs = await res.json();
    if (exportLogs.length === 0) {
      alert(`No records found for the last ${days} days.`);
      setIsExporting(false);
      setShowExportModal(false);
      return;
    }

    const header = ['Employee Name', 'Date', 'Status'];
    const csvLines = exportLogs.map(log => `${log.employee_name},${log.date},${log.status}`);
    const csvContent = [header.join(','), ...csvLines].join('\n');
    const filename = `attendance_last_${days}_days.csv`;

    // Try Capacitor Filesystem plugin (works in native Android app)
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      // Convert to base64
      const base64Data = btoa(unescape(encodeURIComponent(csvContent)));
      await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });
      setIsExporting(false);
      setShowExportModal(false);
      setExportSuccess(`✅ Saved to Documents: ${filename}`);
      setTimeout(() => setExportSuccess(null), 4000);
      return;
    } catch (e) {
      // Capacitor not available or failed — fall through to browser download
    }

    // Browser fallback: data URI download
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const link = document.createElement('a');
    link.href = dataUri;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExporting(false);
    setShowExportModal(false);
    setExportSuccess(`✅ ${filename} downloaded!`);
    setTimeout(() => setExportSuccess(null), 4000);
  };

  const fetchStats = async (emp) => {
    setStatsModal(emp);
    setEmployeeStats(null);
    setExpandAbsent(false);

    const end = new Date().toISOString().split('T')[0];
    const start = '2024-01-01'; // Fetch all history
    const res = await fetch(`${API_URL}/api/attendance?start_date=${start}&end_date=${end}&user_id=${emp.id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) setEmployeeStats(await res.json());
  };

  const fixAbsent = async (userId, date) => {
    if (!window.confirm(`Are you sure you want to mark this employee as PRESENT for ${date}?`)) return;

    await fetch(`${API_URL}/api/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ user_id: userId, date, status: 'present' })
    });
    // Update locally
    setEmployeeStats(prev => prev.map(l => l.date === date ? { ...l, status: 'present' } : l));
    // Refresh global logs just in case it's in the 7 day window
    fetchLogs();
  };

  const submitManualEntry = async (status) => {
    if (!selectedManualEmp) return alert("Please select an employee first.");
    if (!window.confirm(`Mark ${selectedManualEmp.name} as ${status.toUpperCase()} for ${formatIndianDate(manualDate)}?`)) return;

    await fetch(`${API_URL}/api/attendance`, {
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
    fetchLogs();
  };

  const submitBulkAttendance = async () => {
    const today = new Date().toISOString().split('T')[0];
    const updates = Object.keys(bulkAttendance).map(userId => {
      const status = bulkAttendance[userId];
      if (!status) return Promise.resolve();

      return fetch(`${API_URL}/api/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ user_id: userId, date: today, status })
      });
    });

    await Promise.all(updates);
    alert('Attendance successfully logged for today!');
    setBulkAttendance({});
    fetchLogs();
  };

  const formatIndianDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const generatePayrollSummary = async () => {
    if (selectedPayrollEmps.size === 0) return alert('Please select at least one employee.');
    setIsLoadingPayroll(true);
    setPayrollSummary(null);

    const res = await fetch(`${API_URL}/api/attendance?start_date=${payrollStartDate}&end_date=${payrollEndDate}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });

    if (!res.ok) { setIsLoadingPayroll(false); return; }
    const allLogs = await res.json();

    const selectedEmployees = employees.filter(e => e.role === 'employee' && selectedPayrollEmps.has(e.id));
    const summary = selectedEmployees.map(emp => {
      const empLogs = allLogs.filter(l => l.user_id === emp.id);
      const presentDays = empLogs.filter(l => l.status === 'present').length;
      const absentDays = empLogs.filter(l => l.status === 'absent').length;
      const leaveDays = empLogs.filter(l => l.status === 'leave').length;
      const dailyRate = Number(emp.salary || 0) / 30;
      const totalPayout = presentDays * dailyRate;
      return { ...emp, presentDays, absentDays, leaveDays, dailyRate, totalPayout };
    });

    setPayrollSummary(summary);
    setIsLoadingPayroll(false);
  };

  const togglePayrollEmp = (id) => {
    setPayrollSummary(null);
    setSelectedPayrollEmps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setPayrollSummary(null);
    const workerIds = employees.filter(e => e.role === 'employee').map(e => e.id);
    if (selectedPayrollEmps.size === workerIds.length) {
      setSelectedPayrollEmps(new Set());
    } else {
      setSelectedPayrollEmps(new Set(workerIds));
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Calculate Neobank Dashboard Metrics
  const calculateMetrics = () => {
    let presentToday = 0;
    let absentToday = 0;
    let leaveToday = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    logs.forEach(log => {
      // Today's count
      if (log.date === todayStr) {
        if (log.status === 'present') presentToday++;
        if (log.status === 'absent') absentToday++;
        if (log.status === 'leave') leaveToday++;
      }
    });

    const totalStaff = employees.filter(e => e.role !== 'ceo').length;
    
    // Calculate total estimated payout for today based on present staff
    const todayPresentUserIds = logs.filter(l => l.date === todayStr && l.status === 'present').map(l => l.user_id);
    const estimatedPayout = employees
      .filter(e => todayPresentUserIds.includes(e.id))
      .reduce((acc, e) => acc + (Number(e.salary || 0) / 30), 0);

    return { presentToday, absentToday, leaveToday, totalStaff, estimatedPayout };
  };

  const { presentToday, absentToday, leaveToday, totalStaff, estimatedPayout } = calculateMetrics();

  // Notification Data
  const today = new Date().toISOString().split('T')[0];
  const todayAbsentees = logs.filter(l => l.date === today && l.status === 'absent');
  const todayLeaves = logs.filter(l => l.date === today && l.status === 'leave');
  const notificationCount = todayAbsentees.length + todayLeaves.length;

  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()) && e.role === 'employee');

  // Group logs by Date
  const groupedLogs = logs.reduce((acc, log) => {
    if (!acc[log.date]) acc[log.date] = { present: 0, absent: 0, leave: 0, halfDay: 0, details: [] };
    if (log.status === 'present') acc[log.date].present++;
    if (log.status === 'absent') acc[log.date].absent++;
    if (log.status === 'leave') acc[log.date].leave++;
    if (log.status === 'half-day') acc[log.date].halfDay++;
    acc[log.date].details.push(log);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

      {/* Export Success Toast */}
      <AnimatePresence>
        {exportSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
              background: '#166534', color: 'white', padding: '0.75rem 1.25rem',
              borderRadius: '12px', zIndex: 9999, fontSize: '0.875rem', fontWeight: 700,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)', whiteSpace: 'nowrap', maxWidth: '90vw'
            }}
          >
            {exportSuccess}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <motion.div key="home" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <div className="flex-between mb-6">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '0.05rem', color: 'var(--text-dark)' }}>
                  {getGreeting()}, Pritesh
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', fontWeight: 500 }}>
                  Welcome to Chills
                </p>
              </div>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowNotifications(!showNotifications)} style={{ background: '#ffffff', border: '1px solid var(--border)', borderRadius: '16px', padding: '0.75rem', cursor: 'pointer', position: 'relative', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                  <Bell size={16} color="var(--text-dark)" strokeWidth={2} />
                  {notificationCount > 0 && (
                    <span style={{ position: 'absolute', top: 10, right: 10, background: '#84cc16', width: '10px', height: '10px', borderRadius: '50%', border: '2px solid white' }}></span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.75rem', width: '280px', background: 'white', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '1px solid var(--border)', zIndex: 100, overflow: 'hidden' }}
                    >
                      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: '#fafafa' }}>
                        <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>Today's Alerts</h4>
                      </div>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {notificationCount === 0 ? (
                          <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.875rem' }}>
                            All clear! No absentees today.
                          </div>
                        ) : (
                          <>
                            {todayAbsentees.length > 0 && (
                              <div style={{ padding: '0.75rem 1rem' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Absent</p>
                                {todayAbsentees.map(log => (
                                  <div key={log.id} style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0.25rem 0' }}>{log.employee_name}</div>
                                ))}
                              </div>
                            )}
                            {todayLeaves.length > 0 && (
                              <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--info)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>On Leave</p>
                                {todayLeaves.map(log => (
                                  <div key={log.id} style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0.25rem 0' }}>{log.employee_name}</div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="card card-accent mb-6" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 0 }}>Today's Pulse</h2>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase' }}>Present</p>
                  <p style={{ fontSize: '2rem', fontWeight: 800 }}>{presentToday}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase' }}>Absent</p>
                  <p style={{ fontSize: '2rem', fontWeight: 800 }}>{absentToday}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase' }}>On Leave</p>
                  <p style={{ fontSize: '2rem', fontWeight: 800 }}>{leaveToday}</p>
                </div>
              </div>
            </div>

            <div className="flex-between mb-4">
              <h2 className="card-title" style={{ marginBottom: 0, fontSize: '1.25rem' }}>Team Directory</h2>
              <button className="btn" style={{ width: 'auto', padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px', background: 'var(--accent)', color: 'white' }} onClick={() => { setForm({ id: null, name: '', username: '', password: '', role: 'employee', salary: 0 }); setShowForm(true); }}>
                <Plus size={16} /> Add Employee
              </button>
            </div>

            <div className="search-wrapper" style={{ marginBottom: '1rem' }}>
              <SearchIcon size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <AnimatePresence>
              {showForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="card"
                  style={{ background: '#fafafa' }}
                >
                  <h3 className="card-title" style={{ fontSize: '1.125rem' }}>{form.id ? 'Edit Employee' : 'New Employee'}</h3>
                  <form onSubmit={handleSaveEmployee}>
                    <div className="form-group"><label>Full Name</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>

                    <div className="form-group">
                      <label>Monthly Salary (₹)</label>
                      <input
                        type="number"
                        required
                        value={form.salary}
                        onChange={e => setForm({ ...form, salary: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        onFocus={e => e.target.select()}
                      />
                    </div>

                    <div className="form-group">
                      <label>System Role</label>
                      <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                        <option value="employee">Factory Worker</option>
                        <option value="attendance_taker">Attendance Taker</option>
                        <option value="ceo">Administrator</option>
                      </select>
                    </div>

                    {form.role !== 'employee' && (
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className="form-group" style={{ flex: 1 }}><label>Username</label><input required={form.role !== 'employee'} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div>
                        <div className="form-group" style={{ flex: 1 }}><label>Password</label><input type="password" required={form.role !== 'employee'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button type="submit" className="btn">Save changes</button>
                      <button type="button" className="btn btn-outline" style={{ borderRadius: '9999px' }} onClick={() => setShowForm(false)}>Cancel</button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              {filteredEmployees.length === 0 ? <p className="text-light text-center" style={{ padding: '3rem 0' }}>No employees found.</p> : null}
              {filteredEmployees.map(emp => (
                <div key={emp.id} className="card" style={{ padding: '1.25rem' }}>
                  <div className="flex-between">
                    <div>
                      <h3 style={{ fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.15rem' }}>
                        {emp.name}
                      </h3>
                      {emp.role !== 'employee' && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {emp.role === 'ceo' ? 'Administrator' : 'Attendance Taker'}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button style={{ background: '#f4f5f7', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', color: 'var(--text-dark)' }} onClick={() => fetchStats(emp)} title="View Stats">
                        <Eye size={16} />
                      </button>
                      <button style={{ background: '#f4f5f7', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', color: 'var(--text-dark)' }} onClick={() => { setForm(emp); setShowForm(true) }} title="Edit Employee">
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'attendance' && (
          <motion.div key="attendance" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Quick Attendance</h2>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-light)', fontWeight: 600 }}>{formatIndianDate(new Date().toISOString().split('T')[0])}</span>
            </div>

            <div style={{ paddingBottom: '5rem' }}>
              {employees
                .filter(e => e.role !== 'ceo')
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(emp => {
                  const status = bulkAttendance[emp.id];
                  const isAbsent = status === 'absent';
                  const isPresent = status === 'present';

                  return (
                    <div key={emp.id} className="card" style={{
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: isAbsent ? '#fff0f0' : isPresent ? '#f0fff4' : 'var(--card-bg)',
                      border: isAbsent ? '1px solid #ffcaca' : isPresent ? '1px solid #c6f6d5' : '1px solid transparent',
                      transition: 'all 0.2s'
                    }}>
                      <div>
                        <h3 style={{ fontWeight: 700, color: isAbsent ? 'var(--danger)' : isPresent ? 'var(--success)' : 'var(--text-dark)', marginBottom: '0.15rem', textTransform: 'capitalize' }}>
                          {emp.name}
                        </h3>
                        {emp.role !== 'employee' && (
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase' }}>
                            {emp.role.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setBulkAttendance(prev => ({ ...prev, [emp.id]: isPresent ? null : 'present' }))}
                          style={{
                            width: '40px', height: '40px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isPresent ? 'var(--success)' : '#f4f5f7',
                            color: isPresent ? 'white' : 'var(--text-light)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Check size={20} strokeWidth={isPresent ? 3 : 2} />
                        </button>
                        <button
                          onClick={() => setBulkAttendance(prev => ({ ...prev, [emp.id]: isAbsent ? null : 'absent' }))}
                          style={{
                            width: '40px', height: '40px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isAbsent ? 'var(--danger)' : '#f4f5f7',
                            color: isAbsent ? 'white' : 'var(--text-light)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <X size={20} strokeWidth={isAbsent ? 3 : 2} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div style={{ position: 'fixed', bottom: '85px', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '440px', padding: '0 1.5rem', zIndex: 90 }}>
              <button
                className="btn"
                style={{ width: '100%', padding: '1.25rem', fontSize: '1.125rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                onClick={submitBulkAttendance}
                disabled={Object.values(bulkAttendance).filter(Boolean).length === 0}
              >
                Submit Attendance
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'logs' && (
          <motion.div key="logs" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <div className="flex-between mb-4">
              <h2 className="card-title" style={{ marginBottom: 0, fontSize: '1.25rem' }}>Recent History</h2>
              <button className="btn btn-outline" style={{ width: 'auto', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px' }} onClick={() => setShowExportModal(true)}>
                <Download size={14} /> Export
              </button>
            </div>

            {sortedDates.length === 0 ? <p className="text-light text-center" style={{ padding: '3rem 0' }}>No records available.</p> : null}

            <div>
              {sortedDates.map(date => {
                const group = groupedLogs[date];
                const isExpanded = expandedDate === date;
                return (
                  <div key={date} className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', overflow: 'hidden' }}>
                    <div className="flex-between" style={{ cursor: 'pointer' }} onClick={() => setExpandedDate(isExpanded ? null : date)}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '1.125rem' }}>{formatIndianDate(date)}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 600, marginTop: '0.25rem' }}>
                          <span style={{ color: 'var(--success)', marginRight: '0.5rem' }}>{group.present} Present</span>
                          <span style={{ color: 'var(--danger)', marginRight: '0.5rem' }}>{group.absent} Absent</span>
                          <span style={{ color: 'var(--info)' }}>{group.leave} Leave</span>
                        </p>
                      </div>
                      <div style={{ color: 'var(--text-light)' }}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}
                        >
                          {group.details.map((log, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.875rem' }}>{log.employee_name}</span>
                              <span className={`badge badge-${log.status}`} style={{ transform: 'scale(0.85)', transformOrigin: 'right center' }}>{log.status}</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {activeTab === 'manual' && (
          <motion.div key="manual" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '-0.5px' }}>Manual Correction</h2>

            <div className="card" style={{ padding: '1.5rem' }}>

              {!selectedManualEmp && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>1. Select Employee</label>
                  <div className="search-wrapper" style={{ marginBottom: 0 }}>
                    <SearchIcon size={20} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Type a name to search..."
                      value={manualSearch}
                      onChange={(e) => setManualSearch(e.target.value)}
                    />
                  </div>

                  {manualSearch && (
                    <div style={{ background: '#fafafa', borderRadius: '12px', marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)' }}>
                      {employees.filter(e => e.role !== 'ceo' && e.name.toLowerCase().includes(manualSearch.toLowerCase())).map(emp => (
                        <div
                          key={emp.id}
                          style={{ padding: '1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600 }}
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
                <div style={{ background: '#fafafa', padding: '1rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Selected Employee</p>
                    <p style={{ fontWeight: 800, fontSize: '1.125rem' }}>{selectedManualEmp.name}</p>
                  </div>
                  <button onClick={() => setSelectedManualEmp(null)} style={{ background: 'white', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    Change
                  </button>
                </div>
              ) : null}

              <motion.div style={{ opacity: selectedManualEmp ? 1 : 0.4, pointerEvents: selectedManualEmp ? 'auto' : 'none', transition: 'all 0.3s' }}>
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label>2. Select Date</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={e => setManualDate(e.target.value)}
                    disabled={!selectedManualEmp}
                  />
                </div>

                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', marginTop: '1.5rem' }}>3. Overwrite Status</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button className="btn" style={{ background: 'var(--success)', display: 'flex', gap: '0.5rem' }} onClick={() => submitManualEntry('present')} disabled={!selectedManualEmp}>
                    <Check size={18} /> Mark as Present
                  </button>
                  <button className="btn" style={{ background: 'var(--danger)', display: 'flex', gap: '0.5rem' }} onClick={() => submitManualEntry('absent')} disabled={!selectedManualEmp}>
                    <Minus size={18} /> Mark as Absent
                  </button>
                  <button className="btn" style={{ background: 'var(--info)', display: 'flex', gap: '0.5rem' }} onClick={() => submitManualEntry('leave')} disabled={!selectedManualEmp}>
                    <Calendar size={18} /> Mark as Leave
                  </button>
                </div>
              </motion.div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="card" style={{ width: '100%', maxWidth: '320px', margin: '0 auto' }}
            >
              <div className="flex-between mb-4">
                <h3 className="card-title" style={{ fontSize: '1.25rem', marginBottom: 0 }}>Export Logs</h3>
                <button onClick={() => setShowExportModal(false)} style={{ background: '#f4f5f7', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button className="btn btn-outline" onClick={() => exportData(7)} disabled={isExporting}>Last 7 Days</button>
                <button className="btn btn-outline" onClick={() => exportData(15)} disabled={isExporting}>Last 15 Days</button>
                <button className="btn btn-outline" onClick={() => exportData(30)} disabled={isExporting}>Last 30 Days</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Modal */}
      <AnimatePresence>
        {statsModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="card" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div className="flex-between mb-4">
                <div>
                  <h3 className="card-title" style={{ fontSize: '1.25rem', marginBottom: 0 }}>{statsModal.name}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', fontWeight: 500, textTransform: 'capitalize' }}>{statsModal.role.replace('_', ' ')}</p>
                </div>
                <button onClick={() => setStatsModal(null)} style={{ background: '#f4f5f7', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%' }}>
                  <X size={18} />
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
                          <p style={{ fontWeight: 800, fontSize: '1.5rem' }}>₹{totalPayout.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.9, textTransform: 'uppercase' }}>Monthly Salary</p>
                          <p style={{ fontWeight: 700 }}>₹{monthlySalary.toLocaleString('en-IN')}</p>
                          <p style={{ fontSize: '0.65rem', opacity: 0.8 }}>Daily: ₹{dailyRate.toFixed(0)}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', padding: '1rem', borderRadius: '16px' }}>
                        <span className="badge badge-present">Present</span>
                        <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-dark)' }}>{presentCount} <span style={{ fontSize: '0.875rem', color: 'var(--text-light)', fontWeight: 500 }}>days</span></span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', padding: '1rem', borderRadius: '16px' }}>
                        <span className="badge badge-leave">Leave</span>
                        <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-dark)' }}>{leaveCount} <span style={{ fontSize: '0.875rem', color: 'var(--text-light)', fontWeight: 500 }}>days</span></span>
                      </div>

                      <div style={{ background: '#fafafa', padding: '1rem', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="badge badge-absent">Absent</span>
                          <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-dark)' }}>{absentCount} <span style={{ fontSize: '0.875rem', color: 'var(--text-light)', fontWeight: 500 }}>days</span></span>
                        </div>

                        {absentCount > 0 && (
                          <button
                            style={{ marginTop: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-light)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', padding: 0 }}
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
                              style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                            >
                              {absentLogs.map(log => (
                                <div key={log.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dark)' }}>{formatIndianDate(log.date)}</span>
                                  <button
                                    className="btn btn-accent"
                                    style={{ padding: '0.35rem 0.75rem', width: 'auto', fontSize: '0.75rem', borderRadius: '8px' }}
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
              })() : <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-light)' }}>Loading...</div>}
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'payroll' && (
          <motion.div key="payroll" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Payroll Summary</h2>
            </div>

            {/* Date Range */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Date Range</p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>From</label>
                  <input type="date" value={payrollStartDate} onChange={e => { setPayrollStartDate(e.target.value); setPayrollSummary(null); }} />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>To</label>
                  <input type="date" value={payrollEndDate} onChange={e => { setPayrollEndDate(e.target.value); setPayrollSummary(null); }} />
                </div>
              </div>
            </div>

            {/* Employee Selection */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase' }}>Select Employees</p>
                <button
                  onClick={toggleSelectAll}
                  style={{ fontSize: '0.75rem', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}
                >
                  {selectedPayrollEmps.size === employees.filter(e => e.role === 'employee').length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                {employees.filter(e => e.role === 'employee').sort((a,b) => a.name.localeCompare(b.name)).map(emp => (
                  <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.5rem', cursor: 'pointer', borderRadius: '10px', background: selectedPayrollEmps.has(emp.id) ? 'rgba(99,102,241,0.07)' : 'transparent' }}>
                    <input
                      type="checkbox"
                      checked={selectedPayrollEmps.has(emp.id)}
                      onChange={() => togglePayrollEmp(emp.id)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-dark)', marginBottom: 0 }}>{emp.name}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 500 }}>₹{(Number(emp.salary||0)/30).toFixed(0)}/day</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              className="btn"
              style={{ width: '100%', padding: '1rem', fontWeight: 800, marginBottom: '1.5rem' }}
              onClick={generatePayrollSummary}
              disabled={isLoadingPayroll || selectedPayrollEmps.size === 0}
            >
              {isLoadingPayroll ? 'Calculating...' : `Generate Summary (${selectedPayrollEmps.size} selected)`}
            </button>

            {/* Summary Table */}
            {payrollSummary && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="card" style={{ padding: '1.25rem', marginBottom: '5rem' }}>
                  <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '1rem' }}>
                    {formatIndianDate(payrollStartDate)} → {formatIndianDate(payrollEndDate)}
                  </h3>

                  {payrollSummary.map((emp, idx) => (
                    <div key={emp.id} style={{ borderBottom: idx < payrollSummary.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: '1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <p style={{ fontWeight: 800, color: 'var(--text-dark)', marginBottom: '0.15rem' }}>{emp.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 500 }}>₹{emp.dailyRate.toFixed(0)}/day</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--accent)' }}>₹{emp.totalPayout.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', fontWeight: 500 }}>Total Payout</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ flex: 1, textAlign: 'center', background: '#f0fff4', color: 'var(--success)', padding: '0.4rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>✓ {emp.presentDays} Present</span>
                        <span style={{ flex: 1, textAlign: 'center', background: '#fff0f0', color: 'var(--danger)', padding: '0.4rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>✗ {emp.absentDays} Absent</span>
                        <span style={{ flex: 1, textAlign: 'center', background: '#fffbeb', color: '#d97706', padding: '0.4rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>⏸ {emp.leaveDays} Leave</span>
                      </div>
                    </div>
                  ))}

                  <div style={{ background: 'var(--accent)', borderRadius: '16px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: '0.875rem', opacity: 0.9 }}>GRAND TOTAL</p>
                    <p style={{ color: 'white', fontWeight: 900, fontSize: '1.5rem' }}>₹{payrollSummary.reduce((s, e) => s + e.totalPayout, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <div className="nav-icon"><Home size={24} /></div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>Team</span>
        </button>
        <button className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
          <div className="nav-icon"><Check size={24} /></div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>Attendance</span>
        </button>
        <button className={`nav-item ${activeTab === 'payroll' ? 'active' : ''}`} onClick={() => setActiveTab('payroll')}>
          <div className="nav-icon"><Download size={24} /></div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>Payroll</span>
        </button>
        <button className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
          <div className="nav-icon"><FileText size={24} /></div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>History</span>
        </button>
        <button className={`nav-item ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')}>
          <div className="nav-icon"><Edit3 size={24} /></div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>Manual</span>
        </button>
      </div>
    </motion.div>
  );
}
