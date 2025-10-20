from __future__ import annotations
import uuid
from dataclasses import dataclass, asdict
from typing import List, Dict, Any
from dateutil import parser as dateparser


@dataclass
class BBox:
    x: float
    y: float
    w: float
    h: float


def gen_id() -> str:
    return str(uuid.uuid4())


def ocr_stub(file_path: str) -> Dict[str, Any]:
    # TODO: replace with real OCR/HTR
    return {
        "docId": gen_id(),
        "pages": [
            {
                "page": 1,
                "text": "Registro: John Doe, 1861, São Paulo, Brazil",
            }
        ],
        "lang": "pt",
    }


def ner_stub(ocr: Dict[str, Any]) -> Dict[str, Any]:
    page_text = ocr["pages"][0]["text"]
    ents = []
    # naive rules for demo
    if "Inácio" in page_text:
        ents.append({
            "id": gen_id(),
            "type": "PERSON_NAME",
            "text": "John Doe",
            "confidence": 0.92,
            "page": 1,
            "span": {"start": page_text.find("Inácio"), "end": page_text.find("Inácio") + len("John Doe")},
        })
    if "1861" in page_text:
        ents.append({
            "id": gen_id(),
            "type": "DATE",
            "text": "1861",
            "confidence": 0.88,
            "page": 1,
            "iso": {"from": "1861-01-01", "to": "1861-12-31"},
        })
    if "São Paulo" in page_text:
        ents.append({
            "id": gen_id(),
            "type": "PLACE",
            "text": "São Paulo, Brazil",
            "confidence": 0.83,
            "page": 1,
            "normalized": "São Paulo, São Paulo, Brazil",
            "placeId": "place:sp-sao-paulo",
        })
    return {"docId": ocr["docId"], "entities": ents}


def suggest_stub(ner: Dict[str, Any]) -> Dict[str, Any]:
    # naive single suggestion
    return {
        "suggestions": [
            {
                "name": "John Doe",
                "score": 0.86,
                "explanations": ["Nome ✓", "Data ✓ (1861)", "Lugar ✓ (São Paulo)"] ,
                "fsUrl": "https://beta.familysearch.org/tree/person/details/K-123",
                "fsPersonId": "K-123",
            }
        ]
    }


def citation_stub(file_path: str) -> Dict[str, Any]:
    return {
        "citation": {
            "title": "Registro — John Doe (1861)",
            "note": "Gerado automaticamente a partir de imagem enviada.",
            "url": None,
        }
    }


def run_pipeline(file_path: str) -> Dict[str, Any]:
    ocr = ocr_stub(file_path)
    ner = ner_stub(ocr)
    sug = suggest_stub(ner)
    cit = citation_stub(file_path)
    return {
        "docId": ocr["docId"],
        "ocr": ocr,
        "ner": ner,
        **sug,
        **cit,
    }
