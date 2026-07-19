from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
import glob

from vision.video_processor import extract_frames
from vision.pose_estimator import detect_pose_for_frames

router = APIRouter()

VIDEO_DIR = "uploads/videos"
FRAME_DIR = "uploads/frames"

@router.post("/upload-video/")
async def upload_video(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".mp4", ".mov", ".avi")):
        raise HTTPException(status_code=400, detail="Only .mp4, .mov, or .avi files are supported")

    video_path = os.path.join(VIDEO_DIR, file.filename)
    os.makedirs(VIDEO_DIR, exist_ok=True)

    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    video_name = os.path.splitext(file.filename)[0]
    output_dir = os.path.join(FRAME_DIR, video_name)

    try:
        frames = extract_frames(video_path, output_dir)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "message": "Video uploaded and frames extracted successfully",
        "video_filename": file.filename,
        "frames_extracted": len(frames),
        "frame_folder": output_dir
    }

@router.post("/detect-pose/")
async def detect_pose(video_filename: str):
    """
    Runs pose detection on all frames already extracted for a given video.
    video_filename should be the original uploaded filename, e.g. "test.mp4".
    """
    video_name = os.path.splitext(video_filename)[0]
    frame_dir = os.path.join(FRAME_DIR, video_name)

    if not os.path.isdir(frame_dir):
        raise HTTPException(
            status_code=404,
            detail=f"No extracted frames found for '{video_filename}'. Upload the video first."
        )

    frame_paths = sorted(glob.glob(os.path.join(frame_dir, "*.jpg")))

    if not frame_paths:
        raise HTTPException(status_code=404, detail="Frame folder exists but contains no images")

    pose_results = detect_pose_for_frames(frame_paths)

    return {
        "video_filename": video_filename,
        "total_frames": len(frame_paths),
        "frames_with_pose_detected": len(pose_results),
        "results": pose_results
    }