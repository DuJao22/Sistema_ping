import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, RefreshCw, Activity, Globe, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { format } from 'date-fns';

interface SiteLog {
  checked_at: string;
  response_time: number | null;
  status: string;
}

interface Site {
  id: string;
  url: string;
  db_url?: string;
  description: string;
  status: string;
  db_status: string;
  response_time: number | null;
  last_checked: string | null;
  uptime: string;
  logs: SiteLog[];
}

export default function Dashboard() {
  const [sites, setSites] = useState<Site[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  // Form state
  const [url, setUrl] = useState('');
  const [dbUrl, setDbUrl] = useState('');
  const [description, setDescription] = useState('');

  // Load from Backend on mount
  useEffect(() => {
    const fetchProjects = async () => {
      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSites(data.map((p: any) => ({
          id: p.id.toString(),
          url: p.page_url,
          db_url: p.db_url,
          description: '',
          status: p.page_status || 'Pending',
          db_status: p.db_status || 'Pending',
          response_time: null,
          last_checked: p.last_checked,
          uptime: '100.00',
          logs: []
        })));
      }
    };
    fetchProjects();
  }, []);

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ page_url: url, db_url: dbUrl }),
    });
    if (response.ok) {
      setShowAddModal(false);
      setUrl('');
      setDbUrl('');
      setDescription('');
      // Refresh projects
      const res = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setSites(data.map((p: any) => ({
        id: p.id.toString(),
        url: p.page_url,
        db_url: p.db_url,
        description: '',
        status: p.last_status || 'Pending',
        response_time: null,
        last_checked: p.last_checked,
        uptime: '100.00',
        logs: []
      })));
    } else {
      alert('Failed to add project');
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this monitored site?')) return;
    setSites(sites.filter(s => s.id !== id));
    if (selectedSite?.id === id) setSelectedSite(null);
  };

  const checkSite = async (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    if (!site) return;

    try {
      // Call our serverless function to avoid CORS
      const res = await fetch(`/api/ping?url=${encodeURIComponent(site.url)}`);
      const data = await res.json();

      const newLog: SiteLog = {
        checked_at: new Date().toISOString(),
        status: data.status,
        response_time: data.responseTime
      };

      setSites(prev => prev.map(s => {
        if (s.id === siteId) {
          const updatedLogs = [newLog, ...s.logs].slice(0, 50); // Keep last 50 logs
          const onlineCount = updatedLogs.filter(l => l.status === 'Online').length;
          const uptime = ((onlineCount / updatedLogs.length) * 100).toFixed(2);

          return {
            ...s,
            status: data.status,
            response_time: data.responseTime,
            last_checked: newLog.checked_at,
            uptime,
            logs: updatedLogs
          };
        }
        return s;
      }));
    } catch (error) {
      console.error('Ping failed', error);
    }
  };

  const handleCheckNow = (id: string) => {
    checkSite(id);
  };

  // Auto-ping every 30 seconds while dashboard is open
  useEffect(() => {
    if (sites.length === 0) return;
    const interval = setInterval(() => {
      sites.forEach(site => checkSite(site.id));
    }, 30000);
    return () => clearInterval(interval);
  }, [sites]);

  const handleSelectSite = (site: Site) => {
    setSelectedSite(site);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Online': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'Offline': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'Slow': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default: return <Activity className="w-5 h-5 text-zinc-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Online': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Offline': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'Slow': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  };

  const overallUptime = sites.length > 0 
    ? (sites.reduce((acc, site) => acc + parseFloat(site.uptime || '0'), 0) / sites.length).toFixed(2)
    : '0.00';

  const onlineCount = sites.filter(s => s.status === 'Online').length;
  const offlineCount = sites.filter(s => s.status === 'Offline').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 rounded-xl">
            <Activity className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm text-zinc-400 font-medium">Overall Uptime</p>
            <p className="text-3xl font-bold text-zinc-100">{overallUptime}%</p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center gap-4">
          <div className="p-4 bg-blue-500/10 rounded-xl">
            <Globe className="w-8 h-8 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-zinc-400 font-medium">Monitored Sites</p>
            <p className="text-3xl font-bold text-zinc-100">{sites.length}</p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center gap-4">
          <div className="p-4 bg-red-500/10 rounded-xl">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-zinc-400 font-medium">Currently Down</p>
            <p className="text-3xl font-bold text-zinc-100">{offlineCount}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-semibold text-zinc-100">Monitored Projects</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center w-full sm:w-auto gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Add Project
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sites List */}
        <div className="lg:col-span-1 space-y-4">
          {sites.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
              <Globe className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No sites monitored yet.</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-emerald-500 hover:text-emerald-400 text-sm font-medium"
              >
                Add your first monitor
              </button>
            </div>
          ) : (
            sites.map(site => (
              <div 
                key={site.id} 
                onClick={() => handleSelectSite(site)}
                className={`bg-zinc-900 border rounded-2xl p-5 cursor-pointer transition-all hover:border-zinc-600 ${selectedSite?.id === site.id ? 'border-emerald-500/50 ring-1 ring-emerald-500/50' : 'border-zinc-800'}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(site.status)}
                    <h4 className="font-medium text-zinc-100 truncate max-w-[180px]" title={site.url}>
                      {site.url.replace(/^https?:\/\//, '')}
                    </h4>
                  </div>
                  <div className="flex gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusColor(site.status)}`} title="Page Status">
                      P: {site.status === 'Online' ? 'OK' : 'Down'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusColor(site.db_status)}`} title="DB Status">
                      DB: {site.db_status === 'Online' ? 'OK' : 'Down'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {site.response_time ? `${site.response_time}ms` : 'N/A'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    {site.uptime}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Site Details & Chart */}
        <div className="lg:col-span-2">
          {selectedSite ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-full flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div className="w-full sm:w-auto truncate">
                  <h2 className="text-2xl font-bold text-zinc-100 mb-2 truncate" title={selectedSite.url}>{selectedSite.url}</h2>
                  <p className="text-zinc-400 text-sm truncate">{selectedSite.description || 'No description provided'}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => handleCheckNow(selectedSite.id)}
                    className="flex-1 sm:flex-none flex justify-center p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors"
                    title="Check Now"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(selectedSite.id)}
                    className="flex-1 sm:flex-none flex justify-center p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors"
                    title="Delete Monitor"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Page Status</p>
                  <p className={`font-medium ${selectedSite.status === 'Online' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {selectedSite.status}
                  </p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">DB Status</p>
                  <p className={`font-medium ${selectedSite.db_status === 'Online' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {selectedSite.db_status}
                  </p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Response Time</p>
                  <p className="font-medium text-zinc-100">{selectedSite.response_time ? `${selectedSite.response_time}ms` : '-'}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Uptime</p>
                  <p className="font-medium text-zinc-100">{selectedSite.uptime}%</p>
                </div>
              </div>

              <div className="bg-zinc-800/30 rounded-xl p-4 mb-8 border border-zinc-800/50">
                <h4 className="text-sm font-medium text-zinc-400 mb-4">Current Status Overview</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={[
                    { name: 'Page', status: selectedSite.status === 'Online' ? 1 : selectedSite.status === 'Offline' ? 0 : 0.5 },
                    { name: 'DB', status: selectedSite.db_status === 'Online' ? 1 : selectedSite.db_status === 'Offline' ? 0 : 0.5 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                    <YAxis domain={[0, 1]} ticks={[0, 0.5, 1]} stroke="#71717a" fontSize={12} tickFormatter={(val) => val === 1 ? 'Online' : val === 0 ? 'Offline' : 'Pending'} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                      formatter={(val: number) => [val === 1 ? 'Online' : val === 0 ? 'Offline' : 'Pending', 'Status']}
                    />
                    <Bar dataKey="status" radius={[4, 4, 0, 0]}>
                      {[
                        { name: 'Page', status: selectedSite.status === 'Online' ? 1 : selectedSite.status === 'Offline' ? 0 : 0.5 },
                        { name: 'DB', status: selectedSite.db_status === 'Online' ? 1 : selectedSite.db_status === 'Offline' ? 0 : 0.5 }
                      ].map((entry, index) => {
                        let color;
                        if (index === 0) { // Page
                          color = entry.status === 1 ? '#10b981' : entry.status === 0 ? '#ef4444' : '#71717a';
                        } else { // DB
                          color = entry.status === 1 ? '#f97316' : entry.status === 0 ? '#ef4444' : '#71717a';
                        }
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {selectedSite.db_url && (
                <div className="bg-zinc-800/30 rounded-xl p-4 mb-8 border border-zinc-800/50">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Database URL (SQLiteCloud)</p>
                  <p className="font-medium text-zinc-300 truncate" title={selectedSite.db_url}>{selectedSite.db_url}</p>
                </div>
              )}
              
              <div className={`flex-1 min-h-[300px] ${!selectedSite.db_url ? 'mt-4' : ''}`}>
                <h4 className="text-sm font-medium text-zinc-400 mb-4">Response Time History</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...selectedSite.logs].map(log => ({ ...log, response_time: log.response_time ?? 0 })).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                      dataKey="checked_at" 
                      tickFormatter={(val) => {
                        try {
                          return format(new Date(val), 'HH:mm:ss');
                        } catch (e) {
                          return val;
                        }
                      }}
                      stroke="#71717a"
                      fontSize={12}
                      tickMargin={10}
                    />
                    <YAxis 
                      stroke="#71717a" 
                      fontSize={12}
                      tickFormatter={(val) => `${val}ms`}
                      width={60}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                      labelFormatter={(val) => {
                        try {
                          return format(new Date(val), 'MMM d, HH:mm:ss');
                        } catch (e) {
                          return val;
                        }
                      }}
                      formatter={(val: number) => [`${val} ms`, 'Response Time']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="response_time" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, fill: '#10b981', stroke: '#18181b', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-full flex items-center justify-center text-zinc-500">
              Select a site to view details
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-zinc-100">Add New Project</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-zinc-100">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Project URL (Render, etc.)</label>
                <input
                  type="url"
                  required
                  placeholder="https://my-project.onrender.com"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Database URL (SQLiteCloud) <span className="text-zinc-500 font-normal">- Optional</span></label>
                <input
                  type="url"
                  placeholder="https://my-db.sqlite.cloud"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={dbUrl}
                  onChange={(e) => setDbUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Friendly Name / Description (Optional)</label>
                <input
                  type="text"
                  placeholder="My Production Server"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50">
                <p className="text-sm text-zinc-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  Ping Interval: <strong>Every 30 seconds</strong> (While open)
                </p>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-medium transition-colors"
                >
                  Add Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
