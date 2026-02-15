"""
Eva AI Full Test Suite - Multiple Scenarios
Tests: websites, code, desktop actions, general chat, tasks, etc.
"""

import requests
import json
import time
from datetime import datetime

API_URL = "https://agent-saas.onrender.com/api"

# Comprehensive test scenarios
TEST_SCENARIOS = [
    # ========== GENERAL CHAT ==========
    {
        "category": "General",
        "name": "Simple greeting",
        "message": "Salut !",
        "expected": "Short intro, ask name",
        "max_words": 30
    },
    {
        "category": "General",
        "name": "Name introduction",
        "message": "Je m'appelle Sophie",
        "expected": "Use name, ask job",
        "max_words": 30
    },
    {
        "category": "General",
        "name": "Joke request",
        "message": "Raconte-moi une blague",
        "expected": "Tell a joke",
        "max_words": 50
    },
    {
        "category": "General",
        "name": "Weather question",
        "message": "Quel temps fait-il à Paris ?",
        "expected": "Explain can't access weather",
        "max_words": 40
    },

    # ========== DESKTOP ACTIONS ==========
    {
        "category": "Desktop",
        "name": "Create file request",
        "message": "Crée un fichier test.txt sur mon bureau avec 'Hello World' dedans",
        "expected": "Instructions or action to create file",
        "keywords": ["fichier", "créer", "bureau", "desktop"]
    },
    {
        "category": "Desktop",
        "name": "List files request",
        "message": "Montre-moi les fichiers dans mon dossier Documents",
        "expected": "Explain need desktop app or show how",
        "keywords": ["fichiers", "documents", "dossier"]
    },
    {
        "category": "Desktop",
        "name": "Execute command request",
        "message": "Lance la commande 'dir' sur Windows",
        "expected": "Explain need desktop app",
        "keywords": ["commande", "exécuter", "desktop"]
    },
    {
        "category": "Desktop",
        "name": "Open URL request",
        "message": "Ouvre Google dans mon navigateur",
        "expected": "Explain need desktop app or provide link",
        "keywords": ["ouvrir", "navigateur", "google"]
    },
    {
        "category": "Desktop",
        "name": "Clipboard request",
        "message": "Copie ce texte dans mon presse-papiers: Mon numéro est 0612345678",
        "expected": "Explain need desktop app",
        "keywords": ["copier", "presse-papiers", "clipboard"]
    },

    # ========== CODE GENERATION ==========
    {
        "category": "Code",
        "name": "Python function",
        "message": "Écris une fonction Python qui calcule la factorielle",
        "expected": "Generate Python code",
        "must_contain": ["def ", "factorial", "return"]
    },
    {
        "category": "Code",
        "name": "SQL query",
        "message": "Écris une requête SQL pour sélectionner tous les utilisateurs actifs",
        "expected": "Generate SQL query",
        "must_contain": ["SELECT", "FROM", "WHERE"]
    },
    {
        "category": "Code",
        "name": "React component",
        "message": "Crée un composant React pour un bouton avec un compteur",
        "expected": "Generate React component",
        "must_contain": ["function", "useState", "return"]
    },
    {
        "category": "Code",
        "name": "CSS animation",
        "message": "Crée une animation CSS pour faire pulser un élément",
        "expected": "Generate CSS keyframes",
        "must_contain": ["@keyframes", "animation"]
    },

    # ========== WEBSITE GENERATION ==========
    {
        "category": "Website",
        "name": "Portfolio simple",
        "message": "Crée-moi un portfolio de développeur",
        "expected": "Generate HTML/CSS code",
        "must_contain": ["<!DOCTYPE html>", "<style>", "</html>"]
    },
    {
        "category": "Website",
        "name": "Landing page startup",
        "message": "Fais une landing page pour une startup IA appelée NeurAI",
        "expected": "Generate complete landing page",
        "must_contain": ["<!DOCTYPE html>", "NeurAI"]
    },
    {
        "category": "Website",
        "name": "E-commerce page",
        "message": "Crée une page produit pour des sneakers Nike Air Max",
        "expected": "Generate product page",
        "must_contain": ["<!DOCTYPE html>", "Nike", "Air Max"]
    },

    # ========== TASK MANAGEMENT ==========
    {
        "category": "Tasks",
        "name": "Create todo list",
        "message": "Aide-moi à créer une liste de tâches pour lancer mon business",
        "expected": "Provide structured task list",
        "keywords": ["1.", "2.", "3."]
    },
    {
        "category": "Tasks",
        "name": "Project planning",
        "message": "Planifie les étapes pour créer une app mobile",
        "expected": "Structured plan with phases",
        "keywords": ["étape", "phase", "développement"]
    },

    # ========== ADVICE & STRATEGY ==========
    {
        "category": "Advice",
        "name": "Marketing strategy",
        "message": "Donne-moi 3 conseils pour améliorer mon SEO",
        "expected": "Concise SEO tips",
        "max_words": 150
    },
    {
        "category": "Advice",
        "name": "Business advice",
        "message": "Comment trouver mes premiers clients en freelance ?",
        "expected": "Actionable advice",
        "keywords": ["client", "freelance", "trouver"]
    },

    # ========== TRANSLATION ==========
    {
        "category": "Translation",
        "name": "French to English",
        "message": "Traduis en anglais: Bonjour, comment allez-vous ?",
        "expected": "English translation",
        "must_contain": ["Hello", "how"]
    },
    {
        "category": "Translation",
        "name": "English to French",
        "message": "Translate to French: The quick brown fox jumps over the lazy dog",
        "expected": "French translation",
        "must_contain": ["renard", "chien"]
    },

    # ========== EXPLANATIONS ==========
    {
        "category": "Explain",
        "name": "Technical concept",
        "message": "Explique-moi ce qu'est une API REST en 2 phrases",
        "expected": "Brief explanation",
        "max_words": 60
    },
    {
        "category": "Explain",
        "name": "Simple concept",
        "message": "C'est quoi le machine learning ?",
        "expected": "Simple explanation",
        "max_words": 80
    },

    # ========== MATH ==========
    {
        "category": "Math",
        "name": "Simple calculation",
        "message": "Combien font 15% de 250 ?",
        "expected": "Answer: 37.5",
        "must_contain": ["37"]
    },
    {
        "category": "Math",
        "name": "Word problem",
        "message": "J'ai 3 pommes, j'en donne 1 et j'en achète 5. Combien j'en ai ?",
        "expected": "Answer: 7",
        "must_contain": ["7"]
    },
]

def create_test_user():
    """Create a test user account"""
    email = f"fulltest_{int(time.time())}@test.com"
    password = "TestPass123!"

    try:
        response = requests.post(f"{API_URL}/auth/register", json={
            "email": email,
            "password": password,
            "name": "Full Test User"
        })

        if response.status_code == 201:
            data = response.json()
            return {
                "email": email,
                "token": data.get("accessToken"),
            }
    except Exception as e:
        print(f"Error creating test user: {e}")

    return None

def send_message(token, message, language="fr"):
    """Send a message to Eva"""
    try:
        response = requests.post(
            f"{API_URL}/agent/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": message, "language": language},
            timeout=60
        )

        if response.status_code == 200:
            data = response.json()
            return {
                "response": data.get("response", ""),
                "ai_info": data.get("ai", {}),
            }
    except Exception as e:
        print(f"Error sending message: {e}")

    return None

def evaluate_response(scenario, response):
    """Evaluate response quality"""
    issues = []
    score = 10

    if not response:
        return {"score": 0, "issues": ["No response"]}

    text = response.lower()
    word_count = len(response.split())

    # Check max words
    if "max_words" in scenario and word_count > scenario["max_words"]:
        issues.append(f"Too long: {word_count} words (max: {scenario['max_words']})")
        score -= 2

    # Check must_contain
    if "must_contain" in scenario:
        for keyword in scenario["must_contain"]:
            if keyword.lower() not in text:
                issues.append(f"Missing: '{keyword}'")
                score -= 2

    # Check keywords (at least one)
    if "keywords" in scenario:
        found = any(kw.lower() in text for kw in scenario["keywords"])
        if not found:
            issues.append(f"Missing keywords: {scenario['keywords']}")
            score -= 2

    # Check for generic phrases
    generic_phrases = ["absolument", "certainement", "bien sûr", "en tant qu'ia", "je suis désolé"]
    for phrase in generic_phrases:
        if phrase in text:
            issues.append(f"Generic phrase: '{phrase}'")
            score -= 1

    # Check for code in website/code scenarios
    if scenario["category"] in ["Website", "Code"]:
        if "```" not in response:
            issues.append("No code block found")
            score -= 3

    return {"score": max(0, score), "issues": issues}

def run_tests():
    """Run all tests"""
    print("=" * 70)
    print("EVA FULL TEST SUITE")
    print("=" * 70)

    # Create test user
    print("\nCreating test user...")
    user = create_test_user()
    if not user:
        print("Failed to create test user!")
        return

    print(f"Test user: {user['email']}\n")

    results_by_category = {}
    all_results = []

    for scenario in TEST_SCENARIOS:
        category = scenario["category"]
        name = scenario["name"]

        print(f"\n[{category}] {name}")
        print(f"  Message: {scenario['message'][:60]}...")

        response = send_message(user["token"], scenario["message"])

        if response:
            eva_response = response["response"]
            ai_info = response.get("ai_info", {})

            print(f"  Eva: {eva_response[:100]}...")
            print(f"  Model: {ai_info.get('model', 'unknown')} | Cost: ${ai_info.get('cost', 0):.6f}")

            evaluation = evaluate_response(scenario, eva_response)

            if evaluation["issues"]:
                print(f"  Issues: {', '.join(evaluation['issues'][:3])}")

            print(f"  Score: {evaluation['score']}/10")

            result = {
                "category": category,
                "name": name,
                "message": scenario["message"],
                "response": eva_response,
                "score": evaluation["score"],
                "issues": evaluation["issues"],
                "ai_info": ai_info
            }

            all_results.append(result)

            if category not in results_by_category:
                results_by_category[category] = []
            results_by_category[category].append(result)
        else:
            print("  ERROR: No response!")
            all_results.append({
                "category": category,
                "name": name,
                "score": 0,
                "issues": ["No response"]
            })

        time.sleep(1.5)  # Rate limiting

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY BY CATEGORY")
    print("=" * 70)

    total_score = 0
    total_tests = 0

    for category, results in results_by_category.items():
        scores = [r["score"] for r in results]
        avg_score = sum(scores) / len(scores) if scores else 0
        total_score += sum(scores)
        total_tests += len(scores)

        status = "✅" if avg_score >= 8 else "⚠️" if avg_score >= 6 else "❌"
        print(f"{status} {category}: {avg_score:.1f}/10 ({len(results)} tests)")

    overall_avg = total_score / total_tests if total_tests else 0
    print(f"\n{'=' * 70}")
    print(f"OVERALL SCORE: {overall_avg:.1f}/10")
    print(f"{'=' * 70}")

    # Save results
    output = {
        "timestamp": datetime.now().isoformat(),
        "overall_score": overall_avg,
        "results": all_results,
        "by_category": {
            cat: {
                "avg_score": sum(r["score"] for r in res) / len(res),
                "count": len(res)
            }
            for cat, res in results_by_category.items()
        }
    }

    with open("eva_full_test_results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nResults saved to eva_full_test_results.json")

if __name__ == "__main__":
    run_tests()
