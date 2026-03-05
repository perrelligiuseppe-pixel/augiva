-- ============================================================
-- Augiva — Schema Database Supabase PostgreSQL
-- Blocco 1: Struttura base per bandi, aziende, match
-- ============================================================

-- Abilita estensioni necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- per pgvector (embedding)

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE company_size AS ENUM ('micro', 'piccola', 'media', 'grande');
CREATE TYPE tender_source AS ENUM ('TED', 'ANAC', 'MEPA', 'SIMOG', 'INPS');
CREATE TYPE notification_channel AS ENUM ('email', 'telegram', 'webhook');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'skipped');

-- ============================================================
-- TABLE: companies
-- Aziende onboardate su Augiva
-- ============================================================

CREATE TABLE companies (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    p_iva           VARCHAR(11) UNIQUE NOT NULL,
    ragione_sociale TEXT NOT NULL,
    ateco           VARCHAR(10),                        -- codice ATECO principale (es. "62.01")
    ateco_desc      TEXT,                               -- descrizione ATECO
    settori         TEXT[],                             -- settori liberi (es. ["IT","costruzioni"])
    dimensione      company_size DEFAULT 'piccola',
    regione         VARCHAR(50),                        -- regione italiana (es. "Lombardia")
    provincia       VARCHAR(5),                         -- sigla provincia (es. "MI")
    email           TEXT,
    telegram_chat_id TEXT,
    active          BOOLEAN DEFAULT TRUE,
    onboarded_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_p_iva ON companies(p_iva);
CREATE INDEX idx_companies_ateco ON companies(ateco);
CREATE INDEX idx_companies_regione ON companies(regione);

-- ============================================================
-- TABLE: tenders
-- Bandi/appalti da tutte le fonti
-- ============================================================

CREATE TABLE tenders (
    id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    source              tender_source NOT NULL,
    source_id           TEXT NOT NULL,                  -- ID univoco nella fonte
    title               TEXT NOT NULL,
    description         TEXT,
    contracting_body    TEXT,                           -- ente appaltante
    publication_date    DATE,
    deadline_date       DATE,
    estimated_value     NUMERIC(18, 2),
    currency            VARCHAR(3) DEFAULT 'EUR',
    cpv_codes           TEXT[],                         -- codici CPV
    country             VARCHAR(3) DEFAULT 'IT',
    region              VARCHAR(50),
    url                 TEXT NOT NULL,
    
    -- Vector embedding per semantic matching (dimensione 1536 per text-embedding-3-small)
    embedding_vector    vector(1536),
    
    -- Cache score pre-calcolato (opzionale, per performance)
    score_cache         JSONB DEFAULT '{}',
    
    -- Metadata aggiuntivi grezzi dalla fonte
    raw_data            JSONB DEFAULT '{}',
    
    -- Stato del bando
    is_open             BOOLEAN DEFAULT TRUE,
    
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    
    -- Vincolo univocità: una fonte non può avere due bandi con stesso ID
    UNIQUE(source, source_id)
);

CREATE INDEX idx_tenders_source ON tenders(source);
CREATE INDEX idx_tenders_deadline ON tenders(deadline_date);
CREATE INDEX idx_tenders_cpv ON tenders USING GIN(cpv_codes);
CREATE INDEX idx_tenders_publication ON tenders(publication_date DESC);
CREATE INDEX idx_tenders_open ON tenders(is_open) WHERE is_open = TRUE;
-- Index per ricerca vettoriale (cosine similarity)
CREATE INDEX idx_tenders_embedding ON tenders USING ivfflat (embedding_vector vector_cosine_ops)
    WITH (lists = 100);

-- ============================================================
-- TABLE: matches
-- Match calcolati tra aziende e bandi
-- ============================================================

CREATE TABLE matches (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    tender_id       UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    
    -- Score composito (0.0 - 1.0)
    score           NUMERIC(4, 3) NOT NULL CHECK (score >= 0 AND score <= 1),
    
    -- Dettaglio score per spiegabilità
    score_detail    JSONB DEFAULT '{}',    -- {"cpv": 0.8, "region": 1.0, "semantic": 0.75}
    
    -- Notifica inviata
    notified_at     TIMESTAMPTZ,
    notification_channel notification_channel,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, tender_id)
);

CREATE INDEX idx_matches_company ON matches(company_id);
CREATE INDEX idx_matches_tender ON matches(tender_id);
CREATE INDEX idx_matches_score ON matches(score DESC);
CREATE INDEX idx_matches_notified ON matches(notified_at) WHERE notified_at IS NULL;

-- ============================================================
-- TABLE: notifications_log
-- Log completo di tutti gli invii notifiche
-- ============================================================

CREATE TABLE notifications_log (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
    tender_id       UUID REFERENCES tenders(id) ON DELETE SET NULL,
    match_id        UUID REFERENCES matches(id) ON DELETE SET NULL,
    
    channel         notification_channel NOT NULL,
    recipient       TEXT NOT NULL,          -- email o chat_id
    subject         TEXT,                   -- oggetto email
    body_preview    TEXT,                   -- prime 500 char del messaggio
    
    status          notification_status DEFAULT 'pending',
    error_message   TEXT,                   -- se status = 'failed'
    
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_company ON notifications_log(company_id);
CREATE INDEX idx_notif_status ON notifications_log(status);
CREATE INDEX idx_notif_created ON notifications_log(created_at DESC);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenders_updated_at
    BEFORE UPDATE ON tenders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Da abilitare in produzione con JWT auth
-- ============================================================

-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- VIEWS UTILI
-- ============================================================

-- Bandi aperti con scadenza imminente (< 15 giorni)
CREATE VIEW tenders_urgent AS
SELECT 
    t.*,
    (t.deadline_date - CURRENT_DATE) AS days_to_deadline
FROM tenders t
WHERE 
    t.is_open = TRUE
    AND t.deadline_date IS NOT NULL
    AND t.deadline_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '15 days')
ORDER BY t.deadline_date ASC;

-- Top match per azienda
CREATE VIEW top_matches_per_company AS
SELECT 
    c.ragione_sociale,
    c.p_iva,
    t.title,
    t.source,
    t.deadline_date,
    t.estimated_value,
    m.score,
    m.notified_at,
    t.url
FROM matches m
JOIN companies c ON c.id = m.company_id
JOIN tenders t ON t.id = m.tender_id
WHERE t.is_open = TRUE
ORDER BY c.id, m.score DESC;

-- ============================================================
-- SEED DATA (per test)
-- ============================================================

-- Azienda di test
INSERT INTO companies (p_iva, ragione_sociale, ateco, settori, dimensione, regione, email)
VALUES (
    '12345678901',
    'Tech PMI Srl',
    '62.01',
    ARRAY['software', 'IT', 'sviluppo web'],
    'piccola',
    'Lombardia',
    'test@techpmi.it'
) ON CONFLICT (p_iva) DO NOTHING;

