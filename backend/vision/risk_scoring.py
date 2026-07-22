def score_biomechanical_deviations(summary: dict) -> float:
    """
    Scores 0-100 based on how far knee angles and knee valgus deviate from
    safe biomechanical ranges. Higher = more risk.
    """
    score = 0
    knee_valgus_avg = summary.get("knee_valgus_ratio", {}).get("average", 0)
    trunk_lean_avg = summary.get("trunk_lean", {}).get("average", 0)

    # Knee valgus ratio > 1.0 means knees are narrower than ankles (inward collapse)
    if knee_valgus_avg < 0.8:
        score += 40
    elif knee_valgus_avg < 1.0:
        score += 20

    # Excessive trunk lean (normalized coordinate difference)
    if trunk_lean_avg > 0.08:
        score += 30
    elif trunk_lean_avg > 0.05:
        score += 15

    return min(score, 100)


def score_movement_asymmetry(summary: dict) -> float:
    """Scores 0-100 based on left/right knee and hip angle symmetry."""
    knee_diff = summary.get("knee_symmetry_diff", {}).get("average", 0)
    hip_diff = summary.get("hip_symmetry_diff", {}).get("average", 0)

    score = 0
    if knee_diff > 15:
        score += 50
    elif knee_diff > 8:
        score += 25

    if hip_diff > 15:
        score += 50
    elif hip_diff > 8:
        score += 25

    return min(score, 100)


def score_historical_injury_factors(injury_history: str) -> float:
    """Simple heuristic: presence of noted injury history raises baseline risk."""
    if not injury_history or injury_history.strip().lower() in ("none", "n/a", ""):
        return 0
    return 60  # any recorded prior injury raises this factor significantly


def score_training_load(training_load: str) -> float:
    """Heuristic scoring based on a text/category training load field."""
    if not training_load:
        return 0
    load = training_load.strip().lower()
    if load in ("high", "very high", "heavy"):
        return 70
    if load in ("moderate", "medium"):
        return 35
    return 10


def score_fatigue_indicators(summary: dict) -> float:
    """
    Proxy for fatigue: uses balance offset variability across the video
    (less stable balance late in a movement sequence can indicate fatigue).
    """
    balance_max = summary.get("balance_offset", {}).get("max", 0)
    balance_avg = summary.get("balance_offset", {}).get("average", 0)
    variability = balance_max - balance_avg

    if variability > 0.05:
        return 70
    elif variability > 0.02:
        return 35
    return 10


def calculate_injury_risk(summary: dict, injury_history: str = "", training_load: str = ""):
    """
    Implements the Weighted Scoring Model from the project document (Module 8):
    Biomechanical Deviations 35%, Historical Injury Factors 20%,
    Movement Asymmetry 20%, Training Load Indicators 15%, Fatigue Indicators 10%.
    """
    biomechanical = score_biomechanical_deviations(summary)
    historical = score_historical_injury_factors(injury_history)
    asymmetry = score_movement_asymmetry(summary)
    training = score_training_load(training_load)
    fatigue = score_fatigue_indicators(summary)

    total_score = (
        biomechanical * 0.35 +
        historical * 0.20 +
        asymmetry * 0.20 +
        training * 0.15 +
        fatigue * 0.10
    )
    total_score = round(total_score, 2)

    if total_score < 25:
        category = "Low Risk"
    elif total_score < 50:
        category = "Moderate Risk"
    elif total_score < 75:
        category = "High Risk"
    else:
        category = "Critical Risk"

    return {
        "injury_risk_score": total_score,
        "risk_category": category,
        "breakdown": {
            "biomechanical_deviations": biomechanical,
            "historical_injury_factors": historical,
            "movement_asymmetry": asymmetry,
            "training_load_indicators": training,
            "fatigue_indicators": fatigue,
        }
    }