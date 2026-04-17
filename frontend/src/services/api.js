const API_BASE_URL = 'http://localhost:8000';

export const api = {
  async analyzeFrame(imageBlob) {
    const formData = new FormData();
    formData.append('file', imageBlob, 'frame.jpg');

    const response = await fetch(`${API_BASE_URL}/process-frame`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Frame analysis failed');
    }

    return await response.json();
  },

  /**
   * Returns analysis results from localStorage.
   * No mock fallback — if no analysis has been run, returns null
   * so the UI can redirect or show an appropriate state.
   */
  async getAnalysisResults() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const cached = localStorage.getItem('temp_analysis');
        if (cached) {
          try {
            resolve(JSON.parse(cached));
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      }, 200);
    });
  }
};
