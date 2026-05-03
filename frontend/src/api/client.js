import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const analyzeProduct = async (productUrl, maxPages = 5) => {
  const response = await apiClient.post('/analyze', {
    product_url: productUrl,
    max_pages: maxPages,
  });
  return response.data;
};

export const getJobs = async () => {
  const response = await apiClient.get('/jobs');
  return response.data;
};

export const getJobResult = async (jobId) => {
  const response = await apiClient.get(`/result/${jobId}`);
  return response.data;
};
