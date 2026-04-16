from __future__ import annotations

import logging
import shutil
import statistics
import tempfile
import time
from pathlib import Path
from typing import List, Optional

import cv2
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.models.schemas import (
    FatigueInput,
    FormFlags,
    ProcessFrameResponse,
)
from app.services.feature_engineering import analyze_form, extract_joint_angles, generate_feature_vector
from app.services.pose_service import PoseService, detect_pose
from app.services.pipeline import run_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["Frame Processing"])

_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

_ISSUE_DETAILS = {
    "Not going low enough":       "Your hips didn't go below your knees.",
    "Knees going inward":            "Your knees move inward while coming up.",
    "Leaning too far forward": "Your upper body tilted too far forward.",
    "Heels lifting up":              "Your heels came off the floor while going down.",
    "Shifting to one side":          "Your weight shifted more to one side.",
}


@router.post(
    "/process-frame",
    response_model=ProcessFrameResponse,
    summary="Full pipeline: pose → angles → form analysis → feature vector",
)
async def process_frame(
    file: UploadFile = File(..., description="Image frame (JPEG / PNG / WebP)"),
    training_load: float = Form(..., gt=0, description="Training load metric"),
    sleep_hours: float = Form(..., gt=0, le=24, description="Hours of sleep last night"),
) -> ProcessFrameResponse:
    """
    End-to-end pipeline for a single frame:

    1. Detect pose via MediaPipe BlazePose.
    2. Extract joint angles (knee, hip, back).
    3. Analyse biomechanical form (knee valgus, bad back, squat depth).
    4. Compute fatigue / recovery features.
    5. Assemble a flat, ML-ready feature vector.
    """
    content_type = (file.content_type or "").split(";")[0].strip()
    if content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported media type '{content_type}'. Allowed: {sorted(_ALLOWED_TYPES)}",
        )

    try:
        image_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    t_start = time.perf_counter()

    # ── Step 1 & 2: Pose detection + angle extraction ──────────────────────
    try:
        pose_result = detect_pose(image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Pose detection failed.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Pose detection failed.") from exc

    elapsed_ms = round((time.perf_counter() - t_start) * 1_000, 2)

    if not pose_result.pose_detected:
        return ProcessFrameResponse(
            pose_detected=False,
            processing_time_ms=elapsed_ms,
            error="No pose detected in the uploaded frame.",
        )

    # ── Step 3: Form analysis ───────────────────────────────────────────────
    form_flags: FormFlags = analyze_form(
        landmarks=pose_result.landmarks,
        back_angle=pose_result.angles.back_angle if pose_result.angles else None,
    )

    # ── Step 4 & 5: Fatigue + feature vector ───────────────────────────────
    fatigue_input = FatigueInput(
        training_load=training_load,
        sleep_hours=sleep_hours,
    )

    feature_vector = generate_feature_vector(
        pose_data=pose_result,
        fatigue_input=fatigue_input,
    )

    elapsed_ms = round((time.perf_counter() - t_start) * 1_000, 2)

    logger.info(
        "process-frame completed in %.1f ms — fatigue=%.4f recovery=%.4f",
        elapsed_ms, feature_vector.fatigue_score, feature_vector.recovery_score,
    )

    return ProcessFrameResponse(
        pose_detected=True,
        feature_vector=feature_vector,
        form_flags=form_flags,
        angles=pose_result.angles,
        processing_time_ms=elapsed_ms,
    )


def _extract_video_features_sync(tmp_path_str: str, max_frames: int = 20) -> dict:
    cap = cv2.VideoCapture(tmp_path_str)
    if not cap.isOpened():
        return {"error": "Could not open video file"}

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Calculate sampling stride to cover the whole video
    stride = max(1, total_frames // max_frames)
    
    frames_processed = 0
    all_landmarks: List = []
    knee_angles: List[float] = []
    hip_angles:  List[float] = []
    back_angles: List[float] = []

    try:
        with PoseService(static_image_mode=False) as pose_svc:
            # Sample max_frames across the entire video duration
            for i in range(max_frames):
                frame_idx = i * stride
                if frame_idx >= total_frames:
                    break
                
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, bgr_frame = cap.read()
                if not ret:
                    break

                rgb_frame = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
                landmarks = pose_svc.process_frame(rgb_frame)

                if landmarks:
                    all_landmarks.append(landmarks)
                    angles = extract_joint_angles(landmarks)

                    if angles.left_knee and angles.right_knee:
                        knee_angles.append((angles.left_knee + angles.right_knee) / 2.0)
                    elif angles.left_knee:
                        knee_angles.append(angles.left_knee)
                    elif angles.right_knee:
                        knee_angles.append(angles.right_knee)

                    if angles.left_hip and angles.right_hip:
                        hip_angles.append((angles.left_hip + angles.right_hip) / 2.0)
                    elif angles.left_hip:
                        hip_angles.append(angles.left_hip)
                    elif angles.right_hip:
                        hip_angles.append(angles.right_hip)

                    if angles.back is not None:
                        back_angles.append(angles.back)

                frames_processed += 1
    finally:
        cap.release()

    return {
        "fps": fps,
        "frames_processed": frames_processed,
        "all_landmarks": all_landmarks,
        "knee_angles": knee_angles,
        "hip_angles": hip_angles,
        "back_angles": back_angles,
    }


@router.post("/analyze")
async def analyze_video(
    file: UploadFile = File(...),
    training_experience: str = Form("Intermediate"),
    relative_intensity: str = Form("Medium"),
    max_pr: float = Form(0.0),
    body_weight: float = Form(0.0),
):
    """
    Analyzes the video using the intelligent scoring engine.
    Personalization and Intensity-aware results are computed automatically.
    """
    logger.info("Video received for intelligent analysis: %s", file.filename)

    tmp_dir = tempfile.mkdtemp(prefix="analyze_")
    tmp_path = Path(tmp_dir) / (file.filename or "upload.mp4")

    try:
        # Save video to tmp file
        file_bytes = await file.read()
        tmp_path.write_bytes(file_bytes)

        # ── Step 1: Clear global history and populate it via analyze_video_form ──
        # This populates FRAME_ANGLES_HISTORY with knee, hip, back, drift, and visibility
        from app.services.pose_service import analyze_video_form
        _ = await run_in_threadpool(analyze_video_form, str(tmp_path))

        # ── Step 2: Run the intelligent pipeline ──
        # Pipeline will look at FRAME_ANGLES_HISTORY and use the provided metadata
        risk_input = {
            "training_experience": training_experience,
            "relative_intensity": relative_intensity,
            "max_pr": max_pr,
            "body_weight": body_weight,
            "previous_injury": 0, # Could be passed from frontend in future
        }
        
        pipeline_result = run_pipeline(risk_input)
        
        # Result compilation
        computed_score = round(max(0.0, 100.0 - pipeline_result.risk_score), 1)
        
        level_map = {
            "Low": ("SAFE", "green"),
            "Medium": ("MODERATE", "yellow"),
            "High": ("HIGH", "red"),
        }
        mapped_level, mapped_color = level_map.get(pipeline_result.risk_level, ("MODERATE", "yellow"))

        return {
            "score": computed_score,
            "risk_level": mapped_level,
            "risk_color": mapped_color,
            "injury_reasons": pipeline_result.reasons,
            "recommendations": pipeline_result.recommendations,
            "feature_vector": {
                **pipeline_result.input_features,
                "confidence_score": pipeline_result.confidence_score,
                "reps_detected": pipeline_result.angle_stats.get("reps_detected", 5) # Rep counting can stay for now
            },
            "angle_stats": pipeline_result.angle_stats,
            "form_flags": pipeline_result.angle_stats.get("form_flags", {})
        }

    except Exception as exc:
        logger.error("analyze_video processing failed: %s", str(exc), exc_info=True)
        return {"error": "processing failed", "detail": str(exc)}
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
