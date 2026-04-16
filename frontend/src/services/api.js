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
        resolve(mockAnalysisData);
      }, 400);
    });
  }
};
