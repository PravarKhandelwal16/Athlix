from __future__ import annotations

import logging

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.models.schemas import PoseDetectionResponse
from app.services.pose_service import detect_pose

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["Pose Detection"])

_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/detect-pose", response_model=PoseDetectionResponse, summary="Detect body pose from an image")
async def detect_pose_endpoint(
    file: UploadFile = File(...),
) -> PoseDetectionResponse:
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
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Uploaded file is empty.")

    try:
        response = detect_pose(image_bytes)
        if response and getattr(response, "keypoints", None):
            print("\n----- DEBUG POSE -----")
            print(f"Keypoints Extracted: {len(response.keypoints)}")
            print("----------------------\n")
        return response
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error during pose detection.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Pose detection failed.") from exc


@router.post("/process-frame")
async def process_frame(file: UploadFile = File(...)):
    """
    Optimized real-time frame processing. 
    Returns risk score, level, and coaching feedback.
    """
    start_time = time.time()
    try:
        contents = await file.read()
        
        # 1. Pose Landmarks
        svc = get_pose_service()
        landmarks = svc.process_frame_from_bytes(contents)
        
        if not landmarks:
            return {
                "risk_score": 0,
                "risk_level": "None",
                "injury_reason": "No person detected in frame.",
                "latency_ms": round((time.time() - start_time) * 1000, 2)
            }
            
        # 2. ML Prediction
        pred_svc = get_prediction_service()
        result = pred_svc.predict(landmarks)
        
        if not result:
            # Buffer not full yet
            return {
                "risk_score": 0,
                "risk_level": "Analyzing...",
                "injury_reason": "Collecting movement data...",
                "latency_ms": round((time.time() - start_time) * 1000, 2)
            }
            
        # Return compact response for UI
        return {
            "risk_score": result["risk_score"],
            "risk_level": result["risk_level"],
            "injury_reason": result["injury_reason"],
            "dominant_issue": result["dominant_issue"],
            "confidence": result["confidence"],
            "latency_ms": round((time.time() - start_time) * 1000, 2)
        }
        
    except Exception as e:
        logger.error(f"Error in frame processing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
