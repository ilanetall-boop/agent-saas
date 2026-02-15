"""
Eva AI - Tests avec Vraies Personas (14-90 ans)
Simulation réaliste de vrais utilisateurs de tous âges
"""

import requests
import json
import time
from datetime import datetime
import random
import sys

# Fix Windows console encoding
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API_URL = "https://agent-saas.onrender.com/api"

# ============================================================
# PERSONAS RÉALISTES - 14 À 90 ANS
# ============================================================

PERSONAS = [
    # ========== ADOLESCENTS (14-17) ==========
    {
        "name": "Léa",
        "age": 14,
        "profile": "Collégienne, fan de K-pop et TikTok",
        "style": "Abréviations, emojis, langage jeune",
        "messages": [
            "slt 😊",
            "jsuis en 3eme et jcomprend rien aux maths mdr",
            "tu px m'expliquer les équations stp?? 🙏",
            "c trop bien!! et sinon tu connais bts??",
            "fais moi un site pour ma page de fan kpop 💜"
        ]
    },
    {
        "name": "Enzo",
        "age": 16,
        "profile": "Lycéen, gamer, veut devenir dev",
        "style": "Langage gamer, anglicismes",
        "messages": [
            "yo",
            "je veux apprendre à coder des jeux c possible?",
            "genre par quoi je commence? python ou c++?",
            "t'as des tips pour faire un petit jeu genre snake?",
            "écris moi le code stp j'ai la flemme 😂"
        ]
    },
    {
        "name": "Inès",
        "age": 17,
        "profile": "Terminale, stressée par le bac",
        "style": "Anxieuse, questions rapides",
        "messages": [
            "Salut j'ai mon bac dans 2 mois et je stress grave",
            "Comment je fais pour réviser efficacement??",
            "J'arrive pas à me concentrer plus de 20 min",
            "Tu peux me faire une fiche de révision sur la révolution française?",
            "Merci t'es plus utile que mes profs lol"
        ]
    },

    # ========== JEUNES ADULTES (18-25) ==========
    {
        "name": "Hugo",
        "age": 19,
        "profile": "Étudiant en informatique, premier appart",
        "style": "Décontracté, curieux tech",
        "messages": [
            "Hey! Je suis en L1 info",
            "Tu peux m'expliquer les pointeurs en C? Je galère",
            "Et sinon tu sais faire des recettes pas chères? J'ai 50€ pour la semaine",
            "Ah nice! Et pour mon projet web, fais moi un portfolio moderne",
            "Avec du React si possible"
        ]
    },
    {
        "name": "Chloé",
        "age": 22,
        "profile": "Jeune diplômée en marketing, cherche emploi",
        "style": "Professionnelle mais friendly",
        "messages": [
            "Bonjour!",
            "Je cherche mon premier emploi en marketing digital",
            "Tu peux m'aider à améliorer mon CV?",
            "Comment je me démarque des autres candidats?",
            "Écris-moi une lettre de motivation pour un poste chez L'Oréal"
        ]
    },
    {
        "name": "Mehdi",
        "age": 25,
        "profile": "Dev junior, veut monter en compétences",
        "style": "Technique, direct",
        "messages": [
            "Salut",
            "Je suis dev React depuis 1 an, je veux passer senior",
            "Quelles compétences je dois développer?",
            "Tu connais les design patterns les plus utilisés?",
            "Montre-moi un exemple de clean architecture en Node.js"
        ]
    },

    # ========== ADULTES (26-40) ==========
    {
        "name": "Sarah",
        "age": 28,
        "profile": "Chef de projet, maman d'un bébé",
        "style": "Efficace, manque de temps",
        "messages": [
            "Bonjour, j'ai pas beaucoup de temps",
            "Je dois faire une présentation demain sur l'IA pour mon boss",
            "Donne-moi les 5 points clés à présenter",
            "Comment l'IA peut aider dans la gestion de projet?",
            "Fais-moi un slide deck rapide stp"
        ]
    },
    {
        "name": "Thomas",
        "age": 32,
        "profile": "Entrepreneur, lance sa startup",
        "style": "Business, orienté résultats",
        "messages": [
            "Hello",
            "Je monte une boîte de livraison de repas healthy",
            "J'ai besoin d'un business plan solide",
            "Quel budget marketing pour les 6 premiers mois?",
            "Crée-moi une landing page qui convertit"
        ]
    },
    {
        "name": "Fatima",
        "age": 35,
        "profile": "Médecin généraliste, curieuse nouvelles technos",
        "style": "Précise, scientifique",
        "messages": [
            "Bonjour",
            "Je suis médecin et j'aimerais comprendre comment l'IA peut m'aider",
            "Quels sont les risques éthiques de l'IA en médecine?",
            "Tu peux m'aider à vulgariser des infos santé pour mes patients?",
            "Écris un texte simple sur la prévention du diabète"
        ]
    },
    {
        "name": "Alexandre",
        "age": 38,
        "profile": "Avocat d'affaires, travaille beaucoup",
        "style": "Formel, précis",
        "messages": [
            "Bonjour",
            "J'ai besoin d'aide pour rédiger un contrat type de prestation de services",
            "Quelles clauses sont essentielles?",
            "Tu connais le RGPD? J'ai des questions",
            "Résume-moi les obligations d'une entreprise concernant les données personnelles"
        ]
    },

    # ========== MILIEU DE VIE (41-55) ==========
    {
        "name": "Nathalie",
        "age": 45,
        "profile": "DRH, gère une équipe de 20 personnes",
        "style": "Managériale, bienveillante",
        "messages": [
            "Bonjour",
            "Comment gérer un conflit entre deux collaborateurs?",
            "Un de mes employés semble en burn-out, que faire?",
            "Tu peux m'aider à rédiger un mail d'annonce de restructuration?",
            "Comment garder la motivation de l'équipe en période difficile?"
        ]
    },
    {
        "name": "Philippe",
        "age": 48,
        "profile": "Artisan plombier, veut se digitaliser",
        "style": "Pratique, pas très tech",
        "messages": [
            "Bonjour",
            "Je suis plombier depuis 25 ans, je veux créer mon site internet",
            "C'est quoi le mieux pour avoir des clients sur Google?",
            "Je comprends pas trop ces histoires de référencement",
            "Tu peux me faire un site simple pour mon entreprise?"
        ]
    },
    {
        "name": "Isabelle",
        "age": 52,
        "profile": "Prof de français, passionnée de littérature",
        "style": "Cultivée, bon français",
        "messages": [
            "Bonjour",
            "Je cherche des idées pour rendre mes cours plus interactifs",
            "Comment intéresser les ados à Molière?",
            "Peux-tu me suggérer des exercices d'écriture créative?",
            "Analyse-moi ce passage de Madame Bovary en 10 lignes"
        ]
    },

    # ========== SENIORS ACTIFS (56-70) ==========
    {
        "name": "Jean-Pierre",
        "age": 58,
        "profile": "Directeur commercial, proche retraite",
        "style": "Expérimenté, parfois sceptique",
        "messages": [
            "Bonjour",
            "On me parle beaucoup d'intelligence artificielle au travail",
            "C'est vraiment utile ou c'est du marketing?",
            "Comment ça peut m'aider concrètement dans mon métier?",
            "Je veux préparer ma succession, tu as des conseils?"
        ]
    },
    {
        "name": "Martine",
        "age": 62,
        "profile": "Jeune retraitée, veut voyager",
        "style": "Enthousiaste, découvre la tech",
        "messages": [
            "Bonjour! Je suis nouvelle ici",
            "Je viens de prendre ma retraite et je veux voyager",
            "Tu peux m'aider à organiser un voyage au Japon?",
            "C'est quoi la meilleure période pour y aller?",
            "Et niveau budget, je dois prévoir combien pour 2 semaines?"
        ]
    },
    {
        "name": "Bernard",
        "age": 67,
        "profile": "Retraité, ancien comptable, aime le jardinage",
        "style": "Méthodique, patient",
        "messages": [
            "Bonjour",
            "Je voudrais créer un potager mais je ne sais pas par où commencer",
            "Quels légumes sont faciles pour un débutant?",
            "Comment je protège mes tomates des maladies?",
            "Tu peux me faire un calendrier de plantation pour ma région (Bretagne)?"
        ]
    },

    # ========== SENIORS (71-80) ==========
    {
        "name": "Monique",
        "age": 72,
        "profile": "Veuve, grand-mère de 5 petits-enfants",
        "style": "Chaleureux, parfois perdue avec la tech",
        "messages": [
            "Bonjour ma petite",
            "Je ne suis pas très douée avec les ordinateurs",
            "Mon petit-fils m'a installé ça, il dit que tu peux m'aider",
            "Je voudrais envoyer des photos à ma famille, comment on fait?",
            "Et c'est quoi cette histoire de cloud dont tout le monde parle?"
        ]
    },
    {
        "name": "Jacques",
        "age": 75,
        "profile": "Ancien professeur d'histoire, passionné",
        "style": "Érudit, curieux",
        "messages": [
            "Bonjour",
            "J'écris un livre sur la Résistance en Normandie",
            "Peux-tu m'aider à structurer mon plan?",
            "Quelles sources me recommandes-tu?",
            "Rédige-moi une introduction qui donne envie de lire la suite"
        ]
    },
    {
        "name": "Jeannine",
        "age": 78,
        "profile": "Vit seule, aime tricoter et cuisiner",
        "style": "Simple, gentil, parfois répétitif",
        "messages": [
            "Bonjour",
            "Tu es gentille de m'aider",
            "Je cherche une recette de tarte aux pommes comme faisait ma mère",
            "Avec de la cannelle, elle mettait de la cannelle",
            "Tu peux m'écrire la recette en gros caractères?"
        ]
    },

    # ========== GRANDS SENIORS (81-90) ==========
    {
        "name": "Marcel",
        "age": 84,
        "profile": "Ancien résistant, vit en maison de retraite",
        "style": "Lent, nostalgie, sagesse",
        "messages": [
            "Bonjour jeune fille",
            "C'est mon arrière-petite-fille qui m'a montré cette machine",
            "À mon époque on n'avait pas tout ça",
            "Tu peux me raconter comment c'est le monde aujourd'hui?",
            "Les jeunes ils ont l'air tous sur leurs téléphones..."
        ]
    },
    {
        "name": "Germaine",
        "age": 87,
        "profile": "Ancienne couturière, mémoire qui flanche",
        "style": "Confus parfois, attachant",
        "messages": [
            "Bonjour... c'est toi Marie?",
            "Ah non pardon, c'est cette machine qui parle",
            "Je voulais... qu'est-ce que je voulais déjà?",
            "Ah oui! Une recette de soupe aux légumes",
            "Comme ma grand-mère faisait... tu la connais?"
        ]
    },
    {
        "name": "Henri",
        "age": 90,
        "profile": "Doyen de sa famille, lucide et philosophe",
        "style": "Sage, réfléchi, humour",
        "messages": [
            "Bonjour",
            "90 ans et je parle à une intelligence artificielle, qui l'eût cru!",
            "Dis-moi, tu penses quoi de la vie?",
            "J'ai vu deux guerres mondiales, le premier homme sur la Lune...",
            "Qu'est-ce qui attend les jeunes d'aujourd'hui selon toi?"
        ]
    },
]


def create_test_user():
    """Create a test user account"""
    email = f"personas_test_{int(time.time())}@test.com"
    password = "TestPass123!"

    try:
        response = requests.post(f"{API_URL}/auth/register", json={
            "email": email,
            "password": password,
            "name": "Personas Test"
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
            timeout=90
        )

        if response.status_code == 200:
            data = response.json()
            return {
                "response": data.get("response", ""),
                "ai_info": data.get("ai", {}),
            }
        else:
            return {"response": f"[ERROR {response.status_code}]", "ai_info": {}}
    except Exception as e:
        return {"response": f"[EXCEPTION: {e}]", "ai_info": {}}


def evaluate_persona_response(persona, message, response):
    """Evaluate if response is appropriate for the persona"""
    issues = []
    score = 10
    text = response.lower()

    # Check for inappropriate formality
    age = persona["age"]

    # For teens (14-17): should be casual, not too formal
    if age <= 17:
        if "je vous" in text or "veuillez" in text:
            issues.append("Too formal for teen")
            score -= 1

    # For elderly (75+): should be respectful, patient
    if age >= 75:
        if len(response.split()) > 200:
            issues.append("Response too long for elderly")
            score -= 1
        if "mdr" in text or "lol" in text:
            issues.append("Slang inappropriate for elderly")
            score -= 2

    # For confused elderly: should be extra gentle
    if age >= 80 and ("confus" in persona.get("style", "") or "mémoire" in persona.get("profile", "")):
        if "non" in text[:20] or "incorrect" in text:
            issues.append("Too blunt for confused elderly")
            score -= 2

    # Check for empathy in emotional situations
    emotional_keywords = ["stress", "triste", "perdu", "seule", "peur"]
    if any(kw in message.lower() for kw in emotional_keywords):
        empathy_words = ["comprends", "difficile", "là pour", "aide", "normal"]
        if not any(ew in text for ew in empathy_words):
            issues.append("Missing empathy")
            score -= 2

    # Check for age-appropriate language
    if age >= 60:
        tech_jargon = ["api", "backend", "frontend", "framework", "stack"]
        jargon_count = sum(1 for j in tech_jargon if j in text)
        if jargon_count >= 3:
            issues.append("Too much tech jargon for senior")
            score -= 1

    # Check for generic AI phrases
    generic = ["en tant qu'ia", "je suis désolé mais", "absolument"]
    for phrase in generic:
        if phrase in text:
            issues.append(f"Generic: '{phrase}'")
            score -= 1

    # Check for helpfulness
    if "?" in message and len(response) < 20:
        issues.append("Response too short")
        score -= 2

    return {"score": max(0, score), "issues": issues}


def run_persona_tests():
    """Run tests for all personas"""
    print("=" * 70)
    print("EVA AI - TESTS AVEC VRAIES PERSONAS (14-90 ANS)")
    print("=" * 70)
    print(f"Nombre de personas: {len(PERSONAS)}")
    print(f"Total messages: {sum(len(p['messages']) for p in PERSONAS)}")

    # Create test user
    print("\nCréation utilisateur test...")
    user = create_test_user()
    if not user:
        print("Échec création utilisateur!")
        return

    print(f"User: {user['email']}\n")

    all_results = []
    results_by_age_group = {
        "14-17 (Ados)": [],
        "18-25 (Jeunes adultes)": [],
        "26-40 (Adultes)": [],
        "41-55 (Milieu de vie)": [],
        "56-70 (Seniors actifs)": [],
        "71-80 (Seniors)": [],
        "81-90 (Grands seniors)": []
    }

    def get_age_group(age):
        if age <= 17: return "14-17 (Ados)"
        if age <= 25: return "18-25 (Jeunes adultes)"
        if age <= 40: return "26-40 (Adultes)"
        if age <= 55: return "41-55 (Milieu de vie)"
        if age <= 70: return "56-70 (Seniors actifs)"
        if age <= 80: return "71-80 (Seniors)"
        return "81-90 (Grands seniors)"

    for persona in PERSONAS:
        print(f"\n{'='*60}")
        print(f"[PERSONA] {persona['name']}, {persona['age']} ans")
        print(f"   {persona['profile']}")
        print(f"   Style: {persona['style']}")
        print("="*60)

        persona_scores = []
        persona_results = []

        for i, message in enumerate(persona["messages"]):
            print(f"\n  [{i+1}/{len(persona['messages'])}] \"{message[:50]}{'...' if len(message) > 50 else ''}\"")

            result = send_message(user["token"], message)
            response = result["response"]
            ai_info = result.get("ai_info", {})

            print(f"  Eva: {response[:100]}{'...' if len(response) > 100 else ''}")

            if ai_info:
                print(f"  [INFO] Model: {ai_info.get('model', '?')} | Cost: ${ai_info.get('cost', 0):.5f}")

            evaluation = evaluate_persona_response(persona, message, response)
            score = evaluation["score"]
            persona_scores.append(score)

            if evaluation["issues"]:
                print(f"  [!] Issues: {', '.join(evaluation['issues'])}")

            print(f"  Score: {score}/10")

            msg_result = {
                "persona": persona["name"],
                "age": persona["age"],
                "message": message,
                "response": response,
                "score": score,
                "issues": evaluation["issues"],
                "ai_info": ai_info
            }
            persona_results.append(msg_result)
            all_results.append(msg_result)

            time.sleep(1.5)  # Rate limit

        # Persona summary
        avg_score = sum(persona_scores) / len(persona_scores) if persona_scores else 0
        status = "[OK]" if avg_score >= 8 else "[WARN]" if avg_score >= 6 else "[FAIL]"
        print(f"\n  {status} Score moyen pour {persona['name']}: {avg_score:.1f}/10")

        age_group = get_age_group(persona["age"])
        results_by_age_group[age_group].append({
            "name": persona["name"],
            "age": persona["age"],
            "avg_score": avg_score,
            "results": persona_results
        })

    # Final Summary
    print("\n" + "=" * 70)
    print("RÉSUMÉ PAR TRANCHE D'ÂGE")
    print("=" * 70)

    total_score = 0
    total_count = 0

    for age_group, personas_data in results_by_age_group.items():
        if personas_data:
            scores = [p["avg_score"] for p in personas_data]
            avg = sum(scores) / len(scores)
            total_score += sum(scores)
            total_count += len(scores)

            status = "[OK]" if avg >= 8 else "[WARN]" if avg >= 6 else "[FAIL]"
            names = ", ".join([p["name"] for p in personas_data])
            print(f"{status} {age_group}: {avg:.1f}/10")
            print(f"   Personas: {names}")

    overall = total_score / total_count if total_count else 0
    print(f"\n{'='*70}")
    print(f"SCORE GLOBAL: {overall:.1f}/10")
    print(f"{'='*70}")

    # Problem areas
    print("\n" + "=" * 70)
    print("PROBLÈMES DÉTECTÉS")
    print("=" * 70)

    problems = [r for r in all_results if r["score"] < 8]
    for p in problems[:15]:
        print(f"[X] {p['persona']} ({p['age']} ans): {p['score']}/10")
        print(f"   Message: \"{p['message'][:40]}...\"")
        if p["issues"]:
            print(f"   Issues: {', '.join(p['issues'][:2])}")

    # Save results
    output = {
        "timestamp": datetime.now().isoformat(),
        "overall_score": overall,
        "total_personas": len(PERSONAS),
        "total_messages": len(all_results),
        "by_age_group": {
            group: {
                "avg_score": sum(p["avg_score"] for p in data) / len(data) if data else 0,
                "personas": [{"name": p["name"], "age": p["age"], "score": p["avg_score"]} for p in data]
            }
            for group, data in results_by_age_group.items()
        },
        "all_results": all_results
    }

    with open("eva_personas_results.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n[SAVED] Résultats sauvegardés: eva_personas_results.json")

    return output


if __name__ == "__main__":
    run_persona_tests()
