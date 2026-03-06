#!/usr/bin/env python3
"""
Augiva Matching Daemon
Gira in background su Hetzner. Ogni 60 secondi controlla se ci sono
nuove aziende con status='pending' e avvia il matching.

Ciclo:
  1. Legge companies con status='pending' da Supabase
  2. Per ogni azienda → genera embedding profilo (OpenAI)
  3. Lancia match_all() → L1 keyword + L2 pgvector
  4. Salva risultati in matches
  5. Aggiorna status='active'
  6. Dorme 60s e ripete
"""

import os
import sys
import time
import logging
import asyncio
import psycopg2
import psycopg2.extras
from datetime import datetime

# Path setup
sys.path.insert(0, os.path.dirname(__file__))
from matching.engine import MatchingEngine, _load_env, _get_db_conn

_load_env()

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/var/log/augiva-daemon.log', mode='a'),
    ]
)
logger = logging.getLogger('augiva.daemon')

POLL_INTERVAL = 60  # secondi tra un ciclo e l'altro


def get_pending_companies(conn) -> list[dict]:
    """Legge aziende con status='pending'."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT id, ragione_sociale, piva, ateco, settori, regione, zone_operative
            FROM companies
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT 10
        """)
        return [dict(r) for r in cur.fetchall()]


def set_status(conn, company_id: str, status: str):
    """Aggiorna lo status di un'azienda."""
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE companies SET status = %s, updated_at = NOW() WHERE id = %s",
            (status, company_id)
        )
    conn.commit()


def set_processing(conn, company_id: str):
    """Marca come 'processing' per evitare doppi run."""
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE companies SET status = 'processing', updated_at = NOW() WHERE id = %s AND status = 'pending'",
            (company_id,)
        )
        updated = cur.rowcount
    conn.commit()
    return updated > 0  # False se già presa da altro processo


def save_matches(conn, company_id: str, matches: list[dict]):
    """Salva i match nel DB (upsert su company_id + tender_id)."""
    if not matches:
        return
    with conn.cursor() as cur:
        for m in matches:
            cur.execute("""
                INSERT INTO matches (company_id, tender_id, score, score_l1, score_l2, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT (company_id, tender_id)
                DO UPDATE SET score = EXCLUDED.score, score_l1 = EXCLUDED.score_l1,
                              score_l2 = EXCLUDED.score_l2, updated_at = NOW()
            """, (
                company_id,
                m.get('tender_id'),
                m.get('score_final', 0),
                m.get('score_l1', 0),
                m.get('score_l2', 0),
            ))
    conn.commit()
    logger.info(f"  💾 Salvati {len(matches)} match")


async def process_company(engine: MatchingEngine, conn, company: dict):
    """Esegue il matching completo per una singola azienda."""
    cid = str(company['id'])
    name = company.get('ragione_sociale', cid)

    # Tenta di prendere il lock (status pending → processing)
    if not set_processing(conn, cid):
        logger.info(f"  ⏭️  {name} già in processing — skip")
        return

    logger.info(f"  🔄 Processing: {name} (ATECO: {company.get('ateco','?')})")

    try:
        matches = await engine.match_all(company)
        save_matches(conn, cid, matches)
        set_status(conn, cid, 'active')
        logger.info(f"  ✅ {name} → {len(matches)} opportunità trovate → status=active")
    except Exception as e:
        logger.error(f"  ❌ Errore su {name}: {e}")
        set_status(conn, cid, 'error')


async def run_cycle(engine: MatchingEngine, conn):
    """Un ciclo completo: leggi pending → processa → aggiorna."""
    companies = get_pending_companies(conn)
    if not companies:
        return  # nulla da fare

    logger.info(f"🔍 Trovate {len(companies)} aziende pending")
    for company in companies:
        await process_company(engine, conn, company)


async def main():
    logger.info("=" * 60)
    logger.info("🚀 Augiva Matching Daemon avviato")
    logger.info(f"   Poll interval: {POLL_INTERVAL}s")
    logger.info(f"   DB: db.izwpthubencimzsgervo.supabase.co")
    logger.info("=" * 60)

    engine = MatchingEngine()

    while True:
        try:
            conn = _get_db_conn()
            try:
                await run_cycle(engine, conn)
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"❌ Errore ciclo daemon: {e}")

        await asyncio.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    asyncio.run(main())
