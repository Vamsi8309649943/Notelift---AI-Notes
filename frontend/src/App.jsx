import { BrowserRouter, Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import jsPDF from 'jspdf';
import {
  Sparkles, FileText, History, BarChart3, Settings, CreditCard,
  LogOut, Menu, X, ArrowRight, CheckCircle2, Zap, Brain, Shield,
  Download, ChevronDown, ChevronUp, AlertCircle, Star, Users,
  Clock, Lightbulb, BookOpen, Target, Bell, Search,
  Copy, Check, Loader2, HelpCircle, MessageSquare
} from 'lucide-react';

// ─── Auth Context ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

const getToken = () => localStorage.getItem('nlt-token');
const getStoredUser = () => { try { return JSON.parse(localStorage.getItem('nlt-user') || 'null'); } catch { return null; } };
const storeAuth = (token, user) => { localStorage.setItem('nlt-token', token); localStorage.setItem('nlt-user', JSON.stringify(user)); };
const clearAuth = () => { localStorage.removeItem('nlt-token'); localStorage.removeItem('nlt-user'); };

function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(!!getToken() && !getStoredUser());

  useEffect(() => {
    const token = getToken();
    if (token && !user) {
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(u => { setUser(u); localStorage.setItem('nlt-user', JSON.stringify(u)); })
        .catch(() => { clearAuth(); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => { storeAuth(token, userData); setUser(userData); };
  const logout = async () => {
    const token = getToken();
    if (token) fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    clearAuth(); setUser(null);
  };
  const refreshUser = async () => {
    const token = getToken();
    if (!token) return;
    const r = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) { const u = await r.json(); setUser(u); localStorage.setItem('nlt-user', JSON.stringify(u)); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
    </div>
  );

  return <AuthContext.Provider value={{ user, login, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

const useAuth = () => useContext(AuthContext);

// ─── API ─────────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) { clearAuth(); window.location.href = '/login'; throw new Error('Session expired'); }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error ${res.status}`);
  }
  return res.json();
};

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
  return (
    <div className={`toast ${type === 'error' ? 'toast-error' : 'toast-success'} flex items-center gap-3`}>
      {type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />}
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ─── PDF Export ──────────────────────────────────────────────────────────────
function exportToPDF(note) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, margin = 18, lineH = 6, contentW = W - 2 * margin;
  let y = margin;

  const addText = (text, size = 10, bold = false, color = [30, 30, 30]) => {
    doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text || ''), contentW);
    lines.forEach(line => { if (y > 275) { doc.addPage(); y = margin; } doc.text(line, margin, y); y += lineH; });
  };
  const section = (title) => {
    y += 4; doc.setFillColor(238, 242, 255);
    doc.roundedRect(margin - 2, y - 4, contentW + 4, lineH + 2, 2, 2, 'F');
    addText(title, 11, true, [79, 70, 229]); y += 2;
  };
  const divider = () => { y += 2; doc.setDrawColor(226, 232, 240); doc.line(margin, y, W - margin, y); y += 5; };

  doc.setFillColor(79, 70, 229); doc.rect(0, 0, W, 22, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('Notelift — AI Meeting Notes', margin, 14);
  y = 30;

  addText(note.meeting_title || 'Untitled Meeting', 18, true, [15, 23, 42]); y += 2;
  addText(`Generated: ${new Date().toLocaleString()}`, 9, false, [100, 116, 139]);
  divider();

  section('Meeting Objective'); addText(note.meeting_objective || '—');
  section('Executive Summary'); addText(note.executive_summary || '—');
  if (note.topics_discussed?.length) { section('Topics Discussed'); note.topics_discussed.forEach((t, i) => addText(`${i + 1}. ${t}`)); }
  if (note.key_decisions?.length) { section('Key Decisions'); note.key_decisions.forEach(d => addText(`• ${d}`)); }
  if (note.action_items?.length) {
    section('Action Items');
    note.action_items.forEach((item, i) => {
      addText(`${i + 1}. ${item.task}`, 10, true);
      addText(`   Owner: ${item.owner || 'Unassigned'}  |  Due: ${item.due_date || 'Not set'}  |  Priority: ${item.priority || 'medium'}`, 9, false, [100, 116, 139]);
    });
  }
  if (note.risks?.length) { section('Risks'); note.risks.forEach(r => addText(`⚠ ${r}`)); }
  if (note.open_questions?.length) { section('Open Questions'); note.open_questions.forEach(q => addText(`? ${q}`)); }
  if (note.technical_concepts?.length) {
    section('Technical Concepts');
    note.technical_concepts.forEach(c => { addText(`${c.term}`, 10, true); addText(`  ${c.definition}`, 9, false, [71, 85, 105]); });
  }
  if (note.references?.length) { section('References'); note.references.forEach(r => addText(`• ${r}`)); }

  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text(`Notelift AI Meeting Notes — Page ${i} of ${pages}`, margin, 290);
  }
  doc.save(`${(note.meeting_title || 'meeting-notes').replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/new', label: 'New Meeting', icon: Sparkles },
  { to: '/notes', label: 'My Notes', icon: FileText },
  { to: '/pricing', label: 'Pricing', icon: CreditCard },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/'); onClose?.(); };
  const planBadge = { free: 'Starter', pro: 'Pro', team: 'Team' }[user?.plan] || 'Starter';
  const planColor = { free: 'badge-slate', pro: 'badge-brand', team: 'badge-green' }[user?.plan] || 'badge-slate';

  return (
    <>
      {open && <div className="mobile-overlay lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-100 z-50 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-violet-500 rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">Notelift</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3 mb-3">Workspace</p>
          {NAV.filter(n => !['Billing'].includes(n.label) || n.label === 'Billing').map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Icon style={{ width: '1.1rem', height: '1.1rem' }} />
              {label}
            </NavLink>
          ))}
          <div className="divider my-4 border-t border-slate-100" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3 mb-3">Help</p>
          <NavLink to="/docs" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}><HelpCircle className="w-4 h-4" />Documentation</NavLink>
          <NavLink to="/support" onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}><MessageSquare className="w-4 h-4" />Support</NavLink>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.email}</p>
              <span className={`badge text-xs ${planColor}`}>{planBadge}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const showToast = (msg, type = 'success') => setToast({ msg, type });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="glass-nav sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 h-14">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5 text-slate-500" /></button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold focus:outline-none hover:ring-2 hover:ring-brand-300 transition-all cursor-pointer"
              >
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </button>
              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2 fade-in-up">
                    <div className="px-4 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs text-slate-400 font-medium">Signed in as</p>
                      <p className="text-sm font-semibold text-slate-900 truncate">{user?.email}</p>
                    </div>
                    <Link to="/settings" onClick={() => setProfileDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <Settings className="w-4 h-4 text-slate-400" /> Settings
                    </Link>
                    <Link to="/billing" onClick={() => setProfileDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <CreditCard className="w-4 h-4 text-slate-400" /> Billing
                    </Link>
                    <Link to="/support" onClick={() => setProfileDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <MessageSquare className="w-4 h-4 text-slate-400" /> Support
                    </Link>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={async () => { setProfileDropdownOpen(false); await logout(); navigate('/'); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8">{children(showToast)}</main>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Public Navbar ────────────────────────────────────────────────────────────
function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  useEffect(() => { const fn = () => setScrolled(window.scrollY > 10); window.addEventListener('scroll', fn); return () => window.removeEventListener('scroll', fn); }, []);
  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass-nav' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-violet-500 rounded-xl flex items-center justify-center shadow-sm"><Sparkles className="w-4 h-4 text-white" /></div>
          <span className="text-lg font-bold gradient-text">Notelift</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="/#features" className="hover:text-brand-600 transition-colors">Features</a>
          <Link to="/pricing" className="hover:text-brand-600 transition-colors">Pricing</Link>
          <a href="#" className="hover:text-brand-600 transition-colors">Blog</a>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard" className="btn-primary py-2 px-4 text-sm">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors">Sign in</Link>
              <Link to="/login" className="btn-primary py-2 px-4 text-sm">Get Started Free</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── Guard ────────────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!user) navigate('/login', { replace: true }); }, [user]);
  return user ? children : null;
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH PAGE
// ══════════════════════════════════════════════════════════════════════════════
function AuthPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isLogin && password !== confirmPw) { setError('Passwords do not match'); return; }
    if (!isLogin && password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Authentication failed');
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-bg flex flex-col">
      <PublicNav />
      <div className="flex-1 flex items-center justify-center px-4 pt-20">
        <div className="w-full max-w-md fade-in-up">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-brand-600 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
            <p className="text-slate-500 mt-1">{isLogin ? 'Sign in to your workspace' : 'Start your free journey — no card needed'}</p>
          </div>

          <div className="card p-8">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-5 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="input-field" placeholder={isLogin ? '••••••••' : 'Min 6 characters'} />
              </div>
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                  <input type="password" required value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="input-field" placeholder="••••••••" />
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>
            <div className="mt-5 text-center text-sm text-slate-500">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="ml-1 text-brand-600 font-semibold hover:underline">
                {isLogin ? 'Sign up free' : 'Sign in'}
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400 mt-4">Your password is hashed with bcrypt and never stored in plain text.</p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE
// ══════════════════════════════════════════════════════════════════════════════
function LandingPage() {
  return (
    <div className="min-h-screen">
      <PublicNav />
      <section className="hero-bg pt-32 pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center fade-in-up">
          <div className="section-tag mx-auto mb-6 w-fit"><Sparkles className="w-3.5 h-3.5" /> AI-Powered Meeting Intelligence</div>
          <h1 className="text-5xl sm:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
            Turn messy meetings into<br /><span className="gradient-text">crystal-clear notes</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Paste any transcript and get structured summaries, action items, decisions, risks, and technical insights — in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/login" className="btn-primary btn-pulse text-base px-8 py-3.5">Start for Free <ArrowRight className="w-5 h-5" /></Link>
            <Link to="/pricing" className="btn-secondary text-base px-8 py-3.5">View Pricing</Link>
          </div>
          {/* Demo card */}
          <div className="card max-w-3xl mx-auto overflow-hidden">
            <div className="bg-gradient-to-r from-brand-600 to-violet-600 p-4 flex items-center gap-2">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-white/30" /><div className="w-3 h-3 rounded-full bg-white/30" /><div className="w-3 h-3 rounded-full bg-white/30" /></div>
              <span className="text-white/80 text-sm ml-2">notelift.app</span>
            </div>
            <div className="p-6 text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="badge badge-green"><CheckCircle2 className="w-3 h-3" /> Processed</div>
                <div className="badge badge-brand">3 Actions</div>
                <div className="badge badge-amber">2 Risks</div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">Q3 Product Roadmap Review</h3>
              <p className="text-slate-400 text-sm mb-3">July 14, 2025 · 6 participants</p>
              <p className="text-slate-600 text-sm leading-relaxed">Team reviewed Q3 milestones, prioritised mobile-first features, and agreed to ship the notification system by end of month...</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[['Zero', 'Learning curve'], ['100%', 'Data security'], ['< 5s', 'Processing time'], ['Seamless', 'PDF Export']].map(([n, l], i) => (
            <div key={i}><div className="text-3xl font-extrabold gradient-text mb-1">{n}</div><div className="text-sm text-slate-500">{l}</div></div>
          ))}
        </div>
      </section>

      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16"><div className="section-tag mx-auto w-fit mb-4">Features</div><h2 className="text-4xl font-extrabold text-slate-900">Everything you need to capture meetings</h2></div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: 'AI Summarization', desc: 'Our AI pipeline extracts executive summaries, decisions, and action items with remarkable accuracy.', color: 'bg-brand-50 text-brand-600' },
              { icon: Target, title: 'Action Item Tracking', desc: 'Every action item gets an owner, due date, and priority — never drop the ball again.', color: 'bg-violet-50 text-violet-600' },
              { icon: Shield, title: 'Risk Detection', desc: 'Automatically surface risks, open questions, and blockers buried in your transcript.', color: 'bg-rose-50 text-rose-500' },
              { icon: Lightbulb, title: 'Technical Concepts', desc: 'Domain-specific terms are extracted and defined for newcomers and non-technical stakeholders.', color: 'bg-amber-50 text-amber-500' },
              { icon: Download, title: 'PDF Export', desc: 'Download beautifully formatted meeting notes as PDF to share with your team.', color: 'bg-emerald-50 text-emerald-500' },
              { icon: History, title: 'Meeting History', desc: 'All notes are stored per-user and searchable — your organisational memory, forever.', color: 'bg-sky-50 text-sky-500' },
            ].map((f, i) => (
              <div key={i} className="card p-7">
                <div className={`w-12 h-12 ${f.color} rounded-2xl flex items-center justify-center mb-5`}><f.icon className="w-5 h-5" /></div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="section-tag mx-auto w-fit mb-4">How it works</div>
          <h2 className="text-4xl font-extrabold text-slate-900 mb-16">Three steps to perfect notes</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[['01', 'Paste your transcript', 'Copy raw transcript from Zoom, Meet, or any recorder.'], ['02', 'AI does the heavy lifting', 'Our advanced AI processes through a multi-stage pipeline.'], ['03', 'Download & share', 'Get structured notes, download PDF, share instantly.']].map(([s, t, d], i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-4"><span className="gradient-text font-extrabold text-lg">{s}</span></div>
                <h3 className="font-bold text-slate-900 mb-2">{t}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12"><div className="section-tag mx-auto w-fit mb-4">Testimonials</div><h2 className="text-4xl font-extrabold text-slate-900">Loved by teams everywhere</h2></div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Sarah Chen', role: 'Product Manager @ Stripe', quote: "Notelift cuts my post-meeting writeup from 45 minutes to 30 seconds. It's the single most impactful tool in my stack." },
              { name: 'Marcus Reid', role: 'CTO @ Vercel', quote: "The technical concept extraction is a game-changer for engineering reviews. Junior devs finally understand what was decided." },
              { name: 'Priya Nair', role: 'Engineering Lead @ Linear', quote: "We dropped Notion Meeting Notes for this. Action items with owners is exactly what we needed." },
            ].map((t, i) => (
              <div key={i} className="card p-7">
                <div className="flex mb-4">{[0, 1, 2, 3, 4].map(j => <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />)}</div>
                <p className="text-slate-700 text-sm leading-relaxed mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">{t.name[0]}</div>
                  <div><p className="font-semibold text-slate-900 text-sm">{t.name}</p><p className="text-xs text-slate-400">{t.role}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-gradient-to-br from-brand-950 to-brand-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">Ready to transform your meetings?</h2>
          <p className="text-brand-200 text-lg mb-10">Start free, upgrade when you're ready. No credit card required.</p>
          <Link to="/login" className="btn-primary btn-pulse text-base px-10 py-4 shadow-2xl">Get Started Free <ArrowRight className="w-5 h-5" /></Link>
        </div>
      </section>

      <footer className="bg-white border-t border-slate-100 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-gradient-to-br from-brand-600 to-violet-500 rounded-xl flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
              <span className="font-bold gradient-text">Notelift</span>
            </div>
            <p className="text-slate-400 text-sm">AI-powered meeting notes for modern teams.</p>
          </div>
          <div className="grid grid-cols-3 gap-12 text-sm">
            <div>
              <p className="font-semibold text-slate-700 mb-3">Product</p>
              <div className="space-y-2 text-slate-400">
                <p><a href="/#features" className="hover:text-brand-600 transition-colors">Features</a></p>
                <p><Link to="/pricing" className="hover:text-brand-600 transition-colors">Pricing</Link></p>
                <p><Link to="/changelog" className="hover:text-brand-600 transition-colors">Changelog</Link></p>
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-3">Company</p>
              <div className="space-y-2 text-slate-400">
                <p><Link to="/about" className="hover:text-brand-600 transition-colors">About</Link></p>
                <p><Link to="/blog" className="hover:text-brand-600 transition-colors">Blog</Link></p>
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-700 mb-3">Legal</p>
              <div className="space-y-2 text-slate-400">
                <p><Link to="/privacy" className="hover:text-brand-600 transition-colors">Privacy</Link></p>
                <p><Link to="/terms" className="hover:text-brand-600 transition-colors">Terms</Link></p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">© {new Date().getFullYear()} Notelift. All rights reserved.</div>
      </footer>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function DashboardPage() {
  return <AppShell>{(showToast) => <DashboardContent showToast={showToast} />}</AppShell>;
}
function DashboardContent({ showToast }) {
  const [usage, setUsage] = useState(null);
  const [recentNotes, setRecentNotes] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    apiFetch('/api/usage').then(setUsage).catch(console.error);
    apiFetch('/api/notes').then(d => setRecentNotes(d.slice(0, 3))).catch(console.error);
  }, []);
  const usedPct = usage ? Math.round((usage.used_today / usage.limit) * 100) : 0;
  const planLabel = { free: 'Starter', pro: 'Pro', team: 'Team' }[user?.plan] || 'Starter';
  return (
    <div className="max-w-5xl mx-auto fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.email?.split('@')[0]} 👋</h1>
        <p className="text-slate-400 mt-1">Here's your meeting intelligence overview</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Today's Usage", value: `${usage?.used_today ?? '—'} / ${usage?.limit ?? '—'}`, icon: BarChart3, color: 'text-brand-600 bg-brand-50' },
          { label: 'Remaining', value: usage?.remaining ?? '—', icon: Zap, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Total Notes', value: recentNotes.length > 0 ? recentNotes.length : '0', icon: FileText, color: 'text-violet-600 bg-violet-50' },
          { label: 'Current Plan', value: planLabel, icon: Star, color: 'text-amber-600 bg-amber-50' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-3`}><s.icon className="w-4 h-4" /></div>
            <div className="text-2xl font-extrabold text-slate-900 mb-0.5">{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>
      {usage && (
        <div className="card-flat p-5 mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-slate-700">Daily usage — {planLabel} plan ({usedPct}%)</span>
            {usage.remaining === 0 && <Link to="/pricing" className="badge badge-red text-xs">Upgrade now →</Link>}
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.min(usedPct, 100)}%` }} /></div>
          <p className="text-xs text-slate-400 mt-2">{usage.remaining} summaries remaining today</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <button onClick={() => navigate('/new')} className="card p-6 text-left flex items-center gap-4 group cursor-pointer">
          <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-violet-500 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><Sparkles className="w-5 h-5 text-white" /></div>
          <div><p className="font-bold text-slate-900">New Meeting Summary</p><p className="text-sm text-slate-400">Paste a transcript to get started</p></div>
          <ArrowRight className="w-5 h-5 text-slate-300 ml-auto group-hover:text-brand-500 transition-colors" />
        </button>
        <button onClick={() => navigate('/notes')} className="card p-6 text-left flex items-center gap-4 group cursor-pointer">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform"><History className="w-5 h-5 text-white" /></div>
          <div><p className="font-bold text-slate-900">View Past Notes</p><p className="text-sm text-slate-400">Browse your meeting history</p></div>
          <ArrowRight className="w-5 h-5 text-slate-300 ml-auto group-hover:text-emerald-500 transition-colors" />
        </button>
      </div>
      {recentNotes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Notes</h2>
            <Link to="/notes" className="text-sm text-brand-600 font-medium hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {recentNotes.map(n => (
              <div key={n.id} className="card-flat p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-brand-600" /></div>
                  <div className="min-w-0"><p className="font-semibold text-slate-800 truncate">{n.result.meeting_title || 'Untitled Meeting'}</p><p className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p></div>
                </div>
                <button onClick={() => exportToPDF(n.result)} className="shrink-0 btn-secondary py-1.5 px-3 text-xs"><Download className="w-3.5 h-3.5" /> PDF</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NEW MEETING
// ══════════════════════════════════════════════════════════════════════════════
function NewMeetingPage() { return <AppShell>{(showToast) => <NewMeetingContent showToast={showToast} />}</AppShell>; }
function NewMeetingContent({ showToast }) {
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [usage, setUsage] = useState(null);
  const [copied, setCopied] = useState(false);

  // Saved note state and Editing states
  const [savedNoteId, setSavedNoteId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editResult, setEditResult] = useState(null);

  useEffect(() => { apiFetch('/api/usage').then(setUsage).catch(console.error); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transcript.trim()) return;
    setLoading(true); setError(''); setResult(null);
    setSavedNoteId(null); setIsEditing(false);
    try {
      const data = await apiFetch('/api/summarize', { method: 'POST', body: JSON.stringify({ transcript }) });
      setResult(data.result);
      setSavedNoteId(data.id);
      showToast(data.cached ? 'Loaded from cache — duplicate detected' : 'Meeting notes generated and saved to history!');
      apiFetch('/api/usage').then(setUsage).catch(() => { });
    } catch (err) { setError(err.message); showToast(err.message, 'error'); }
    finally { setLoading(false); }
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = [`# ${result.meeting_title}`, `## Objective\n${result.meeting_objective}`, `## Summary\n${result.executive_summary}`, `## Action Items\n${result.action_items?.map(a => `- [ ] ${a.task} (${a.owner || 'Unassigned'})`).join('\n')}`].join('\n\n');
    navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); showToast('Copied to clipboard!');
  };

  const startEditing = () => {
    setEditResult(JSON.parse(JSON.stringify(result)));
    setIsEditing(true);
  };

  const handleUpdateNote = async () => {
    setResult(editResult);
    setIsEditing(false);

    if (savedNoteId) {
      try {
        await apiFetch(`/api/notes/${savedNoteId}`, {
          method: 'PUT',
          body: JSON.stringify({ result: editResult })
        });
        showToast('Changes saved successfully!');
      } catch (err) {
        showToast(err.message || 'Failed to save changes on server', 'error');
      }
    }
  };

  // Helper actions for nested array editor
  const addArrayItem = (key, defaultVal) => {
    setEditResult(prev => ({ ...prev, [key]: [...(prev[key] || []), defaultVal] }));
  };

  const updateArrayItem = (key, idx, val) => {
    setEditResult(prev => {
      const copy = [...prev[key]];
      copy[idx] = val;
      return { ...prev, [key]: copy };
    });
  };

  const deleteArrayItem = (key, idx) => {
    setEditResult(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
  };

  const updateObjectArrayItem = (key, idx, field, val) => {
    setEditResult(prev => {
      const copy = [...prev[key]];
      copy[idx] = { ...copy[idx], [field]: val };
      return { ...prev, [key]: copy };
    });
  };

  const hasChanges = JSON.stringify(editResult) !== JSON.stringify(result);

  const renderStringArrayEditor = (title, keyName, icon) => {
    const items = editResult?.[keyName] || [];
    return (
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">{icon}{title}</h3>
          <button type="button" onClick={() => addArrayItem(keyName, '')} className="btn-secondary py-1 px-2 text-xs font-semibold">+ Add Item</button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                className="input-field py-1.5 text-sm"
                value={item}
                onChange={e => updateArrayItem(keyName, idx, e.target.value)}
                placeholder={`Enter ${title.toLowerCase()} item...`}
              />
              <button type="button" onClick={() => deleteArrayItem(keyName, idx)} className="text-red-500 hover:text-red-700 px-2 text-xs font-semibold">Delete</button>
            </div>
          ))}
          {items.length === 0 && <p className="text-xs text-slate-400 italic">No {title.toLowerCase()} items.</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto fade-in-up">
      <div className="mb-8"><h1 className="text-3xl font-extrabold text-slate-900">New Meeting Summary</h1><p className="text-slate-400 mt-1">Paste your transcript below and we'll do the rest</p></div>
      {usage && (
        <div className="card-flat p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600"><Zap className="w-4 h-4 text-brand-500" /><span><b className="text-slate-900">{usage.remaining}</b> summaries remaining today · <span className="capitalize">{usage.plan}</span> plan</span></div>
          {usage.remaining === 0 && <Link to="/pricing" className="badge badge-red">Upgrade ↑</Link>}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="card p-6 mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-3">Meeting Transcript</label>
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
            placeholder={"Paste the raw meeting transcript here...\n\nExample:\n[00:01] Alice: Let's discuss the Q4 roadmap.\n[00:04] Bob: We need to prioritize the payment integration..."}
            className="input-field resize-none h-72 font-mono text-sm leading-relaxed" />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-400">{transcript.length.toLocaleString()} / 15,000 characters</span>
            {transcript && <button type="button" onClick={() => setTranscript('')} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Clear</button>}
          </div>
        </div>
        {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-4 border border-red-100"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
        <button type="submit" disabled={loading || !transcript.trim() || (usage?.remaining === 0)} className="btn-primary btn-pulse text-base px-8 py-3.5">
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <><Brain className="w-5 h-5" /> Generate Notes</>}
        </button>
      </form>

      {result && (
        <div className="mt-10 fade-in-up">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="badge badge-green"><CheckCircle2 className="w-3.5 h-3.5" /> Generated & Saved</div>
              <div className="badge badge-brand">{result.action_items?.length || 0} Actions</div>
              <div className="badge badge-amber">{result.risks?.length || 0} Risks</div>
              <div className="badge badge-slate">Confidence: {result.confidence}</div>
            </div>
          </div>
          <div className="card p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Meeting Title</label>
                      <input
                        type="text"
                        className="input-field py-2 text-base font-semibold"
                        value={editResult.meeting_title || ''}
                        onChange={e => setEditResult(prev => ({ ...prev, meeting_title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Meeting Objective</label>
                      <input
                        type="text"
                        className="input-field py-2 text-sm"
                        value={editResult.meeting_objective || ''}
                        onChange={e => setEditResult(prev => ({ ...prev, meeting_objective: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-extrabold text-slate-900">{result.meeting_title}</h2>
                    <p className="text-slate-400 mt-1">{result.meeting_objective}</p>
                  </>
                )}
              </div>
              <div className="flex gap-2 text-right">
                {isEditing ? (
                  <>
                    <button onClick={() => setIsEditing(false)} className="btn-secondary py-2 px-3 text-sm">Cancel</button>
                    {hasChanges && (
                      <button onClick={handleUpdateNote} className="btn-primary py-2 px-3 text-sm">Save Changes</button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={startEditing} className="btn-secondary py-2 px-3 text-sm">Edit / Modify</button>
                    <button onClick={copyToClipboard} className="btn-secondary py-2 px-3 text-sm">{copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}{copied ? 'Copied' : 'Copy'}</button>
                    <button onClick={() => exportToPDF(result)} className="btn-primary py-2 px-3 text-sm"><Download className="w-4 h-4" /> PDF</button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-brand-500" />Executive Summary</h3>
              {isEditing ? (
                <textarea
                  className="input-field h-40 resize-none text-sm leading-relaxed"
                  value={editResult.executive_summary || ''}
                  onChange={e => setEditResult(prev => ({ ...prev, executive_summary: e.target.value }))}
                />
              ) : (
                <p className="text-slate-600 leading-relaxed">{result.executive_summary}</p>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-6">
                {/* Action Items Editor */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><Target className="w-4 h-4 text-emerald-500" />Action Items</h3>
                    <button type="button" onClick={() => addArrayItem('action_items', { task: '', owner: '', due_date: '', priority: 'medium' })} className="btn-secondary py-1 px-2 text-xs font-semibold">+ Add Action</button>
                  </div>
                  <div className="space-y-3">
                    {(editResult.action_items || []).map((item, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3 space-y-2 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">Action #{idx + 1}</span>
                          <button type="button" onClick={() => deleteArrayItem('action_items', idx)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Remove</button>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 font-medium mb-1">Task</label>
                          <input type="text" className="input-field py-1 text-xs" value={item.task || ''} onChange={e => updateObjectArrayItem('action_items', idx, 'task', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-slate-500 font-medium mb-1">Owner</label>
                            <input type="text" className="input-field py-1 text-xs" value={item.owner || ''} onChange={e => updateObjectArrayItem('action_items', idx, 'owner', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 font-medium mb-1">Due Date</label>
                            <input type="text" className="input-field py-1 text-xs" value={item.due_date || ''} onChange={e => updateObjectArrayItem('action_items', idx, 'due_date', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 font-medium mb-1">Priority</label>
                            <select className="input-field py-1 text-xs" value={item.priority || 'medium'} onChange={e => updateObjectArrayItem('action_items', idx, 'priority', e.target.value)}>
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(editResult.action_items || []).length === 0 && <p className="text-xs text-slate-400 italic">No action items.</p>}
                  </div>
                </div>

                {/* Key Decisions Editor */}
                {renderStringArrayEditor('Key Decisions', 'key_decisions', <CheckCircle2 className="w-4 h-4 text-brand-500" />)}

                {/* Risks Editor */}
                {renderStringArrayEditor('Risks', 'risks', <AlertCircle className="w-4 h-4 text-rose-500" />)}

                {/* Open Questions Editor */}
                {renderStringArrayEditor('Open Questions', 'open_questions', <HelpCircle className="w-4 h-4 text-sky-500" />)}

                {/* Topics Discussed Editor */}
                {renderStringArrayEditor('Topics Discussed', 'topics_discussed', <BookOpen className="w-4 h-4 text-brand-600" />)}

                {/* References Editor */}
                {renderStringArrayEditor('References & Resources', 'references', <FileText className="w-4 h-4 text-slate-500" />)}

                {/* Additional Notes Editor */}
                {renderStringArrayEditor('Additional Notes', 'additional_notes', <FileText className="w-4 h-4 text-violet-500" />)}

                {/* Technical Concepts Editor */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" />Technical Concepts</h3>
                    <button type="button" onClick={() => addArrayItem('technical_concepts', { term: '', definition: '' })} className="btn-secondary py-1 px-2 text-xs font-semibold">+ Add Concept</button>
                  </div>
                  <div className="space-y-3">
                    {(editResult.technical_concepts || []).map((item, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3 space-y-2 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">Concept #{idx + 1}</span>
                          <button type="button" onClick={() => deleteArrayItem('technical_concepts', idx)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Remove</button>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 font-medium mb-1">Term</label>
                          <input type="text" className="input-field py-1 text-xs" value={item.term || ''} onChange={e => updateObjectArrayItem('technical_concepts', idx, 'term', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 font-medium mb-1">Definition</label>
                          <textarea className="input-field py-1 text-xs h-16 resize-none" value={item.definition || ''} onChange={e => updateObjectArrayItem('technical_concepts', idx, 'definition', e.target.value)} />
                        </div>
                      </div>
                    ))}
                    {(editResult.technical_concepts || []).length === 0 && <p className="text-xs text-slate-400 italic">No technical concepts.</p>}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {result.action_items?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-emerald-500" />Action Items</h3>
                      <ul className="space-y-2">
                        {result.action_items.map((item, idx) => (
                          <li key={idx} className="bg-white border border-slate-100 rounded-xl p-3 flex items-start gap-2 shadow-sm">
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${item.priority === 'high' ? 'bg-red-500' : item.priority === 'low' ? 'bg-slate-300' : 'bg-amber-400'}`} />
                            <div><p className="font-medium text-slate-800 text-sm">{item.task}</p><p className="text-xs text-slate-400 mt-0.5">{item.owner || 'Unassigned'} · {item.due_date || 'No due date'}</p></div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.key_decisions?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-500" />Key Decisions</h3>
                      <ul className="space-y-2">
                        {result.key_decisions.map((d, idx) => <li key={idx} className="flex items-start gap-2 text-sm text-slate-700"><CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />{d}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
                {result.risks?.length > 0 && <div className="mb-4"><h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-rose-500" />Risks</h3><ul className="space-y-1.5">{result.risks.map((r, i) => <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-rose-400">⚠</span>{r}</li>)}</ul></div>}
                {result.open_questions?.length > 0 && <div className="mb-4"><h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-sky-500" />Open Questions</h3><ul className="space-y-1.5">{result.open_questions.map((q, i) => <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-sky-400">?</span>{q}</li>)}</ul></div>}

                {/* Additional Notes Section */}
                {result.additional_notes?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-violet-500" />Additional Notes</h3>
                    <ul className="space-y-1.5 text-sm text-slate-600">
                      {result.additional_notes.map((n, i) => <li key={i} className="flex gap-2"><span className="text-violet-400">•</span>{n}</li>)}
                    </ul>
                  </div>
                )}

                {/* New sections: Topics Discussed & References */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {result.topics_discussed?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-brand-600" />Topics & Themes</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.topics_discussed.map((t, i) => <span key={i} className="badge badge-brand text-xs font-semibold px-2.5 py-1.5">{t}</span>)}
                      </div>
                    </div>
                  )}
                  {result.references?.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" />References & Resources</h3>
                      <ul className="space-y-1.5">
                        {result.references.map((r, i) => <li key={i} className="text-sm text-slate-600 flex items-start gap-1.5"><span className="text-slate-400">•</span>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                {result.technical_concepts?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" />Technical Concepts</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {result.technical_concepts.map((c, i) => <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-3"><p className="font-semibold text-amber-900 text-sm">{c.term}</p><p className="text-amber-700 text-xs mt-1">{c.definition}</p></div>)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// NOTES HISTORY
// ══════════════════════════════════════════════════════════════════════════════
function NotesPage() { return <AppShell>{(showToast) => <NotesContent showToast={showToast} />}</AppShell>; }
function NotesContent({ showToast }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');

  // Editing states
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteResult, setEditNoteResult] = useState(null);

  useEffect(() => { apiFetch('/api/notes').then(d => { setNotes(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const startEditingNote = (note) => {
    setEditingNoteId(note.id);
    setEditNoteResult(JSON.parse(JSON.stringify(note.result)));
  };

  const cancelEditingNote = () => {
    setEditingNoteId(null);
  };

  const handleSaveEditedNote = async (noteId) => {
    try {
      await apiFetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        body: JSON.stringify({ result: editNoteResult })
      });
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, result: editNoteResult } : n));
      setEditingNoteId(null);
      showToast('Note updated successfully!');
    } catch (err) {
      showToast(err.message || 'Failed to update note', 'error');
    }
  };

  // Helper actions for nested array editor
  const addArrayItem = (key, defaultVal) => {
    setEditNoteResult(prev => ({ ...prev, [key]: [...(prev[key] || []), defaultVal] }));
  };

  const updateArrayItem = (key, idx, val) => {
    setEditNoteResult(prev => {
      const copy = [...prev[key]];
      copy[idx] = val;
      return { ...prev, [key]: copy };
    });
  };

  const deleteArrayItem = (key, idx) => {
    setEditNoteResult(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
  };

  const updateObjectArrayItem = (key, idx, field, val) => {
    setEditNoteResult(prev => {
      const copy = [...prev[key]];
      copy[idx] = { ...copy[idx], [field]: val };
      return { ...prev, [key]: copy };
    });
  };

  const renderStringArrayEditor = (title, keyName, icon) => {
    const items = editNoteResult?.[keyName] || [];
    return (
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">{icon}{title}</h3>
          <button type="button" onClick={() => addArrayItem(keyName, '')} className="btn-secondary py-1 px-2 text-xs font-semibold">+ Add Item</button>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                className="input-field py-1.5 text-sm"
                value={item}
                onChange={e => updateArrayItem(keyName, idx, e.target.value)}
                placeholder={`Enter ${title.toLowerCase()} item...`}
              />
              <button type="button" onClick={() => deleteArrayItem(keyName, idx)} className="text-red-500 hover:text-red-700 px-2 text-xs font-semibold">Delete</button>
            </div>
          ))}
          {items.length === 0 && <p className="text-xs text-slate-400 italic">No {title.toLowerCase()} items.</p>}
        </div>
      </div>
    );
  };

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    return !q || (n.result.meeting_title || '').toLowerCase().includes(q) || (n.result.executive_summary || '').toLowerCase().includes(q);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div><h1 className="text-3xl font-extrabold text-slate-900">My Notes</h1><p className="text-slate-400 mt-1">{notes.length} meeting{notes.length !== 1 ? 's' : ''} processed</p></div>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="     Search notes..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 w-60" /></div>
      </div>
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText className="w-14 h-14 text-slate-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">{search ? 'No matching notes' : 'No notes yet'}</h3>
          <p className="text-slate-400 mb-6">{search ? 'Try different keywords' : 'Generate your first meeting summary to see it here'}</p>
          {!search && <Link to="/new" className="btn-primary">New Meeting Summary</Link>}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(note => {
            const hasChanges = JSON.stringify(editNoteResult) !== JSON.stringify(note.result);
            return (
              <div key={note.id} className="note-card">
                <div className="p-5 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => { setExpanded(expanded === note.id ? null : note.id); setEditingNoteId(null); }}>
                  <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-brand-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 truncate">{note.result.meeting_title || 'Untitled Meeting'}</h3>
                      {note.parse_failed && <span className="badge badge-red">Parse Error</span>}
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">{note.result.executive_summary || 'No summary available'}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(note.created_at).toLocaleString()}</span>
                      {note.result.action_items?.length > 0 && <span className="badge badge-brand text-xs">{note.result.action_items.length} actions</span>}
                      {note.result.risks?.length > 0 && <span className="badge badge-amber text-xs">{note.result.risks.length} risks</span>}
                      <span className={`badge text-xs ${note.result.confidence === 'high' ? 'badge-green' : note.result.confidence === 'low' ? 'badge-red' : 'badge-slate'}`}>{note.result.confidence} confidence</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={e => { e.stopPropagation(); exportToPDF(note.result); showToast('PDF downloaded!'); }} className="btn-secondary py-1.5 px-3 text-xs"><Download className="w-3.5 h-3.5" /> PDF</button>
                    {expanded === note.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
                {expanded === note.id && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50/50 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Note Actions</span>
                      <div className="flex gap-2">
                        {editingNoteId === note.id ? (
                          <>
                            <button onClick={cancelEditingNote} className="btn-secondary py-1 px-3 text-xs">Cancel</button>
                            {hasChanges && (
                              <button onClick={() => handleSaveEditedNote(note.id)} className="btn-primary py-1 px-3 text-xs">Save Changes</button>
                            )}
                          </>
                        ) : (
                          <button onClick={() => startEditingNote(note)} className="btn-secondary py-1 px-3 text-xs">Edit / Modify</button>
                        )}
                      </div>
                    </div>

                    {editingNoteId === note.id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Meeting Title</label>
                          <input
                            type="text"
                            className="input-field py-2 text-base font-semibold"
                            value={editNoteResult.meeting_title || ''}
                            onChange={e => setEditNoteResult(prev => ({ ...prev, meeting_title: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Meeting Objective</label>
                          <input
                            type="text"
                            className="input-field py-2 text-sm"
                            value={editNoteResult.meeting_objective || ''}
                            onChange={e => setEditNoteResult(prev => ({ ...prev, meeting_objective: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Executive Summary</label>
                          <textarea
                            className="input-field h-40 resize-none text-sm leading-relaxed"
                            value={editNoteResult.executive_summary || ''}
                            onChange={e => setEditNoteResult(prev => ({ ...prev, executive_summary: e.target.value }))}
                          />
                        </div>

                        {/* Nested Editors */}
                        <div className="bg-slate-100 rounded-2xl p-4 space-y-4 mt-6">
                          <h4 className="font-bold text-slate-900 text-sm">Detailed Sections</h4>

                          {/* Action Items */}
                          <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-semibold text-xs text-slate-800 uppercase tracking-wider">Action Items</span>
                              <button type="button" onClick={() => addArrayItem('action_items', { task: '', owner: '', due_date: '', priority: 'medium' })} className="btn-secondary py-1 px-2 text-xs font-semibold">+ Add Action</button>
                            </div>
                            <div className="space-y-3">
                              {(editNoteResult.action_items || []).map((item, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 relative">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400">Action #{idx + 1}</span>
                                    <button type="button" onClick={() => deleteArrayItem('action_items', idx)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Remove</button>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-500 font-medium mb-1">Task</label>
                                    <input type="text" className="input-field py-1 text-xs" value={item.task || ''} onChange={e => updateObjectArrayItem('action_items', idx, 'task', e.target.value)} />
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="block text-xs text-slate-500 font-medium mb-1">Owner</label>
                                      <input type="text" className="input-field py-1 text-xs" value={item.owner || ''} onChange={e => updateObjectArrayItem('action_items', idx, 'owner', e.target.value)} />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-slate-500 font-medium mb-1">Due Date</label>
                                      <input type="text" className="input-field py-1 text-xs" value={item.due_date || ''} onChange={e => updateObjectArrayItem('action_items', idx, 'due_date', e.target.value)} />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-slate-500 font-medium mb-1">Priority</label>
                                      <select className="input-field py-1 text-xs" value={item.priority || 'medium'} onChange={e => updateObjectArrayItem('action_items', idx, 'priority', e.target.value)}>
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Key Decisions */}
                          {renderStringArrayEditor('Key Decisions', 'key_decisions', <CheckCircle2 className="w-4 h-4 text-brand-500" />)}

                          {/* Risks */}
                          {renderStringArrayEditor('Risks', 'risks', <AlertCircle className="w-4 h-4 text-rose-500" />)}

                          {/* Open Questions */}
                          {renderStringArrayEditor('Open Questions', 'open_questions', <HelpCircle className="w-4 h-4 text-sky-500" />)}

                          {/* Topics Discussed */}
                          {renderStringArrayEditor('Topics Discussed', 'topics_discussed', <BookOpen className="w-4 h-4 text-brand-600" />)}

                          {/* References */}
                          {renderStringArrayEditor('References & Resources', 'references', <FileText className="w-4 h-4 text-slate-500" />)}

                          {/* Additional Notes */}
                          {renderStringArrayEditor('Additional Notes', 'additional_notes', <FileText className="w-4 h-4 text-violet-500" />)}

                          {/* Technical Concepts */}
                          <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-semibold text-xs text-slate-800 uppercase tracking-wider">Technical Concepts</span>
                              <button type="button" onClick={() => addArrayItem('technical_concepts', { term: '', definition: '' })} className="btn-secondary py-1 px-2 text-xs font-semibold">+ Add Concept</button>
                            </div>
                            <div className="space-y-3">
                              {(editNoteResult.technical_concepts || []).map((item, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400">Concept #{idx + 1}</span>
                                    <button type="button" onClick={() => deleteArrayItem('technical_concepts', idx)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Remove</button>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-500 font-medium mb-1">Term</label>
                                    <input type="text" className="input-field py-1 text-xs" value={item.term || ''} onChange={e => updateObjectArrayItem('technical_concepts', idx, 'term', e.target.value)} />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-500 font-medium mb-1">Definition</label>
                                    <textarea className="input-field py-1 text-xs h-16 resize-none" value={item.definition || ''} onChange={e => updateObjectArrayItem('technical_concepts', idx, 'definition', e.target.value)} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        {note.result.meeting_objective && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Meeting Objective</p>
                            <p className="text-slate-750 text-sm font-medium">{note.result.meeting_objective}</p>
                          </div>
                        )}

                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                          <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-brand-500" />Executive Summary</h3>
                          <p className="text-slate-600 leading-relaxed text-sm">{note.result.executive_summary}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          {note.result.action_items?.length > 0 && (
                            <div>
                              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-emerald-500" />Action Items</h3>
                              <ul className="space-y-2">
                                {note.result.action_items.map((item, idx) => (
                                  <li key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-start gap-2">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${item.priority === 'high' ? 'bg-red-500' : item.priority === 'low' ? 'bg-slate-300' : 'bg-amber-400'}`} />
                                    <div><p className="font-medium text-slate-800 text-sm">{item.task}</p><p className="text-xs text-slate-400 mt-0.5">{item.owner || 'Unassigned'} · {item.due_date || 'No due date'}</p></div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {note.result.key_decisions?.length > 0 && (
                            <div>
                              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-500" />Key Decisions</h3>
                              <ul className="space-y-2">
                                {note.result.key_decisions.map((d, idx) => <li key={idx} className="flex items-start gap-2 text-sm text-slate-700"><CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />{d}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                        {note.result.risks?.length > 0 && <div className="mb-4"><h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-rose-500" />Risks</h3><ul className="space-y-1.5">{note.result.risks.map((r, i) => <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-rose-400">⚠</span>{r}</li>)}</ul></div>}
                        {note.result.open_questions?.length > 0 && <div className="mb-4"><h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-sky-500" />Open Questions</h3><ul className="space-y-1.5">{note.result.open_questions.map((q, i) => <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-sky-400">?</span>{q}</li>)}</ul></div>}

                        {note.result.additional_notes?.length > 0 && (
                          <div className="mb-4">
                            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-violet-500" />Additional Notes</h3>
                            <ul className="space-y-1.5 text-sm text-slate-600">
                              {note.result.additional_notes.map((n, i) => <li key={i} className="flex gap-2"><span className="text-violet-400">•</span>{n}</li>)}
                            </ul>
                          </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                          {note.result.topics_discussed?.length > 0 && (
                            <div>
                              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-brand-600" />Topics & Themes</h3>
                              <div className="flex flex-wrap gap-2">
                                {note.result.topics_discussed.map((t, i) => <span key={i} className="badge badge-brand text-xs font-semibold px-2.5 py-1.5">{t}</span>)}
                              </div>
                            </div>
                          )}
                          {note.result.references?.length > 0 && (
                            <div>
                              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" />References & Resources</h3>
                              <ul className="space-y-1.5">
                                {note.result.references.map((r, i) => <li key={i} className="text-sm text-slate-600 flex items-start gap-1.5"><span className="text-slate-400">•</span>{r}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>

                        {note.result.technical_concepts?.length > 0 && (
                          <div>
                            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" />Technical Concepts</h3>
                            <div className="grid md:grid-cols-2 gap-3">
                              {note.result.technical_concepts.map((c, i) => <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-3"><p className="font-semibold text-amber-900 text-sm">{c.term}</p><p className="text-amber-700 text-xs mt-1">{c.definition}</p></div>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PRICING PAGE
// ══════════════════════════════════════════════════════════════════════════════
function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleUpgrade = async (plan) => {
    if (!user) { navigate('/login'); return; }
    if (plan === 'free') { navigate('/dashboard'); return; }
    setLoadingPlan(plan);
    try {
      const data = await apiFetch('/api/stripe/create-checkout-session', { method: 'POST', body: JSON.stringify({ plan }) });
      window.location.href = data.url;
    } catch (err) {
      alert(err.message.includes('not configured') ?
        '⚠️ Stripe is not configured yet.\n\nAdd your Stripe keys to backend/.env to enable payments.' :
        err.message);
    } finally { setLoadingPlan(null); }
  };

  const plans = [
    {
      name: 'Starter', desc: 'Perfect for individuals', price: { monthly: 0, annual: 0 }, badge: null, cta: 'Get Started Free', plan: 'free',
      features: ['3 summaries per day', 'Standard AI model (Llama 70B)', '7-day history retention', 'PDF export', 'Basic action item tracking']
    },
    {
      name: 'Pro', desc: 'For power users & small teams', price: { monthly: 15, annual: 12 }, badge: 'Most Popular', cta: 'Upgrade to Pro', plan: 'pro', popular: true,
      features: ['100 summaries per day', 'Best AI model (Llama 70B)', 'Unlimited history', 'PDF export + bulk download', 'Priority + owner tracking', 'Technical concept extraction', 'Risk detection', 'Email sharing']
    },
    {
      name: 'Team', desc: 'For growing organisations', price: { monthly: 39, annual: 29 }, badge: null, cta: 'Upgrade to Team', plan: 'team',
      features: ['Everything in Pro', 'Up to 25 team members', 'Shared workspace & notes', 'Admin dashboard', 'SSO / SAML', 'Custom data retention', 'Priority support', 'SLA guarantee']
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicNav />
      <div className="max-w-6xl mx-auto px-4 pt-32 pb-24">
        <div className="text-center mb-16">
          <div className="section-tag mx-auto w-fit mb-4">Pricing</div>
          <h1 className="text-5xl font-extrabold text-slate-900 mb-4">Simple, transparent pricing</h1>
          <p className="text-xl text-slate-500 mb-8">Start free. Scale when you need to. Cancel anytime.</p>
          <div className="inline-flex items-center gap-3 bg-white rounded-full p-1.5 border border-slate-200 shadow-sm">
            <button onClick={() => setAnnual(false)} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${!annual ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500'}`}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${annual ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500'}`}>Annual <span className="text-emerald-500 font-bold">-20%</span></button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <div key={i}
              className={`pricing-card relative ${plan.popular ? 'border-brand-700' : ''}`}
              style={plan.popular ? { background: 'linear-gradient(to bottom, #1e1b4b, #312e81)', borderColor: '#6366f1' } : {}}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wide">{plan.badge}</span>
                </div>
              )}
              <h3 className={`text-xl font-bold mb-1 ${plan.popular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
              <p className={`text-sm mb-6 ${plan.popular ? 'text-indigo-300' : 'text-slate-500'}`}>{plan.desc}</p>
              <div className="mb-8">
                <span className={`text-5xl font-extrabold ${plan.popular ? 'text-white' : 'text-slate-900'}`}>
                  ${annual ? plan.price.annual : plan.price.monthly}
                </span>
                <span className={`text-sm ml-1 ${plan.popular ? 'text-indigo-300' : 'text-slate-400'}`}>
                  /mo{annual && plan.price.monthly > 0 ? ', billed annually' : ''}
                </span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className={`flex items-center gap-2.5 text-sm ${plan.popular ? 'text-indigo-100' : 'text-slate-600'}`}>
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${plan.popular ? 'text-indigo-400' : 'text-emerald-500'}`} />{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.plan)}
                disabled={loadingPlan === plan.plan}
                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${plan.popular
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
              >
                {loadingPlan === plan.plan ? <Loader2 className="w-4 h-4 animate-spin" /> : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-24 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900 text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your billing page with one click. You keep access until the end of your billing period.' },
              { q: 'Is my data secure?', a: 'Yes. Transcripts are processed in memory and only the structured notes are stored, tied to your account with bcrypt-hashed passwords.' },
              { q: 'What AI model powers Notelift?', a: 'We use Llama 3.3 70B via Groq — one of the fastest and most capable open-weight models available today, free for our backend.' },
              { q: 'How does Stripe billing work?', a: 'We use Stripe in test mode. No real money moves. Use card number 4242 4242 4242 4242 with any future date and any CVC.' },
            ].map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-flat overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left">
        <span className="font-semibold text-slate-900">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      {open && <div className="px-5 pb-5 text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-4">{a}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BILLING PAGE
// ══════════════════════════════════════════════════════════════════════════════
function BillingPage() { return <AppShell>{(showToast) => <BillingContent showToast={showToast} />}</AppShell>; }
function BillingContent({ showToast }) {
  const { user, refreshUser } = useAuth();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    apiFetch('/api/stripe/subscription').then(d => { setSub(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You will keep access until the end of your billing period.')) return;
    setCanceling(true);
    try {
      await apiFetch('/api/stripe/cancel', { method: 'POST' });
      showToast('Subscription will cancel at period end');
      apiFetch('/api/stripe/subscription').then(setSub);
      refreshUser();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setCanceling(false); }
  };

  const planColors = { free: 'badge-slate', pro: 'badge-brand', team: 'badge-green' };
  const planNames = { free: 'Starter (Free)', pro: 'Pro', team: 'Team' };

  return (
    <div className="max-w-2xl mx-auto fade-in-up">
      <div className="mb-8"><h1 className="text-3xl font-extrabold text-slate-900">Billing & Subscription</h1><p className="text-slate-400 mt-1">Manage your plan and payment details</p></div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-7 h-7 animate-spin text-brand-500" /></div>
      ) : (
        <>
          <div className="card p-6 mb-6">
            <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2"><CreditCard className="w-4 h-4 text-brand-500" />Current Plan</h2>
            <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-200 mb-5">
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{planNames[sub?.plan || 'free']}</p>
                <p className="text-sm text-slate-400 mt-0.5">
                  {sub?.plan === 'free' ? '3 summaries/day' : sub?.plan === 'pro' ? '100 summaries/day' : '1,000 summaries/day'}
                </p>
                {sub?.current_period_end && <p className="text-xs text-slate-400 mt-1">
                  {sub?.cancel_at_period_end ? '⚠️ Cancels on' : 'Renews on'} {new Date(sub.current_period_end).toLocaleDateString()}
                </p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`badge ${planColors[sub?.plan || 'free']}`}>{sub?.status || 'active'}</span>
                {sub?.cancel_at_period_end && <span className="badge badge-amber">Canceling</span>}
              </div>
            </div>

            {/* Plan limits visual */}
            <div className="space-y-3 mb-6">
              {['Daily summaries', 'History retention', 'PDF export'].map((feat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-slate-600 flex-1">{feat}</span>
                  <span className="text-xs font-semibold text-slate-500">
                    {feat === 'Daily summaries' ? (sub?.plan === 'free' ? '3' : sub?.plan === 'pro' ? '100' : '1,000') : '✓'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              {(!sub || sub.plan === 'free') && <Link to="/pricing" className="btn-primary flex-1 justify-center">Upgrade Plan</Link>}
              {sub?.stripe_subscription_id && !sub?.cancel_at_period_end && (
                <button onClick={handleCancel} disabled={canceling} className="btn-danger flex-1">
                  {canceling ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null} Cancel Subscription
                </button>
              )}
            </div>
          </div>

          <div className="card p-6 mb-6">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-brand-500" />Payment Information</h2>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600">
              {sub?.stripe_subscription_id ? (
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Payment method on file (managed via Stripe)</div>
              ) : (
                <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-slate-400" />No payment method — you are on the free plan</div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-3">💡 Using Stripe test mode. Test card: 4242 4242 4242 4242 · Any future date · Any CVC</p>
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-slate-900 mb-4">Billing History</h2>
            {sub?.stripe_subscription_id ? (
              <div className="text-sm text-slate-500 p-4 bg-slate-50 rounded-xl border border-slate-100">
                Full billing history is available in your Stripe Customer Portal (coming soon in the next release).
              </div>
            ) : (
              <div className="text-sm text-slate-400">No billing history — you are on the free plan.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════════════════════════
function SettingsPage() { return <AppShell>{() => <SettingsContent />}</AppShell>; }
function SettingsContent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const handleLogout = async () => { await logout(); navigate('/'); };
  return (
    <div className="max-w-2xl mx-auto fade-in-up">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Settings</h1>
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2"><Users className="w-4 h-4 text-brand-500" />Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-sm">{user?.email?.[0]?.toUpperCase() || 'U'}</div>
          <div><p className="font-semibold text-slate-900">{user?.email}</p><p className="text-sm text-slate-400 capitalize">{user?.plan || 'free'} plan · Member since {new Date().getFullYear()}</p></div>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label><input className="input-field" value={user?.email || ''} readOnly /></div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1.5">Display name</label><input className="input-field" defaultValue={user?.email?.split('@')[0] || ''} placeholder="Your name" /></div>
        </div>
        <button onClick={handleSave} className="btn-primary mt-5">{saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save Changes'}</button>
      </div>
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-slate-900 mb-5 flex items-center gap-2"><CreditCard className="w-4 h-4 text-brand-500" />Plan & Billing</h2>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
          <div><p className="font-semibold text-slate-900 capitalize">{user?.plan === 'free' ? 'Starter (Free)' : user?.plan}</p><p className="text-sm text-slate-400">{user?.plan === 'free' ? '3 summaries/day' : user?.plan === 'pro' ? '100 summaries/day' : '1,000 summaries/day'}</p></div>
          <span className={`badge ${user?.plan === 'pro' ? 'badge-brand' : user?.plan === 'team' ? 'badge-green' : 'badge-slate'}`}>{user?.plan === 'free' ? 'Free' : 'Active'}</span>
        </div>
        <div className="flex gap-3">
          <Link to="/billing" className="btn-secondary flex-1 justify-center">Manage Billing</Link>
          <Link to="/pricing" className="btn-primary flex-1 justify-center">Upgrade Plan</Link>
        </div>
      </div>
      <div className="card-flat p-6 border-red-100 bg-red-50/40">
        <h2 className="font-bold text-red-700 mb-4">Danger Zone</h2>
        <p className="text-sm text-slate-500 mb-4">Sign out of your account on this device. Your session token will be invalidated on the server.</p>
        <button onClick={handleLogout} className="btn-danger">Sign Out</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CHECKOUT SUCCESS / CANCEL
// ══════════════════════════════════════════════════════════════════════════════
function CheckoutSuccess() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { refreshUser(); const t = setTimeout(() => navigate('/dashboard'), 4000); return () => clearTimeout(t); }, []);
  return (
    <div className="min-h-screen hero-bg flex items-center justify-center">
      <div className="text-center card p-12 max-w-md mx-4 fade-in-up">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-3">Payment Successful!</h1>
        <p className="text-slate-500 mb-6">Your plan has been upgraded. Enjoy unlimited meeting notes!</p>
        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600 mb-6">Redirecting to dashboard in a few seconds...</div>
        <Link to="/dashboard" className="btn-primary justify-center w-full">Go to Dashboard</Link>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HELP & DOCUMENTATION PAGE
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// DOCUMENTATION PAGE
// ══════════════════════════════════════════════════════════════════════════════
function DocsPage() { return <AppShell>{() => <DocsContent />}</AppShell>; }
function DocsContent() {
  const [faqExpanded, setFaqExpanded] = useState({});

  const toggleFaq = (idx) => {
    setFaqExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const faqs = [
    {
      q: "How do I generate meeting notes?",
      a: "Navigate to 'New Meeting' in the sidebar, paste the raw transcript of your meeting (Zoom, Google Meet, MS Teams, etc.), and click 'Generate Notes'. Our AI pipeline will analyze it and output objective, executive summary, action items, key decisions, risks, and technical concepts."
    },
    {
      q: "Will my meeting summaries be saved automatically?",
      a: "Yes. Meeting summaries are automatically generated and saved to your history dashboard in real-time. You can access all past summaries by clicking 'My Notes' in the sidebar."
    },
    {
      q: "How can I edit or modify meeting notes?",
      a: "You can edit notes directly in the review screen after generation, or later by expanding the note in 'My Notes' and clicking the 'Edit / Modify' button. Modify the title, objective, or summary as needed, and click 'Save Changes' to update."
    },
    {
      q: "How do daily usage limits work?",
      a: "The limits reset every day at midnight UTC. The Starter plan includes 3 generations per day, the Pro plan includes 100, and the Team plan includes 1,000. You can check remaining generations in your dashboard."
    },
    {
      q: "How do I export notes to PDF?",
      a: "Under the meeting title of any generated or saved note, click the 'PDF' button. A beautifully formatted, high-quality document will instantly download to your local device."
    }
  ];

  return (
    <div className="max-w-3xl mx-auto fade-in-up">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2 flex items-center gap-3">
        <BookOpen className="w-8 h-8 text-brand-500" /> Help & Documentation
      </h1>
      <p className="text-slate-500 mb-8">Learn how to make the most of Notelift meeting summaries</p>

      <div className="space-y-6">
        <div className="card p-6 bg-slate-50 border-none mb-4">
          <h2 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2"><Target className="w-5 h-5 text-brand-500" /> Getting Started Quick Guide</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
            <li>Open the <b>New Meeting</b> page.</li>
            <li>Paste your raw text transcript (formatted with speakers is best).</li>
            <li>Click <b>Generate Notes</b>. The system will process it in seconds.</li>
            <li>Your notes are saved instantly and can be reviewed, edited, or exported to PDF anytime.</li>
          </ol>
        </div>

        <div className="space-y-3">
          <h2 className="font-bold text-lg text-slate-800 mb-4">Frequently Asked Questions</h2>
          {faqs.map((faq, idx) => (
            <div key={idx} className="card p-4 border border-slate-100 shadow-sm">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full flex items-center justify-between font-semibold text-slate-900 text-left text-sm"
              >
                <span>{faq.q}</span>
                {faqExpanded[idx] ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>
              {faqExpanded[idx] && (
                <p className="text-sm text-slate-600 mt-3 leading-relaxed border-t border-slate-50 pt-3">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUPPORT PAGE
// ══════════════════════════════════════════════════════════════════════════════
function SupportPage() { return <AppShell>{(showToast) => <SupportContent showToast={showToast} />}</AppShell>; }
function SupportContent({ showToast }) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.email?.split('@')[0] || '');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch('/api/support', {
        method: 'POST',
        body: JSON.stringify({ name, email, message })
      });
      showToast('Support request submitted! We will email you back shortly.');
      setMessage('');
    } catch (err) {
      showToast(err.message || 'Failed to submit support request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto fade-in-up grid md:grid-cols-5 gap-8">
      <div className="md:col-span-3">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-brand-500" /> Customer Support
        </h1>
        <p className="text-slate-500 mb-8">We are here to help you resolve any issues with Notelift</p>

        <div className="card p-6 border border-slate-100 shadow-sm mb-6">
          <h2 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" /> System Status
          </h2>
          <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="flex h-3.5 w-3.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <span>All systems operational. AI summarization engines are online.</span>
          </div>
        </div>

        <div className="card p-6 border border-slate-100 shadow-sm">
          <h2 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-500" /> Response Times & Info
          </h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li>• <b>Starter Plan users:</b> We aim to reply to all queries within 24-48 business hours.</li>
            <li>• <b>Pro & Team Plan users:</b> Priority support queue with 4-12 business hour response times.</li>
            <li>• <b>Billing queries:</b> Handled immediately. Use the Stripe portal in Billing section to manage invoice copies.</li>
          </ul>
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="card p-6 bg-white border border-slate-100 shadow-sm sticky top-20">
          <h2 className="font-bold text-lg text-slate-900 mb-2">
            Submit Support Request
          </h2>
          <p className="text-slate-500 text-xs mb-5">Have a question or run into an issue? Drop our support team a line.</p>

          <form onSubmit={handleSupportSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="input-field py-2 text-sm"
                placeholder="Name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field py-2 text-sm"
                placeholder="you@domain.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="input-field resize-none py-2 text-sm"
                placeholder="Describe your issue or query..."
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full justify-center text-sm py-2.5"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC FOOTER PAGES (Changelog, About, Blog, Privacy, Terms)
// ══════════════════════════════════════════════════════════════════════════════
function ChangelogPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNav />
      <div className="max-w-3xl mx-auto px-4 pt-32 pb-24 flex-1 fade-in-up">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Changelog</h1>
        <p className="text-slate-500 mb-8">Latest updates, features, and fixes shipped to Notelift</p>
        <div className="space-y-8">
          <div className="card p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <span className="badge badge-brand">v1.2.0</span>
              <span className="text-xs text-slate-400 font-medium">July 2026</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Custom Summary Editor & Split Docs/Support</h2>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5">
              <li>Users can now fully edit any section of their generated notes, including action items and topics.</li>
              <li>Divided the old combined help view into dedicated Documentation and Support interfaces.</li>
              <li>Added priority support indicator status tables.</li>
            </ul>
          </div>
          <div className="card p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <span className="badge badge-slate">v1.1.0</span>
              <span className="text-xs text-slate-400 font-medium">June 2026</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Auto-save meeting summaries & Stripe Integration</h2>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5">
              <li>Created stripe subscriptions with secure user plan restrictions.</li>
              <li>Summaries are now persisted automatically to history database on generation.</li>
              <li>Enhanced export styles for PDF reports.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNav />
      <div className="max-w-3xl mx-auto px-4 pt-32 pb-24 flex-1 fade-in-up">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">About Notelift</h1>
        <p className="text-slate-500 mb-8">AI-powered meeting intelligence designed for modern, agile teams.</p>
        <div className="card p-8 border border-slate-100 shadow-sm space-y-6 text-slate-600 leading-relaxed">
          <p>
            At Notelift, we believe that hours spent typing up meeting roadmaps, summaries, and action items is hours wasted. Our mission is simple: to make meetings actionable, transparent, and brief.
          </p>
          <p>
            By leveraging advanced large language models, Notelift processes meeting transcripts from Zoom, Google Meet, Teams, or local voice recorders, extracting the core decisions and structuring them into a beautiful, exportable roadmap.
          </p>
          <h2 className="text-xl font-bold text-slate-900 pt-4">Our Core Philosophy</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li><b>Action First:</b> Every meeting should result in clear deliverables, ownership, and due dates.</li>
            <li><b>Total Data Security:</b> We process transcripts securely and allow users to delete their history instantly.</li>
            <li><b>Seamless Integrations:</b> Easy exports to PDF, email sharing, and copy-paste markdown templates.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function BlogPage() {
  const posts = [
    { title: "How to Run Actionable and Effective Remote Meetings", date: "July 12, 2026", desc: "Tired of meetings that could have been emails? Here is the ultimate template for team alignment and roadmap definitions." },
    { title: "Introducing Notelift v1.2: Nested Editing & Auto-Saving", date: "July 01, 2026", desc: "A breakdown of our latest features, including full customization control over AI summaries, custom action items, and split documentation channels." }
  ];
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNav />
      <div className="max-w-4xl mx-auto px-4 pt-32 pb-24 flex-1 fade-in-up">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Notelift Blog</h1>
        <p className="text-slate-500 mb-10">Guides, updates, and thought leadership on meeting productivity</p>
        <div className="grid md:grid-cols-2 gap-6">
          {posts.map((post, i) => (
            <div key={i} className="card p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold">{post.date}</span>
                <h2 className="text-lg font-bold text-slate-900 mt-2 mb-3 hover:text-brand-600 transition-colors cursor-pointer">{post.title}</h2>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">{post.desc}</p>
              </div>
              <span className="text-sm text-brand-600 font-semibold cursor-pointer hover:underline">Read article →</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNav />
      <div className="max-w-3xl mx-auto px-4 pt-32 pb-24 flex-1 fade-in-up">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-500 mb-8">Effective Date: July 14, 2026</p>
        <div className="card p-8 border border-slate-100 shadow-sm space-y-6 text-slate-600 text-sm leading-relaxed">
          <p>
            At Notelift, we take your privacy seriously. This policy describes how we collect, process, and protect your information when using our transcript summarization services.
          </p>
          <h2 className="text-lg font-bold text-slate-900">1. Data Collection & Processing</h2>
          <p>
            We process transcripts you paste solely to perform AI analysis and generate summaries. Transcripts are sent securely to our backend and are only stored if you save them.
          </p>
          <h2 className="text-lg font-bold text-slate-900">2. Sharing & Third Parties</h2>
          <p>
            We do not sell your personal data. LLM processing is conducted via secure API calls. No training data is kept by third-party model providers.
          </p>
        </div>
      </div>
    </div>
  );
}

function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNav />
      <div className="max-w-3xl mx-auto px-4 pt-32 pb-24 flex-1 fade-in-up">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-slate-500 mb-8">Last Updated: July 14, 2026</p>
        <div className="card p-8 border border-slate-100 shadow-sm space-y-6 text-slate-600 text-sm leading-relaxed">
          <p>
            By accessing or using Notelift, you agree to comply with and be bound by these terms.
          </p>
          <h2 className="text-lg font-bold text-slate-900">1. Description of Service</h2>
          <p>
            Notelift is a SaaS product that provides transcript summarization, action item assignment, objective mapping, and PDF exports.
          </p>
          <h2 className="text-lg font-bold text-slate-900">2. Account Responsibility</h2>
          <p>
            You are responsible for securing your login credentials and for the contents of any transcript processed by your account.
          </p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP ROUTER
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/new" element={<RequireAuth><NewMeetingPage /></RequireAuth>} />
          <Route path="/notes" element={<RequireAuth><NotesPage /></RequireAuth>} />
          <Route path="/billing" element={<RequireAuth><BillingPage /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
          <Route path="/docs" element={<RequireAuth><DocsPage /></RequireAuth>} />
          <Route path="/support" element={<RequireAuth><SupportPage /></RequireAuth>} />
          <Route path="/help" element={<RequireAuth><DocsPage /></RequireAuth>} />
          <Route path="/changelog" element={<ChangelogPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
