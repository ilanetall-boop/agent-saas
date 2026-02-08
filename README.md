# 🤖 Agent SaaS (Nom de code)

> Un agent IA personnel pour chaque utilisateur. Il apprend, il agit, il évolue.

## Vision

Donner à tout le monde accès à un assistant IA qui ne fait pas que parler — il **fait**.
- Développe des projets
- Automatise des tâches
- Gère le quotidien
- Business ou perso

## Stack technique

- **Framework agent** : OpenClaw (fork)
- **LLM** : Claude API (Anthropic)
- **Backend** : Node.js
- **Database** : SQLite / PostgreSQL
- **Auth** : Simple (email magic link)
- **Channels** : Telegram (MVP), puis Web, WhatsApp
- **Hosting** : VPS (Hetzner/OVH) ou Railway

## MVP — Phase 1 (2-3 semaines)

### Fonctionnalités
- [ ] Landing page + inscription
- [ ] Connexion Telegram en 1 clic (BotFather flow)
- [ ] Onboarding conversationnel (5 questions)
- [ ] Mémoire persistante par utilisateur
- [ ] Actions basiques :
  - [ ] Recherche web
  - [ ] Rappels / alarmes
  - [ ] Écriture (emails, posts, textes)
  - [ ] Réponses intelligentes
- [ ] Dashboard simple (stats d'usage)
- [ ] Paiement Stripe (29€/mois)

### Ce qu'on reporte (Phase 2+)
- Exécution de code
- Browser automation
- Intégrations (CRM, Sheets, etc.)
- Multi-agents
- WhatsApp / Web widget

## Structure

```
agent-saas/
├── docs/           # Documentation
├── src/
│   ├── api/        # Backend API
│   ├── web/        # Landing + Dashboard
│   └── agent/      # Core agent logic
├── scripts/        # Setup & deploy scripts
└── README.md
```

## Business Model

| Plan | Prix | Limites |
|------|------|---------|
| Free | 0€ | 50 msgs/mois, rappels only |
| Perso | 29€/mois | 2000 msgs, toutes actions |
| Pro | 79€/mois | 10K msgs, code, automations |

## Roadmap

- **Semaine 1** : Landing + Auth + Telegram bot setup
- **Semaine 2** : Agent core + mémoire + onboarding
- **Semaine 3** : Actions + Stripe + Beta test

---

*Projet démarré le 8 février 2026*
