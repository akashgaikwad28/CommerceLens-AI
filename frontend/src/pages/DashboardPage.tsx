import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getJobs } from '../api/client';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { BarChart3, Clock, CheckCircle, Search, Scale } from 'lucide-react';
import clsx from 'clsx';

export default function DashboardPage() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: getJobs,
    refetchInterval: 10000, // Poll every 10s for dashboard
  });

  const stats = React.useMemo(() => {
    if (!jobs.length) return { analysis: 0, comparison: 0, successRate: 0, processing: 0 };
    
    const analysisJobs = jobs.filter(j => j.product_name && !j.product_name.includes("|")); // heuristic
    const comparisonJobs = jobs.filter(j => !j.product_name || j.product_name.includes("|"));
    const completed = jobs.filter(j => j.status === 'completed').length;
    const processing = jobs.filter(j => ['pending', 'processing'].includes(j.status.toLowerCase())).length;
    
    return {
      analysis: analysisJobs.length,
      comparison: comparisonJobs.length,
      successRate: Math.round((completed / jobs.length) * 100),
      processing
    };
  }, [jobs]);

  if (isLoading) {
    return <div className="animate-pulse space-y-8">
      <div className="h-8 bg-slate-200 rounded w-1/4"></div>
      <div className="grid grid-cols-4 gap-4"><div className="h-24 bg-slate-200 rounded"></div></div>
    </div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">Monitor all AI intelligence tasks across your platform.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Analysis Jobs" value={stats.analysis} icon={Search} color="text-indigo-500" bg="bg-indigo-50" />
        <StatCard title="Comparison Jobs" value={stats.comparison} icon={Scale} color="text-violet-500" bg="bg-violet-50" />
        <StatCard title="Active Processing" value={stats.processing} icon={Clock} color="text-amber-500" bg="bg-amber-50" />
        <StatCard title="Success Rate" value={`${stats.successRate}%`} icon={CheckCircle} color="text-emerald-500" bg="bg-emerald-50" />
      </div>

      {/* Recent Jobs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            Recent Jobs
          </h2>
        </div>
        
        {jobs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No jobs found. Run an analysis to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-medium">Job ID</th>
                  <th className="px-6 py-4 font-medium">Type / Product</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Created At</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => {
                  // Basic heuristic to distinguish job types on the dashboard if backend doesn't explicitly return type
                  const isComparison = !job.product_name || job.product_name.includes("|") || job.job_id.startsWith("comp");
                  
                  return (
                    <tr key={job.job_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {job.job_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isComparison ? <Scale className="w-4 h-4 text-violet-500" /> : <Search className="w-4 h-4 text-indigo-500" />}
                          <span className="font-medium text-slate-700 max-w-[200px] truncate block">
                            {job.product_name || "Multiple Products"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(job.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={isComparison ? `/compare?job=${job.job_id}` : `/job/${job.job_id}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          View Results
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: { title: string, value: string|number, icon: any, color: string, bg: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center", bg)}>
        <Icon className={clsx("w-6 h-6", color)} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
