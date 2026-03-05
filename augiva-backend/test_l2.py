"""
Test end-to-end Matching Engine L1+L2 pgvector
"""
import os, sys, logging, asyncio

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
sys.path.insert(0, '/root/.openclaw/workspace/augiva')

# Carica env
from matching.engine import MatchingEngine, _load_env
_load_env()

engine = MatchingEngine()

azienda_1 = {
    "ragione_sociale": "Rossi Costruzioni Srl",
    "ateco": "41.20",
    "ateco_desc": "Costruzione di edifici residenziali e non residenziali",
    "settori": ["costruzioni", "edilizia", "ristrutturazioni"],
    "regione": "Lombardia"
}

azienda_2 = {
    "ragione_sociale": "TechSoft Srl",
    "ateco": "62.01",
    "ateco_desc": "Produzione di software",
    "settori": ["software", "IT", "sviluppo web", "cloud"],
    "regione": "Toscana"
}

results = {}

for azienda in [azienda_1, azienda_2]:
    nome = azienda["ragione_sociale"]
    print(f"\n{'='*60}")
    print(f"🏢 {nome}")
    print(f"ATECO: {azienda['ateco']} — {azienda['ateco_desc']}")
    print(f"Settori: {', '.join(azienda['settori'])}")
    print(f"Regione: {azienda['regione']}")
    print('='*60)

    # Step 1: pgvector top-20 semantici
    semantic_results = engine.score_tender_l2_pgvector(azienda, top_k=20)
    print(f"\n📊 Risultati semantici pgvector: {len(semantic_results)} bandi")

    # Step 2: calcola score combinato L1+L2 per tutti i top-20
    all_scored = []
    for sem in semantic_results:
        tender = {
            'id': sem['id'],
            'title': sem['title'],
            'description': sem.get('description'),
            'cpv_codes': sem.get('cpv_codes'),
            'region': sem.get('region'),
            'estimated_value': sem.get('estimated_value'),
        }
        result_l1 = engine.score_tender_l1(azienda, tender)
        score_l1 = result_l1['score']
        score_l2 = sem['score_l2']
        score_finale = round(score_l1 * 0.4 + score_l2 * 0.6, 1)
        all_scored.append({
            'title': sem['title'][:70],
            'score_l1': score_l1,
            'score_l2': score_l2,
            'score_finale': score_finale,
            'similarity': sem['similarity'],
        })

    all_scored.sort(key=lambda x: x['score_finale'], reverse=True)

    print(f"\n🏆 Top 5 match (combinati L1+L2):")
    print(f"{'#':<3} {'Titolo':<70} {'L1':>6} {'L2':>6} {'Finale':>7}")
    print('-'*100)
    top5 = all_scored[:5]
    for i, r in enumerate(top5, 1):
        print(f"{i:<3} {r['title']:<70} {r['score_l1']:>6.1f} {r['score_l2']:>6.1f} {r['score_finale']:>7.1f}")

    # Step 3: match_all() filtrato >= 60
    matches = asyncio.run(engine.match_all(azienda))
    print(f"\n✅ match_all() — bandi con score ≥ 60: {len(matches)}")

    results[nome] = {
        'top5': top5,
        'total_matches_60': len(matches),
        'all_scored': all_scored,
    }

# Analisi comparativa
print(f"\n{'='*60}")
print("📊 ANALISI COMPARATIVA L1 vs L2")
print('='*60)
for nome, data in results.items():
    avg_l1 = sum(r['score_l1'] for r in data['all_scored']) / len(data['all_scored']) if data['all_scored'] else 0
    avg_l2 = sum(r['score_l2'] for r in data['all_scored']) / len(data['all_scored']) if data['all_scored'] else 0
    avg_fin = sum(r['score_finale'] for r in data['all_scored']) / len(data['all_scored']) if data['all_scored'] else 0
    print(f"\n{nome}:")
    print(f"  Media L1 (rule-based): {avg_l1:.1f}")
    print(f"  Media L2 (semantico):  {avg_l2:.1f}")
    print(f"  Media Finale:          {avg_fin:.1f}")
    print(f"  Match con score ≥ 60:  {data['total_matches_60']}")

print("\n✅ Test completato!")
