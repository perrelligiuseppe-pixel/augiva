"""
MEPA Scraper — Augiva Blocco 1
Fonte: Acquisti in Rete PA (Consip) — Feed RSS avvisi di gara
URL RSS: https://www.acquistinretepa.it/opencms/opencms/main/appalti/avvisi_gara/

Note: MEPA non ha API pubblica. Il feed RSS degli avvisi è la fonte più stabile.
Fallback: scraping HTML della pagina avvisi.
"""

import httpx
import asyncio
import logging
import feedparser
from datetime import datetime, timedelta
from typing import Optional
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

MEPA_RSS_URLS = [
    "https://www.acquistinretepa.it/opencms/opencms/main/appalti/avvisi_gara/RSS.xml",
    "https://www.acquistinretepa.it/opencms/opencms/main/appalti/RSS.xml",
    "https://www.acquistinretepa.it/RSS.xml",
]

MEPA_SEARCH_URL = "https://www.acquistinretepa.it/opencms/opencms/main/appalti/avvisi_gara/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; Augiva/1.0; +https://augiva.com)",
}


async def scrape_mepa_html(days_back: int = 7) -> list[dict]:
    """
    Scraping HTML del portale MEPA — avvisi di gara recenti.
    """
    results = []
    cutoff = datetime.now() - timedelta(days=days_back)

    async with httpx.AsyncClient(timeout=30.0, headers=HEADERS, follow_redirects=True) as client:
        resp = await client.get(MEPA_SEARCH_URL)
        if resp.status_code != 200:
            logger.warning(f"[MEPA] HTML {resp.status_code}")
            return []

        soup = BeautifulSoup(resp.text, "lxml")

        # Cerca tabella o lista avvisi gara
        rows = soup.find_all("tr") or soup.find_all("li", class_=lambda c: c and "avviso" in c.lower())
        
        for row in rows:
            try:
                title_el = row.find("a") or row.find("h3") or row.find("h4")
                if not title_el:
                    continue
                title = title_el.get_text(strip=True)
                url = title_el.get("href", "")
                if url and not url.startswith("http"):
                    url = "https://www.acquistinretepa.it" + url

                # Cerca data
                date_el = row.find(class_=lambda c: c and "data" in str(c).lower())
                pub_date = date_el.get_text(strip=True) if date_el else ""

                if title and len(title) > 10:
                    results.append({
                        "source": "MEPA",
                        "source_id": url.split("/")[-1] or title[:30],
                        "title": title,
                        "description": title,
                        "contracting_body": "",
                        "publication_date": pub_date,
                        "deadline_date": None,
                        "estimated_value": None,
                        "currency": "EUR",
                        "cpv_codes": [],
                        "country": "IT",
                        "region": None,
                        "url": url,
                    })
            except Exception:
                continue

    return results


async def scrape_mepa_rss(days_back: int = 7) -> list[dict]:
    """
    Legge feed RSS MEPA se disponibile.
    """
    cutoff = datetime.now() - timedelta(days=days_back)
    results = []

    async with httpx.AsyncClient(timeout=20.0, headers=HEADERS, follow_redirects=True) as client:
        for rss_url in MEPA_RSS_URLS:
            try:
                resp = await client.get(rss_url)
                if resp.status_code != 200:
                    continue
                
                feed = feedparser.parse(resp.text)
                if not feed.entries:
                    continue
                
                logger.info(f"[MEPA] RSS {rss_url}: {len(feed.entries)} entries")
                
                for entry in feed.entries:
                    pub = entry.get("published_parsed") or entry.get("updated_parsed")
                    pub_dt = datetime(*pub[:6]) if pub else datetime.now()
                    if pub_dt < cutoff:
                        continue

                    results.append({
                        "source": "MEPA",
                        "source_id": entry.get("id", entry.get("link", ""))[-50:],
                        "title": entry.get("title", ""),
                        "description": entry.get("summary", ""),
                        "contracting_body": "",
                        "publication_date": pub_dt.strftime("%Y-%m-%d"),
                        "deadline_date": None,
                        "estimated_value": None,
                        "currency": "EUR",
                        "cpv_codes": [],
                        "country": "IT",
                        "region": None,
                        "url": entry.get("link", ""),
                    })
                
                if results:
                    return results  # primo RSS funzionante è sufficiente
                    
            except Exception as e:
                logger.debug(f"[MEPA] RSS {rss_url} fallito: {e}")
                continue

    return results


async def run_full_scrape(days_back: int = 7) -> list[dict]:
    """
    Prima prova RSS, poi fallback HTML.
    """
    results = await scrape_mepa_rss(days_back)
    
    if not results:
        logger.info("[MEPA] RSS non disponibile, provo HTML scraping")
        results = await scrape_mepa_html(days_back)
    
    logger.info(f"[MEPA] Totale: {len(results)} avvisi")
    return results


async def test_connection():
    try:
        results = await run_full_scrape(days_back=7)
        if results:
            print(f"✅ MEPA OK — {len(results)} avvisi")
            print(f"   Esempio: {results[0]['title'][:80]}")
        else:
            print("⚠️  MEPA: 0 risultati (RSS non disponibile, HTML non strutturato)")
            print("   → Fonte alternativa: monitorare SIMOG o Consip newsletter")
        return True
    except Exception as e:
        print(f"❌ MEPA Error: {e}")
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_connection())
