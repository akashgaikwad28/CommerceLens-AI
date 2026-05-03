import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { Clock, ExternalLink } from 'lucide-react';

const JobCard = ({ job }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 pr-4">
          {job.product_name || 'Analyzing Amazon Product...'}
        </h3>
        <StatusBadge status={job.status} />
      </div>
      
      <div className="flex items-center text-sm text-gray-500 mb-6">
        <Clock className="w-4 h-4 mr-1.5" />
        {new Date(job.created_at).toLocaleString()}
      </div>
      
      <div className="flex justify-end">
        <Link 
          to={`/job/${job.job_id}`}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          View Details
          <ExternalLink className="w-4 h-4 ml-2" />
        </Link>
      </div>
    </div>
  );
};

export default JobCard;
