"""
Augiva — Orchestratore Scrapers Blocco 1
Lancia TED, ANAC e MEPA in parallelo e salva i risultati.

Usage:
    python run_all.py [--days-back N] [--output PATH]
"""

import asyncio
import json
import logging
import sys
import argparse
from datetime import datetime
from pathlib import Path
from typing import Callable

# Import scrapers
sys.path.insert(0, str(Path(__file__).parent.parent))
from scrapers.ted_scraper import run_full_scrape as ted_scrape
from scrapers.anac_scraper import run_full_scrape as anac_scrape
from scrapers.mepa_scraper import run_full_scrape as mepa_scrape

# Configura logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("augiva.orchestrator")

OUTPUT_PATH = "/tmp/augiva_scrape_results.json"


async def run_scraper_safe(
    name: str,
    scrape_fn: Callable,
    days_back: int,
) -> tuple[str, list[dict], str | None]:
    """
    Esegue un singolo scraper in modo sicuro (cattura eccezioni).
    Ritorna (nome, risultati, errore_se_presente).
    """
    try:
        logger.info(f"[{name}] ▶ Avvio...")
        start = datetime.now()
        results = await scrape_fn(days_back=days_back)
        elapsed = (datetime.now() - start).total_seconds()
        logger.info(f"[{name}] ✅ Completato in {elapsed:.1f}s — {len(results)} bandi")
        return name, results, None
    except Exception as e:
        logger.error(f"[{name}] ❌ Errore: {type(e).__name__}: {e}", exc_info=True)
        return name, [], str(e)


def validate_tender(tender: dict, source: str) -> bool:
    """Validazione minima formato bando standard."""
    required = ["source", "source_id", "title", "url"]
    for field in required:
        if not tender.get(field):
            logger.debug(f"[{source}] Bando invalido — manca '{field}': {tender}")
            return False
    return True


async def run_all_scrapers(days_back: int = 7) -> dict:
    """
    Lancia tutti e 3 gli scrapers in parallelo con asyncio.gather.
    Aggrega, valida e deduplicà i risultati.
    """
    logger.info("=" * 60)
    logger.info(f"🚀 Augiva Scraper Orchestrator — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"   Periodo: ultimi {days_back} giorni")
    logger.info("=" * 60)

    start_total = datetime.now()

    # Lancio parallelo
    tasks = await asyncio.gather(
        run_scraper_safe("TED", ted_scrape, days_back),
        run_scraper_safe("ANAC", anac_scrape, days_back),
        run_scraper_safe("MEPA", mepa_scrape, days_back),
        return_exceptions=False,
    )

    # Aggregazione risultati
    all_tenders = []
    stats = {}
    errors = {}
    seen_ids = set()  # deduplicazione per (source, source_id)

    for name, results, error in tasks:
        if error:
            errors[name] = error
            stats[name] = {"count": 0, "status": "error", "error": error}
            continue

        valid_count = 0
        dupes = 0
        for tender in results:
            # Validazione
            if not validate_tender(tender, name):
                continue
            # Deduplicazione
            key = f"{tender['source']}:{tender['source_id']}"
            if key in seen_ids:
                dupes += 1
                continue
            seen_ids.add(key)
            all_tenders.append(tender)
            valid_count += 1

        stats[name] = {
            "count": valid_count,
            "dupes_skipped": dupes,
            "status": "ok",
        }

    total_elapsed = (datetime.now() - start_total).total_seconds()

    # Ordina per data pubblicazione (più recente prima)
    all_tenders.sort(
        key=lambda x: x.get("publication_date", "") or "",
        reverse=True,
    )

    # Output strutturato
    output = {
        "metadata": {
            "run_at": datetime.now().isoformat(),
            "days_back": days_back,
            "total_tenders": len(all_tenders),
            "elapsed_seconds": round(total_elapsed, 1),
        },
        "stats": stats,
        "errors": errors,
        "tenders": all_tenders,
    }

    # Log summary
    logger.info("\n" + "=" * 60)
    logger.info("📊 RISULTATI SCRAPE")
    logger.info("=" * 60)
    for source, stat in stats.items():
        if stat["status"] == "ok":
            logger.info(f"  {source:8s} ✅  {stat['count']:4d} bandi (dupes saltati: {stat.get('dupes_skipped', 0)})")
        else:
            logger.info(f"  {source:8s} ❌  ERRORE: {stat.get('error', '')[:80]}")
    logger.info(f"  {'TOTALE':8s}     {len(all_tenders):4d} bandi unici")
    logger.info(f"  Tempo totale: {total_elapsed:.1f}s")
    logger.info("=" * 60)

    return output


def save_results(output: dict, path: str = OUTPUT_PATH):
    """Salva risultati su file JSON."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2, default=str)
    logger.info(f"💾 Risultati salvati in: {path}")
    logger.info(f"   Dimensione file: {p.stat().st_size / 1024:.1f} KB")


async def main():
    parser = argparse.ArgumentParser(description="Augiva Scraper Orchestrator")
    parser.add_argument("--days-back", type=int, default=7, help="Giorni indietro da scrapare (default: 7)")
    parser.add_argument("--output", type=str, default=OUTPUT_PATH, help="Path output JSON")
    args = parser.parse_args()

    output = await run_all_scrapers(days_back=args.days_back)
    save_results(output, path=args.output)

    # Stampa riepilogo finale
    print(f"\n✅ Scrape completato!")
    print(f"   TED:  {output['stats'].get('TED', {}).get('count', 0)} bandi")
    print(f"   ANAC: {output['stats'].get('ANAC', {}).get('count', 0)} bandi")
    print(f"   MEPA: {output['stats'].get('MEPA', {}).get('count', 0)} bandi")
    print(f"   TOTALE: {output['metadata']['total_tenders']} bandi unici")
    print(f"   Output: {args.output}")


if __name__ == "__main__":
    asyncio.run(main())
