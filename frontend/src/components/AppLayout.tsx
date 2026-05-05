import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Home, LineChart, Search, Sparkles } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/analyze', label: 'Analyze Product', icon: Search },
  { to: '/compare', label: 'Compare Products', icon: LineChart },
  { to: '/dashboard', label: 'Dashboard (Recent Analyses)', icon: BarChart3 },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 border-r border-slate-200 bg-white/95 px-5 py-6 shadow-sm backdrop-blur lg:flex lg:flex-col">
        <NavLink to="/" className="mb-8 flex items-center gap-3 rounded-2xl px-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-200">
            <Sparkles className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-base font-semibold tracking-tight">CommerceLens AI</span>
            <span className="text-xs font-medium text-slate-500">Review intelligence</span>
          </span>
        </NavLink>

        <nav className="space-y-2">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                  isActive
                    ? 'bg-slate-950 text-white shadow-md shadow-slate-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-950">Insight-first reports</p>
          <p className="mt-1 text-xs leading-5 text-blue-800/70">
            Every chart and recommendation is tied to backend review signals.
          </p>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">CommerceLens AI</span>
          </NavLink>
          <NavLink to="/analyze" className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
            Analyze
          </NavLink>
        </div>
        <nav className="mt-3 grid grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center justify-center rounded-xl py-2 transition',
                  isActive ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
                )
              }
              title={label}
            >
              <Icon className="h-4 w-4" />
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:ml-72 lg:w-[calc(100%-18rem)] lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-7xl overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
