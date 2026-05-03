import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { Clock, ExternalLink, Search, Scale } from 'lucide-react';
import { JobListItem } from '../api/client';

interface JobCardProps {
  job: JobListItem;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const isComparison = !job.product_name || job.product_name.includes("|") || job.job_id.startsWith("comp");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all duration-200 group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:text-blue-500 transition-colors">
            {isComparison ? <Scale className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </div>
          <h3 className="font-bold text-slate-800 line-clamp-2 leading-snug">
            {job.product_name || 'Multi-Product Comparison'}
          </h3>
        </div>
        <StatusBadge status={job.status} />
      </div>
      
      <div className="flex items-center text-xs font-medium text-slate-400 mb-6">
        <Clock className="w-3.5 h-3.5 mr-1.5" />
        {new Date(job.created_at).toLocaleString()}
      </div>
      
      <div className="flex justify-end pt-4 border-t border-slate-50">
        <Link 
          to={isComparison ? `/compare?job=${job.job_id}` : `/job/${job.job_id}`}
          className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          View Full Insights
          <ExternalLink className="w-4 h-4 ml-2" />
        </Link>
      </div>
    </div>
  );
};

export default JobCard;
