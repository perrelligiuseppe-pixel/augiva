"""
Augiva Matching Engine — il cuore del prodotto.

Livello 1: Keyword/Rule-based matching
Livello 2: Semantic matching via OpenAI embeddings (se API key disponibile)
"""

import os
import re
import sys
import logging
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


class MatchingEngine:
    """
    Motore di matching bandi–aziende.

    Calcola un punteggio 0-100 di compatibilità tra un'azienda e un bando.
    Combina regole keyword-based (sempre attive) con semantic embedding
    (solo se OPENAI_API_KEY è disponibile).
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
        """
        Confronta ATECO aziendale con CPV codes del bando.
        Se CPV codes sono vuoti, tenta di inferire dalla categoria nel titolo.
        Restituisce 0.0–1.0
        """
        ateco = str(company.get('ateco', '') or '').strip()
        if not ateco:
            return 0.0

        # Prefissi ATECO da più specifico a meno specifico
        ateco_prefixes = []
        parts = ateco.split('.')
        current = ''
        for i, part in enumerate(parts):
            current = (current + '.' + part) if current else part
            ateco_prefixes.append(current)
        ateco_prefixes.reverse()  # più specifico prima

        # CPV codes del bando
        cpv_codes = tender.get('cpv_codes') or []

        # Se non ci sono CPV, prova a inferire dalla categoria nel titolo
        inferred_cpvs = []
        title = str(tender.get('title', '') or '').lower()
        if not cpv_codes:
            inferred_cpvs = self._infer_cpv_from_title(title)

        all_cpvs = list(cpv_codes) + inferred_cpvs

        if not all_cpvs and not inferred_cpvs:
            return 0.0

        # Cerca match CPV
        best_score = 0.0
        for ateco_prefix in ateco_prefixes:
            mapped_cpvs = ATECO_TO_CPV.get(ateco_prefix, [])
            # Cerca anche prefissi parziali (es. "41" matcha "41.20")
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
                    # Match parziale
                    common = len(os.path.commonprefix([cpv_str[:4], mapped_clean[:4]]))
                    if common >= 1:
                        best_score = max(best_score, common / 4.0 * 0.7)

        return min(best_score, 1.0)

    def _infer_cpv_from_title(self, title_lower: str) -> list:
        """
        Inferisce CPV approssimativi dalla categoria nel titolo TED.
        I bandi TED hanno formato: "Italia – [Categoria] – [Titolo]"
        """
        # Mappa categoria → CPV prefix approssimativo
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
        """
        Confronta settori aziendali con testo del bando via keyword matching.
        Restituisce 0.0–1.0
        """
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

        # Bonus se il settore compare direttamente nel titolo
        for settore in settori:
            if settore.lower() in title:
                base_score = min(base_score + 0.2, 1.0)
                break

        return min(base_score, 1.0)

    def _score_geo(self, company: dict, tender: dict) -> float:
        """
        Controlla compatibilità geografica.
        Se il bando è nazionale → score pieno.
        Se il bando è regionale → controlla se l'azienda è nella regione.
        Restituisce 0.0–1.0
        """
        tender_region = tender.get('region')
        company_regione = str(company.get('regione', '') or '').strip()
        company_provincia = str(company.get('provincia', '') or '').strip()

        # Bando senza region = nazionale → ok per tutti
        if not tender_region:
            return 1.0

        # Controlla match diretto regione
        if company_regione and company_regione.lower() in str(tender_region).lower():
            return 1.0

        # Controlla via provincia
        if company_provincia:
            allowed_provinces = REGIONE_TO_PROVINCE.get(company_regione, [])
            if any(p.lower() in str(tender_region).lower() for p in allowed_provinces):
                return 0.8

        # Controlla se il titolo menziona la regione/provincia
        title = str(tender.get('title', '') or '').lower()
        if company_regione and company_regione.lower() in title:
            return 0.9
        if company_provincia and company_provincia.lower() in title:
            return 0.85

        # Bando regionale ma azienda fuori regione → penalità
        return 0.3

    def _score_value(self, company: dict, tender: dict) -> float:
        """
        Filtra bandi per valore:
        - Troppo piccolo (<5K) → score basso
        - Troppo grande (>10x fatturato) → score penalizzato
        - Nella fascia giusta → score pieno
        Restituisce 0.0–1.0
        """
        value = tender.get('estimated_value')
        fatturato = company.get('fatturato')

        # Valore non disponibile → neutro (non penalizzare)
        if value is None:
            return 0.7

        try:
            value = float(value)
        except (TypeError, ValueError):
            return 0.7

        # Troppo piccolo
        if value < self.MIN_VALUE_EUR:
            return 0.1

        # Senza fatturato → non possiamo filtrare per dimensione
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
            return 0.2   # Bando troppo grande
        elif ratio > 5:
            return 0.6   # Bando grande ma possibile
        elif ratio < 0.01:
            return 0.4   # Bando minuscolo
        else:
            return 1.0   # Nella fascia ideale

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
    # LIVELLO 2: Semantic (OpenAI Embeddings)
    # ─────────────────────────────────────────────

    def _get_embedding(self, text: str) -> Optional[list]:
        """Ottieni embedding OpenAI con cache."""
        if not self._openai_available:
            return None
        if text in self._embedding_cache:
            return self._embedding_cache[text]
        try:
            resp = self._openai_client.embeddings.create(
                model='text-embedding-3-small',
                input=text[:8000]  # limite sicuro
            )
            emb = resp.data[0].embedding
            self._embedding_cache[text] = emb
            return emb
        except Exception as e:
            logger.error(f"Errore embedding: {e}")
            return None

    def _cosine_similarity(self, v1: list, v2: list) -> float:
        """Cosine similarity tra due vettori."""
        import math
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a ** 2 for a in v1))
        norm2 = math.sqrt(sum(b ** 2 for b in v2))
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot / (norm1 * norm2)

    def _build_company_text(self, company: dict) -> str:
        parts = [
            company.get('ragione_sociale', ''),
            company.get('ateco_desc', ''),
            company.get('ateco', ''),
            ' '.join(company.get('settori', []) if isinstance(company.get('settori'), list)
                     else [str(company.get('settori', ''))]),
            company.get('descrizione', ''),
        ]
        return ' '.join(p for p in parts if p).strip()

    def _build_tender_text(self, tender: dict) -> str:
        parts = [
            tender.get('title', ''),
            tender.get('description', ''),
        ]
        return ' '.join(p for p in parts if p).strip()

    def score_tender_l2(self, company: dict, tender: dict) -> Optional[float]:
        """
        Livello 2: calcola score semantico via OpenAI embeddings.
        Restituisce score 0-100 o None se OpenAI non disponibile.
        """
        if not self._openai_available:
            return None

        company_text = self._build_company_text(company)
        tender_text = self._build_tender_text(tender)

        if not company_text or not tender_text:
            return None

        emb_company = self._get_embedding(company_text)
        emb_tender = self._get_embedding(tender_text)

        if emb_company is None or emb_tender is None:
            return None

        sim = self._cosine_similarity(emb_company, emb_tender)
        # Cosine similarity [-1, 1] → [0, 100]
        score = (sim + 1) / 2 * 100
        return round(score, 2)

    # ─────────────────────────────────────────────
    # Score finale (combina L1 + L2)
    # ─────────────────────────────────────────────

    def score_tender(self, company: dict, tender: dict) -> float:
        """
        Calcola score finale di compatibilità tra azienda e bando.
        Combina L1 (sempre) e L2 (se OpenAI disponibile).
        Restituisce float 0-100.
        """
        result_l1 = self.score_tender_l1(company, tender)
        score_l1 = result_l1['score']

        score_l2 = self.score_tender_l2(company, tender)

        if score_l2 is not None:
            # Combina: 60% semantico + 40% rule-based
            final = score_l2 * 0.6 + score_l1 * 0.4
        else:
            final = score_l1

        return round(final, 2)

    def score_tender_full(self, company: dict, tender: dict) -> dict:
        """
        Score completo con dettaglio componenti.
        """
        result_l1 = self.score_tender_l1(company, tender)
        score_l2 = self.score_tender_l2(company, tender)

        if score_l2 is not None:
            final = score_l2 * 0.6 + result_l1['score'] * 0.4
        else:
            final = result_l1['score']

        return {
            'score': round(final, 2),
            'score_l1': result_l1['score'],
            'score_l2': score_l2,
            'components_l1': result_l1['components'],
            'tender_id': tender.get('id'),
            'tender_title': tender.get('title', '')[:100],
        }

    # ─────────────────────────────────────────────
    # Match tutti i bandi per un'azienda
    # ─────────────────────────────────────────────

    def match_all(self, company_id: str = None, company: dict = None,
                  min_score: float = 10.0, limit: int = 100) -> list:
        """
        Matcha tutti i bandi nel DB per un'azienda.

        Args:
            company_id: ID azienda nel DB (usa questo OPPURE company)
            company: dict azienda (usa questo se non hai company_id)
            min_score: score minimo per includere il risultato
            limit: numero massimo di bandi da considerare

        Returns:
            Lista di dict ordinati per score decrescente
        """
        sb = self._get_supabase()

        # Carica azienda dal DB se serve
        if company is None and company_id:
            res = sb.table('companies').select('*').eq('id', company_id).single().execute()
            company = res.data
            if not company:
                raise ValueError(f"Azienda {company_id} non trovata")

        if company is None:
            raise ValueError("company_id o company dict richiesto")

        # Carica tutti i bandi
        res = sb.table('tenders').select('*').limit(limit).execute()
        tenders = res.data or []

        logger.info(f"Matching {company.get('ragione_sociale', 'N/A')} vs {len(tenders)} bandi...")

        results = []
        for tender in tenders:
            try:
                full = self.score_tender_full(company, tender)
                if full['score'] >= min_score:
                    results.append(full)
            except Exception as e:
                logger.warning(f"Errore su bando {tender.get('id')}: {e}")

        results.sort(key=lambda x: x['score'], reverse=True)
        return results

    # ─────────────────────────────────────────────
    # Salva match nel DB
    # ─────────────────────────────────────────────

    def _save_match(self, company_id: str, tender_id: str, score: float,
                    details: dict) -> None:
        """Salva o aggiorna un match nel DB."""
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

    # ─────────────────────────────────────────────
    # Batch matching: tutte le aziende nel DB
    # ─────────────────────────────────────────────

    def run_batch_matching(self, min_score: float = 15.0,
                           save_to_db: bool = True) -> dict:
        """
        Processa tutte le aziende nel DB e salva i match.

        Returns:
            dict con statistiche del batch
        """
        sb = self._get_supabase()

        # Carica aziende
        res = sb.table('companies').select('*').execute()
        companies = res.data or []

        # Carica bandi
        res = sb.table('tenders').select('*').execute()
        tenders = res.data or []

        logger.info(f"Batch matching: {len(companies)} aziende × {len(tenders)} bandi")

        stats = {
            'companies_processed': 0,
            'total_matches': 0,
            'errors': 0,
            'started_at': datetime.utcnow().isoformat(),
        }

        for company in companies:
            try:
                company_id = company.get('id')
                results = []

                for tender in tenders:
                    try:
                        full = self.score_tender_full(company, tender)
                        if full['score'] >= min_score:
                            results.append(full)
                            if save_to_db and company_id:
                                self._save_match(
                                    company_id=company_id,
                                    tender_id=tender['id'],
                                    score=full['score'],
                                    details=full
                                )
                    except Exception as e:
                        logger.warning(f"Errore bando {tender.get('id')}: {e}")
                        stats['errors'] += 1

                stats['companies_processed'] += 1
                stats['total_matches'] += len(results)
                logger.info(f"  {company.get('ragione_sociale')}: {len(results)} match")

            except Exception as e:
                logger.error(f"Errore azienda {company.get('id')}: {e}")
                stats['errors'] += 1

        stats['completed_at'] = datetime.utcnow().isoformat()
        logger.info(f"Batch completato: {stats}")
        return stats
