"""
ANAC Scraper — Augiva Blocco 1
Fonte: dati.anticorruzione.it — Dataset CIG mensili (ZIP+CSV)
Aggiornati mensilmente, disponibili per anno corrente e precedenti.
"""

import httpx
import asyncio
import logging
import io
import zipfile
import csv
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# URL pattern dataset ANAC — ZIP contenente CSV separato da ";"
ANAC_BASE = "https://dati.anticorruzione.it/opendata/dataset"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; Augiva/1.0; +https://augiva.com)",
    "Referer": "https://dati.anticorruzione.it/",
}

def _csv_url(year: int, month: int) -> str:
    return (
        f"{ANAC_BASE}/cig-{year}/resource/"
        f"dummy/download/cig_csv_{year}_{month:02d}.csv"
    )

def _direct_url(year: int, month: int) -> str:
    """URL diretto funzionante (senza UUID resource)."""
    return (
        f"https://dati.anticorruzione.it/opendata/dataset/cig-{year}/"
        f"resource/dummy/download/cig_csv_{year}_{month:02d}.csv"
    )

# URL effettivi scoperti per UUID (2025)
ANAC_RESOURCE_URLS = {
    (2025, 11): "https://dati.anticorruzione.it/opendata/dataset/cig-2025/resource/8bc58a13-f600-4198-ad10-38738d4b4cc0/download/cig_csv_2025_11.csv",
    (2025, 10): "https://dati.anticorruzione.it/opendata/dataset/cig-2025/resource/12b9c75f-cc6c-43c7-aeb9-f73f262b3a23/download/cig_csv_2025_10.csv",
    (2025, 12): "https://dati.anticorruzione.it/opendata/dataset/cig-2025/resource/dummy/download/cig_csv_2025_12.csv",
}

def _build_url(year: int, month: int) -> str:
    """Costruisce URL download CSV ANAC per anno/mese."""
    key = (year, month)
    if key in ANAC_RESOURCE_URLS:
        return ANAC_RESOURCE_URLS[key]
    # Pattern generico (funziona per 2025+ con user-agent browser)
    return f"https://dati.anticorruzione.it/opendata/dataset/cig-{year}/resource/dummy/download/cig_csv_{year}_{month:02d}.csv"


async def download_anac_csv(year: int, month: int) -> list[dict]:
    """
    Scarica e parsea il CSV mensile ANAC.
    Ritorna lista di bandi nel formato standard Augiva.
    """
    url = f"https://dati.anticorruzione.it/opendata/dataset/cig-{year}/resource/8bc58a13-f600-4198-ad10-38738d4b4cc0/download/cig_csv_{year}_{month:02d}.csv"
    
    # Prova con URL esatto che funziona per nov 2025
    if year == 2025 and month == 11:
        url = "https://dati.anticorruzione.it/opendata/dataset/cig-2025/resource/8bc58a13-f600-4198-ad10-38738d4b4cc0/download/cig_csv_2025_11.csv"
    
    logger.info(f"[ANAC] Download {year}-{month:02d}: {url}")
    
    async with httpx.AsyncClient(timeout=60.0, headers=HEADERS, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        content = resp.content

    # Il file è un ZIP
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            csv_name = zf.namelist()[0]
            csv_bytes = zf.read(csv_name)
            text = csv_bytes.decode("utf-8", errors="replace")
    except zipfile.BadZipFile:
        # Fallback: prova come CSV diretto
        text = content.decode("utf-8", errors="replace")

    return _parse_anac_csv(text, year, month)


def _parse_anac_csv(text: str, year: int, month: int) -> list[dict]:
    """Parsea CSV ANAC semicolon-separated e ritorna formato Augiva."""
    results = []
    reader = csv.DictReader(io.StringIO(text), delimiter=";")
    
    for row in reader:
        # Salta righe cancellate
        if row.get("COD_MOTIVO_CANCELLAZIONE"):
            continue
        
        # Filtro: solo bandi attivi e recenti (ultimi 30 giorni)
        pub_date_str = row.get("data_pubblicazione", "")
        if pub_date_str:
            try:
                pub_date = datetime.strptime(pub_date_str, "%Y-%m-%d")
                if pub_date < datetime.now() - timedelta(days=30):
                    continue
            except ValueError:
                pass

        value_str = row.get("importo_lotto") or row.get("importo_complessivo_gara") or ""
        try:
            value = float(value_str.replace(",", ".")) if value_str else None
        except ValueError:
            value = None

        results.append({
            "source": "ANAC",
            "source_id": row.get("cig", ""),
            "title": row.get("oggetto_lotto") or row.get("oggetto_gara") or "",
            "description": row.get("oggetto_gara", ""),
            "contracting_body": row.get("denominazione_amministrazione_appaltante", ""),
            "publication_date": pub_date_str,
            "deadline_date": row.get("data_scadenza_offerta") or None,
            "estimated_value": value,
            "currency": "EUR",
            "cpv_codes": [row["cod_cpv"]] if row.get("cod_cpv") else [],
            "country": "IT",
            "region": row.get("sezione_regionale", "").replace("SEZIONE REGIONALE ", ""),
            "url": f"https://dati.anticorruzione.it/superset/dashboard/cig/?cig={row.get('cig','')}",
            "procedure_type": row.get("tipo_scelta_contraente", ""),
            "sector": row.get("settore", ""),
            "pnrr": row.get("FLAG_PNRR_PNC", "0") == "1",
        })

    return results


async def run_full_scrape(days_back: int = 30) -> list[dict]:
    """
    Scarica i CSV ANAC degli ultimi mesi e ritorna tutti i bandi.
    """
    results = []
    now = datetime.now()
    
    # Scarica mese corrente e precedente
    months_to_fetch = []
    for i in range(2):
        d = now - timedelta(days=30 * i)
        months_to_fetch.append((d.year, d.month))

    for year, month in months_to_fetch:
        try:
            bandi = await download_anac_csv(year, month)
            logger.info(f"[ANAC] {year}-{month:02d}: {len(bandi)} bandi")
            results.extend(bandi)
        except Exception as e:
            logger.warning(f"[ANAC] {year}-{month:02d} fallito: {e}")

    # Deduplicazione per source_id
    seen = set()
    unique = []
    for b in results:
        if b["source_id"] not in seen:
            seen.add(b["source_id"])
            unique.append(b)

    return unique


async def test_connection():
    try:
        now = datetime.now()
        # Usa novembre 2025 come test (URL noto funzionante)
        bandi = await download_anac_csv(2025, 11)
        print(f"✅ ANAC OK — {len(bandi)} bandi (nov 2025)")
        if bandi:
            b = bandi[0]
            print(f"   Esempio: [{b['publication_date']}] {b['title'][:80]}")
            print(f"   Ente: {b['contracting_body'][:60]}")
            print(f"   Valore: €{b['estimated_value']:,.0f}" if b['estimated_value'] else "   Valore: n/d")
        return True
    except Exception as e:
        print(f"❌ ANAC Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_connection())
