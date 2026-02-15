"""
Test des nouvelles fonctionnalités Eva
- E-commerce
- Présentations
- Posts réseaux sociaux
- Scripts vidéo
- Documents pro
"""

import requests
import time
import sys

# Fix Windows encoding
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API_URL = "https://agent-saas.onrender.com/api"

def create_user():
    email = f"features_test_{int(time.time())}@test.com"
    try:
        response = requests.post(f"{API_URL}/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "name": "Features Test"
        })
        if response.status_code == 201:
            return response.json().get("accessToken")
    except:
        pass
    return None

def send(token, msg):
    try:
        response = requests.post(
            f"{API_URL}/agent/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": msg, "language": "fr"},
            timeout=120
        )
        if response.status_code == 200:
            data = response.json()
            return {
                "response": data.get("response", ""),
                "ai": data.get("ai", {})
            }
    except Exception as e:
        return {"response": f"[ERROR: {e}]", "ai": {}}
    return {"response": "[NO RESPONSE]", "ai": {}}

def main():
    print("=" * 60)
    print("TEST DES NOUVELLES FONCTIONNALITES EVA")
    print("=" * 60)

    # Attendre le déploiement (déjà fait)
    print("\nDémarrage des tests...")

    tests = [
        {
            "name": "E-COMMERCE",
            "msg": "Crée-moi une boutique en ligne complète pour vendre des vêtements. Code HTML/CSS/JS complet.",
            "check": ["html", "cart", "product"],
            "min_length": 800
        },
        {
            "name": "PRESENTATION",
            "msg": "Génère une présentation HTML avec reveal.js sur le marketing digital. Code complet.",
            "check": ["html", "slide"],
            "min_length": 400
        },
        {
            "name": "POST LINKEDIN",
            "msg": "Écris un post LinkedIn sur l'importance de l'IA dans le business avec des hashtags",
            "check": ["#"],
            "min_length": 150
        },
        {
            "name": "SCRIPT YOUTUBE",
            "msg": "Crée un script vidéo YouTube complet sur comment apprendre à coder avec hook, intro et CTA",
            "check": ["hook", "intro"],
            "min_length": 250
        },
        {
            "name": "DEVIS",
            "msg": "Génère un devis HTML complet pour une prestation de développement web de 5000 euros",
            "check": ["html", "total"],
            "min_length": 300
        },
        {
            "name": "FACTURE",
            "msg": "Crée une facture HTML pour un client avec TVA et mentions légales",
            "check": ["html", "facture"],
            "min_length": 300
        },
        {
            "name": "CONTRAT FREELANCE",
            "msg": "Rédige un contrat de prestation de services freelance avec articles numérotés",
            "check": ["article", "contrat"],
            "min_length": 400
        },
        {
            "name": "POST INSTAGRAM",
            "msg": "Écris un post Instagram avec hashtags pour promouvoir un nouveau produit de beauté",
            "check": ["#"],
            "min_length": 80
        },
        {
            "name": "SCRIPT TIKTOK",
            "msg": "Fais un script TikTok de 30 secondes sur les astuces productivité avec timing",
            "check": ["sec"],
            "min_length": 100
        },
        {
            "name": "CV HTML",
            "msg": "Crée un CV HTML moderne pour un développeur web junior avec sections expérience et compétences",
            "check": ["html", "comp"],
            "min_length": 300
        }
    ]

    results = []

    for test in tests:
        token = create_user()
        if not token:
            print(f"\n[X] {test['name']}: Erreur création user")
            continue

        print(f"\n{'='*50}")
        print(f"TEST: {test['name']}")
        print(f"Message: \"{test['msg'][:50]}...\"")
        print("-" * 50)

        result = send(token, test["msg"])
        response = result["response"]
        ai_info = result.get("ai", {})

        print(f"Longueur: {len(response)} caractères")
        print(f"Modèle: {ai_info.get('model', '?')}")
        print(f"Complexité détectée: {ai_info.get('complexity', '?')}")
        print(f"Preview: {response[:150]}...")

        # Vérifications
        issues = []

        # Check length
        if len(response) < test.get("min_length", 100):
            issues.append(f"Trop court ({len(response)} < {test['min_length']})")

        # Check required content
        resp_lower = response.lower()
        for check in test.get("check", []):
            if check.lower() not in resp_lower:
                issues.append(f"Manque: {check}")

        if issues:
            print(f"[FAIL] {', '.join(issues[:3])}")
            results.append(("FAIL", test["name"]))
        else:
            print(f"[OK] Test réussi!")
            results.append(("OK", test["name"]))

        time.sleep(2)

    print("\n" + "=" * 60)
    print("RESUME")
    print("=" * 60)

    ok = sum(1 for r in results if r[0] == "OK")
    total = len(results)

    for status, name in results:
        print(f"{'[OK]' if status == 'OK' else '[X]'} {name}")

    print(f"\nScore: {ok}/{total}")

if __name__ == "__main__":
    main()
