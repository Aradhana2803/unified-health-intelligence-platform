from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import math

app = FastAPI(title="UHIC AI Service", version="0.1.0")

class Vitals(BaseModel):
    hr: Optional[float] = None
    bp: Optional[str] = None
    spo2: Optional[float] = None
    rr: Optional[float] = None

class PredictIn(BaseModel):
    symptoms: List[str] = Field(default_factory=list)
    vitals: Vitals = Field(default_factory=Vitals)
    age: Optional[int] = None
    trauma_type: Optional[str] = None

class PredictOut(BaseModel):
    emergency_type: str
    probability: float
    recommended_setup: List[str]
    urgency_score: float
    emergency_class: str
    confidence: float
    recommended_setup_details: Dict[str, Any] = Field(default_factory=dict)
    hospital_routing: Dict[str, Any] = Field(default_factory=dict)

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def parse_bp(bp: Optional[str]):
    if not bp:
        return None, None
    try:
        s, d = bp.split("/")
        return float(s), float(d)
    except Exception:
        return None, None

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/predict", response_model=PredictOut)
def predict(inp: PredictIn):
    # Hybrid approach:
    # 1) Rule-based red flags
    # 2) Soft scoring to produce probability + urgency
    symptoms = [s.lower().strip() for s in inp.symptoms]
    hr = inp.vitals.hr
    spo2 = inp.vitals.spo2
    rr = inp.vitals.rr
    sys_bp, dia_bp = parse_bp(inp.vitals.bp)
    age = inp.age or 40

    score = 0.0
    tags = set()

    # Rule flags
    if "chest pain" in symptoms or "pressure chest" in symptoms:
        score += 25; tags.add("cardiac")
    if "shortness of breath" in symptoms or "breathless" in symptoms:
        score += 20; tags.add("resp")
    if "unconscious" in symptoms or "seizure" in symptoms:
        score += 30; tags.add("neuro")
    if inp.trauma_type:
        score += 15; tags.add("trauma")

    if hr is not None:
        if hr >= 130: score += 25
        elif hr >= 110: score += 15
        elif hr <= 45: score += 20
    if spo2 is not None:
        if spo2 < 90: score += 30
        elif spo2 < 94: score += 15
    if rr is not None:
        if rr >= 30: score += 20
        elif rr >= 24: score += 10

    if sys_bp is not None and sys_bp < 90:
        score += 30
    if sys_bp is not None and sys_bp > 180:
        score += 15

    # Age sensitivity
    if age >= 65: score += 10
    if age <= 5: score += 10

    urgency = clamp(score, 0, 100)

    # Convert to probability via logistic-ish mapping
    prob = 1.0 / (1.0 + math.exp(-(urgency - 50) / 10.0))
    prob = float(clamp(prob, 0.01, 0.99))

    # Determine emergency type + setup
    if "neuro" in tags:
        etype = "Neurological Emergency"
        setup = ["CT-ready bay", "Airway kit", "Seizure protocol meds"]
    elif "cardiac" in tags:
        etype = "Cardiac Emergency"
        setup = ["ECG", "Defib ready", "Troponin kit", "Oxygen"]
    elif "resp" in tags:
        etype = "Respiratory Distress"
        setup = ["Oxygen", "Nebulizer", "Ventilation support"]
    elif "trauma" in tags:
        etype = "Trauma"
        setup = ["Trauma bay", "Blood products standby", "FAST ultrasound"]
    else:
        etype = "General Emergency"
        setup = ["Triage bay", "IV access", "Basic labs"]

    eclass = "high" if urgency >= 70 else "medium" if urgency >= 40 else "low"
    conf = float(clamp(0.5 + (abs(urgency - 50) / 100), 0.5, 0.95))

    routing = {
        "hospital_code": "HOSP-001" if urgency >= 60 else "HOSP-002",
        "rationale": "Nearest ER with capability for predicted class (demo)."
    }

    return PredictOut(
        emergency_type=etype,
        probability=prob,
        recommended_setup=setup,
        urgency_score=float(urgency),
        emergency_class=eclass,
        confidence=conf,
        recommended_setup_details={"tags": list(tags)},
        hospital_routing=routing
    )
