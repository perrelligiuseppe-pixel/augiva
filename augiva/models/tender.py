"""
Augiva — Tender Model
Schema standard per bandi normalizzati da qualsiasi fonte.
"""
from dataclasses import dataclass, field
from typing import Optional
from datetime import date


@dataclass
class Tender:
    """
    Schema standard Augiva per bandi/appalti.
    Compatibile con tabella `tenders` su Supabase.
    """
    source: str                     # "TED" | "ANAC" | "MEPA"
    source_id: str                  # ID univoco nella fonte
    title: str                      # titolo del bando
    url: str                        # link diretto al bando
    description: str = ""
    contracting_body: str = ""      # ente appaltante
    publication_date: Optional[str] = None   # ISO: YYYY-MM-DD
    deadline_date: Optional[str] = None      # ISO: YYYY-MM-DD
    estimated_value: Optional[float] = None  # valore stimato
    currency: str = "EUR"
    cpv_codes: list[str] = field(default_factory=list)
    country: str = "IT"
    region: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "source_id": self.source_id,
            "title": self.title,
            "description": self.description,
            "contracting_body": self.contracting_body,
            "publication_date": self.publication_date,
            "deadline_date": self.deadline_date,
            "estimated_value": self.estimated_value,
            "currency": self.currency,
            "cpv_codes": self.cpv_codes,
            "country": self.country,
            "region": self.region,
            "url": self.url,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Tender":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})
