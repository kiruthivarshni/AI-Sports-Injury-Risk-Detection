import cv2
import os

def assess_video_quality(video_path: str):
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")

    brightness_values = []
    sharpness_values = []
    sampled_frames = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if sampled_frames < 30:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            brightness_values.append(float(gray.mean()))
            sharpness_values.append(
                float(cv2.Laplacian(gray, cv2.CV_64F).var())
            )

            sampled_frames += 1
        else:
            break

    cap.release()

    if not brightness_values:
        return {
            "quality_status": "Poor",
            "brightness": 0,
            "sharpness": 0,
            "enhancement_required": True
        }

    avg_brightness = sum(brightness_values) / len(brightness_values)
    avg_sharpness = sum(sharpness_values) / len(sharpness_values)

    too_dark = avg_brightness < 50
    too_bright = avg_brightness > 210
    blurry = avg_sharpness < 50

    return {
        "quality_status": "Poor" if blurry or too_dark or too_bright else "Good",
        "brightness": round(avg_brightness, 2),
        "sharpness": round(avg_sharpness, 2),
        "enhancement_required": too_dark or too_bright or blurry
    }

def enhance_frame(frame):
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_l = clahe.apply(l_channel)

    enhanced_lab = cv2.merge((enhanced_l, a_channel, b_channel))

    return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

def extract_frames(
    video_path: str,
    output_dir: str,
    frame_interval: int = 5,
    apply_enhancement: bool = False
):
    """
    Extracts frames from a video file at a given interval.
    If apply_enhancement=True, saved analysis frames are enhanced.
    """
    os.makedirs(output_dir, exist_ok=True)
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")

    frame_count = 0
    saved_frames = []

    while cap.isOpened():
        ret, frame = cap.read()

        if not ret:
            break

        if frame_count % frame_interval == 0:
            if apply_enhancement:
                frame = enhance_frame(frame)

            frame_filename = f"frame_{frame_count}.jpg"
            frame_path = os.path.join(output_dir, frame_filename)

            cv2.imwrite(frame_path, frame)
            saved_frames.append(frame_path)

        frame_count += 1

    cap.release()
    return saved_frames