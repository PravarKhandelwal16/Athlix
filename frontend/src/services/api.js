import { mockAnalysisData } from '../data/mockAnalysisData';

export const api = {
  /**
   * Simulates fetching analysis results from the backend.
   * Replaces real API call for the frontend MVP phase.
   */
  async getAnalysisResults() {
    // Simulate a brief network delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const cached = localStorage.getItem('temp_analysis');
        if (cached) {
          resolve(JSON.parse(cached));
        } else {
          resolve(mockAnalysisData);
        }
      }, 400);
    });
  }
};
