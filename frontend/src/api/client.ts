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
  sentiment_score: number;
  positive_ratio: number;
  top_buying_reasons: string[];
  top_complaints: string[];
  improvement_suggestions: string[];
  confidence_score: number;
  reviews_analyzed: number;
}

export interface JobResultResponse {
  status: string;
  progress: number;
  stage: string;
  result?: AnalysisResult;
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
