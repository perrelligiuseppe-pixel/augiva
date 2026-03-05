"""
Augiva — Supabase Client
Interfaccia pronta per quando arrivano le credenziali.
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    logger.warning("supabase-py non installato")


class AugivaDB:
    """
    Client Supabase per Augiva.
    Configurabile via env vars: SUPABASE_URL e SUPABASE_KEY.
    """

    def __init__(self, url: Optional[str] = None, key: Optional[str] = None):
        self.url = url or os.getenv("SUPABASE_URL")
        self.key = key or os.getenv("SUPABASE_KEY")
        self._client: Optional["Client"] = None

    @property
    def client(self) -> Optional["Client"]:
        if self._client is None:
            if not self.url or not self.key:
                logger.warning("⚠️ Supabase non configurato (mancano SUPABASE_URL/SUPABASE_KEY)")
                return None
            if not SUPABASE_AVAILABLE:
                logger.warning("⚠️ supabase-py non disponibile")
                return None
            self._client = create_client(self.url, self.key)
        return self._client

    def is_configured(self) -> bool:
        return bool(self.url and self.key and SUPABASE_AVAILABLE)

    async def upsert_tenders(self, tenders: list[dict]) -> dict:
        """
        Inserisce/aggiorna bandi nel database.
        Usa upsert su (source, source_id) per evitare duplicati.
        """
        if not self.client:
            logger.warning("Supabase non connesso — salto upsert")
            return {"inserted": 0, "error": "not_configured"}

        try:
            result = (
                self.client.table("tenders")
                .upsert(tenders, on_conflict="source,source_id")
                .execute()
            )
            count = len(result.data) if result.data else 0
            logger.info(f"✅ Upsert {count} bandi su Supabase")
            return {"inserted": count, "error": None}
        except Exception as e:
            logger.error(f"❌ Errore upsert Supabase: {e}")
            return {"inserted": 0, "error": str(e)}

    async def get_companies(self, active_only: bool = True) -> list[dict]:
        """Recupera aziende onboardate."""
        if not self.client:
            return []
        query = self.client.table("companies").select("*")
        if active_only:
            query = query.eq("active", True)
        result = query.execute()
        return result.data or []


# Singleton globale (da usare dopo configurazione env)
db = AugivaDB()
