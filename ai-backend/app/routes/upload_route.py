from __future__ import annotations

import logging
import shutil
import tempfile
import time
from pathlib import Path
from typing import List

import cv2
import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.models.schemas import (
    BiomechanicalFeatures,
    FrameProcessingResponse,
    FrameResult,
    ProcessingStatus,
    VideoProcessingResponse,
)
from app.services.feature_engineering import build_feature_vector
from app.services.pose_service import PoseService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["Upload & Processing"])

_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
_ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/avi"}
_MAX_VIDEO_FRAMES = 15  # Hard cap — never process more than this to avoid blocking


def _validate_content_type(file: UploadFile, allowed: set[str]) -> None:
    base_type = (file.content_type or "").split(";")[0].strip()
    if base_type not in allowed:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported media type '{base_type}'. Allowed: {sorted(allowed)}",
        )


def _bgr_to_rgb(frame: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)


def _decode_image_bytes(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not decode the uploaded image.",
        )
    return img


@router.post("/frame", response_model=FrameProcessingResponse, summary="Process a single image frame")
async def upload_frame(
    file: UploadFile = File(...),
) -> FrameProcessingResponse:
    _validate_content_type(file, _ALLOWED_IMAGE_TYPES)
    t_start = time.perf_counter()

    try:
        raw_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    rgb_frame = _bgr_to_rgb(_decode_image_bytes(raw_bytes))

    with PoseService(static_image_mode=True) as pose_svc:
        landmarks = pose_svc.process_frame(rgb_frame)

    pose_detected = landmarks is not None
    features: BiomechanicalFeatures | None = None

    if pose_detected:
        features = build_feature_vector(frame_index=0, landmarks=landmarks)

    elapsed_ms = (time.perf_counter() - t_start) * 1_000

    return FrameProcessingResponse(
        status=ProcessingStatus.SUCCESS if pose_detected else ProcessingStatus.PARTIAL,
        processing_time_ms=round(elapsed_ms, 2),
        result=FrameResult(
            frame_index=0,
            pose_detected=pose_detected,
            landmarks=landmarks,
            features=features,
            error_message=None if pose_detected else "No pose detected in the uploaded frame.",
        ),
        metadata={"filename": file.filename or "unknown", "source": "frame"},
    )


def _process_video_sync(tmp_path_str: str, max_frames: int) -> dict:
    frame_results: List[FrameResult] = []
    cap = cv2.VideoCapture(tmp_path_str)

    if not cap.isOpened():
        return {"error": "OpenCV could not open the uploaded video file."}

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    detected = 0

    try:
        with PoseService(static_image_mode=False) as pose_svc:
            frame_idx = 0
            while cap.isOpened() and frame_idx < max_frames:
                ret, bgr_frame = cap.read()
                if not ret:
                    break

                landmarks = pose_svc.process_frame(_bgr_to_rgb(bgr_frame))
                pose_detected = landmarks is not None
                features: BiomechanicalFeatures | None = None
                error_msg: str | None = None

                if pose_detected:
                    detected += 1
                    try:
                        features = build_feature_vector(frame_index=frame_idx, landmarks=landmarks)
                    except Exception as exc:
                        error_msg = f"Feature extraction error: {exc}"
                else:
                    error_msg = "No pose detected."

                frame_results.append(FrameResult(
                    frame_index=frame_idx,
                    pose_detected=pose_detected,
                    landmarks=landmarks,
                    features=features,
                    error_message=error_msg,
                ))
                frame_idx += 1
    finally:
        cap.release()

    return {
        "frame_results": frame_results,
        "total_frames": total_frames,
        "detected": detected
    }

@router.post("/video", response_model=VideoProcessingResponse, summary="Process a video file")
async def upload_video(
    file: UploadFile = File(...),
) -> VideoProcessingResponse:
    _validate_content_type(file, _ALLOWED_VIDEO_TYPES)
    t_start = time.perf_counter()

    tmp_dir  = tempfile.mkdtemp(prefix="athlix_")
    tmp_path = Path(tmp_dir) / (file.filename or "upload.mp4")

    try:
        with tmp_path.open("wb") as buf:
            shutil.copyfileobj(file.file, buf)

        logger.info("Video received: %s — (capped at %d frames)", file.filename, _MAX_VIDEO_FRAMES)

        result_dict = await run_in_threadpool(_process_video_sync, str(tmp_path), _MAX_VIDEO_FRAMES)
        
        if "error" in result_dict:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=result_dict["error"],
            )

        frame_results = result_dict["frame_results"]
        total_frames = result_dict["total_frames"]
        detected = result_dict["detected"]

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    elapsed_ms     = (time.perf_counter() - t_start) * 1_000
    processed_count = len(frame_results)

    status_val = (
        ProcessingStatus.SUCCESS if detected > 0
        else ProcessingStatus.PARTIAL if processed_count > 0
        else ProcessingStatus.FAILED
    )

    return VideoProcessingResponse(
        status=status_val,
        total_frames=total_frames,
        processed_frames=processed_count,
        detected_frames=detected,
        processing_time_ms=round(elapsed_ms, 2),
        frame_results=frame_results,
        aggregate_risk_score=None,
        aggregate_risk_level=None,
        metadata={
            "filename": file.filename or "unknown",
            "max_frames_cap": str(_MAX_VIDEO_FRAMES),
        },
    )
