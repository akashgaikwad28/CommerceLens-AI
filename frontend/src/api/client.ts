import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Types ---
export interface JobResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface AnalysisResult {
  product_url: string;
  product_name?: string;
  product_image?: string;
  sentiment_score: number;
  positive_ratio: number;
  negative_ratio: number;
  sentiment_summary: {
    positive: number;
    neutral: number;
    negative: number;
  };
  rating_distribution: Record<string, number>;
  tldr: {
    verdict: string;
    opportunity: string;
    risk: string;
  };
  actionability: {
    fix_immediately: string[];
    improve_messaging: string[];
    double_down: string[];
  };
  keyword_insights: {
    positives: Array<{ word: string; intensity: number; frequency_pct: number }>;
    negatives: Array<{ word: string; intensity: number; frequency_pct: number }>;
  };
  market_intelligence_insights: string[];
  purchase_drivers: string[];
  pain_points: string[];
  revenue_estimate: {
    range: {
      min_sales: number;
      max_sales: number;
      min_revenue: number;
      max_revenue: number;
    };
    currency: string;
    confidence: string;
    revenue_model: string;
    tooltip: string;
  };
  confidence_layers: {
    sentiment: string;
    revenue: string;
    pros_cons: string;
    insights: string;
  };
  specs: string[];
  reviews: Array<{ title: string; text: string; rating: number }>;
  reviews_analyzed: number;
  source: string;
  used_llm: boolean;
}

export interface JobResultResponse {
  status: string;
  progress: number;
  stage: string;
  data?: AnalysisResult;
  error?: string;
  meta: {
    created_at: string;
    processing_time_ms: number;
  };
}

export interface CompareResultResponse {
  status: string;
  progress: number;
  stage: string;
  result?: any; // The big structured dict from compare_worker
  error?: string;
}

export interface JobListItem {
  job_id: string;
  product_name: string;
  status: string;
  created_at: string;
}

// --- API Methods ---

export const analyzeProduct = async (productUrl: string, maxPages: number = 5): Promise<JobResponse> => {
  const response = await apiClient.post('/analyze', {
    product_url: productUrl,
    max_pages: maxPages,
  });
  return response.data;
};

export const getJobResult = async (jobId: string): Promise<JobResultResponse> => {
  const response = await apiClient.get(`/result/${jobId}`);
  return response.data;
};

export const compareProducts = async (productUrls: string[]): Promise<JobResponse> => {
  const response = await apiClient.post('/compare', {
    product_urls: productUrls,
  });
  return response.data;
};

export const getCompareResult = async (jobId: string): Promise<CompareResultResponse> => {
  const response = await apiClient.get(`/compare/${jobId}`);
  return response.data;
};

export const getJobs = async (): Promise<JobListItem[]> => {
  const response = await apiClient.get('/jobs');
  return response.data;
};
