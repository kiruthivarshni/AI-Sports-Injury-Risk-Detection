from datetime import datetime


def generate_biomechanics_report(
    video_filename: str,
    frames_analyzed: int,
    summary: dict,
    quality_result: dict,
    risk_result: dict = None,
    athlete_info: dict = None
):
    """
    Combines pose/biomechanics/quality (and optionally injury risk) data
    into one structured report — matches Module 12's
    'Biomechanical assessment reports' and 'Movement analysis reports'.
    """
    report = {
        "report_id": f"RPT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "video_filename": video_filename,
        "athlete": athlete_info,
        "frames_analyzed": frames_analyzed,
        "movement_quality": {
            "score": quality_result.get("movement_quality_score"),
            "label": quality_result.get("quality_label"),
        },
        "biomechanical_metrics": {
            "knee_angle": {
                "left_avg": summary.get("left_knee_angle", {}).get("average"),
                "right_avg": summary.get("right_knee_angle", {}).get("average"),
            },
            "hip_angle": {
                "left_avg": summary.get("left_hip_angle", {}).get("average"),
                "right_avg": summary.get("right_hip_angle", {}).get("average"),
            },
            "trunk_lean_avg": summary.get("trunk_lean", {}).get("average"),
            "knee_valgus_ratio_avg": summary.get("knee_valgus_ratio", {}).get("average"),
            "knee_symmetry_diff_avg": summary.get("knee_symmetry_diff", {}).get("average"),
            "hip_symmetry_diff_avg": summary.get("hip_symmetry_diff", {}).get("average"),
            "balance_offset_avg": summary.get("balance_offset", {}).get("average"),
        },
        "full_summary_detail": summary,
    }

    if risk_result:
        report["injury_risk"] = {
            "score": risk_result.get("injury_risk_score"),
            "category": risk_result.get("risk_category"),
            "breakdown": risk_result.get("breakdown"),
        }

    return report