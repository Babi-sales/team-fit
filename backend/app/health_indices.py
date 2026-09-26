"""BMI, waist-hip ratio (WHR) and waist-height ratio (WHtR) from weight/measurement
history, with risk classification. Classification labels are returned in
Portuguese — they are displayed as-is in the dashboard."""

from app.models import BodyMeasurement, WeightLog
from app.schemas import HealthIndices, IndexPoint


def classify_bmi(bmi: float) -> str:
    if bmi < 18.5:
        return "Abaixo do peso"
    if bmi < 25:
        return "Peso normal"
    if bmi < 30:
        return "Sobrepeso"
    if bmi < 35:
        return "Obesidade grau I"
    if bmi < 40:
        return "Obesidade grau II"
    return "Obesidade grau III"


def classify_whr(whr: float, sex: str | None) -> str:
    female = (sex or "").strip().lower().startswith("f")
    low_cutoff = 0.80 if female else 0.90
    moderate_cutoff = 0.85 if female else 1.0
    if whr < low_cutoff:
        return "Risco baixo"
    if whr < moderate_cutoff:
        return "Risco moderado"
    return "Risco alto"


def classify_whtr(whtr: float) -> str:
    if whtr < 0.5:
        return "Risco baixo"
    if whtr < 0.6:
        return "Risco moderado"
    return "Risco alto"


def compute_health_indices(
    height_cm: float | None,
    sex: str | None,
    weight_logs: list[WeightLog],
    measurements: list[BodyMeasurement],
) -> HealthIndices:
    height_m = float(height_cm) / 100 if height_cm else None

    bmi_history = (
        [IndexPoint(date=w.date, value=round(float(w.weight_kg) / (height_m**2), 1)) for w in weight_logs]
        if height_m
        else []
    )
    whr_history = [
        IndexPoint(date=m.date, value=round(float(m.waist_cm) / float(m.hip_cm), 2))
        for m in measurements
        if m.waist_cm and m.hip_cm
    ]
    whtr_history = (
        [
            IndexPoint(date=m.date, value=round(float(m.waist_cm) / float(height_cm), 2))
            for m in measurements
            if m.waist_cm
        ]
        if height_cm
        else []
    )

    bmi_current = bmi_history[-1].value if bmi_history else None
    whr_current = whr_history[-1].value if whr_history else None
    whtr_current = whtr_history[-1].value if whtr_history else None

    return HealthIndices(
        bmi_current=bmi_current,
        bmi_classification=classify_bmi(bmi_current) if bmi_current is not None else None,
        bmi_history=bmi_history,
        whr_current=whr_current,
        whr_classification=classify_whr(whr_current, sex) if whr_current is not None else None,
        whr_history=whr_history,
        whtr_current=whtr_current,
        whtr_classification=classify_whtr(whtr_current) if whtr_current is not None else None,
        whtr_history=whtr_history,
    )
