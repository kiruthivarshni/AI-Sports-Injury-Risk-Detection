import cv2
import mediapipe as mp

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

# Maps your document's "Key Body Points" (Module 4) to MediaPipe's landmarks.
# Both left and right sides are captured so symmetry analysis (Module 5) is possible.
KEY_POINTS = {
    "head": mp_pose.PoseLandmark.NOSE,
    "left_shoulder": mp_pose.PoseLandmark.LEFT_SHOULDER,
    "right_shoulder": mp_pose.PoseLandmark.RIGHT_SHOULDER,
    "left_elbow": mp_pose.PoseLandmark.LEFT_ELBOW,
    "right_elbow": mp_pose.PoseLandmark.RIGHT_ELBOW,
    "left_wrist": mp_pose.PoseLandmark.LEFT_WRIST,
    "right_wrist": mp_pose.PoseLandmark.RIGHT_WRIST,
    "left_hip": mp_pose.PoseLandmark.LEFT_HIP,
    "right_hip": mp_pose.PoseLandmark.RIGHT_HIP,
    "left_knee": mp_pose.PoseLandmark.LEFT_KNEE,
    "right_knee": mp_pose.PoseLandmark.RIGHT_KNEE,
    "left_ankle": mp_pose.PoseLandmark.LEFT_ANKLE,
    "right_ankle": mp_pose.PoseLandmark.RIGHT_ANKLE,
    "left_foot": mp_pose.PoseLandmark.LEFT_FOOT_INDEX,
    "right_foot": mp_pose.PoseLandmark.RIGHT_FOOT_INDEX,
}


def detect_pose_landmarks(frame_path: str):
    image = cv2.imread(frame_path)
    if image is None:
        return None

    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    with mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5) as pose:
        results = pose.process(image_rgb)

    if not results.pose_landmarks:
        return None

    landmarks = {}
    for name, point in KEY_POINTS.items():
        lm = results.pose_landmarks.landmark[point]
        landmarks[name] = {
            "x": round(lm.x, 4),
            "y": round(lm.y, 4),
            "z": round(lm.z, 4),
            "visibility": round(lm.visibility, 4),
        }
    return landmarks


def detect_pose_for_frames(frame_paths: list, annotated_dir: str = None):
    results = []

    if annotated_dir:
        import os
        os.makedirs(annotated_dir, exist_ok=True)

    # One MediaPipe Pose instance across all frames = temporal tracking
    with mp_pose.Pose(
        static_image_mode=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    ) as pose:

        for frame_path in frame_paths:
            image = cv2.imread(frame_path)
            if image is None:
                continue

            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            pose_result = pose.process(image_rgb)

            if not pose_result.pose_landmarks:
                continue

            landmarks = {}

            for name, point in KEY_POINTS.items():
                lm = pose_result.pose_landmarks.landmark[point]
                landmarks[name] = {
                    "x": round(lm.x, 4),
                    "y": round(lm.y, 4),
                    "z": round(lm.z, 4),
                    "visibility": round(lm.visibility, 4),
                }

            annotated_path = None

            if annotated_dir:
                annotated = image.copy()

                mp_drawing.draw_landmarks(
                    annotated,
                    pose_result.pose_landmarks,
                    mp_pose.POSE_CONNECTIONS
                )

                import os
                annotated_path = os.path.join(
                    annotated_dir,
                    os.path.basename(frame_path)
                )

                cv2.imwrite(annotated_path, annotated)

            results.append({
                "frame": frame_path,
                "annotated_frame": annotated_path,
                "landmarks": landmarks
            })

    return results