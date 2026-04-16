import { mockAnalysisData } from '../data/mockAnalysisData';

export const api = {
  async getAnalysisResults(videoData) {
    // VITE_API_BASE_URL will be provided by Vercel later
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'; 
    
    try {
      const response = await fetch(`${baseUrl}/upload`, { 
        method: 'POST',
        // Add headers and body depending on how your backend expects the data
      });
      return await response.json();
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }
};