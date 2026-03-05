import Link from 'next/link'
import TenderCard from '@/components/TenderCard'

const appaltiMock = [
  {
    id: 1,
    titolo: 'Lavori di ristrutturazione edificio scolastico — Comune di Milano',
    ente: 'Comune di Milano',
    score: 94,
    importo: '€ 450.000',
    scadenza: '15 apr 2026',
    tipo: 'appalto',
    link: '#',
  },
  {
    id: 2,
    titolo: 'Fornitura arredi uffici — Agenzia delle Entrate',
    ente: 'Agenzia delle Entrate',
    score: 78,
    importo: '€ 120.000',
    scadenza: '22 mar 2026',
    tipo: 'appalto',
    link: '#',
  },
  {
    id: 3,
    titolo: 'Servizi di manutenzione impianti — ASL Roma 1',
    ente: 'ASL Roma 1',
    score: 71,
    importo: '€ 85.000',
    scadenza: '8 apr 2026',
    tipo: 'appalto',
    link: '#',
  },
]

const fondiMock = [
  {
    id: 4,
    titolo: 'Nuova Sabatini — Beni strumentali PMI',
    ente: 'Ministero delle Imprese e del Made in Italy',
    score: 89,
    importo: 'Fino a € 4.000.000',
    scadenza: 'Sempre aperto',
    tipo: 'fondo',
    link: '#',
  },
  {
    id: 5,
    titolo: 'Resto al Sud 2.0 — Imprenditoria giovanile',
    ente: 'Invitalia',
    score: 82,
    importo: 'Fino a € 75.000',
    scadenza: '31 dic 2026',
    tipo: 'fondo',
    link: '#',
  },
  {
    id: 6,
    titolo: 'Smart&Start Italia — Startup innovative',
    ente: 'Invitalia',
    score: 67,
    importo: 'Fino a € 1.500.000',
    scadenza: 'Sempre aperto',
    tipo: 'fondo',
    link: '#',
  },
]

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7' }}>
      {/* Navbar */}
      <nav style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', background: '#2563EB', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: '16px', fontWeight: '800' }}>A</span>
            </div>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#1D1D1F' }}>Augiva</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/auth/login" style={{ fontSize: '14px', fontWeight: '500', color: '#6E6E73', padding: '8px 16px' }}>
              Accedi
            </Link>
            <Link
              href="/auth/register"
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                background: '#2563EB',
                padding: '9px 20px',
                borderRadius: '10px',
                textDecoration: 'none',
              }}
            >
              Inizia gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '100px 24px 80px', textAlign: 'center' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#EEF4FF',
            color: '#2563EB',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '28px',
          }}>
            ✦ Matching AI-powered per PMI italiane
          </div>
          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 60px)',
            fontWeight: '800',
            color: '#1D1D1F',
            lineHeight: '1.15',
            marginBottom: '24px',
            letterSpacing: '-0.02em',
          }}>
            Le opportunità vengono a te —<br />
            <span style={{ color: '#2563EB' }}>tu non cerchi nulla.</span>
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#6E6E73',
            lineHeight: '1.7',
            marginBottom: '40px',
            maxWidth: '560px',
            margin: '0 auto 40px',
          }}>
            Augiva analizza la tua azienda e trova automaticamente le gare d'appalto, i fondi e le agevolazioni più adatte — con uno score di compatibilità personalizzato.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              href="/auth/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 32px',
                background: '#2563EB',
                color: 'white',
                fontSize: '16px',
                fontWeight: '700',
                borderRadius: '14px',
                textDecoration: 'none',
              }}
            >
              Inizia la prova gratuita →
            </Link>
            <a
              href="#esempi"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 32px',
                background: 'white',
                color: '#1D1D1F',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '14px',
                textDecoration: 'none',
                border: '1.5px solid rgba(0,0,0,0.1)',
              }}
            >
              Guarda esempi reali
            </a>
          </div>
          <p style={{ fontSize: '13px', color: '#AEAEB2', marginTop: '16px' }}>
            Nessuna carta di credito richiesta · Setup in 2 minuti
          </p>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ padding: '0 24px 80px' }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '20px',
          padding: '32px 40px',
          boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '32px',
          textAlign: 'center',
        }}>
          {[
            { value: '50+', label: 'Gare d\'appalto monitorate' },
            { value: '35+', label: 'Fondi e agevolazioni' },
            { value: '94%', label: 'Accuracy del matching AI' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p style={{ fontSize: '32px', fontWeight: '800', color: '#2563EB' }}>{value}</p>
              <p style={{ fontSize: '13px', color: '#6E6E73', marginTop: '4px' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mock results section */}
      <section id="esempi" style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#1D1D1F', marginBottom: '12px' }}>
              Ecco cosa trova Augiva per te
            </h2>
            <p style={{ fontSize: '16px', color: '#6E6E73' }}>
              Esempio reale di matching per un'impresa edile lombarda
            </p>
          </div>

          {/* Gare d'appalto */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '22px' }}>📋</span>
              <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#1D1D1F' }}>Gare d'appalto</h3>
              <span style={{
                background: '#EEF4FF',
                color: '#2563EB',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
              }}>
                {appaltiMock.length} match
              </span>
            </div>
            <div className="grid-cards">
              {appaltiMock.map(tender => (
                <TenderCard key={tender.id} tender={tender} />
              ))}
            </div>
          </div>

          {/* Fondi */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '22px' }}>💰</span>
              <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#1D1D1F' }}>Fondi e agevolazioni</h3>
              <span style={{
                background: '#EEF4FF',
                color: '#2563EB',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600',
              }}>
                {fondiMock.length} match
              </span>
            </div>
            <div className="grid-cards">
              {fondiMock.map(tender => (
                <TenderCard key={tender.id} tender={tender} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section style={{
        background: '#2563EB',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: '800', color: 'white', marginBottom: '16px' }}>
            Pronto a trovare le tue opportunità?
          </h2>
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.8)', marginBottom: '36px' }}>
            Inserisci la tua P.IVA e in 30 secondi Augiva trova le migliori gare e fondi per la tua azienda.
          </p>
          <Link
            href="/auth/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 36px',
              background: 'white',
              color: '#2563EB',
              fontSize: '16px',
              fontWeight: '700',
              borderRadius: '14px',
              textDecoration: 'none',
            }}
          >
            Inizia la prova gratuita →
          </Link>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '16px' }}>
            Nessuna carta di credito · Gratis per 14 giorni
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#F5F5F7', borderTop: '1px solid rgba(0,0,0,0.06)', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#6E6E73' }}>
          © 2026 Augiva — Tutti i diritti riservati
        </p>
      </footer>
    </div>
  )
}
