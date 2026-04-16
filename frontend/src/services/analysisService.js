/**
 * Service to handle video upload and analysis API calls.
 */

export const analyzeVideo = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:8000/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error analyzing video:", error);
    throw error;
  }
};
