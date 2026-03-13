"""
Augiva Precompiler — motore di pre-compilazione documenti bandi PA

Flusso per ogni job:
  1. Fetch dati bando + azienda da DB
  2. Analisi profonda bando (re-fetch URL + Claude Sonnet)
  3. Gap analysis: documenti richiesti vs profilo azienda
  4. Generazione bozze documenti (Claude Sonnet)
  5. Genera PDF con reportlab
  6. Upload PDF su Supabase Storage
  7. Salva risultati in precompile_documents + precompile_checklist
"""

import os
import sys
import json
import time
import logging
import asyncio
import re
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

import httpx
import psycopg2
import psycopg2.extras

sys.path.insert(0, os.path.dirname(__file__))
from matching.engine import _load_env, _get_db_conn

_load_env()

logger = logging.getLogger('augiva.precompiler')

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '') or os.environ.get('SUPABASE_ANON_KEY', '')

# ─── Template dichiarazioni standard PA ─────────────────────────────────────

TEMPLATES = {
    "dichiarazione_de_minimis": """
DICHIARAZIONE DE MINIMIS
(ai sensi del Regolamento UE n. 1407/2013)

Il/La sottoscritto/a {nome_legale_rappresentante}, nato/a il {data_nascita} a {luogo_nascita},
in qualità di legale rappresentante della {forma_giuridica} {ragione_sociale},
con sede in {comune}, P.IVA {piva}, C.F. {codice_fiscale},

DICHIARA

che nell'arco degli ultimi tre esercizi finanziari ({anno1}, {anno2}, {anno3}),
la propria impresa ha beneficiato dei seguenti aiuti "de minimis":

□ Nessun aiuto de minimis ricevuto
□ Aiuti de minimis ricevuti per un importo complessivo di € ___________
  (specificare ente erogatore e importo per ciascun aiuto ricevuto)

L'impresa è consapevole che l'importo totale degli aiuti de minimis concessi
non può superare € 300.000 nell'arco di tre esercizi finanziari.

{comune_sede}, {data}

Firma del Legale Rappresentante
_______________________________
{ragione_sociale}
""",

    "dichiarazione_sostitutiva": """
DICHIARAZIONE SOSTITUTIVA DELL'ATTO DI NOTORIETÀ
(Art. 47 D.P.R. 28 dicembre 2000, n. 445)

Il/La sottoscritto/a _____________________________, nato/a il _________ a _______________,
in qualità di legale rappresentante di:

Ragione Sociale: {ragione_sociale}
Forma giuridica: {forma_giuridica}
Sede legale: {indirizzo_sede}
P.IVA: {piva}
PEC: {pec}
ATECO: {ateco} - {ateco_desc}
Numero dipendenti: {dipendenti}
Fatturato ultimo anno: € {fatturato}

consapevole delle sanzioni penali previste dall'art. 76 del D.P.R. 445/2000,

DICHIARA

1. Che la società è regolarmente iscritta al Registro delle Imprese della Camera di Commercio
   di _____________ al n. _____________;
2. Che la società non si trova in stato di liquidazione, fallimento, concordato preventivo,
   o qualsiasi altra procedura concorsuale;
3. Che la società è in regola con gli obblighi contributivi (INPS, INAIL) e fiscali;
4. Che la società non ha riportato condanne penali definitive per reati che escludono
   la partecipazione a procedure di evidenza pubblica;
5. Che le informazioni fornite nel presente modulo e negli allegati sono veritiere e complete.

{comune_sede}, {data}

Firma del Legale Rappresentante
_______________________________
(allegare copia documento d'identità)
""",

    "lettera_accompagnamento": """
{comune_sede}, {data}

Spett.le
{ente_destinatario}

OGGETTO: Domanda di partecipazione — {titolo_bando}

La {ragione_sociale}, con sede legale in {indirizzo_sede}, P.IVA {piva},
rappresentata dal/dalla {nome_legale_rappresentante} in qualità di Legale Rappresentante,

PRESENTA DOMANDA DI PARTECIPAZIONE

al bando "{titolo_bando}" pubblicato da {ente_erogatore}.

L'impresa opera nel settore {settore_attivita} (ATECO {ateco} — {ateco_desc})
{riga_dimensione}

Si allega alla presente domanda la documentazione richiesta dal bando.

Si rimane a disposizione per qualsiasi ulteriore informazione o chiarimento.

Distinti saluti,

_______________________________
{nome_legale_rappresentante}
Legale Rappresentante
{ragione_sociale}
PEC: {pec}
""",
}

# ─── Helpers ────────────────────────────────────────────────────────────────

def call_claude(prompt: str, model: str = "claude-sonnet-4-6", max_tokens: int = 4000) -> Optional[str]:
    """Chiamata sincrona a Claude via API Anthropic."""
    import urllib.request
    import urllib.error

    payload = json.dumps({
        "model": model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
            return data["content"][0]["text"]
    except Exception as e:
        logger.error(f"Claude error: {e}")
        return None


async def fetch_url(url: str, timeout: int = 20) -> Optional[str]:
    """Fetch asincrono di una URL."""
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            headers = {"User-Agent": "Mozilla/5.0 (compatible; AugivaBot/1.0; +https://augiva.com)"}
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.text
    except Exception as e:
        logger.warning(f"Fetch fallito {url}: {e}")
    return None


def clean_text(html: str, max_chars: int = 8000) -> str:
    """Rimuove HTML tags e limita il testo."""
    text = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', ' ', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:max_chars]


def get_today_str() -> str:
    return datetime.now().strftime('%d/%m/%Y')


def get_year_range() -> tuple:
    y = datetime.now().year
    return str(y-2), str(y-1), str(y)


# ─── Precompiler ────────────────────────────────────────────────────────────

class Precompiler:

    def __init__(self):
        self.conn = _get_db_conn()

    def update_job_status(self, job_id: str, status: str, step: str = None, error: str = None):
        with self.conn.cursor() as cur:
            cur.execute(
                "UPDATE precompile_jobs SET status=%s, progress_step=%s, error_message=%s, "
                "completed_at=CASE WHEN %s IN ('complete','error') THEN NOW() ELSE NULL END "
                "WHERE id=%s",
                (status, step, error, status, job_id)
            )
        self.conn.commit()

    def get_tender(self, tender_id: str) -> Optional[dict]:
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM tenders WHERE id=%s", (tender_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def get_company(self, company_id: str) -> Optional[dict]:
        with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM companies WHERE id=%s", (company_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def save_checklist(self, job_id: str, items: List[dict]):
        with self.conn.cursor() as cur:
            cur.execute("DELETE FROM precompile_checklist WHERE job_id=%s", (job_id,))
            for i, item in enumerate(items):
                cur.execute(
                    "INSERT INTO precompile_checklist (job_id, item, category, notes, sort_order) "
                    "VALUES (%s, %s, %s, %s, %s)",
                    (job_id, item['item'], item['category'], item.get('notes', ''), i)
                )
        self.conn.commit()

    def save_document(self, job_id: str, name: str, category: str, status: str,
                      content_html: str = None, file_url: str = None,
                      download_url: str = None, notes: str = None, sort_order: int = 0):
        with self.conn.cursor() as cur:
            cur.execute(
                "INSERT INTO precompile_documents "
                "(job_id, name, category, status, content_html, file_url, download_url, notes, sort_order) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (job_id, name, category, status, content_html, file_url, download_url, notes, sort_order)
            )
        self.conn.commit()

    def upload_pdf_to_supabase(self, pdf_bytes: bytes, filename: str) -> Optional[str]:
        """Upload PDF su Supabase Storage, ritorna URL pubblico."""
        try:
            from supabase import create_client
            sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
            path = f"precompile/{filename}"
            sb.storage.from_("company-docs").upload(
                path, pdf_bytes,
                file_options={"content-type": "application/pdf", "upsert": "true"}
            )
            return sb.storage.from_("company-docs").get_public_url(path)
        except Exception as e:
            logger.error(f"Upload PDF fallito: {e}")
            return None

    def generate_pdf(self, title: str, content: str, company: dict) -> bytes:
        """Genera PDF professionale con reportlab."""
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
        import io

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=A4,
            leftMargin=2.5*cm, rightMargin=2.5*cm,
            topMargin=2.5*cm, bottomMargin=2.5*cm
        )

        styles = getSampleStyleSheet()
        style_title = ParagraphStyle('Title', fontSize=14, fontName='Helvetica-Bold',
                                     spaceAfter=6, textColor=colors.HexColor('#1D1D1F'))
        style_subtitle = ParagraphStyle('Sub', fontSize=10, fontName='Helvetica',
                                        spaceAfter=12, textColor=colors.HexColor('#6E6E73'))
        style_body = ParagraphStyle('Body', fontSize=10, fontName='Helvetica',
                                    leading=16, spaceAfter=8,
                                    textColor=colors.HexColor('#1D1D1F'))
        style_label = ParagraphStyle('Label', fontSize=8, fontName='Helvetica-Bold',
                                     textColor=colors.HexColor('#6E6E73'),
                                     spaceBefore=6, spaceAfter=2)

        story = []

        # Header
        story.append(Paragraph(title, style_title))
        story.append(Paragraph(
            f"Documento generato automaticamente — {company.get('ragione_sociale','')} — {get_today_str()}",
            style_subtitle
        ))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E5E5EA'), spaceAfter=16))

        # Contenuto: ogni riga diventa paragrafo
        for line in content.split('\n'):
            line = line.strip()
            if not line:
                story.append(Spacer(1, 4))
                continue
            if line.isupper() and len(line) > 4:
                story.append(Paragraph(line, style_label))
            else:
                # Escape caratteri speciali per reportlab
                line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                story.append(Paragraph(line, style_body))

        # Footer
        story.append(Spacer(1, 20))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E5E5EA')))
        story.append(Paragraph(
            "Bozza generata da Augiva.com · Verificare, completare, firmare e inviare personalmente.",
            ParagraphStyle('Footer', fontSize=7, textColor=colors.HexColor('#A1A1AA'), spaceBefore=6)
        ))

        doc.build(story)
        return buf.getvalue()

    async def analyze_tender_deep(self, tender: dict) -> dict:
        """
        Analisi profonda del bando con Claude:
        - Re-fetch HTML dalla URL originale
        - Estrae lista completa documenti richiesti
        - Trova link a moduli ufficiali da scaricare
        - Identifica dichiarazioni necessarie
        """
        url = tender.get('url', '')
        title = tender.get('title', '')
        tipo = tender.get('tipo', 'appalto')
        description = tender.get('description', '')
        docs_from_enricher = tender.get('documenti_richiesti') or []

        # Fetch HTML fresco
        html = await fetch_url(url) if url else None
        text = clean_text(html) if html else description[:3000]

        prompt = f"""Sei un esperto di bandi pubblici italiani ed europei.
Analizza attentamente questo bando e restituisci SOLO un JSON valido con questa struttura:

{{
  "documenti_obbligatori": [
    {{"nome": "...", "tipo": "dichiarazione|modulo|documento_aziendale|piano|preventivo", "note": "..."}}
  ],
  "dichiarazioni_necessarie": ["de_minimis", "sostitutiva", "antimafia", "assenza_aiuti_stato"],
  "moduli_scaricabili": [
    {{"nome": "...", "url_probabile": "..."}}
  ],
  "modalita_invio": "PEC|sportello|portale_online|posta|misto|non_specificato",
  "indirizzo_invio": "...",
  "piano_richiesto": true/false,
  "preventivi_richiesti": true/false,
  "note_importanti": "..."
}}

Regole:
- documenti_obbligatori: tutti i doc richiesti per presentare la domanda
- dichiarazioni_necessarie: SOLO quelli che conosci essere richiesti da questo tipo di bando
- moduli_scaricabili: cerca nel testo link a PDF allegati, moduli, allegati A/B/C
- piano_richiesto: true se richiede business plan o piano investimenti
- preventivi_richiesti: true se richiede preventivi di spesa
- Risposta: SOLO JSON, zero testo

TIPO BANDO: {tipo}
TITOLO: {title[:200]}
TESTO: {text[:5000]}"""

        result = call_claude(prompt, max_tokens=2000)

        if result:
            try:
                # Estrai solo il JSON
                json_match = re.search(r'\{.*\}', result, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group())
                    return data
            except json.JSONDecodeError:
                logger.warning("Claude: JSON non valido nell'analisi bando")

        # Fallback: usa dati enricher + defaults
        return {
            "documenti_obbligatori": [{"nome": d, "tipo": "documento_aziendale", "note": ""} for d in docs_from_enricher],
            "dichiarazioni_necessarie": ["sostitutiva"],
            "moduli_scaricabili": [],
            "modalita_invio": "non_specificato",
            "indirizzo_invio": "",
            "piano_richiesto": tipo == "fondo",
            "preventivi_richiesti": False,
            "note_importanti": ""
        }

    def gap_analysis(self, analysis: dict, company: dict) -> List[dict]:
        """
        Incrocia documenti richiesti con profilo azienda.
        Ritorna checklist con status per ogni documento.
        """
        checklist = []
        company_docs = company.get('documenti_ids') or []
        has_visura = any('visura' in str(d).lower() for d in company_docs)
        has_durc = any('durc' in str(d).lower() for d in company_docs)
        has_bilancio = any('bilancio' in str(d).lower() for d in company_docs)

        # Documenti aziendali standard
        aziendali = {
            "Visura camerale": has_visura,
            "DURC (regolarità contributiva)": has_durc,
            "Bilancio / Dichiarazione redditi": has_bilancio,
        }
        for nome, presente in aziendali.items():
            checklist.append({
                "item": nome,
                "category": "ready" if presente else "missing",
                "notes": "Già caricata nel profilo ✓" if presente else "Da caricare nel profilo o allegare separatamente"
            })

        # Documenti obbligatori dal bando
        for doc in analysis.get('documenti_obbligatori', []):
            nome = doc.get('nome', '')
            tipo = doc.get('tipo', '')
            note = doc.get('note', '')

            if tipo in ('dichiarazione', 'modulo') or 'domanda' in nome.lower() or 'dichiarazione' in nome.lower():
                cat = 'generated'
                note_out = 'Generiamo noi la bozza ✨'
            elif tipo == 'documento_aziendale':
                # Controlla se già in profilo
                nome_lower = nome.lower()
                if 'visura' in nome_lower:
                    cat = 'ready' if has_visura else 'missing'
                    note_out = 'Già caricata ✓' if has_visura else 'Da procurarsi'
                elif 'durc' in nome_lower:
                    cat = 'ready' if has_durc else 'missing'
                    note_out = 'Già caricato ✓' if has_durc else 'Da richiedere all\'INPS'
                elif 'bilancio' in nome_lower:
                    cat = 'ready' if has_bilancio else 'missing'
                    note_out = 'Già caricato ✓' if has_bilancio else 'Da allegare'
                else:
                    cat = 'missing'
                    note_out = note or 'Da procurarsi'
            elif tipo in ('piano', 'business plan'):
                cat = 'generated'
                note_out = 'Generiamo noi la bozza ✨'
            elif tipo == 'preventivo':
                cat = 'missing'
                note_out = 'Da richiedere ai fornitori previsti'
            else:
                # Documenti tecnici specifici → il cliente li deve preparare
                CLIENT_DOCS = [
                    'offerta tecnica', 'offerta economica', 'offerta', 'progetto tecnico',
                    'relazione tecnica', 'piano tecnico', 'proposta tecnica',
                    'referenze', 'referenza', 'servizi analoghi', 'esperienze analoghe',
                    'curriculum', 'cv', 'cauzione', 'garanzia provvisoria', 'fideiussione',
                    'polizza', 'iscrizione albo', 'iscrizione ccia', 'attestazione soa',
                    'certificazione iso', 'certificato qualità', 'certificazione',
                ]
                nome_lower = nome.lower()
                if any(kw in nome_lower for kw in CLIENT_DOCS):
                    cat = 'client_specific'
                    note_out = 'Da preparare in autonomia con i dati del tuo progetto'
                else:
                    cat = 'missing'
                    note_out = note or 'Da procurarsi'

            # Evita duplicati con quelli già in aziendali
            if not any(c['item'] == nome for c in checklist):
                checklist.append({"item": nome, "category": cat, "notes": note_out})

        # Dichiarazioni standard
        for dich in analysis.get('dichiarazioni_necessarie', []):
            label = {
                'de_minimis': 'Dichiarazione de minimis',
                'sostitutiva': 'Dichiarazione sostitutiva',
                'antimafia': 'Documentazione antimafia',
                'assenza_aiuti_stato': 'Dichiarazione assenza aiuti di Stato',
            }.get(dich, dich)
            if not any(c['item'] == label for c in checklist):
                checklist.append({
                    "item": label,
                    "category": "generated",
                    "notes": "Generiamo noi la bozza ✨"
                })

        # Moduli ufficiali da scaricare
        for modulo in analysis.get('moduli_scaricabili', []):
            checklist.append({
                "item": modulo.get('nome', 'Modulo ufficiale'),
                "category": "download",
                "notes": f"Scarica dal sito del bando: {modulo.get('url_probabile', '')}"
            })

        # Piano e preventivi
        if analysis.get('piano_richiesto'):
            if not any('piano' in c['item'].lower() or 'business' in c['item'].lower() for c in checklist):
                checklist.append({
                    "item": "Piano aziendale / Business plan",
                    "category": "generated",
                    "notes": "Generiamo noi la bozza con i tuoi dati ✨"
                })

        if analysis.get('preventivi_richiesti'):
            checklist.append({
                "item": "Preventivi di spesa",
                "category": "missing",
                "notes": "Da richiedere ai fornitori per gli investimenti previsti"
            })

        return checklist

    def fill_template(self, template_key: str, company: dict, tender: dict) -> str:
        """Compila un template dichiarazione con dati azienda."""
        y1, y2, y3 = get_year_range()
        today = get_today_str()
        regione = company.get('regione', '')
        comune_sede = company.get('provincia') or regione or 'Italia'
        dipendenti = company.get('dipendenti') or '___'
        fatturato = company.get('fatturato') or '___'

        vars_map = {
            '{ragione_sociale}': company.get('ragione_sociale', '___'),
            '{piva}': company.get('piva') or company.get('p_iva', '___'),
            '{pec}': company.get('pec', '___'),
            '{ateco}': company.get('ateco', '___'),
            '{ateco_desc}': company.get('ateco_desc', '___'),
            '{forma_giuridica}': company.get('forma_giuridica', '___'),
            '{indirizzo_sede}': f"{comune_sede}",
            '{comune_sede}': comune_sede,
            '{data}': today,
            '{anno1}': y1, '{anno2}': y2, '{anno3}': y3,
            '{nome_legale_rappresentante}': '___________________________',
            '{data_nascita}': '___/___/______',
            '{luogo_nascita}': '_______________',
            '{codice_fiscale}': '_______________',
            '{dipendenti}': str(dipendenti),
            '{fatturato}': str(fatturato),
            '{titolo_bando}': tender.get('title', tender.get('titolo', ''))[:100],
            '{ente_erogatore}': tender.get('ente') or tender.get('contracting_body', '___'),
            '{ente_destinatario}': tender.get('ente') or tender.get('contracting_body', '___'),
            '{settore_attivita}': company.get('ateco_desc') or company.get('ateco', '___'),
        }

        # Riga dimensione
        dim_parts = []
        if dipendenti and str(dipendenti) != '___':
            dim_parts.append(f"con {dipendenti} dipendenti")
        if fatturato and str(fatturato) != '___':
            dim_parts.append(f"e un fatturato di € {fatturato}")
        vars_map['{riga_dimensione}'] = ', '.join(dim_parts) + '.' if dim_parts else ''

        tpl = TEMPLATES.get(template_key, '')
        for k, v in vars_map.items():
            tpl = tpl.replace(k, str(v) if v else '___')
        return tpl

    async def generate_ai_document(self, doc_type: str, company: dict, tender: dict,
                                    analysis: dict) -> str:
        """
        Genera un documento con Claude Sonnet.
        Usa SOLO dati reali dell'azienda — non inventa mai nulla.
        """
        ragione = company.get('ragione_sociale', '___')
        piva = company.get('piva') or company.get('p_iva', '___')
        ateco = company.get('ateco', '___')
        ateco_desc = company.get('ateco_desc', '')
        regione = company.get('regione', '___')
        forma = company.get('forma_giuridica', '')
        dipendenti = company.get('dipendenti', '')
        fatturato = company.get('fatturato', '')
        pec = company.get('pec', '___')
        titolo_bando = tender.get('title', tender.get('titolo', ''))[:150]
        ente = tender.get('ente') or tender.get('contracting_body', '___')
        tipo_bando = tender.get('tipo', 'bando')
        importo = tender.get('estimated_value') or ''
        scadenza = tender.get('deadline_date') or ''
        modalita = analysis.get('modalita_invio', 'non_specificato')
        indirizzo = analysis.get('indirizzo_invio', '')

        azienda_info = f"""
DATI AZIENDA (reali, da usare esattamente come sono):
- Ragione Sociale: {ragione}
- P.IVA: {piva}
- Forma Giuridica: {forma or '(non specificata)'}
- ATECO: {ateco} — {ateco_desc or '(non specificato)'}
- Regione: {regione}
- Dipendenti: {dipendenti or '(dato non disponibile)'}
- Fatturato: {fatturato or '(dato non disponibile)'}
- PEC: {pec}
"""
        bando_info = f"""
DATI BANDO:
- Titolo: {titolo_bando}
- Ente: {ente}
- Tipo: {tipo_bando}
- Importo: {importo or 'non specificato'}
- Scadenza: {scadenza or 'non specificata'}
- Modalità invio: {modalita}
"""

        if doc_type == "domanda_partecipazione":
            prompt = f"""Sei un consulente esperto di bandi pubblici italiani.
Scrivi una DOMANDA DI PARTECIPAZIONE formale in italiano per il bando indicato.

{azienda_info}
{bando_info}

REGOLE TASSATIVE:
1. Usa SOLO i dati reali forniti sopra — NON inventare dati mancanti
2. Per dati mancanti usa "___" (da completare a cura del richiedente)
3. Tono: formale, burocratico italiano corretto
4. Struttura: intestazione → oggetto → corpo con dati azienda → richiesta formale → firma
5. Lunghezza: 300-500 parole
6. NON includere disclaimer AI nel testo del documento

Scrivi solo il documento, senza spiegazioni."""

        elif doc_type == "piano_aziendale":
            prompt = f"""Sei un consulente esperto di bandi pubblici italiani.
Crea una BOZZA DI PIANO AZIENDALE per la partecipazione al bando indicato.

{azienda_info}
{bando_info}

REGOLE TASSATIVE:
1. Usa SOLO dati reali forniti — per dati mancanti scrivi "___" (da completare)
2. NON inventare numeri, previsioni, o dati finanziari specifici non forniti
3. Per sezioni che richiedono dati specifici dell'azienda (fatturato futuro, piano investimenti): 
   metti placeholder chiari "[INSERIRE: descrizione investimento previsto]"
4. Tono: professionale, orientato al bando
5. Struttura: descrizione impresa → obiettivi → piano investimenti → ricadute occupazionali → sostenibilità
6. NON includere disclaimer AI nel documento

Scrivi solo il piano, senza spiegazioni."""

        else:
            return ""

        result = call_claude(prompt, max_tokens=3000)
        return result or f"[Documento {doc_type} — generazione fallita, riprovare]"

    async def run(self, job_id: str, company_id: str, tender_id: str):
        """Esegue il job di precompilazione completo."""
        logger.info(f"[JOB {job_id}] Start — company={company_id} tender={tender_id}")

        try:
            # Step 1: Fetch dati
            self.update_job_status(job_id, 'analyzing', 'Carico i dati del bando...')
            tender = self.get_tender(tender_id)
            company = self.get_company(company_id)

            if not tender or not company:
                self.update_job_status(job_id, 'error', error='Bando o azienda non trovati')
                return

            logger.info(f"[JOB {job_id}] Bando: {tender.get('title','')[:60]}")

            # Step 2: Analisi profonda bando
            self.update_job_status(job_id, 'analyzing', 'Analizzo il bando in dettaglio...')
            analysis = await self.analyze_tender_deep(tender)
            logger.info(f"[JOB {job_id}] Analysis: {len(analysis.get('documenti_obbligatori',[]))} doc obbligatori")

            # Step 3: Gap analysis
            self.update_job_status(job_id, 'analyzing', 'Confronto documenti richiesti con il tuo profilo...')
            checklist = self.gap_analysis(analysis, company)
            self.save_checklist(job_id, checklist)
            logger.info(f"[JOB {job_id}] Checklist: {len(checklist)} items")

            # Step 4: Genera documenti
            self.update_job_status(job_id, 'generating', 'Genero i documenti...')
            sort = 0

            # 4a. Dichiarazioni standard (template)
            for dich_key, dich_label in [
                ('dichiarazione_sostitutiva', 'Dichiarazione sostitutiva'),
                ('dichiarazione_de_minimis', 'Dichiarazione de minimis'),
                ('lettera_accompagnamento', 'Lettera di accompagnamento'),
            ]:
                if dich_key == 'dichiarazione_sostitutiva' or dich_key in analysis.get('dichiarazioni_necessarie', ['sostitutiva']):
                    content = self.fill_template(dich_key, company, tender)
                    pdf_bytes = self.generate_pdf(dich_label, content, company)
                    fname = f"{job_id}_{dich_key}.pdf"
                    file_url = self.upload_pdf_to_supabase(pdf_bytes, fname)
                    self.save_document(
                        job_id, dich_label, 'generated', 'ready',
                        content_html=content, file_url=file_url,
                        notes='Compilare i campi ___ prima della firma', sort_order=sort
                    )
                    sort += 1
                    logger.info(f"[JOB {job_id}] Generato: {dich_label}")

            # 4b. Domanda di partecipazione (AI)
            self.update_job_status(job_id, 'generating', 'Genero la domanda di partecipazione...')
            domanda = await self.generate_ai_document('domanda_partecipazione', company, tender, analysis)
            pdf_bytes = self.generate_pdf('Domanda di Partecipazione', domanda, company)
            fname = f"{job_id}_domanda.pdf"
            file_url = self.upload_pdf_to_supabase(pdf_bytes, fname)
            self.save_document(
                job_id, 'Domanda di partecipazione', 'generated', 'ready',
                content_html=domanda, file_url=file_url,
                notes='Bozza AI — verificare e completare i campi ___', sort_order=sort
            )
            sort += 1

            # 4c. Piano aziendale (se richiesto)
            if analysis.get('piano_richiesto'):
                self.update_job_status(job_id, 'generating', 'Genero il piano aziendale...')
                piano = await self.generate_ai_document('piano_aziendale', company, tender, analysis)
                pdf_bytes = self.generate_pdf('Piano Aziendale', piano, company)
                fname = f"{job_id}_piano.pdf"
                file_url = self.upload_pdf_to_supabase(pdf_bytes, fname)
                self.save_document(
                    job_id, 'Piano aziendale (bozza)', 'generated', 'ready',
                    content_html=piano, file_url=file_url,
                    notes='Bozza struttura — completare con dati specifici del progetto', sort_order=sort
                )
                sort += 1

            # 4d. Moduli ufficiali da scaricare
            for modulo in analysis.get('moduli_scaricabili', []):
                self.save_document(
                    job_id, modulo.get('nome', 'Modulo ufficiale'), 'official', 'download_link',
                    download_url=modulo.get('url_probabile', ''),
                    notes='Modulo ufficiale da scaricare, compilare e firmare', sort_order=sort
                )
                sort += 1

            # Step 5: Documenti mancanti (da profilo azienda)
            missing = [c for c in checklist if c['category'] == 'missing']
            for m in missing:
                self.save_document(
                    job_id, m['item'], 'missing', 'missing',
                    notes=m.get('notes', 'Da procurarsi'), sort_order=sort
                )
                sort += 1

            # Completato
            self.update_job_status(job_id, 'complete', 'Precompilazione completata ✓')
            logger.info(f"[JOB {job_id}] COMPLETE — {sort} documenti generati")

        except Exception as e:
            logger.error(f"[JOB {job_id}] ERRORE: {e}", exc_info=True)
            self.update_job_status(job_id, 'error', error=str(e))
        finally:
            try:
                self.conn.close()
            except Exception:
                pass


# ─── Entry point per run diretto ────────────────────────────────────────────

async def run_job(job_id: str, company_id: str, tender_id: str):
    p = Precompiler()
    await p.run(job_id, company_id, tender_id)


if __name__ == '__main__':
    import sys
    if len(sys.argv) == 4:
        asyncio.run(run_job(sys.argv[1], sys.argv[2], sys.argv[3]))
    else:
        print("Usage: python3 precompiler.py <job_id> <company_id> <tender_id>")
