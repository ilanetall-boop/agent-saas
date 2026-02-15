"""
Test rapide - Vérification de l'adaptation d'Eva aux différents profils
"""

import requests
import time

API_URL = "https://agent-saas.onrender.com/api"

def create_user():
    email = f"adapt_test_{int(time.time())}@test.com"
    try:
        response = requests.post(f"{API_URL}/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "name": "Adapt Test"
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
            timeout=60
        )
        if response.status_code == 200:
            return response.json().get("response", "")
    except Exception as e:
        return f"[ERROR: {e}]"
    return "[NO RESPONSE]"

def main():
    print("=" * 60)
    print("TEST D'ADAPTATION D'EVA")
    print("=" * 60)

    token = create_user()
    if not token:
        print("Erreur création utilisateur")
        return

    tests = [
        {
            "name": "ADO - Langage SMS",
            "msg": "slt mdr jcomprend rien",
            "check_not": ["boulot", "travail", "emploi"],
            "check_has": ["Hey", "Salut", "yo"]
        },
        {
            "name": "SENIOR - Message formel",
            "msg": "Bonjour Madame, je cherche de l'aide",
            "check_not": ["mdr", "lol", "🔥", "KILLER"],
            "check_has": ["Bonjour", "vous", "aide"]
        },
        {
            "name": "STRESS - Besoin d'empathie",
            "msg": "Je suis vraiment stressé, j'en peux plus",
            "check_has": ["comprends", "difficile", "là", "aide"],
            "check_not": ["KILLER", "🔥", "MODE"]
        },
        {
            "name": "ÉTUDIANT - Pas demander le boulot",
            "msg": "je suis en terminale et j'ai besoin d'aide",
            "check_not": ["boulot", "travail", "entreprise", "job"],
            "check_has": ["bac", "terminale", "études", "cours", "aide"]
        }
    ]

    results = []

    for test in tests:
        print(f"\n{'='*50}")
        print(f"TEST: {test['name']}")
        print(f"Message: \"{test['msg']}\"")
        print("-" * 50)

        # Nouveau user pour chaque test (pas de contexte)
        token = create_user()
        if not token:
            print("Erreur user")
            continue

        response = send(token, test["msg"])
        print(f"Eva: {response[:200]}...")

        # Vérifications
        issues = []
        resp_lower = response.lower()

        # Check what should NOT be there
        for bad in test.get("check_not", []):
            if bad.lower() in resp_lower:
                issues.append(f"Contient '{bad}' (pas bien)")

        # Check what SHOULD be there (at least one)
        if "check_has" in test:
            found = any(good.lower() in resp_lower for good in test["check_has"])
            if not found:
                issues.append(f"Manque un de: {test['check_has']}")

        if issues:
            print(f"[FAIL] Issues: {', '.join(issues)}")
            results.append(("FAIL", test["name"]))
        else:
            print(f"[OK] Adaptation correcte!")
            results.append(("OK", test["name"]))

        time.sleep(2)

    print("\n" + "=" * 60)
    print("RÉSUMÉ")
    print("=" * 60)

    ok = sum(1 for r in results if r[0] == "OK")
    total = len(results)

    for status, name in results:
        print(f"{'[OK]' if status == 'OK' else '[X]'} {name}")

    print(f"\nScore: {ok}/{total}")

if __name__ == "__main__":
    main()
