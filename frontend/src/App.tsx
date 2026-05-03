import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardPage from './pages/DashboardPage';
import AnalysisPage from './pages/AnalysisPage';
import ComparisonPage from './pages/ComparisonPage';
import JobDetailPage from './pages/JobDetailPage';
import { LayoutDashboard, Search, Scale } from 'lucide-react';
import clsx from 'clsx';

const queryClient = new QueryClient();

function Sidebar() {
  const location = useLocation();

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', color: 'text-blue-500' },
    { to: '/analyze', icon: Search, label: 'Single Analysis', color: 'text-indigo-500' },
    { to: '/compare', icon: Scale, label: 'Compare Products', color: 'text-violet-500' },
  ];

  return (
    <nav className="fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 p-6 flex flex-col shadow-sm z-50">
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          CommerceLens AI
        </h1>
        <p className="text-sm text-slate-500 mt-1">Product Intelligence</p>
      </div>
      
      <div className="flex flex-col gap-2">
        {links.map((link) => {
          const isActive = location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to));
          return (
            <Link
              key={link.to}
              to={link.to}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-slate-700",
                isActive ? "bg-slate-50 shadow-sm border border-slate-100 text-slate-900" : "hover:bg-slate-50 border border-transparent"
              )}
            >
              <link.icon className={clsx("w-5 h-5", link.color)} />
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
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
          <Sidebar />

          {/* Main Content Area */}
          <main className="ml-64 flex-1 p-8 min-h-screen">
            <div className="max-w-6xl mx-auto pb-12">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/analyze" element={<AnalysisPage />} />
                <Route path="/compare" element={<ComparisonPage />} />
                <Route path="/job/:jobId" element={<JobDetailPage />} />
              </Routes>
            </div>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
