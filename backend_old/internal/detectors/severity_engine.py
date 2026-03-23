from typing import Optional


class SeverityEngine:
    """
    Converts detection confidence + physical parameters
    into a severity classification.
    """

    def classify(
        self,
        confidence: float,
        distance: Optional[float] = None,
        velocity: Optional[float] = None,
    ) -> str:

        risk_score = confidence

        # Distance risk
        if distance is not None:
            if distance < 3:
                risk_score += 0.4
            elif distance < 5:
                risk_score += 0.3
            elif distance < 10:
                risk_score += 0.2
            elif distance < 20:
                risk_score += 0.1

        # Velocity risk
        if velocity is not None:
            v = abs(velocity)

            if v > 10:
                risk_score += 0.3
            elif v > 5:
                risk_score += 0.2
            elif v > 2:
                risk_score += 0.1

        # Clamp score
        risk_score = min(risk_score, 1.5)

        # Severity mapping
        if risk_score >= 1.2:
            return "CRITICAL"

        if risk_score >= 0.9:
            return "HIGH"

        if risk_score >= 0.6:
            return "MEDIUM"

        return "LOW"