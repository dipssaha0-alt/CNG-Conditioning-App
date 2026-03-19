import React from 'react';
import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { UserProfile, CNGStation, AuditPoint } from './types';
import Dashboard from './components/Dashboard';
import AuditForm from './components/AuditForm';
import Analyzer from './components/Analyzer';
import LiveTracer from './components/LiveTracer';
import AdminPanel from './components/AdminPanel';
import { LayoutDashboard, ClipboardList, BrainCircuit, Radar, Settings, ShieldAlert, Menu, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center">
            <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">The application encountered an unexpected error. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold"
            >
              Refresh App
            </button>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-6 p-4 bg-gray-100 rounded-lg text-left text-xs overflow-auto max-h-40">
                {JSON.stringify(this.state.error, null, 2)}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type Tab = 'dashboard' | 'audit' | 'analyzer' | 'tracer' | 'admin';

const GUEST_USER: UserProfile = {
  uid: 'guest-admin',
  displayName: 'Guest Administrator',
  email: 'guest@example.com',
  role: 'admin',
  photoURL: null
};

export default function App() {
  const [userProfile, setUserProfile] = React.useState<UserProfile>(GUEST_USER);
  const [activeTab, setActiveTab] = React.useState<Tab>('dashboard');
  const [stations, setStations] = React.useState<CNGStation[]>([]);
  const [points, setPoints] = React.useState<AuditPoint[]>([]);
  const [auditors, setAuditors] = React.useState<UserProfile[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    const stationsUnsubscribe = onSnapshot(collection(db, 'stations'), (snapshot) => {
      setStations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CNGStation)));
    });

    const pointsUnsubscribe = onSnapshot(collection(db, 'audit_points'), (snapshot) => {
      setPoints(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditPoint)));
    });

    const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAuditors(snapshot.docs.map(doc => doc.data() as UserProfile).filter(u => u.role === 'auditor'));
    });

    return () => {
      stationsUnsubscribe();
      pointsUnsubscribe();
      usersUnsubscribe();
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'audit', label: 'New Audit', icon: ClipboardList, roles: ['auditor', 'admin'] },
    { id: 'analyzer', label: 'AI Analyzer', icon: BrainCircuit },
    { id: 'tracer', label: 'Live Tracer', icon: Radar },
    { id: 'admin', label: 'Admin Panel', icon: Settings, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => !item.roles || item.roles.includes(userProfile.role));

  const handleRoleChange = (role: any) => {
    setUserProfile({
      ...userProfile,
      role,
      displayName: `Guest ${role.charAt(0).toUpperCase() + role.slice(1)}`
    });
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="h-full flex flex-col p-6">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                  <LayoutDashboard size={20} className="text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight">CNG Monitor</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-400">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              {filteredNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as Tab);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                    ${activeTab === item.id 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-gray-100">
              <div className="mb-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Switch View (Demo)</label>
                <div className="grid grid-cols-3 gap-1">
                  {['auditor', 'coordinator', 'admin'].map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className={`px-1 py-1 rounded text-[9px] font-bold uppercase transition-all ${userProfile.role === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {r.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 mb-2 px-2">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                  {userProfile.photoURL ? (
                    <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{userProfile.displayName}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{userProfile.role}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between lg:hidden">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-500">
              <Menu size={24} />
            </button>
            <span className="font-bold text-lg">CNG Monitor</span>
            <div className="w-10" /> {/* Spacer */}
          </header>

          <div className="flex-1 overflow-y-auto p-6 lg:p-10">
            <div className="max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'dashboard' && <Dashboard user={userProfile} />}
                  {activeTab === 'audit' && <AuditForm user={userProfile} stations={stations} />}
                  {activeTab === 'analyzer' && <Analyzer points={points} stations={stations} />}
                  {activeTab === 'tracer' && <LiveTracer auditors={auditors} />}
                  {activeTab === 'admin' && <AdminPanel user={userProfile} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
