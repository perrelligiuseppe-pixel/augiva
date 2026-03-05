# MEMORY.md - Long-Term Memory

## Chi sono
Mi chiamo Jarvi. Sono l'AI che gestisce il progetto Augiva per Giuseppe (founder).
Ruolo: supervisore 24/7 via Telegram, costruisco il sistema, lo mantengo, rispondo ai comandi del founder.

## Il Progetto: Augiva — v6.0 (documento definitivo)

### Vision
Hub digitale per PMI italiane ed europee. Monitoring automatico di bandi, appalti e fondi pubblici con pre-compilazione AI.
Posizionamento: "Le opportunità vengono a te — tu non cerchi nulla."
Filosofia: business automatico al 95-98%. Founder gestisce solo eccezioni e decisioni strategiche — 1-2h/settimana a regime.

### Competitor
- Legacy (Telemat, InfoBandiPA): database datato, prezzo alto
- BandoSubito: €2M funding gen 2026, partner Il Sole 24 Ore, €500K fatturato anno 1, modello ibrido uomo-macchina
- Augiva: 100% automatico, più economico, copre anche appalti, pre-compilazione self-service

### Cosa monitora
- Appalti: TED/OJEU, ANAC, MEPA, MIT, 20 portali regionali, 105 Camere di Commercio
- Fondi nazionali: Invitalia, MIMIT, Gazzetta Ufficiale, PNRR
- Finanziamenti: SIMEST, Mediocredito Centrale
- Day one: 20-25 fonti principali, poi aggiunta progressiva

### Onboarding con P.IVA
Cliente inserisce solo P.IVA → sistema compila automaticamente da Camera di Commercio (<1 sec):
ragione sociale, ATECO, PEC, forma giuridica, dipendenti, fatturato.
Provider: OpenAPI.com (gratis primi 30/mese, poi €0.04/chiamata una tantum per cliente)

### Modalità operativa
- Scansione: giovedì notte ore 03:00
- Notifica: venerdì mattina ore 07:00 — digest settimanale personalizzato
- Solo bandi sopra 60% compatibilità
- Deduplicazione 3 livelli: CIG → hash contenuto → similarità embedding

### Pricing definitivo
- Pricing definitivo: Starter €97/mese (€77 annuale), Professional €197/mese (€157 annuale), pre-compilazione €29/doc (solo Starter)
- Mese 4+: Piano Essenziale €149/mese + Piano Professionale €449/mese
- Codici promo via Stripe (es. VEDILIA30 = 30 giorni gratis)
- Nessuna beta gratuita — prodotto completo dal day one

### Tasto PRECOMPILA
- Essenziale: checkout Stripe €9 → pre-compilazione parte
- Professionale: inclusa illimitata
- Output SEMPRE come bozza — cliente verifica, corregge, firma, invia da solo
- Augiva non invia mai documenti, non firma, non garantisce esiti

### AI — 3 livelli
- L1: Gemini Flash 2.0 + text-embedding-3-small OpenAI → volume/velocità (€3.50/mese)
- L2: Claude Sonnet → matching, notifiche, pre-compilazione standard (€23-25/mese)
- L3: Claude Opus → escalation automatica su bandi complessi (€2-5/mese, 50-100 chiamate)
- Fallback: Mistral Small europeo (€2/mese)
- Esclusi: Kimi, DeepSeek (GDPR), Manus, Llama locale
- Totale AI: €30-35/mese

### Stack tecnico
- Server: Hetzner CAX21, ARM64 4vCPU, 8GB RAM, 80GB NVMe, €6.49/mese, Ubuntu 24.04
- IP: 89.167.109.239
- Supabase: database + storage vettoriale (EU West, GDPR)
- Vercel: frontend (dominio augiva.com)
- Stripe: pagamenti, rinnovi, codici promo
- Resend: email transazionali
- Apify: scraping (Starter €49/mese)
- OCR: pytesseract locale

### Costi mensili
- Lancio (0-100 clienti): ~€90-97/mese
- Crescita (100-500 clienti): ~€278-288/mese
- Investimento iniziale: €1.000 max

### Proiezioni finanziarie
- Mese 4: 10 clienti → MRR €1.490
- Mese 6: 50 clienti → MRR €7.450
- Mese 9: 120 clienti → MRR €23.880
- Mese 12: 220 clienti → MRR €43.780
- ARR anno 1: €500-600K realistico, €700-800K ottimistico
- Obiettivo minimo: €5-10K/mese netti (mese 5-6)

### Piano costruzione — 14 blocchi
0. Setup Hetzner + OpenClaw + account (1 giorno)
1. Scraping TED + ANAC + MEPA (1-2 sett)
2. Scraping fondi nazionali + SIMEST + PNRR (1-2 sett)
3. Database Supabase + deduplicazione (1 sett)
4. Motore matching + embedding + score % (1 sett)
4b. Addestramento archivi storici (in parallelo)
5. Frontend landing page stile Apple (1 sett)
6. Onboarding P.IVA → API Camera di Commercio (4 giorni)
7. Analisi sito web cliente automatica (2 giorni)
8. Stripe — 2 piani + codici promo + rinnovi (3 giorni)
9. Sistema email digest settimanale (3 giorni)
10. Dashboard cliente + pagina opportunità (1 sett)
10b. Tasto PRECOMPILA + gestione documenti + escalation AI (4 giorni)
11. Chatbot supporto AI FAQ (3 giorni)
12. Sistema monitoraggio + alert Telegram + report venerdì (2-3 giorni)
13. Scraping portali regionali + Camere di Commercio (2-3 sett)
14. Testing completo (1-2 sett)
TOTALE: 12-16 settimane

### Domini da registrare
- augiva.com — priorità massima
- augiva.eu — alternativa principale
- augiva.ai — alternativa premium
- Verificare su namecheap.com o godaddy.com

### Sicurezza
1. Whitelist Telegram ID founder
2. Firewall Hetzner (SSH + porte necessarie)
3. Spending limit €10/giorno su Anthropic e OpenAI
4. Solo skill OpenClaw verificate
5. Backup settimanale Hetzner €0.99/mese

### Aspetti legali (pre-lancio)
- Privacy Policy (revisione €200-400)
- Terms of Service con limitazione responsabilità
- Cookie Policy
- DPA GDPR con Supabase, OpenAPI.com, Resend
- Con €50K+ ricavi: uscita regime forfettario → pianificare con commercialista

### Acquisizione clienti
- LinkedIn organico (OpenClaw prepara post, Buffer pubblica)
- Commercialisti distributori (fee referral)
- Associazioni categoria: Confindustria, CNA, Confartigianato
- Word of mouth

### Stato attuale (marzo 2026)
✅ Completato: nome, vision, architettura, pricing, piano costruzione, competitor analisi, legale identificato
⏳ Da fare: verificare e registrare domini, aprire account necessari, iniziare Blocco 0

## Setup OpenClaw completato (03/03/2026)
- Gateway come servizio systemd (openclaw-gateway.service) ✅
- tools.allow = group:openclaw ✅
- tools.exec.host = gateway ✅
- tools.agentToAgent.enabled = true ✅
- tools.elevated.enabled + allowFrom.telegram = ["*"] ✅
- Whisper API configurato con OpenAI API key ✅
- exec attivo e funzionante ✅

## Prossimi passi
- Verificare e registrare dominio augiva.com (era "lunedì" nel doc)
- Aprire account necessari (lista 22 passi nel documento)
- Iniziare Blocco 0 del piano costruzione

## Design Specs Augiva (da OPTRA v5.0)
Stile: Apple — percezione premium, minimalismo, eleganza. Riferimento: apple.com, linear.app, notion.so

**Colori:**
- Sfondo: #F5F5F7 (grigio Apple)
- Testo primario: #1D1D1F
- Testo secondario: #6E6E73
- Accento: #0066CC (blu) o #4CAF82 (verde salvia)
- Verde compatibilità alta: #34C759
- Giallo compatibilità media: #FF9F0A
- Arancio compatibilità bassa: #FF6B35
- Bordi: #E5E5EA

**Tipografia:**
- Font: Inter (Google Fonts, gratuito)
- Titoli: Inter 600-700, letterspacing -0.5px
- Corpo: Inter 400, line-height 1.6
- Testo giustificato a sinistra — mai centrato

**Forme:**
- Border-radius cards: 16px
- Border-radius bottoni: 12px
- Ombre: box-shadow 0 2px 20px rgba(0,0,0,0.06)
- Spaziatura generosa, nessun elemento spigoloso

## Storico nomi progetto
- OPTRA v5.0 → nome di lavoro, poi cambiato in Augiva
- Augiva v6.0 → nome definitivo

## Design Approvato — Linea Guida (04/03/2026)
File di riferimento: `vedilia-design-approved.html`

**Palette colori approvata (dark premium):**
- Sfondo: #32323C
- Sfondo card: #3A3A45
- Sfondo elementi: #40404C
- Surface: #47474F
- Bordi: rgba(255,255,255,0.09)
- Testo primario: #F4F4F5
- Testo secondario: #A1A1AA
- Testo terziario: #71717A
- Accento: #3B82F6

**Tipografia approvata:**
- Font: Inter (Google Fonts)
- Titoli: gradiente lineare 180deg da #F4F4F5 (top) a #71717A (bottom) — effetto profondità premium
- Peso titoli: 900 (hero), 800 (section)
- Letter-spacing: -3px (hero), -1.5px (sezioni)

**Componenti approvati:**
- Border-radius cards: 16px (radius-sm: 10px, radius-lg: 24px)
- Ombre: 0 40px 80px rgba(0,0,0,0.4)
- Preview prodotto con barra browser simulata
- Score ring colorati (verde/blu/giallo) per compatibilità bandi
- Onboarding step con badge "Auto ✓" verde
- Upload area dashed per documenti
- Capacity selector radio per capacità finanziaria

**Copy approvato:**
- Headline: "Opportunità per la tua azienda, ogni settimana."
- "Come funziona": "Semplice da subito. Automatico per sempre."
- "Onboarding": "Configurazione una volta. Il resto è automatico."
- CTA: "Smetti di cercare. Inizia a trovare."
- Button: "Inizia la prova →"
- Nota carta: "Inserisci la carta — nessun addebito per 30 giorni. Disdici prima e non paghi nulla."
- NO competitor nel sito, NO "gratis", NO "passi" ripetuti

## Domini registrati (05/03/2026)
- augiva.com ✅ registrato su Aruba, scadenza 05/03/2027
- augiva.it ✅ registrato su Aruba, scadenza 05/03/2027
- Rinnovo automatico attivato su entrambi
- Prossimo step: configurare DNS su Aruba per puntare a Vercel
