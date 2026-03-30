from typing import Optional


class SeverityEngine:
    def classify(
        self,
        confidence: float,
        distance: Optional[float] = None,
        velocity: Optional[float] = None,
    ) -> str:
        risk_score = confidence

        if distance is not None:
            if distance < 3:
                risk_score += 0.4
            elif distance < 5:
                risk_score += 0.3
            elif distance < 10:
                risk_score += 0.2
            elif distance < 20:
                risk_score += 0.1

        if velocity is not None:
            absolute_velocity = abs(velocity)
            if absolute_velocity > 10:
                risk_score += 0.3
            elif absolute_velocity > 5:
                risk_score += 0.2
            elif absolute_velocity > 2:
                risk_score += 0.1

        risk_score = min(risk_score, 1.5)

        if risk_score >= 1.2:
            return "CRITICAL"
        if risk_score >= 0.9:
            return "HIGH"
        if risk_score >= 0.6:
            return "MEDIUM"
        return "LOW"
