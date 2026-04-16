export const api = {
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
