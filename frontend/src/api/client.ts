import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
  pros?: string[];
  cons?: string[];
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
  total_reviews?: number;
  confidence?: number;
  data_quality?: {
    confidence: 'high' | 'medium' | 'low';
    confidence_score: number;
    review_count: number;
    reviews_fetched: number;
    low_data_confidence: boolean;
    scraper_method: string;
  };
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
  validateJobResult(response.data);
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
  validateCompareResult(response.data);
  return response.data;
};

export const getJobs = async (): Promise<JobListItem[]> => {
  const response = await apiClient.get('/jobs');
  return response.data;
};

function validateJobResult(response: JobResultResponse) {
  if (response.status !== 'completed' || !response.data) return;

  const data = response.data;
  console.log('DATA SOURCE CHECK:', data);

  if (typeof data.sentiment_score !== 'number') {
    console.error('Missing sentiment_score from backend', data);
  }
  if (typeof data.positive_ratio !== 'number' || typeof data.negative_ratio !== 'number') {
    console.error('Missing sentiment ratios from backend', data);
  }
  if (!Array.isArray(data.reviews)) {
    console.error('Missing reviews array from backend', data);
  } else if (data.reviews.length < 50) {
    console.warn('Low data confidence: fewer than 50 review snippets returned', {
      reviews: data.reviews.length,
      total_reviews: data.total_reviews,
      source: data.source,
      used_llm: data.used_llm,
    });
  }
  if (!data.source) {
    console.error('Missing scraper source from backend', data);
  }
}

function validateCompareResult(response: CompareResultResponse) {
  if (response.status?.toLowerCase() !== 'completed' || !response.result) return;
  console.log('DATA SOURCE CHECK: comparison', response.result);

  const products = response.result.products;
  if (!Array.isArray(products)) {
    console.error('Comparison result missing products array', response.result);
    return;
  }

  products.forEach((product: any) => {
    if (typeof product.sentiment_score !== 'number' && typeof product.positive_ratio !== 'number') {
      console.warn('Comparison product missing direct sentiment fields', product);
    }
    if (!product.review_count && !product.reviews_analyzed && !product.total_reviews) {
      console.warn('Comparison product missing review count', product);
    }
  });
}
