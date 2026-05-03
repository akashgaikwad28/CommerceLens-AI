import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getJobResult } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import InsightList from '../components/InsightList';
import ChartComponent from '../components/ChartComponent';
import { ArrowLeft, Loader2, AlertCircle, Clock, Star, Target, Zap } from 'lucide-react';

const JobDetailPage = () => {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let pollInterval;

    const fetchResult = async () => {
      try {
        const data = await getJobResult(jobId);
        setJob(data);
        
        // Stop polling if completed or failed
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollInterval);
        }
      } catch (err) {
        setError('Failed to fetch job details. The job might not exist.');
        clearInterval(pollInterval);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResult();
    
    // Poll every 3 seconds
    pollInterval = setInterval(fetchResult, 3000);

    return () => clearInterval(pollInterval);
  }, [jobId]);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 text-lg">Fetching analysis details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-3xl mx-auto mt-12 p-6 bg-red-50 rounded-xl border border-red-100 flex items-start">
        <AlertCircle className="w-6 h-6 text-red-500 mr-3 mt-0.5" />
        <div>
          <h3 className="text-lg font-medium text-red-800">Error</h3>
          <p className="text-red-600 mt-1">{error || 'Job not found'}</p>
          <Link to="/" className="mt-4 inline-flex items-center text-red-700 hover:text-red-800 font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { status, product_url, data: insights, error: jobError, meta } = job;
  const isCompleted = status === 'completed' && insights;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-6 font-medium">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {job.product_name || 'Analyzing Product...'}
            </h1>
            <a href={product_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium break-all">
              {product_url}
            </a>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={status} />
            <span className="text-xs text-gray-500 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {new Date(meta.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* In Progress State */}
      {(status === 'pending' || status === 'processing') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Analysis in Progress</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            We are scraping reviews and extracting AI insights. This usually takes 30-60 seconds depending on the number of pages.
          </p>
        </div>
      )}

      {/* Failed State */}
      {status === 'failed' && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">Analysis Failed</h2>
          <p className="text-red-700">{jobError || 'An unexpected error occurred during processing.'}</p>
        </div>
      )}

      {/* Completed State */}
      {isCompleted && (
        <div className="space-y-8 animate-in fade-in duration-500">
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              icon={<Star className="w-6 h-6 text-yellow-500" />}
              title="Avg Sentiment"
              value={`${insights.sentiment_score}/5.0`}
            />
            <MetricCard 
              icon={<Target className="w-6 h-6 text-blue-500" />}
              title="AI Confidence"
              value={`${Math.round(insights.confidence_score * 100)}%`}
            />
            <MetricCard 
              icon={<Zap className="w-6 h-6 text-indigo-500" />}
              title="Reviews Analyzed"
              value={insights.reviews_analyzed}
            />
            <MetricCard 
              icon={<Clock className="w-6 h-6 text-emerald-500" />}
              title="Processing Time"
              value={meta.processing_time_ms ? `${(meta.processing_time_ms / 1000).toFixed(1)}s` : 'N/A'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Insights (Takes up 2 columns) */}
            <div className="lg:col-span-2 space-y-8">
              <InsightList 
                title="Top Buying Reasons" 
                type="positive" 
                items={insights.top_buying_reasons} 
              />
              <InsightList 
                title="Top Complaints" 
                type="negative" 
                items={insights.top_complaints} 
              />
              <InsightList 
                title="Improvement Suggestions" 
                type="suggestion" 
                items={insights.improvement_suggestions} 
              />
            </div>
            
            {/* Sidebar Insights (Takes up 1 column) */}
            <div className="space-y-8">
              <ChartComponent 
                positiveRatio={insights.positive_ratio} 
                negativeRatio={insights.negative_ratio} 
              />
              <InsightList 
                title="Key Patterns" 
                type="pattern" 
                items={insights.key_patterns} 
              />
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
};

// Internal component for metric cards
const MetricCard = ({ icon, title, value }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center">
    <div className="p-3 rounded-lg bg-gray-50 mr-4">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export default JobDetailPage;
