import json
import urllib.request
import urllib.error
import ssl
import time

def check_urls(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Contexto para ignorar errores de certificado SSL caducado (común en webs locales antiguas)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    valid_data = []
    removed = []

    # Nos hacemos pasar por un navegador Chrome para evitar bloqueos básicos
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    }

    print(f"Comprobando {len(data)} URLs. Por favor, espera...\n")

    for i, item in enumerate(data):
        url = item.get('url', '').strip()
        if not url:
            continue
            
        req = urllib.request.Request(url, headers=headers)
        
        try:
            # 5 segundos de timeout es razonable para saber si la web está muerta
            response = urllib.request.urlopen(req, context=ctx, timeout=8)
            valid_data.append(item)
            if i % 20 == 0:
                print(f"Progreso: {i}/{len(data)}...")
        except urllib.error.HTTPError as e:
            # Si da 403 (Forbidden) o 401, a veces es solo un sistema anti-bots que bloquea scripts de Python
            if e.code in [403, 401, 405, 406]:
                print(f"MANTENIDO (Anti-bot {e.code}): {url}")
                valid_data.append(item)
            else:
                print(f"ELIMINADO (Error HTTP {e.code}): {url}")
                removed.append((item, f"HTTP {e.code}"))
        except urllib.error.URLError as e:
            # Error de DNS o servidor caído
            print(f"ELIMINADO (Servidor no encontrado/Caído): {url} - {e.reason}")
            removed.append((item, f"Error conexión: {e.reason}"))
        except Exception as e:
            print(f"ELIMINADO (Error desconocido): {url} - {str(e)}")
            removed.append((item, f"Excepción: {str(e)}"))
            
        # Pausa pequeñita para no saturar las redes o activar anti-DDoS si hay muchas de la misma IP
        time.sleep(0.1)

    # Sobrescribimos el archivo con los datos que sí han funcionado
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(valid_data, f, ensure_ascii=False, indent=2)

    # Escribimos un log para que el usuario pueda revisarlo
    log_path = 'json/recursos_eliminados.log'
    with open(log_path, 'w', encoding='utf-8') as f:
        for r, reason in removed:
            f.write(f"[{reason}] {r.get('nombre')} -> {r.get('url')}\n")

    print("\n--- RESUMEN ---")
    print(f"Registros originales: {len(data)}")
    print(f"Registros válidos conservados: {len(valid_data)}")
    print(f"Registros fallidos eliminados: {len(removed)}")
    print(f"Log detallado guardado en: {log_path}")

check_urls('json/recursos_valladolid_nocodb.json')
