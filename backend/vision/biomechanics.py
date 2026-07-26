import numpy as np


def calculate_angle(a, b, c):
    """Angle at point b, given three (x, y) points — e.g. hip-knee-ankle for knee angle."""
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba = a - b
    bc = c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    angle = np.arccos(np.clip(cosine, -1.0, 1.0))
    return round(float(np.degrees(angle)), 2)


def calculate_frame_metrics(landmarks: dict):
    """
    Computes per-frame biomechanical metrics matching your document's
    'Biomechanical Metrics' list (Module 5): joint angles, trunk lean,
    knee valgus proxy, and balance — from a single frame's landmarks.
    """
    def pt(name):
        return (landmarks[name]["x"], landmarks[name]["y"])

    left_knee_angle = calculate_angle(pt("left_hip"), pt("left_knee"), pt("left_ankle"))
    right_knee_angle = calculate_angle(pt("right_hip"), pt("right_knee"), pt("right_ankle"))

    left_hip_angle = calculate_angle(pt("left_shoulder"), pt("left_hip"), pt("left_knee"))
    right_hip_angle = calculate_angle(pt("right_shoulder"), pt("right_hip"), pt("right_knee"))

    shoulder_mid_x = (landmarks["left_shoulder"]["x"] + landmarks["right_shoulder"]["x"]) / 2
    hip_mid_x = (landmarks["left_hip"]["x"] + landmarks["right_hip"]["x"]) / 2
    trunk_lean = round(abs(shoulder_mid_x - hip_mid_x), 4)

    # Knee valgus proxy: knees collapsing inward relative to ankle width (larger = worse)
    knee_gap = abs(landmarks["left_knee"]["x"] - landmarks["right_knee"]["x"])
    ankle_gap = abs(landmarks["left_ankle"]["x"] - landmarks["right_ankle"]["x"]) + 1e-8
    knee_valgus_ratio = round(knee_gap / ankle_gap, 4)

    # Movement symmetry: difference between left/right knee angle (0 = perfectly symmetric)
    knee_symmetry_diff = round(abs(left_knee_angle - right_knee_angle), 2)
    hip_symmetry_diff = round(abs(left_hip_angle - right_hip_angle), 2)

    # Balance proxy: horizontal offset between shoulder midpoint and ankle midpoint
    ankle_mid_x = (landmarks["left_ankle"]["x"] + landmarks["right_ankle"]["x"]) / 2
    balance_offset = round(abs(shoulder_mid_x - ankle_mid_x), 4)

    return {
        "left_knee_angle": left_knee_angle,
        "right_knee_angle": right_knee_angle,
        "left_hip_angle": left_hip_angle,
        "right_hip_angle": right_hip_angle,
        "trunk_lean": trunk_lean,
        "knee_valgus_ratio": knee_valgus_ratio,
        "knee_symmetry_diff": knee_symmetry_diff,
        "hip_symmetry_diff": hip_symmetry_diff,
        "balance_offset": balance_offset,
    }


def aggregate_metrics(per_frame_metrics: list):
    """
    Averages per-frame metrics across the whole video into a single
    biomechanics summary — this becomes the 'Movement Quality Assessment'
    and feeds the Risk Scoring Engine in Phase 5.
    """
    if not per_frame_metrics:
        return {}

    keys = per_frame_metrics[0].keys()
    summary = {}
    for key in keys:
        values = [m[key] for m in per_frame_metrics]
        summary[key] = {
            "average": round(float(np.mean(values)), 2),
            "max": round(float(np.max(values)), 2),
            "min": round(float(np.min(values)), 2),
        }
    return summary

def calculate_movement_quality_score(summary: dict) -> dict:
    """
    Movement Quality Score (Module 8): scores 0-100, where 100 = ideal technique.
    Distinct from injury risk — this reflects how clean/efficient the movement is,
    not injury probability.
    """
    score = 100.0

    knee_symmetry_avg = summary.get("knee_symmetry_diff", {}).get("average", 0)
    hip_symmetry_avg = summary.get("hip_symmetry_diff", {}).get("average", 0)
    trunk_lean_avg = summary.get("trunk_lean", {}).get("average", 0)
    balance_avg = summary.get("balance_offset", {}).get("average", 0)
    knee_valgus_avg = summary.get("knee_valgus_ratio", {}).get("average", 1.0)

    # Deduct points for each biomechanical inefficiency, proportional to severity
    score -= min(knee_symmetry_avg * 1.5, 25)
    score -= min(hip_symmetry_avg * 1.5, 25)
    score -= min(trunk_lean_avg * 300, 20)
    score -= min(balance_avg * 300, 15)

    if knee_valgus_avg < 0.85:
        score -= 15
    elif knee_valgus_avg < 1.0:
        score -= 7

    score = max(0, round(score, 2))

    if score >= 85:
        quality_label = "Excellent"
    elif score >= 65:
        quality_label = "Good"
    elif score >= 45:
        quality_label = "Fair"
    else:
        quality_label = "Poor"

    return {
        "movement_quality_score": score,
        "quality_label": quality_label
    }