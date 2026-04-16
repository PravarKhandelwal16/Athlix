export const analyzeVideo = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('http://localhost:8000/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Analysis Service Error:", error);
    throw error;
  }
};

export const processFrameAnalysis = async (imageFile, trainingLoad, sleepHours) => {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('training_load', trainingLoad);
  formData.append('sleep_hours', sleepHours);

  try {
    const response = await fetch('http://localhost:8000/process-frame', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Process Frame Analysis Error:", error);
    throw error;
  }
};
