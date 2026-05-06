import json

def apply_mapping(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    mapping = {
        "Comercio y mercados": ("Comercio", "mercados"),
        "Medios de comunicación": ("Medios", "comunicación"),
        "ONGs y servicios sociales": ("Servicios sociales", "ongs"),
        "Tecnología y empresa": ("Tecnología", "empresa"),
        "Festivales": ("Cultura", "festivales"),
        "Museos": ("Cultura", "museos"),
        "Eventos": ("Agenda y ocio", "eventos"),
        "Hostelería": ("Comercio", "hostelería"),
        "Gastronomía": ("Comercio", "gastronomía"),
        "Movilidad": ("Transporte", "movilidad"),
        "Innovación": ("Economía", "innovación"),
        "Alojamiento": ("Comercio", "alojamiento"),
        "Religión y tradiciones": ("Cultura", "religión"),
        "Seguridad": ("Administración pública", "seguridad"),
        "Urbanismo": ("Administración pública", "urbanismo"),
        "Servicios municipales": ("Administración pública", "servicios-municipales"),
    }

    for item in data:
        cat = item.get('categoria', '').strip()
        tags = set(t.strip() for t in item.get('etiquetas', '').split(';') if t.strip())

        if cat in mapping:
            new_cat, extra_tag = mapping[cat]
            item['categoria'] = new_cat
            if extra_tag:
                tags.add(extra_tag)
                
        # Volvemos a limpiar las etiquetas por si acaso
        clean_tags = set()
        for t in tags:
            t = t.lower().replace(' ', '-')
            # Opcionalmente, podemos limpiar las etiquetas redundantes si coincide exactamente con la categoría
            # pero es mejor dejarlas si el usuario busca por ellas.
            clean_tags.add(t)
        
        item['etiquetas'] = ';'.join(sorted(clean_tags))

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

apply_mapping('json/recursos_valladolid_nocodb.json')

with open('json/recursos_valladolid_nocodb.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    print("Categorías resultantes finales:")
    cats = sorted(set(item.get('categoria', '') for item in data))
    for c in cats:
        print(f"- {c}")
