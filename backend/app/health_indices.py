"""Cálculo de IMC, Relação Cintura-Quadril (RCQ) e Relação Cintura-Altura (RCA)
a partir do histórico de peso e medidas, com classificação de risco."""

from app.models import BodyMeasurement, WeightLog
from app.schemas import HealthIndices, IndicePonto


def classificar_imc(imc: float) -> str:
    if imc < 18.5:
        return "Abaixo do peso"
    if imc < 25:
        return "Peso normal"
    if imc < 30:
        return "Sobrepeso"
    if imc < 35:
        return "Obesidade grau I"
    if imc < 40:
        return "Obesidade grau II"
    return "Obesidade grau III"


def classificar_rcq(rcq: float, sexo: str | None) -> str:
    feminino = (sexo or "").strip().lower().startswith("f")
    limite_baixo = 0.80 if feminino else 0.90
    limite_moderado = 0.85 if feminino else 1.0
    if rcq < limite_baixo:
        return "Risco baixo"
    if rcq < limite_moderado:
        return "Risco moderado"
    return "Risco alto"


def classificar_rca(rca: float) -> str:
    if rca < 0.5:
        return "Risco baixo"
    if rca < 0.6:
        return "Risco moderado"
    return "Risco alto"


def compute_health_indices(
    altura_cm: float | None,
    sexo: str | None,
    weight_logs: list[WeightLog],
    measurements: list[BodyMeasurement],
) -> HealthIndices:
    altura_m = float(altura_cm) / 100 if altura_cm else None

    imc_historico = (
        [IndicePonto(data=w.data, valor=round(float(w.peso_kg) / (altura_m**2), 1)) for w in weight_logs]
        if altura_m
        else []
    )
    rcq_historico = [
        IndicePonto(data=m.data, valor=round(float(m.cintura_cm) / float(m.quadril_cm), 2))
        for m in measurements
        if m.cintura_cm and m.quadril_cm
    ]
    rca_historico = (
        [
            IndicePonto(data=m.data, valor=round(float(m.cintura_cm) / (float(altura_cm)), 2))
            for m in measurements
            if m.cintura_cm
        ]
        if altura_cm
        else []
    )

    imc_atual = imc_historico[-1].valor if imc_historico else None
    rcq_atual = rcq_historico[-1].valor if rcq_historico else None
    rca_atual = rca_historico[-1].valor if rca_historico else None

    return HealthIndices(
        imc_atual=imc_atual,
        imc_classificacao=classificar_imc(imc_atual) if imc_atual is not None else None,
        imc_historico=imc_historico,
        rcq_atual=rcq_atual,
        rcq_classificacao=classificar_rcq(rcq_atual, sexo) if rcq_atual is not None else None,
        rcq_historico=rcq_historico,
        rca_atual=rca_atual,
        rca_classificacao=classificar_rca(rca_atual) if rca_atual is not None else None,
        rca_historico=rca_historico,
    )
