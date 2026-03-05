"""
Fondi Nazionali Scraper — Augiva Blocco 2
Fonti:
  - Invitalia (invitalia.it) — agevolazioni PMI
  - MIMIT (mimit.gov.it) — incentivi imprese
  - PNRR (italiadomani.gov.it) — fondi Next Generation EU
  - SIMEST (simest.it) — internazionalizzazione
  - Gazzetta Ufficiale (gazzettaufficiale.it) — bandi ufficiali
"""

import httpx
import asyncio
import logging
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; Augiva/1.0; +https://augiva.com)"}


# ─────────────────────────────────────────────
# INVITALIA
# ─────────────────────────────────────────────
async def scrape_invitalia() -> list[dict]:
    """Agevolazioni attive da Invitalia."""
    url = "https://www.invitalia.it/cosa-facciamo/rafforziamo-le-imprese"
    results = []
    async with httpx.AsyncClient(timeout=30.0, headers=HEADERS, follow_redirects=True) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            return []
        soup = BeautifulSoup(resp.text, "lxml")
        
        # Cerca card agevolazioni
        cards = soup.find_all(["article", "div"], class_=lambda c: c and any(
            k in str(c).lower() for k in ["card", "agevolaz", "misura", "bando"]
        ))
        
        for card in cards[:20]:
            link = card.find("a", href=True)
            title_el = card.find(["h2", "h3", "h4", "strong"])
            if not title_el or not link:
                continue
            title = title_el.get_text(strip=True)
            href = link["href"]
            if not href.startswith("http"):
                href = "https://www.invitalia.it" + href
            desc_el = card.find("p")
            desc = desc_el.get_text(strip=True) if desc_el else title
            
            if len(title) > 10:
                results.append({
                    "source": "INVITALIA",
                    "source_id": href.split("/")[-1] or title[:30],
                    "title": title,
                    "description": desc,
                    "contracting_body": "Invitalia",
                    "publication_date": datetime.now().strftime("%Y-%m-%d"),
                    "deadline_date": None,
                    "estimated_value": None,
                    "currency": "EUR",
                    "cpv_codes": [],
                    "country": "IT",
                    "region": None,
                    "url": href,
                    "tipo": "fondo",
                    "ente": "Invitalia",
                })
    
    logger.info(f"[INVITALIA] {len(results)} agevolazioni")
    return results


# ─────────────────────────────────────────────
# MIMIT — Ministero delle Imprese e del Made in Italy
# ─────────────────────────────────────────────
async def scrape_mimit() -> list[dict]:
    """Bandi e incentivi attivi dal MIMIT."""
    urls = [
        "https://www.mimit.gov.it/it/incentivi",
        "https://www.mimit.gov.it/it/bandi",
    ]
    results = []
    
    async with httpx.AsyncClient(timeout=30.0, headers=HEADERS, follow_redirects=True) as client:
        for url in urls:
            try:
                resp = await client.get(url)
                if resp.status_code != 200:
                    continue
                soup = BeautifulSoup(resp.text, "lxml")
                
                # Cerca lista bandi/incentivi
                items = soup.find_all(["article", "li", "div"], class_=lambda c: c and any(
                    k in str(c).lower() for k in ["bando", "incentivo", "misura", "item", "card"]
                ))
                
                for item in items[:15]:
                    link = item.find("a", href=True)
                    title_el = item.find(["h2", "h3", "h4", "a"])
                    if not title_el:
                        continue
                    title = title_el.get_text(strip=True)
                    href = link["href"] if link else url
                    if href and not href.startswith("http"):
                        href = "https://www.mimit.gov.it" + href
                    
                    if len(title) > 15:
                        results.append({
                            "source": "MIMIT",
                            "source_id": href.split("/")[-1] or title[:30],
                            "title": title,
                            "description": title,
                            "contracting_body": "MIMIT",
                            "publication_date": datetime.now().strftime("%Y-%m-%d"),
                            "deadline_date": None,
                            "estimated_value": None,
                            "currency": "EUR",
                            "cpv_codes": [],
                            "country": "IT",
                            "region": None,
                            "url": href,
                            "tipo": "fondo",
                            "ente": "MIMIT",
                        })
            except Exception as e:
                logger.warning(f"[MIMIT] {url}: {e}")
    
    # Dedup
    seen = set()
    unique = [r for r in results if r["source_id"] not in seen and not seen.add(r["source_id"])]
    logger.info(f"[MIMIT] {len(unique)} incentivi")
    return unique


# ─────────────────────────────────────────────
# SIMEST — Internazionalizzazione
# ─────────────────────────────────────────────
async def scrape_simest() -> list[dict]:
    """Finanziamenti SIMEST per internazionalizzazione PMI."""
    url = "https://www.simest.it/finanziamenti/"
    results = []
    
    async with httpx.AsyncClient(timeout=30.0, headers=HEADERS, follow_redirects=True) as client:
        try:
            resp = await client.get(url)
            if resp.status_code != 200:
                return []
            soup = BeautifulSoup(resp.text, "lxml")
            
            cards = soup.find_all(["article", "div"], class_=lambda c: c and any(
                k in str(c).lower() for k in ["card", "finanziamento", "prodotto", "item"]
            ))
            
            for card in cards[:10]:
                link = card.find("a", href=True)
                title_el = card.find(["h2", "h3", "h4"])
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                href = link["href"] if link else url
                if href and not href.startswith("http"):
                    href = "https://www.simest.it" + href
                
                if len(title) > 10:
                    results.append({
                        "source": "SIMEST",
                        "source_id": href.split("/")[-2] if "/" in href else title[:30],
                        "title": title,
                        "description": title,
                        "contracting_body": "SIMEST",
                        "publication_date": datetime.now().strftime("%Y-%m-%d"),
                        "deadline_date": None,
                        "estimated_value": None,
                        "currency": "EUR",
                        "cpv_codes": [],
                        "country": "IT",
                        "region": None,
                        "url": href,
                        "tipo": "fondo",
                        "ente": "SIMEST",
                    })
        except Exception as e:
            logger.warning(f"[SIMEST] {e}")
    
    logger.info(f"[SIMEST] {len(results)} finanziamenti")
    return results


# ─────────────────────────────────────────────
# GAZZETTA UFFICIALE — bandi ufficiali
# ─────────────────────────────────────────────
async def scrape_gazzetta_ufficiale(days_back: int = 7) -> list[dict]:
    """Bandi pubblicati in Gazzetta Ufficiale."""
    # GU ha un motore di ricerca con parametri
    url = "https://www.gazzettaufficiale.it/ricerca/anteprima/parole/bando%20PMI/1/10"
    results = []
    
    async with httpx.AsyncClient(timeout=30.0, headers=HEADERS, follow_redirects=True) as client:
        try:
            resp = await client.get(url)
            if resp.status_code != 200:
                return []
            soup = BeautifulSoup(resp.text, "lxml")
            
            items = soup.find_all(["div", "li"], class_=lambda c: c and any(
                k in str(c).lower() for k in ["risultato", "atto", "record", "item"]
            ))
            
            for item in items[:10]:
                link = item.find("a", href=True)
                title_el = item.find(["h3", "h4", "strong", "span"])
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                href = link["href"] if link else ""
                if href and not href.startswith("http"):
                    href = "https://www.gazzettaufficiale.it" + href
                
                if len(title) > 15:
                    results.append({
                        "source": "GAZZETTA_UFFICIALE",
                        "source_id": href.split("/")[-1] or title[:30],
                        "title": title,
                        "description": title,
                        "contracting_body": "Gazzetta Ufficiale",
                        "publication_date": datetime.now().strftime("%Y-%m-%d"),
                        "deadline_date": None,
                        "estimated_value": None,
                        "currency": "EUR",
                        "cpv_codes": [],
                        "country": "IT",
                        "region": None,
                        "url": href,
                        "tipo": "fondo",
                        "ente": "Gazzetta Ufficiale",
                    })
        except Exception as e:
            logger.warning(f"[GU] {e}")
    
    logger.info(f"[GAZZETTA] {len(results)} bandi")
    return results


async def run_full_scrape() -> list[dict]:
    """Lancia tutti gli scrapers fondi in parallelo."""
    tasks = [
        scrape_invitalia(),
        scrape_mimit(),
        scrape_simest(),
        scrape_gazzetta_ufficiale(),
    ]
    results_list = await asyncio.gather(*tasks, return_exceptions=True)
    
    all_results = []
    names = ["Invitalia", "MIMIT", "SIMEST", "Gazzetta"]
    for name, res in zip(names, results_list):
        if isinstance(res, Exception):
            logger.error(f"[{name}] Errore: {res}")
        else:
            all_results.extend(res)
    
    return all_results


async def test_connection():
    print("Testing fondi scrapers...")
    results = await run_full_scrape()
    by_source = {}
    for r in results:
        s = r["source"]
        by_source[s] = by_source.get(s, 0) + 1
    
    for source, count in by_source.items():
        print(f"  ✅ {source}: {count} opportunità")
    
    if not results:
        print("  ⚠️  Tutti i fondi scrapers: 0 risultati (siti potrebbero richiedere JS)")
    
    return len(results) > 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_connection())
