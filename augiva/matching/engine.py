"""
Augiva Matching Engine — il cuore del prodotto.

Livello 1: Keyword/Rule-based matching
Livello 2: Semantic matching via OpenAI embeddings + pgvector
"""

import os
import re
import sys
import logging
import asyncio
import psycopg2
import psycopg2.extras
from typing import Optional
from datetime import datetime

# Path setup
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from matching.ateco_cpv_map import ATECO_TO_CPV, SECTOR_KEYWORDS, REGIONE_TO_PROVINCE

logger = logging.getLogger(__name__)


def _load_env():
    """Carica variabili d'ambiente dal file config/.env"""
    env_path = os.path.join(os.path.dirname(__file__), '..', 'config', '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, val = line.partition('=')
                    if key.strip() and not os.environ.get(key.strip()):
                        os.environ[key.strip()] = val.strip()


_load_env()


def _get_db_conn():
    """Connessione psycopg2 diretta a Supabase per pgvector."""
    return psycopg2.connect(
        host='db.izwpthubencimzsgervo.supabase.co',
        port=5432,
        dbname='postgres',
        user='postgres',
        password=os.environ.get('DB_PASSWORD', 'B7M8pzc6xIqo3ZxK'),
        sslmode='require'
    )


class MatchingEngine:
    """
    Motore di matching bandi–aziende.

    Calcola un punteggio 0-100 di compatibilità tra un'azienda e un bando.
    Combina regole keyword-based (L1, sempre attive) con semantic embedding
    pgvector (L2, solo se OPENAI_API_KEY è disponibile).
    """

    # Pesi per il calcolo dello score finale (livello 1)
    WEIGHT_CPV = 0.35
    WEIGHT_KEYWORD = 0.40
    WEIGHT_GEO = 0.10
    WEIGHT_VALUE = 0.15

    # Soglia minima valore bando
    MIN_VALUE_EUR = 5_000

    def __init__(self):
        self._supabase = None
        self._openai_client = None
        self._openai_available = False
        self._embedding_cache: dict = {}
        self._init_openai()

    def _get_supabase(self):
        if self._supabase is None:
            from supabase import create_client
            url = os.environ.get('SUPABASE_URL', '')
            key = os.environ.get('SUPABASE_SERVICE_KEY', '') or os.environ.get('SUPABASE_ANON_KEY', '')
            if not url or not key:
                raise RuntimeError("SUPABASE_URL e SUPABASE_SERVICE_KEY richiesti")
            self._supabase = create_client(url, key)
        return self._supabase

    def _init_openai(self):
        api_key = os.environ.get('OPENAI_API_KEY', '').strip()
        if api_key:
            try:
                from openai import OpenAI
                self._openai_client = OpenAI(api_key=api_key)
                self._openai_available = True
                logger.info("OpenAI disponibile — semantic matching attivo")
            except ImportError:
                logger.warning("openai package non installato — solo keyword matching")
        else:
            logger.info("OPENAI_API_KEY non configurata — solo keyword matching")

    # ─────────────────────────────────────────────
    # LIVELLO 1: Keyword / Rule-based
    # ─────────────────────────────────────────────

    def _score_cpv(self, company: dict, tender: dict) -> float:
        ateco = str(company.get('ateco', '') or '').strip()
        if not ateco:
            return 0.0

        ateco_prefixes = []
        parts = ateco.split('.')
        current = ''
        for part in parts:
            current = (current + '.' + part) if current else part
            ateco_prefixes.append(current)
        ateco_prefixes.reverse()

        cpv_codes = tender.get('cpv_codes') or []
        title = str(tender.get('title', '') or '').lower()
        inferred_cpvs = []
        if not cpv_codes:
            inferred_cpvs = self._infer_cpv_from_title(title)

        all_cpvs = list(cpv_codes) + inferred_cpvs
        if not all_cpvs:
            return 0.0

        best_score = 0.0
        for ateco_prefix in ateco_prefixes:
            mapped_cpvs = ATECO_TO_CPV.get(ateco_prefix, [])
            if not mapped_cpvs:
                for key in ATECO_TO_CPV:
                    if ateco_prefix.startswith(key) or key.startswith(ateco_prefix.split('.')[0]):
                        mapped_cpvs = ATECO_TO_CPV[key]
                        break

            for mapped in mapped_cpvs:
                mapped_clean = mapped.replace('.', '').strip()
                for cpv in all_cpvs:
                    cpv_str = str(cpv).replace('.', '').replace('-', '').strip()
                    if cpv_str.startswith(mapped_clean[:2]) or mapped_clean.startswith(cpv_str[:2]):
                        best_score = max(best_score, 1.0)
                        break
                    common = len(os.path.commonprefix([cpv_str[:4], mapped_clean[:4]]))
                    if common >= 1:
                        best_score = max(best_score, common / 4.0 * 0.7)

        return min(best_score, 1.0)

    def _infer_cpv_from_title(self, title_lower: str) -> list:
        category_cpv_map = {
            "servizi architettonici": ["71"],
            "servizi di ingegneria": ["71"],
            "servizi architettonici, di ingegneria": ["71"],
            "lavori di manutenzione stradale": ["45"],
            "lavori edili": ["45"],
            "costruzione": ["45"],
            "servizi informatici": ["72"],
            "servizi connessi al software": ["72"],
            "software": ["72", "48"],
            "piattaforme informatiche": ["72", "48"],
            "servizi di pulizia": ["90"],
            "servizi di raccolta di rifiuti": ["90"],
            "servizi assicurativi": ["66"],
            "servizi di mensa": ["55"],
            "servizi di catering": ["55"],
            "servizi di istruzione": ["80"],
            "servizi sanitari": ["85"],
            "dispositivi medici": ["33"],
            "servizi di ambulanza": ["85"],
            "servizi amministrativi in campo sanitario": ["85"],
            "servizi di riparazione e manutenzione": ["50"],
            "servizi di piantagione": ["77"],
            "servizi cimiteriali": ["98"],
            "servizi di programmazione di software": ["72", "48"],
            "servizi di soccorso": ["50"],
            "servizi di trasporto": ["60"],
            "veicoli": ["34"],
            "attrezzature ferroviarie": ["34.9"],
            "servizi di consulenza": ["79"],
            "servizi di gestione": ["79"],
            "servizi di organismi di riscossione": ["75"],
            "servizi di assistenza sociale": ["85.3"],
            "servizi di manutenzione": ["50"],
        }
        inferred = []
        for cat_key, cpvs in category_cpv_map.items():
            if cat_key in title_lower:
                inferred.extend(cpvs)
        return inferred

    def _score_keywords(self, company: dict, tender: dict) -> float:
        settori = company.get('settori') or []
        if isinstance(settori, str):
            settori = [s.strip() for s in settori.split(',')]

        title = str(tender.get('title', '') or '').lower()
        description = str(tender.get('description', '') or '').lower()
        full_text = f"{title} {description}"

        if not settori or not full_text.strip():
            return 0.0

        match_count = 0
        total_weight = 0

        for settore in settori:
            settore_lower = settore.lower().strip()
            keywords = SECTOR_KEYWORDS.get(settore_lower, [settore_lower])
            for kw in keywords:
                if kw.lower() in full_text:
                    match_count += 1
                    break
            total_weight += 1

        if total_weight == 0:
            return 0.0

        base_score = match_count / total_weight

        for settore in settori:
            if settore.lower() in title:
                base_score = min(base_score + 0.2, 1.0)
                break

        return min(base_score, 1.0)

    def _score_geo(self, company: dict, tender: dict) -> float:
        tender_region = tender.get('region')
        company_regione = str(company.get('regione', '') or '').strip()
        company_provincia = str(company.get('provincia', '') or '').strip()

        if not tender_region:
            return 1.0

        if company_regione and company_regione.lower() in str(tender_region).lower():
            return 1.0

        if company_provincia:
            allowed_provinces = REGIONE_TO_PROVINCE.get(company_regione, [])
            if any(p.lower() in str(tender_region).lower() for p in allowed_provinces):
                return 0.8

        title = str(tender.get('title', '') or '').lower()
        if company_regione and company_regione.lower() in title:
            return 0.9
        if company_provincia and company_provincia.lower() in title:
            return 0.85

        return 0.3

    def _score_value(self, company: dict, tender: dict) -> float:
        value = tender.get('estimated_value')
        fatturato = company.get('fatturato')

        if value is None:
            return 0.7

        try:
            value = float(value)
        except (TypeError, ValueError):
            return 0.7

        if value < self.MIN_VALUE_EUR:
            return 0.1

        if not fatturato:
            return 0.8

        try:
            fatturato = float(fatturato)
        except (TypeError, ValueError):
            return 0.8

        if fatturato <= 0:
            return 0.7

        ratio = value / fatturato

        if ratio > 10:
            return 0.2
        elif ratio > 5:
            return 0.6
        elif ratio < 0.01:
            return 0.4
        else:
            return 1.0

    def score_tender_l1(self, company: dict, tender: dict) -> dict:
        """
        Livello 1: calcola score keyword/rule-based.
        Restituisce dict con score totale e dettaglio componenti.
        """
        s_cpv = self._score_cpv(company, tender)
        s_kw = self._score_keywords(company, tender)
        s_geo = self._score_geo(company, tender)
        s_val = self._score_value(company, tender)

        total = (
            s_cpv * self.WEIGHT_CPV +
            s_kw * self.WEIGHT_KEYWORD +
            s_geo * self.WEIGHT_GEO +
            s_val * self.WEIGHT_VALUE
        )

        return {
            'score': round(total * 100, 2),
            'components': {
                'cpv': round(s_cpv * 100, 1),
                'keyword': round(s_kw * 100, 1),
                'geo': round(s_geo * 100, 1),
                'value': round(s_val * 100, 1),
            }
        }

    # ─────────────────────────────────────────────
    # LIVELLO 2: Semantic via OpenAI + pgvector
    # ─────────────────────────────────────────────

    def _build_company_profile_text(self, company: dict) -> str:
        """
        Costruisce testo descrittivo dell'azienda per embedding L2.
        Formato: "{ragione_sociale} {ateco_desc} {settori_joined} {regione}"
        """
        settori = company.get('settori') or []
        if isinstance(settori, str):
            settori = [s.strip() for s in settori.split(',')]
        settori_joined = ' '.join(settori)

        parts = [
            company.get('ragione_sociale', ''),
            company.get('ateco_desc', ''),
            settori_joined,
            company.get('regione', ''),
        ]
        return ' '.join(p for p in parts if p).strip()

    def _get_embedding(self, text: str) -> Optional[list]:
        """Ottieni embedding OpenAI con cache."""
        if not self._openai_available:
            return None
        if text in self._embedding_cache:
            return self._embedding_cache[text]
        try:
            resp = self._openai_client.embeddings.create(
                model='text-embedding-3-small',
                input=text[:8000]
            )
            emb = resp.data[0].embedding
            self._embedding_cache[text] = emb
            return emb
        except Exception as e:
            logger.error(f"Errore embedding: {e}")
            return None

    def score_tender_l2_pgvector(self, company: dict, top_k: int = 20) -> list:
        """
        Livello 2 — pgvector native query.

        Genera embedding del profilo aziendale, poi query pgvector su Supabase
        per ottenere i top-k bandi semanticamente più simili.

        Returns:
            Lista di dict: {id, title, similarity (0-1), score_l2 (0-100)}
        """
        if not self._openai_available:
            logger.warning("OpenAI non disponibile — L2 pgvector disabilitato")
            return []

        company_text = self._build_company_profile_text(company)
        if not company_text:
            return []

        company_vec = self._get_embedding(company_text)
        if company_vec is None:
            return []

        # Formatta il vettore come stringa pgvector: [0.1, 0.2, ...]
        vec_str = '[' + ','.join(str(x) for x in company_vec) + ']'

        try:
            conn = _get_db_conn()
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

            query = """
                SELECT
                    id,
                    title,
                    description,
                    cpv_codes,
                    region,
                    estimated_value,
                    1 - (embedding <=> %s::vector) AS similarity
                FROM tenders
                WHERE embedding IS NOT NULL
                ORDER BY similarity DESC
                LIMIT %s
            """
            cur.execute(query, (vec_str, top_k))
            rows = cur.fetchall()
            conn.close()

            results = []
            for row in rows:
                sim = float(row['similarity'])
                # Cosine similarity [−1, 1] → score [0, 100]
                score_l2 = round((sim + 1) / 2 * 100, 2)
                results.append({
                    'id': row['id'],
                    'title': row['title'],
                    'description': row.get('description'),
                    'cpv_codes': row.get('cpv_codes'),
                    'region': row.get('region'),
                    'estimated_value': row.get('estimated_value'),
                    'similarity': round(sim, 4),
                    'score_l2': score_l2,
                })

            return results

        except Exception as e:
            logger.error(f"Errore pgvector query: {e}")
            return []

    # ─────────────────────────────────────────────
    # Score finale combinato (L1 + L2)
    # ─────────────────────────────────────────────

    def score_tender(self, company: dict, tender: dict,
                     semantic_score: Optional[float] = None) -> float:
        """
        Calcola score finale combinando L1 (rule-based) e L2 (semantico).

        Pesi: 40% L1 + 60% L2 (se semantic_score fornito)
        Se semantic_score è None: usa solo L1.

        Args:
            company: dict azienda
            tender: dict bando
            semantic_score: score L2 (0-100), se già calcolato via pgvector

        Returns:
            float 0-100
        """
        result_l1 = self.score_tender_l1(company, tender)
        l1 = result_l1['score']

        if semantic_score is not None:
            return round(l1 * 0.4 + semantic_score * 0.6, 1)
        return l1

    def score_tender_full(self, company: dict, tender: dict,
                          semantic_score: Optional[float] = None) -> dict:
        """
        Score completo con dettaglio componenti.
        """
        result_l1 = self.score_tender_l1(company, tender)
        l1 = result_l1['score']

        if semantic_score is not None:
            final = round(l1 * 0.4 + semantic_score * 0.6, 1)
        else:
            final = l1

        return {
            'score': final,
            'score_l1': l1,
            'score_l2': semantic_score,
            'components_l1': result_l1['components'],
            'tender_id': tender.get('id'),
            'tender_title': tender.get('title', '')[:100],
        }

    # ─────────────────────────────────────────────
    # match_all() — L1 + L2 combinato via pgvector
    # ─────────────────────────────────────────────

    async def match_all(self, company: dict) -> list:
        """
        Matcha un'azienda contro tutti i bandi usando L1 + L2 pgvector.

        Steps:
          1. Genera embedding profilo aziendale
          2. Query pgvector → top-20 semantici
          3. Per ognuno: calcola score combinato L1 + L2
          4. Filtra: score finale >= 60
          5. Ritorna lista ordinata per score desc

        Returns:
            Lista di dict con score dettagliato, ordinata per score desc
        """
        logger.info(f"match_all() per {company.get('ragione_sociale', 'N/A')}")

        # Step 1 + 2: embedding + pgvector top-20
        semantic_results = self.score_tender_l2_pgvector(company, top_k=20)

        if not semantic_results:
            logger.warning("Nessun risultato semantico — fallback L1 su tutti i bandi")
            # Fallback: carica tutti i bandi e usa solo L1
            sb = self._get_supabase()
            res = sb.table('tenders').select('*').execute()
            tenders = res.data or []
            results = []
            for tender in tenders:
                full = self.score_tender_full(company, tender)
                if full['score'] >= 60:
                    results.append(full)
            results.sort(key=lambda x: x['score'], reverse=True)
            return results

        # Step 3: calcola score combinato L1+L2 per ogni risultato semantico
        results = []
        for sem in semantic_results:
            tender = {
                'id': sem['id'],
                'title': sem['title'],
                'description': sem.get('description'),
                'cpv_codes': sem.get('cpv_codes'),
                'region': sem.get('region'),
                'estimated_value': sem.get('estimated_value'),
            }
            score_l2 = sem['score_l2']
            full = self.score_tender_full(company, tender, semantic_score=score_l2)
            full['similarity'] = sem['similarity']
            results.append(full)

        # Step 4: filtra score >= 60
        results = [r for r in results if r['score'] >= 60]

        # Step 5: ordina per score desc
        results.sort(key=lambda x: x['score'], reverse=True)
        return results

    def match_all_sync(self, company: dict) -> list:
        """Versione sincrona di match_all()."""
        return asyncio.run(self.match_all(company))

    # ─────────────────────────────────────────────
    # run_batch_matching() — tutte le aziende
    # ─────────────────────────────────────────────

    def run_batch_matching(self, min_score: float = 60.0,
                           save_to_db: bool = True) -> dict:
        """
        Processa tutte le aziende nel DB con match_all() e salva i risultati.

        Salva in tabella `matches` (company_id, tender_id, score)
        con ON CONFLICT DO UPDATE.

        Returns:
            dict con statistiche del batch
        """
        sb = self._get_supabase()

        res = sb.table('companies').select('*').execute()
        companies = res.data or []

        logger.info(f"Batch matching: {len(companies)} aziende con L1+L2 pgvector")

        stats = {
            'companies_processed': 0,
            'total_matches': 0,
            'errors': 0,
            'started_at': datetime.utcnow().isoformat(),
        }

        for company in companies:
            try:
                company_id = company.get('id')
                results = asyncio.run(self.match_all(company))

                if save_to_db and company_id:
                    for match in results:
                        if match['score'] >= min_score:
                            self._save_match(
                                company_id=company_id,
                                tender_id=match['tender_id'],
                                score=match['score'],
                                details=match
                            )

                stats['companies_processed'] += 1
                stats['total_matches'] += len(results)
                logger.info(f"  {company.get('ragione_sociale')}: {len(results)} match ≥{min_score}")

            except Exception as e:
                logger.error(f"Errore azienda {company.get('id')}: {e}")
                stats['errors'] += 1

        stats['completed_at'] = datetime.utcnow().isoformat()
        logger.info(f"Batch completato: {stats}")
        return stats

    def _save_match(self, company_id: str, tender_id: str, score: float,
                    details: dict) -> None:
        """Salva o aggiorna un match nel DB (ON CONFLICT DO UPDATE)."""
        try:
            sb = self._get_supabase()
            sb.table('matches').upsert({
                'company_id': company_id,
                'tender_id': tender_id,
                'score': score,
                'details': details,
                'updated_at': datetime.utcnow().isoformat(),
            }, on_conflict='company_id,tender_id').execute()
        except Exception as e:
            logger.error(f"Errore salvataggio match: {e}")
