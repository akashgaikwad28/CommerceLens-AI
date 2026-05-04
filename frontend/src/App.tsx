import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import AnalysisPage from './pages/AnalysisPage';
import ComparisonPage from './pages/ComparisonPage';
import JobDetailPage from './pages/JobDetailPage';
import { LayoutDashboard, Search, Scale, Zap } from 'lucide-react';
import clsx from 'clsx';

const queryClient = new QueryClient();

function Sidebar() {
  const location = useLocation();
  
  // Don't show sidebar on landing page
  if (location.pathname === '/') return null;

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-blue-500' },
    { to: '/analyze', icon: Search, label: 'Single Analysis', color: 'text-indigo-500' },
    { to: '/compare', icon: Scale, label: 'Compare Products', color: 'text-violet-500' },
  ];

  return (
    <nav className="fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-100 p-8 flex flex-col shadow-sm z-50">
      <div className="mb-12">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
             <Zap className="w-4 h-4 text-white fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter">
              CommerceLens
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mt-0.5">Intelligence</p>
          </div>
        </Link>
      </div>
      
      <div className="flex flex-col gap-3">
        {links.map((link) => {
          const isActive = location.pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={clsx(
                "flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-bold text-sm",
                isActive ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <link.icon className={clsx("w-5 h-5", !isActive && link.color)} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

function AppContent() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className={clsx("min-h-screen bg-white text-slate-900 font-sans", !isLanding && "flex")}>
      {!isLanding && <Sidebar />}

      {/* Main Content Area */}
      <main className={clsx("flex-1 min-h-screen", !isLanding && "ml-64 p-10")}>
        <div className={clsx("mx-auto pb-12", !isLanding ? "max-w-7xl" : "max-w-full")}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analyze" element={<AnalysisPage />} />
            <Route path="/compare" element={<ComparisonPage />} />
            <Route path="/job/:jobId" element={<JobDetailPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
