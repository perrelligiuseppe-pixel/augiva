"""
TED (Tenders Electronic Daily) Scraper — Augiva Blocco 1
API v3: https://api.ted.europa.eu/v3
Documentazione: https://ted.europa.eu/api/v3/swagger-ui/index.html

Note tecniche verificate sul campo:
- POST /v3/notices/search con body JSON
- Parametri supportati: query, fields, page (1-based), limit (max 100)
- NON supportati: pageSize, sortColumn, sortOrder, scope
- Codice paese: ITA (3 lettere, non IT)
- Query paese: buyer-country=ITA o place-of-performance=ITA
- notice-title: dict con chiavi lingua minuscolo (ita, eng, fra...)
- organisation-name-buyer: dict {lang: [lista nomi]}
- buyer-country: lista di stringhe ['ITA']
- publication-date: formato '2026-02-26+01:00'
"""

import httpx
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

TED_API_BASE = "https://api.ted.europa.eu/v3"

# Fields verificati come supportati dall'API v3
QUERY_FIELDS = [
    "publication-number",
    "notice-title",
    "publication-date",
    "organisation-name-buyer",
    "buyer-country",
    "place-of-performance",
    "contract-nature",
    "links",
]


async def search_ted_notices(
    days_back: int = 7,
    page: int = 1,
    limit: int = 50,
) -> dict:
    """
    Cerca bandi TED italiani pubblicati negli ultimi N giorni.
    Usa POST con body JSON (API v3 richiede questo formato).
    Filtra: buyer-country=ITA OR place-of-performance=ITA
    """
    date_from = (datetime.now() - timedelta(days=days_back)).strftime("%Y%m%d")

    payload = {
        "query": f"PD>={date_from} AND (buyer-country=ITA OR place-of-performance=ITA)",
        "fields": QUERY_FIELDS,
        "page": page,
        "limit": limit,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{TED_API_BASE}/notices/search",
            json=payload,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()
        return response.json()


def parse_notice(raw: dict) -> dict:
    """
    Normalizza un bando TED nel formato standard Augiva.
    Gestisce la struttura reale dell'API v3.
    """
    pub_number = raw.get("publication-number", "")

    # Titolo: dict con chiavi lingua minuscolo (ita, eng, fra...)
    notice_title = raw.get("notice-title", {})
    title = _extract_multilang_lower(notice_title)

    # Buyer: dict {lang: [lista nomi]}
    buyer_raw = raw.get("organisation-name-buyer", {})
    if isinstance(buyer_raw, dict):
        # Prendi il valore per 'ita' o primo disponibile
        buyer_list = buyer_raw.get("ita") or next(iter(buyer_raw.values()), [])
        contracting_body = buyer_list[0] if isinstance(buyer_list, list) and buyer_list else ""
    elif isinstance(buyer_raw, list):
        contracting_body = buyer_raw[0] if buyer_raw else ""
    else:
        contracting_body = str(buyer_raw) if buyer_raw else ""

    # Paese compratore
    buyer_country = raw.get("buyer-country", [])
    country = buyer_country[0] if isinstance(buyer_country, list) and buyer_country else "ITA"

    # Luogo esecuzione — estrai regione NUTS
    place = raw.get("place-of-performance", [])
    region = None
    if isinstance(place, list):
        for p in place:
            if isinstance(p, str) and p.startswith("IT") and len(p) >= 3:
                region = p
                break

    # URL: link HTML in italiano
    links = raw.get("links", {})
    url = ""
    if isinstance(links, dict):
        html_links = links.get("html", {})
        if isinstance(html_links, dict):
            url = (
                html_links.get("ITA")
                or html_links.get("ENG")
                or next(iter(html_links.values()), "")
            )
    if not url:
        url = f"https://ted.europa.eu/it/notice/-/detail/{pub_number}"

    # Data pubblicazione
    pub_date = raw.get("publication-date", "")

    return {
        "source": "TED",
        "source_id": pub_number,
        "title": title or f"Bando TED {pub_number}",
        "description": "",  # non incluso nel search, serve chiamata dettaglio
        "contracting_body": contracting_body,
        "publication_date": _normalize_date(pub_date),
        "deadline_date": None,   # non nel search, serve dettaglio
        "estimated_value": None,  # non nel search
        "currency": "EUR",
        "cpv_codes": [],          # non nel search
        "country": country,
        "region": region,
        "url": url,
    }


def _extract_multilang_lower(
    field,
    preferred: tuple = ("ita", "eng", "fra", "deu"),
) -> str:
    """Estrae testo da campo multilingua con chiavi minuscole."""
    if isinstance(field, str):
        return field.strip()
    if isinstance(field, dict):
        for lang in preferred:
            val = field.get(lang)
            if val:
                return str(val).strip()
        # Primo disponibile
        for v in field.values():
            if v:
                return str(v).strip()
    if isinstance(field, list) and field:
        return _extract_multilang_lower(field[0], preferred)
    return ""


def _normalize_date(date_str) -> Optional[str]:
    """Normalizza date in formato ISO 8601 (YYYY-MM-DD)."""
    if not date_str:
        return None
    s = str(date_str).strip()
    # Formato TED: '2026-02-26+01:00' — prendi solo i primi 10 char
    if len(s) >= 10 and s[4] == "-":
        return s[:10]
    # Formato YYYYMMDD
    if len(s) == 8 and s.isdigit():
        return f"{s[:4]}-{s[4:6]}-{s[6:8]}"
    return s[:10] if s else None


async def run_full_scrape(days_back: int = 7) -> list[dict]:
    """
    Scrape completo TED: recupera tutti i bandi degli ultimi N giorni
    per imprese italiane (buyer-country=ITA OR place-of-performance=ITA).
    Paginazione automatica, cap a 10 pagine (500 bandi).
    Ritorna lista di dict normalizzati nel formato standard Augiva.
    """
    all_notices = []
    page = 1
    page_limit = 50
    total_pages = None

    logger.info(f"[TED] Avvio scrape — ultimi {days_back} giorni")

    while True:
        try:
            result = await search_ted_notices(
                days_back=days_back,
                page=page,
                limit=page_limit,
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"[TED] HTTP {e.response.status_code} pag {page}: {e.response.text[:200]}")
            break
        except Exception as e:
            logger.error(f"[TED] Errore pag {page}: {type(e).__name__}: {e}")
            break

        notices_raw = result.get("notices", [])
        if not notices_raw:
            logger.info(f"[TED] Pag {page} vuota — stop")
            break

        # Prima pagina: calcola totale
        if total_pages is None:
            total_count = result.get("totalNoticeCount", 0)
            total_pages = max(1, (total_count + page_limit - 1) // page_limit)
            logger.info(f"[TED] Trovati {total_count} bandi italiani ({total_pages} pagine)")

        for raw in notices_raw:
            try:
                parsed = parse_notice(raw)
                all_notices.append(parsed)
            except Exception as e:
                logger.warning(f"[TED] Parsing error: {e}")

        logger.info(f"[TED] Pag {page}/{total_pages} → {len(all_notices)} bandi totali")

        # Cap a 10 pagine per test sicuro
        if page >= total_pages or page >= 10:
            break
        page += 1
        await asyncio.sleep(0.5)

    logger.info(f"[TED] Completato — {len(all_notices)} bandi")
    return all_notices


async def test_connection() -> bool:
    """Test rapido TED API."""
    try:
        result = await search_ted_notices(days_back=7, page=1, limit=5)
        total = result.get("totalNoticeCount", 0)
        notices = result.get("notices", [])
        print(f"✅ TED API OK — {total} bandi IT negli ultimi 7 giorni")
        for n in notices[:3]:
            p = parse_notice(n)
            print(f"   [{p['publication_date']}] {p['contracting_body'][:40]} — {p['title'][:60]}")
        return True
    except Exception as e:
        print(f"❌ TED Error: {type(e).__name__}: {e}")
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_connection())
