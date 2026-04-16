# Athlix — AI Biomechanical Analysis Pipeline

Athlix is an advanced AI-powered biomechanical analysis system designed to predict and prevent athletic injuries. The application evaluates movement quality during structural exercises (like squats) or dynamic movements, utilizing a synergy of **MediaPipe** computer vision, custom biomechanics heuristics, and **XGBoost/Random Forest** models to produce immediate, actionable risk assessments.

---

## 🏗️ Project Architecture

The system is decoupled into an ML-heavy API backend and a professional React dashboard.

- **Root**: Project orchestration and unified execution environment.
- **`ai-backend/`**: A **FastAPI** application handling pose detection, joint angle extraction, and ML-driven risk scoring.
- **`frontend/`**: A **React + Vite** dashboard for uploading media and viewing interactive coaching reports.

---

## 🚀 Quick Start (Unified Flow)

The easiest way to run the entire stack is using the root management scripts.

### 1. Initial Setup
Ensure you have **Node.js** and **Python 3.10+** installed. From the root directory, run:

```powershell
# Create virtual environment and install all dependencies
npm run setup
```

### 2. Launch the Application
Start both the FastAPI backend and the React frontend concurrently:

```powershell
# Starts backend on :8000 and frontend on :5173
npm run dev
```

---

## 🛠️ Manual Configuration (Optional)

### Backend (Python)
If you prefer managing the backend manually:
```bash
cd ai-backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*API docs available at `http://localhost:8000/docs`.*

### Frontend (Node)
```bash
cd frontend
npm install
npm run dev
```

---

## 🎯 Usage Workflow

1. Open `http://localhost:5173/`.
2. Navigate to **Start Analysis**.
3. Select your exercise protocol (e.g., "Back Squat").
4. Upload a video (`.mp4`, `.mov`) or image.
5. Review the **Movement Risk Index**, **Form Decay** charts, and **Coaching Plan**.

---

## ⚙️ Core Technologies
- **Computer Vision**: MediaPipe BlazePose
- **Machine Learning**: XGBoost, Scikit-Learn (Random Forest Fusion)
- **Backend**: FastAPI, OpenCV, NumPy
- **Frontend**: React, Vite, Tailwind CSS, Framer Motion
