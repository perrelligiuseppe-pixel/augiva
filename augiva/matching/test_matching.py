"""
Test del motore di matching Augiva.
Matcha Rossi Costruzioni Srl vs 50 bandi TED nel DB.
"""

import os
import sys
import logging

# Setup path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Configura logging
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s | %(message)s'
)

from matching.engine import MatchingEngine

# ─────────────────────────────────────────
# Azienda di test
# ─────────────────────────────────────────
TEST_COMPANY = {
    "p_iva": "12345678901",
    "ragione_sociale": "Rossi Costruzioni Srl",
    "ateco": "41.20",
    "ateco_desc": "Costruzione di edifici residenziali e non residenziali",
    "settori": ["costruzioni", "edilizia", "ristrutturazioni", "ingegneria"],
    "regione": "Lombardia",
    "provincia": "Milano",
    "fatturato": 2_000_000,
}


def run_test():
    print("=" * 60)
    print("AUGIVA — Motore di Matching v1.0")
    print("=" * 60)
    print(f"\n📋 Azienda: {TEST_COMPANY['ragione_sociale']}")
    print(f"   ATECO: {TEST_COMPANY['ateco']} — {TEST_COMPANY['ateco_desc']}")
    print(f"   Settori: {', '.join(TEST_COMPANY['settori'])}")
    print(f"   Regione: {TEST_COMPANY['regione']}")
    print(f"   Fatturato: €{TEST_COMPANY['fatturato']:,}\n")

    engine = MatchingEngine()
    semantic_active = engine._openai_available
    print(f"🧠 Semantic matching: {'✅ ATTIVO' if semantic_active else '❌ non attivo (no API key)'}")
    print(f"📊 Keyword matching: ✅ ATTIVO\n")

    print("🔄 Matching in corso...")
    results = engine.match_all(company=TEST_COMPANY, min_score=0, limit=100)

    print(f"\n✅ Trovati {len(results)} bandi analizzati\n")

    # Top 5
    top5 = results[:5]
    print("🏆 TOP 5 BANDI PIÙ COMPATIBILI:")
    print("-" * 60)

    for i, r in enumerate(top5, 1):
        title = r['tender_title'][:70]
        score = r['score']
        comps = r['components_l1']
        print(f"\n#{i} Score: {score:.1f}/100")
        print(f"   📄 {title}...")
        print(f"   └─ CPV: {comps['cpv']:.0f}  Keyword: {comps['keyword']:.0f}  "
              f"Geo: {comps['geo']:.0f}  Valore: {comps['value']:.0f}")

    print("\n" + "=" * 60)

    # Distribuzione score
    score_ranges = {'≥50': 0, '30-49': 0, '15-29': 0, '<15': 0}
    for r in results:
        s = r['score']
        if s >= 50:
            score_ranges['≥50'] += 1
        elif s >= 30:
            score_ranges['30-49'] += 1
        elif s >= 15:
            score_ranges['15-29'] += 1
        else:
            score_ranges['<15'] += 1

    print("\n📊 Distribuzione score:")
    for range_key, count in score_ranges.items():
        bar = '█' * count
        print(f"   {range_key:>6}: {bar} ({count})")

    return results


if __name__ == '__main__':
    results = run_test()
