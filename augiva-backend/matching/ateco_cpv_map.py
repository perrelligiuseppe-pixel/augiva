"""
Mapping ATECO → CPV codes e keyword di settore.
ATECO prefix (stringa) → lista di CPV prefix (stringhe) che possono matchare.
"""

# Dizionario ATECO prefix → CPV prefixes
ATECO_TO_CPV = {
    # --- IT e Software ---
    "62": ["72", "48", "71.3"],   # Produzione software → servizi IT, software, consulenza IT
    "63": ["72", "48"],            # Servizi informatici
    "61": ["64.2", "72"],          # Telecomunicazioni

    # --- Costruzioni e Ingegneria ---
    "41": ["45", "71"],            # Costruzione edifici → lavori edili, servizi architettura
    "42": ["45.2", "45.1"],        # Genio civile → infrastrutture
    "43": ["45.3", "45.4", "45"],  # Installazioni → impianti
    "71": ["71", "72.2"],          # Architettura/ingegneria → servizi arch/ing

    # --- Alimentare ---
    "10": ["15", "03"],            # Industria alimentare → prodotti alimentari, agricoltura
    "11": ["15.9"],                # Produzione bevande
    "01": ["03", "15"],            # Agricoltura

    # --- Manifatturiero ---
    "25": ["44", "14"],            # Prodotti in metallo
    "28": ["42", "43"],            # Macchinari
    "22": ["22", "30.2"],          # Materie plastiche/stampa
    "27": ["31", "32"],            # Apparecchiature elettriche
    "29": ["34", "50.1"],          # Autoveicoli

    # --- Commercio ---
    "46": ["34", "15", "30", "31"], # Commercio ingrosso (generico)
    "47": ["30", "15"],             # Commercio dettaglio

    # --- Trasporti e Logistica ---
    "49": ["60", "63"],            # Trasporto terrestre
    "50": ["60.6", "34.7"],        # Trasporto acqua
    "52": ["63.1"],                # Magazzinaggio

    # --- Pulizie e Facility ---
    "81": ["90.9", "77.3"],        # Pulizie, giardinaggio
    "80": ["79.7"],                # Sicurezza/guardiania
    "68": ["70.3"],                # Attività immobiliari

    # --- Istruzione e Formazione ---
    "85": ["80", "55.5"],          # Istruzione → servizi istruzione, mensa
    "86": ["85", "33.1"],          # Sanità → servizi sanitari, manutenzione medicale
    "87": ["85.3"],                # Assistenza sociale con alloggio
    "88": ["85.3"],                # Servizi sociali

    # --- Consulenza e Professionali ---
    "69": ["79", "75.1"],          # Legale/contabilità → servizi business
    "70": ["79.4", "72.2"],        # Consulenza gestionale
    "73": ["73", "71.3", "72"],    # R&D → ricerca, tecnico
    "74": ["71", "79"],            # Attività professionali
    "78": ["79.6"],                # Ricerca del personale

    # --- Media e Comunicazione ---
    "58": ["79.8", "22"],          # Editoria
    "59": ["92.1"],                # Produzione audiovisiva
    "60": ["92.2"],                # Radiodiffusione
    "73.1": ["79.3"],              # Pubblicità

    # --- Ristorazione ---
    "56": ["55", "55.5"],          # Ristorazione → servizi ristorazione/catering

    # --- Ambiente e Rifiuti ---
    "38": ["90.5", "90.1"],        # Raccolta/smaltimento rifiuti
    "39": ["90.7"],                # Risanamento

    # --- Energia ---
    "35": ["09.1", "09.2"],        # Energia
    "36": ["65.1"],                # Acqua
    "19": ["09.1"],                # Raffinazione petrolio
}

# Keyword per settore → parole chiave nel titolo del bando (italiano)
SECTOR_KEYWORDS = {
    "costruzioni": [
        "lavori", "costruzione", "ristrutturazione", "manutenzione stradale",
        "edifici", "cimitero", "opere", "infrastrutture", "edilizia",
        "architettonico", "ingegneria", "progettazione", "architettura",
        "ristrutturazioni", "restauro", "consolidamento", "ampliamento"
    ],
    "edilizia": [
        "lavori edili", "costruzione edifici", "manutenzione edifici",
        "ristrutturazione", "opere edili", "fabbricati", "immobili"
    ],
    "ristrutturazioni": [
        "ristrutturazione", "restauro", "riqualificazione", "rimozione", "demolizione"
    ],
    "software": [
        "software", "informatica", "digitale", "sistema informativo",
        "applicativo", "piattaforma", "app", "sviluppo software", "programmazione"
    ],
    "it": [
        "informatica", "ict", "cloud", "cybersecurity", "infrastruttura it",
        "sistema informativo", "digitale", "hardware", "server", "rete",
        "licenze", "saas", "erp"
    ],
    "servizi it": [
        "servizi connessi al software", "servizi informatici", "servizi digitali",
        "manutenzione software", "assistenza informatica", "supporto informatico"
    ],
    "sanità": [
        "sanitari", "medici", "ospedale", "asl", "azienda sanitaria",
        "dispositivi medici", "farmaci", "chirurgia", "clinica", "pronto soccorso",
        "ambulanza", "diagnostica", "laboratorio"
    ],
    "alimentare": [
        "alimentari", "prodotti alimentari", "derrate", "catering", "mensa",
        "cibo", "prodotti lattiero", "bevande", "pasti"
    ],
    "pulizie": [
        "pulizia", "pulizie", "igiene", "sanificazione", "disinfezione"
    ],
    "trasporti": [
        "trasporto", "veicoli", "autobus", "furgoni", "logistica",
        "spedizioni", "flotta", "carburante", "fuel card"
    ],
    "energie rinnovabili": [
        "energia rinnovabile", "fotovoltaico", "solare", "eolico",
        "efficienza energetica", "isolamento termico"
    ],
    "formazione": [
        "formazione", "corsi", "istruzione", "didattica", "scuola",
        "università", "aggiornamento professionale"
    ],
    "consulenza": [
        "consulenza", "advisory", "supporto", "assistenza", "gestione",
        "pianificazione", "assessment"
    ],
    "sicurezza": [
        "sicurezza", "vigilanza", "guardiania", "videosorveglianza",
        "sorveglianza", "protezione"
    ],
    "verde": [
        "verde", "giardinaggio", "parchi", "piantagione", "manutenzione zone verdi",
        "alberature", "spiagge"
    ],
    "assicurazioni": [
        "assicurativo", "assicurazione", "polizza", "copertura assicurativa", "kasko"
    ],
    "sociale": [
        "sociale", "assistenza", "welfare", "alloggio", "anziani", "disabili",
        "servizi sociali"
    ],
    "rifiuti": [
        "rifiuti", "raccolta rifiuti", "smaltimento", "differenziata", "igiene urbana"
    ],
    "ingegneria": [
        "ingegneria", "progettazione", "tecnici", "collaudo", "direzione lavori",
        "architettura", "urbanistica", "topografia"
    ],
    "arredo": [
        "arredi", "mobili", "arredamento", "sedie", "tavoli"
    ],
    "ferroviario": [
        "ferroviario", "ferroviaria", "treno", "rotabile", "traversoni",
        "massicciata", "binari", "scambio ferroviario"
    ],
}

# Mapping regione italiana → province (per matching geografico)
REGIONE_TO_PROVINCE = {
    "Lombardia": [
        "Milano", "Bergamo", "Brescia", "Como", "Cremona", "Lecco",
        "Lodi", "Mantova", "Monza", "Pavia", "Sondrio", "Varese"
    ],
    "Lazio": ["Roma", "Frosinone", "Latina", "Rieti", "Viterbo"],
    "Campania": ["Napoli", "Avellino", "Benevento", "Caserta", "Salerno"],
    "Sicilia": ["Palermo", "Catania", "Messina", "Agrigento", "Caltanissetta",
                "Enna", "Ragusa", "Siracusa", "Trapani"],
    "Veneto": ["Venezia", "Padova", "Verona", "Vicenza", "Treviso", "Belluno", "Rovigo"],
    "Emilia-Romagna": ["Bologna", "Ferrara", "Forlì", "Modena", "Parma",
                        "Piacenza", "Ravenna", "Reggio Emilia", "Rimini"],
    "Piemonte": ["Torino", "Alessandria", "Asti", "Biella", "Cuneo",
                  "Novara", "Verbania", "Vercelli"],
    "Toscana": ["Firenze", "Arezzo", "Grosseto", "Livorno", "Lucca",
                 "Massa", "Pisa", "Pistoia", "Prato", "Siena"],
    "Puglia": ["Bari", "Brindisi", "Foggia", "Lecce", "Taranto", "BAT"],
    "Calabria": ["Catanzaro", "Cosenza", "Crotone", "Reggio Calabria", "Vibo Valentia"],
    "Sardegna": ["Cagliari", "Nuoro", "Oristano", "Sassari", "Sud Sardegna"],
    "Liguria": ["Genova", "Imperia", "La Spezia", "Savona"],
    "Marche": ["Ancona", "Ascoli Piceno", "Fermo", "Macerata", "Pesaro"],
    "Abruzzo": ["L'Aquila", "Chieti", "Pescara", "Teramo"],
    "Friuli-Venezia Giulia": ["Trieste", "Gorizia", "Pordenone", "Udine"],
    "Umbria": ["Perugia", "Terni"],
    "Basilicata": ["Potenza", "Matera"],
    "Molise": ["Campobasso", "Isernia"],
    "Valle d'Aosta": ["Aosta"],
    "Trentino-Alto Adige": ["Trento", "Bolzano"],
}
