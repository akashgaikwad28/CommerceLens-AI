import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { analyzeProduct, getJobs } from '../api/client';
import JobCard from '../components/JobCard';

const HomePage = () => {
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const navigate = useNavigate();

  const fetchJobs = async () => {
    try {
      const data = await getJobs();
      setJobs(data);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    // Basic URL validation
    if (!url.includes('amazon.')) {
      setError('Please enter a valid Amazon product URL');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await analyzeProduct(url);
      if (result.job_id) {
        navigate(`/job/${result.job_id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start analysis');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
          Amazon Review Intelligence
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
          Extract deep, actionable insights from Amazon product reviews instantly. 
          Just paste a product URL to get started.
        </p>
        
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-6 h-6 text-gray-400" />
            <input
              type="url"
              placeholder="https://www.amazon.in/dp/B0..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full pl-14 pr-36 py-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all shadow-sm text-lg"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg px-6 transition-colors flex items-center disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing
                </>
              ) : (
                'Analyze'
              )}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-3 text-left pl-4">{error}</p>}
        </form>
      </div>

      {/* Recent Jobs Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          Recent Analyses
        </h2>
        
        {isLoadingJobs ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
            <p className="text-gray-500">No analyses found. Start by entering a URL above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <JobCard key={job.job_id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
