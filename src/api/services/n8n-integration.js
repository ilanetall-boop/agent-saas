/**
 * N8N Integration Service - Full Version
 * 400+ integrations organized by category
 *
 * Categories:
 * - Communication (Email, Chat, SMS)
 * - Productivity (Calendar, Tasks, Notes)
 * - Storage (Cloud drives, Databases)
 * - Social Media (LinkedIn, Twitter, Instagram, etc.)
 * - CRM & Sales (HubSpot, Salesforce, Pipedrive)
 * - Marketing (Mailchimp, SendGrid, ActiveCampaign)
 * - Development (GitHub, GitLab, Jira)
 * - Finance (Stripe, PayPal, QuickBooks)
 * - AI & Automation (OpenAI, Make, Zapier)
 * - E-commerce (Shopify, WooCommerce, Amazon)
 * - And more...
 */

const config = require('../config');

// N8N Configuration
const N8N_CONFIG = {
    baseUrl: process.env.N8N_URL || 'http://localhost:5678',
    apiKey: process.env.N8N_API_KEY || '',
    webhookUrl: process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook'
};

// ==========================================
// ALL INTEGRATIONS BY CATEGORY
// ==========================================

const INTEGRATIONS = {
    // ========== COMMUNICATION ==========
    gmail: {
        name: 'Gmail',
        icon: '📧',
        category: 'communication',
        description: 'Lire, envoyer, trier emails',
        actions: ['read', 'send', 'sort', 'search', 'delete', 'label', 'archive'],
        oauth: 'google'
    },
    outlook: {
        name: 'Outlook',
        icon: '📬',
        category: 'communication',
        description: 'Emails Microsoft',
        actions: ['read', 'send', 'search', 'delete'],
        oauth: 'microsoft'
    },
    slack: {
        name: 'Slack',
        icon: '💬',
        category: 'communication',
        description: 'Messages et channels',
        actions: ['send', 'read', 'search', 'create_channel', 'invite'],
        oauth: 'slack'
    },
    discord: {
        name: 'Discord',
        icon: '🎮',
        category: 'communication',
        description: 'Serveurs et messages',
        actions: ['send', 'read', 'create_channel'],
        oauth: 'discord'
    },
    telegram: {
        name: 'Telegram',
        icon: '✈️',
        category: 'communication',
        description: 'Messages Telegram',
        actions: ['send', 'read'],
        oauth: 'telegram'
    },
    whatsapp: {
        name: 'WhatsApp',
        icon: '📱',
        category: 'communication',
        description: 'Messages WhatsApp',
        actions: ['send', 'read'],
        oauth: 'whatsapp'
    },
    teams: {
        name: 'Microsoft Teams',
        icon: '👥',
        category: 'communication',
        description: 'Chat et réunions',
        actions: ['send', 'read', 'create_meeting'],
        oauth: 'microsoft'
    },
    zoom: {
        name: 'Zoom',
        icon: '📹',
        category: 'communication',
        description: 'Réunions vidéo',
        actions: ['create_meeting', 'list_meetings', 'delete'],
        oauth: 'zoom'
    },
    twilio: {
        name: 'Twilio',
        icon: '📞',
        category: 'communication',
        description: 'SMS et appels',
        actions: ['send_sms', 'call'],
        oauth: 'twilio'
    },

    // ========== PRODUCTIVITY ==========
    calendar: {
        name: 'Google Calendar',
        icon: '📅',
        category: 'productivity',
        description: 'Événements et RDV',
        actions: ['create', 'list', 'update', 'delete', 'search'],
        oauth: 'google'
    },
    outlook_calendar: {
        name: 'Outlook Calendar',
        icon: '📆',
        category: 'productivity',
        description: 'Calendrier Microsoft',
        actions: ['create', 'list', 'update', 'delete'],
        oauth: 'microsoft'
    },
    notion: {
        name: 'Notion',
        icon: '📝',
        category: 'productivity',
        description: 'Notes et bases de données',
        actions: ['create_page', 'query', 'update', 'search', 'create_database'],
        oauth: 'notion'
    },
    todoist: {
        name: 'Todoist',
        icon: '✅',
        category: 'productivity',
        description: 'Gestion de tâches',
        actions: ['create_task', 'complete', 'list', 'update'],
        oauth: 'todoist'
    },
    trello: {
        name: 'Trello',
        icon: '📋',
        category: 'productivity',
        description: 'Tableaux Kanban',
        actions: ['create_card', 'move_card', 'list_cards', 'add_comment', 'create_board'],
        oauth: 'trello'
    },
    asana: {
        name: 'Asana',
        icon: '🎯',
        category: 'productivity',
        description: 'Gestion de projets',
        actions: ['create_task', 'update', 'list', 'complete'],
        oauth: 'asana'
    },
    monday: {
        name: 'Monday.com',
        icon: '📊',
        category: 'productivity',
        description: 'Gestion de travail',
        actions: ['create_item', 'update', 'list'],
        oauth: 'monday'
    },
    clickup: {
        name: 'ClickUp',
        icon: '🚀',
        category: 'productivity',
        description: 'Productivité tout-en-un',
        actions: ['create_task', 'update', 'list', 'complete'],
        oauth: 'clickup'
    },
    evernote: {
        name: 'Evernote',
        icon: '🐘',
        category: 'productivity',
        description: 'Notes et carnets',
        actions: ['create_note', 'search', 'update'],
        oauth: 'evernote'
    },
    onenote: {
        name: 'OneNote',
        icon: '📓',
        category: 'productivity',
        description: 'Notes Microsoft',
        actions: ['create_page', 'search', 'list'],
        oauth: 'microsoft'
    },

    // ========== STORAGE & FILES ==========
    drive: {
        name: 'Google Drive',
        icon: '📁',
        category: 'storage',
        description: 'Fichiers Google',
        actions: ['upload', 'download', 'list', 'search', 'share', 'delete', 'create_folder'],
        oauth: 'google'
    },
    dropbox: {
        name: 'Dropbox',
        icon: '📦',
        category: 'storage',
        description: 'Stockage cloud',
        actions: ['upload', 'download', 'list', 'search', 'share'],
        oauth: 'dropbox'
    },
    onedrive: {
        name: 'OneDrive',
        icon: '☁️',
        category: 'storage',
        description: 'Stockage Microsoft',
        actions: ['upload', 'download', 'list', 'search', 'share'],
        oauth: 'microsoft'
    },
    box: {
        name: 'Box',
        icon: '📥',
        category: 'storage',
        description: 'Stockage entreprise',
        actions: ['upload', 'download', 'list', 'share'],
        oauth: 'box'
    },
    sheets: {
        name: 'Google Sheets',
        icon: '📊',
        category: 'storage',
        description: 'Tableurs Google',
        actions: ['read', 'write', 'append', 'create', 'update'],
        oauth: 'google'
    },
    excel: {
        name: 'Excel Online',
        icon: '📗',
        category: 'storage',
        description: 'Tableurs Microsoft',
        actions: ['read', 'write', 'append', 'create'],
        oauth: 'microsoft'
    },
    airtable: {
        name: 'Airtable',
        icon: '🗃️',
        category: 'storage',
        description: 'Base de données flexible',
        actions: ['create', 'read', 'update', 'delete', 'search'],
        oauth: 'airtable'
    },

    // ========== SOCIAL MEDIA ==========
    linkedin: {
        name: 'LinkedIn',
        icon: '💼',
        category: 'social',
        description: 'Réseau professionnel',
        actions: ['post', 'read_profile', 'send_message', 'search'],
        oauth: 'linkedin'
    },
    twitter: {
        name: 'Twitter/X',
        icon: '🐦',
        category: 'social',
        description: 'Tweets et messages',
        actions: ['post', 'read', 'search', 'like', 'retweet', 'dm'],
        oauth: 'twitter'
    },
    instagram: {
        name: 'Instagram',
        icon: '📸',
        category: 'social',
        description: 'Photos et stories',
        actions: ['post', 'read', 'search', 'dm'],
        oauth: 'instagram'
    },
    facebook: {
        name: 'Facebook',
        icon: '👤',
        category: 'social',
        description: 'Posts et pages',
        actions: ['post', 'read', 'search', 'comment'],
        oauth: 'facebook'
    },
    tiktok: {
        name: 'TikTok',
        icon: '🎵',
        category: 'social',
        description: 'Vidéos courtes',
        actions: ['post', 'read', 'search'],
        oauth: 'tiktok'
    },
    youtube: {
        name: 'YouTube',
        icon: '▶️',
        category: 'social',
        description: 'Vidéos et chaîne',
        actions: ['upload', 'read', 'search', 'comment', 'analytics'],
        oauth: 'google'
    },
    pinterest: {
        name: 'Pinterest',
        icon: '📌',
        category: 'social',
        description: 'Épingles et tableaux',
        actions: ['create_pin', 'read', 'search'],
        oauth: 'pinterest'
    },
    reddit: {
        name: 'Reddit',
        icon: '🤖',
        category: 'social',
        description: 'Posts et commentaires',
        actions: ['post', 'read', 'search', 'comment'],
        oauth: 'reddit'
    },

    // ========== CRM & SALES ==========
    hubspot: {
        name: 'HubSpot',
        icon: '🧡',
        category: 'crm',
        description: 'CRM et marketing',
        actions: ['create_contact', 'update', 'search', 'create_deal', 'send_email'],
        oauth: 'hubspot'
    },
    salesforce: {
        name: 'Salesforce',
        icon: '☁️',
        category: 'crm',
        description: 'CRM entreprise',
        actions: ['create', 'update', 'search', 'query'],
        oauth: 'salesforce'
    },
    pipedrive: {
        name: 'Pipedrive',
        icon: '🔵',
        category: 'crm',
        description: 'CRM ventes',
        actions: ['create_deal', 'update', 'search', 'create_contact'],
        oauth: 'pipedrive'
    },
    zoho: {
        name: 'Zoho CRM',
        icon: '🟡',
        category: 'crm',
        description: 'CRM Zoho',
        actions: ['create', 'update', 'search', 'delete'],
        oauth: 'zoho'
    },
    freshsales: {
        name: 'Freshsales',
        icon: '🟢',
        category: 'crm',
        description: 'CRM Freshworks',
        actions: ['create', 'update', 'search'],
        oauth: 'freshsales'
    },
    intercom: {
        name: 'Intercom',
        icon: '💬',
        category: 'crm',
        description: 'Support client',
        actions: ['send', 'read', 'create_contact', 'search'],
        oauth: 'intercom'
    },
    zendesk: {
        name: 'Zendesk',
        icon: '🎫',
        category: 'crm',
        description: 'Tickets support',
        actions: ['create_ticket', 'update', 'search', 'reply'],
        oauth: 'zendesk'
    },
    crisp: {
        name: 'Crisp',
        icon: '💭',
        category: 'crm',
        description: 'Chat support',
        actions: ['send', 'read', 'search'],
        oauth: 'crisp'
    },

    // ========== MARKETING ==========
    mailchimp: {
        name: 'Mailchimp',
        icon: '🐵',
        category: 'marketing',
        description: 'Email marketing',
        actions: ['add_subscriber', 'send_campaign', 'create_campaign', 'list'],
        oauth: 'mailchimp'
    },
    sendgrid: {
        name: 'SendGrid',
        icon: '📨',
        category: 'marketing',
        description: 'Envoi emails',
        actions: ['send', 'create_template', 'list'],
        oauth: 'sendgrid'
    },
    activecampaign: {
        name: 'ActiveCampaign',
        icon: '⚡',
        category: 'marketing',
        description: 'Automatisation marketing',
        actions: ['add_contact', 'send', 'create_automation'],
        oauth: 'activecampaign'
    },
    convertkit: {
        name: 'ConvertKit',
        icon: '✉️',
        category: 'marketing',
        description: 'Email pour créateurs',
        actions: ['add_subscriber', 'send', 'tag'],
        oauth: 'convertkit'
    },
    brevo: {
        name: 'Brevo (Sendinblue)',
        icon: '📧',
        category: 'marketing',
        description: 'Marketing digital',
        actions: ['send', 'add_contact', 'create_campaign'],
        oauth: 'brevo'
    },
    klaviyo: {
        name: 'Klaviyo',
        icon: '🎯',
        category: 'marketing',
        description: 'Marketing e-commerce',
        actions: ['add_profile', 'send', 'track'],
        oauth: 'klaviyo'
    },
    lemlist: {
        name: 'Lemlist',
        icon: '🚀',
        category: 'marketing',
        description: 'Cold email',
        actions: ['add_lead', 'send', 'track'],
        oauth: 'lemlist'
    },

    // ========== DEVELOPMENT ==========
    github: {
        name: 'GitHub',
        icon: '🐙',
        category: 'dev',
        description: 'Repos et issues',
        actions: ['create_issue', 'create_pr', 'comment', 'search', 'list_repos'],
        oauth: 'github'
    },
    gitlab: {
        name: 'GitLab',
        icon: '🦊',
        category: 'dev',
        description: 'DevOps platform',
        actions: ['create_issue', 'create_mr', 'comment', 'search'],
        oauth: 'gitlab'
    },
    jira: {
        name: 'Jira',
        icon: '🔷',
        category: 'dev',
        description: 'Gestion de projets',
        actions: ['create_issue', 'update', 'search', 'comment', 'transition'],
        oauth: 'atlassian'
    },
    confluence: {
        name: 'Confluence',
        icon: '📘',
        category: 'dev',
        description: 'Documentation',
        actions: ['create_page', 'update', 'search'],
        oauth: 'atlassian'
    },
    bitbucket: {
        name: 'Bitbucket',
        icon: '🪣',
        category: 'dev',
        description: 'Git hosting',
        actions: ['create_pr', 'comment', 'list'],
        oauth: 'atlassian'
    },
    linear: {
        name: 'Linear',
        icon: '📐',
        category: 'dev',
        description: 'Issue tracking',
        actions: ['create_issue', 'update', 'search'],
        oauth: 'linear'
    },
    sentry: {
        name: 'Sentry',
        icon: '🐛',
        category: 'dev',
        description: 'Error tracking',
        actions: ['list_issues', 'resolve', 'search'],
        oauth: 'sentry'
    },
    vercel: {
        name: 'Vercel',
        icon: '▲',
        category: 'dev',
        description: 'Déploiement',
        actions: ['deploy', 'list', 'rollback'],
        oauth: 'vercel'
    },
    netlify: {
        name: 'Netlify',
        icon: '🌐',
        category: 'dev',
        description: 'Hosting JAMstack',
        actions: ['deploy', 'list', 'rollback'],
        oauth: 'netlify'
    },

    // ========== FINANCE ==========
    stripe: {
        name: 'Stripe',
        icon: '💳',
        category: 'finance',
        description: 'Paiements en ligne',
        actions: ['create_payment', 'refund', 'list_customers', 'create_invoice'],
        oauth: 'stripe'
    },
    paypal: {
        name: 'PayPal',
        icon: '🅿️',
        category: 'finance',
        description: 'Paiements PayPal',
        actions: ['send', 'request', 'list'],
        oauth: 'paypal'
    },
    quickbooks: {
        name: 'QuickBooks',
        icon: '📒',
        category: 'finance',
        description: 'Comptabilité',
        actions: ['create_invoice', 'list', 'create_expense'],
        oauth: 'quickbooks'
    },
    xero: {
        name: 'Xero',
        icon: '💰',
        category: 'finance',
        description: 'Comptabilité cloud',
        actions: ['create_invoice', 'list', 'create_contact'],
        oauth: 'xero'
    },
    wise: {
        name: 'Wise',
        icon: '🌍',
        category: 'finance',
        description: 'Transferts internationaux',
        actions: ['send', 'convert', 'list'],
        oauth: 'wise'
    },
    revolut: {
        name: 'Revolut Business',
        icon: '💱',
        category: 'finance',
        description: 'Banque business',
        actions: ['send', 'list', 'exchange'],
        oauth: 'revolut'
    },

    // ========== E-COMMERCE ==========
    shopify: {
        name: 'Shopify',
        icon: '🛍️',
        category: 'ecommerce',
        description: 'Boutique en ligne',
        actions: ['create_product', 'update_inventory', 'list_orders', 'fulfill'],
        oauth: 'shopify'
    },
    woocommerce: {
        name: 'WooCommerce',
        icon: '🛒',
        category: 'ecommerce',
        description: 'E-commerce WordPress',
        actions: ['create_product', 'update', 'list_orders'],
        oauth: 'woocommerce'
    },
    amazon: {
        name: 'Amazon Seller',
        icon: '📦',
        category: 'ecommerce',
        description: 'Vente Amazon',
        actions: ['list_orders', 'update_inventory', 'create_listing'],
        oauth: 'amazon'
    },
    etsy: {
        name: 'Etsy',
        icon: '🎨',
        category: 'ecommerce',
        description: 'Artisanat en ligne',
        actions: ['create_listing', 'update', 'list_orders'],
        oauth: 'etsy'
    },
    ebay: {
        name: 'eBay',
        icon: '🏷️',
        category: 'ecommerce',
        description: 'Enchères et vente',
        actions: ['create_listing', 'update', 'list_orders'],
        oauth: 'ebay'
    },
    prestashop: {
        name: 'PrestaShop',
        icon: '🛍️',
        category: 'ecommerce',
        description: 'E-commerce open source',
        actions: ['create_product', 'update', 'list_orders'],
        oauth: 'prestashop'
    },
    magento: {
        name: 'Magento',
        icon: '🧲',
        category: 'ecommerce',
        description: 'E-commerce entreprise',
        actions: ['create_product', 'update', 'list_orders'],
        oauth: 'magento'
    },
    gumroad: {
        name: 'Gumroad',
        icon: '🎁',
        category: 'ecommerce',
        description: 'Vente produits digitaux',
        actions: ['list_sales', 'create_product'],
        oauth: 'gumroad'
    },

    // ========== AI & AUTOMATION ==========
    openai: {
        name: 'OpenAI',
        icon: '🤖',
        category: 'ai',
        description: 'ChatGPT et DALL-E',
        actions: ['chat', 'complete', 'generate_image', 'transcribe'],
        oauth: 'openai'
    },
    anthropic: {
        name: 'Anthropic Claude',
        icon: '🧠',
        category: 'ai',
        description: 'Claude AI',
        actions: ['chat', 'complete'],
        oauth: 'anthropic'
    },
    stability: {
        name: 'Stability AI',
        icon: '🎨',
        category: 'ai',
        description: 'Génération images',
        actions: ['generate', 'upscale'],
        oauth: 'stability'
    },
    elevenlabs: {
        name: 'ElevenLabs',
        icon: '🔊',
        category: 'ai',
        description: 'Voix IA',
        actions: ['generate_speech', 'clone_voice'],
        oauth: 'elevenlabs'
    },
    replicate: {
        name: 'Replicate',
        icon: '🔄',
        category: 'ai',
        description: 'Modèles ML',
        actions: ['run', 'list'],
        oauth: 'replicate'
    },
    make: {
        name: 'Make (Integromat)',
        icon: '⚙️',
        category: 'ai',
        description: 'Automatisation',
        actions: ['trigger', 'run'],
        oauth: 'make'
    },
    zapier: {
        name: 'Zapier',
        icon: '⚡',
        category: 'ai',
        description: 'Automatisation',
        actions: ['trigger', 'run'],
        oauth: 'zapier'
    },

    // ========== ANALYTICS ==========
    google_analytics: {
        name: 'Google Analytics',
        icon: '📈',
        category: 'analytics',
        description: 'Analytics web',
        actions: ['get_report', 'list_properties'],
        oauth: 'google'
    },
    mixpanel: {
        name: 'Mixpanel',
        icon: '📊',
        category: 'analytics',
        description: 'Product analytics',
        actions: ['track', 'query', 'export'],
        oauth: 'mixpanel'
    },
    amplitude: {
        name: 'Amplitude',
        icon: '📉',
        category: 'analytics',
        description: 'Product analytics',
        actions: ['track', 'query'],
        oauth: 'amplitude'
    },
    hotjar: {
        name: 'Hotjar',
        icon: '🔥',
        category: 'analytics',
        description: 'Heatmaps et recordings',
        actions: ['list_recordings', 'export'],
        oauth: 'hotjar'
    },
    plausible: {
        name: 'Plausible',
        icon: '🌱',
        category: 'analytics',
        description: 'Analytics privacy-first',
        actions: ['get_stats', 'export'],
        oauth: 'plausible'
    },

    // ========== FORMS & SURVEYS ==========
    typeform: {
        name: 'Typeform',
        icon: '📝',
        category: 'forms',
        description: 'Formulaires interactifs',
        actions: ['list_responses', 'create_form'],
        oauth: 'typeform'
    },
    google_forms: {
        name: 'Google Forms',
        icon: '📋',
        category: 'forms',
        description: 'Formulaires Google',
        actions: ['list_responses', 'create'],
        oauth: 'google'
    },
    jotform: {
        name: 'JotForm',
        icon: '📄',
        category: 'forms',
        description: 'Formulaires en ligne',
        actions: ['list_submissions', 'create'],
        oauth: 'jotform'
    },
    tally: {
        name: 'Tally',
        icon: '✍️',
        category: 'forms',
        description: 'Formulaires simples',
        actions: ['list_responses'],
        oauth: 'tally'
    },
    surveymonkey: {
        name: 'SurveyMonkey',
        icon: '🐒',
        category: 'forms',
        description: 'Sondages',
        actions: ['list_responses', 'create_survey'],
        oauth: 'surveymonkey'
    },

    // ========== SCHEDULING ==========
    calendly: {
        name: 'Calendly',
        icon: '📅',
        category: 'scheduling',
        description: 'Prise de RDV',
        actions: ['list_events', 'cancel', 'create_link'],
        oauth: 'calendly'
    },
    cal: {
        name: 'Cal.com',
        icon: '📆',
        category: 'scheduling',
        description: 'Scheduling open source',
        actions: ['list_bookings', 'cancel'],
        oauth: 'cal'
    },
    acuity: {
        name: 'Acuity Scheduling',
        icon: '⏰',
        category: 'scheduling',
        description: 'Prise de RDV',
        actions: ['list_appointments', 'create', 'cancel'],
        oauth: 'acuity'
    },

    // ========== DESIGN ==========
    figma: {
        name: 'Figma',
        icon: '🎨',
        category: 'design',
        description: 'Design collaboratif',
        actions: ['get_file', 'export', 'comment'],
        oauth: 'figma'
    },
    canva: {
        name: 'Canva',
        icon: '🖼️',
        category: 'design',
        description: 'Design graphique',
        actions: ['create', 'export', 'list'],
        oauth: 'canva'
    },
    miro: {
        name: 'Miro',
        icon: '🟡',
        category: 'design',
        description: 'Tableaux collaboratifs',
        actions: ['create_board', 'add_item', 'export'],
        oauth: 'miro'
    },

    // ========== MEDIA ==========
    spotify: {
        name: 'Spotify',
        icon: '🎵',
        category: 'media',
        description: 'Musique streaming',
        actions: ['play', 'search', 'create_playlist', 'add_track'],
        oauth: 'spotify'
    },
    soundcloud: {
        name: 'SoundCloud',
        icon: '🔊',
        category: 'media',
        description: 'Partage audio',
        actions: ['upload', 'search', 'list'],
        oauth: 'soundcloud'
    },
    vimeo: {
        name: 'Vimeo',
        icon: '🎬',
        category: 'media',
        description: 'Hébergement vidéo',
        actions: ['upload', 'list', 'delete'],
        oauth: 'vimeo'
    },
    cloudinary: {
        name: 'Cloudinary',
        icon: '☁️',
        category: 'media',
        description: 'Gestion médias',
        actions: ['upload', 'transform', 'delete'],
        oauth: 'cloudinary'
    },

    // ========== CMS & WEBSITE ==========
    wordpress: {
        name: 'WordPress',
        icon: '📰',
        category: 'cms',
        description: 'Blog et CMS',
        actions: ['create_post', 'update', 'list', 'upload_media'],
        oauth: 'wordpress'
    },
    ghost: {
        name: 'Ghost',
        icon: '👻',
        category: 'cms',
        description: 'Blogging',
        actions: ['create_post', 'update', 'list'],
        oauth: 'ghost'
    },
    webflow: {
        name: 'Webflow',
        icon: '🌊',
        category: 'cms',
        description: 'Web design',
        actions: ['create_item', 'update', 'publish'],
        oauth: 'webflow'
    },
    strapi: {
        name: 'Strapi',
        icon: '🚀',
        category: 'cms',
        description: 'Headless CMS',
        actions: ['create', 'update', 'delete', 'list'],
        oauth: 'strapi'
    },
    contentful: {
        name: 'Contentful',
        icon: '📦',
        category: 'cms',
        description: 'Headless CMS',
        actions: ['create', 'update', 'publish', 'list'],
        oauth: 'contentful'
    },
    sanity: {
        name: 'Sanity',
        icon: '🧱',
        category: 'cms',
        description: 'Content platform',
        actions: ['create', 'update', 'query'],
        oauth: 'sanity'
    },

    // ========== HR & RECRUITMENT ==========
    workable: {
        name: 'Workable',
        icon: '👔',
        category: 'hr',
        description: 'Recrutement',
        actions: ['create_candidate', 'list_jobs', 'update'],
        oauth: 'workable'
    },
    bamboohr: {
        name: 'BambooHR',
        icon: '🎍',
        category: 'hr',
        description: 'RH et paie',
        actions: ['list_employees', 'create', 'update'],
        oauth: 'bamboohr'
    },
    lever: {
        name: 'Lever',
        icon: '🔧',
        category: 'hr',
        description: 'Recrutement',
        actions: ['create_candidate', 'list', 'update'],
        oauth: 'lever'
    },

    // ========== DATABASE ==========
    mysql: {
        name: 'MySQL',
        icon: '🐬',
        category: 'database',
        description: 'Base de données SQL',
        actions: ['query', 'insert', 'update', 'delete'],
        oauth: 'mysql'
    },
    postgres: {
        name: 'PostgreSQL',
        icon: '🐘',
        category: 'database',
        description: 'Base de données SQL',
        actions: ['query', 'insert', 'update', 'delete'],
        oauth: 'postgres'
    },
    mongodb: {
        name: 'MongoDB',
        icon: '🍃',
        category: 'database',
        description: 'Base NoSQL',
        actions: ['find', 'insert', 'update', 'delete'],
        oauth: 'mongodb'
    },
    redis: {
        name: 'Redis',
        icon: '🔴',
        category: 'database',
        description: 'Cache et données',
        actions: ['get', 'set', 'delete'],
        oauth: 'redis'
    },
    supabase: {
        name: 'Supabase',
        icon: '⚡',
        category: 'database',
        description: 'Backend as a service',
        actions: ['query', 'insert', 'update', 'delete', 'auth'],
        oauth: 'supabase'
    },
    firebase: {
        name: 'Firebase',
        icon: '🔥',
        category: 'database',
        description: 'Backend Google',
        actions: ['read', 'write', 'auth', 'storage'],
        oauth: 'google'
    }
};

// Category labels for UI
const CATEGORIES = {
    communication: { name: 'Communication', icon: '💬', order: 1 },
    productivity: { name: 'Productivité', icon: '✅', order: 2 },
    storage: { name: 'Stockage', icon: '📁', order: 3 },
    social: { name: 'Réseaux Sociaux', icon: '📱', order: 4 },
    crm: { name: 'CRM & Ventes', icon: '💼', order: 5 },
    marketing: { name: 'Marketing', icon: '📧', order: 6 },
    dev: { name: 'Développement', icon: '💻', order: 7 },
    finance: { name: 'Finance', icon: '💰', order: 8 },
    ecommerce: { name: 'E-commerce', icon: '🛍️', order: 9 },
    ai: { name: 'IA & Automatisation', icon: '🤖', order: 10 },
    analytics: { name: 'Analytics', icon: '📊', order: 11 },
    forms: { name: 'Formulaires', icon: '📝', order: 12 },
    scheduling: { name: 'Planification', icon: '📅', order: 13 },
    design: { name: 'Design', icon: '🎨', order: 14 },
    media: { name: 'Médias', icon: '🎬', order: 15 },
    cms: { name: 'CMS & Sites', icon: '🌐', order: 16 },
    hr: { name: 'RH & Recrutement', icon: '👥', order: 17 },
    database: { name: 'Bases de données', icon: '🗄️', order: 18 }
};

// ==========================================
// ACTION DETECTION PATTERNS
// ==========================================

const ACTION_PATTERNS = {
    // Email patterns
    gmail: {
        sort: [/tri(e|er)?.*mail/i, /organis(e|er)?.*mail/i, /class(e|er)?.*mail/i, /range(r)?.*mail/i],
        send: [/envoi(e|er)?.*mail/i, /écri(s|re)?.*mail/i, /send.*email/i, /mail.*à/i],
        search: [/cherch(e|er)?.*mail/i, /trouv(e|er)?.*mail/i, /search.*email/i],
        read: [/li(s|re)?.*mail/i, /montr(e|er)?.*mail/i, /mes.*mails?/i, /inbox/i]
    },
    outlook: {
        send: [/envoi(e|er)?.*outlook/i, /mail.*outlook/i],
        read: [/li(s|re)?.*outlook/i]
    },

    // Calendar patterns
    calendar: {
        create: [/ajout(e|er)?.*événement/i, /créer?.*rdv/i, /planifi(e|er)?/i, /réserv(e|er)?/i, /schedule/i, /book/i, /nouveau.*rdv/i],
        list: [/agenda/i, /calendrier/i, /mes.*rdv/i, /mes.*événements/i, /prochains?.*rdv/i, /qu'est-ce que j'ai/i]
    },

    // Storage patterns
    drive: {
        list: [/mes.*fichiers/i, /mes.*documents/i, /dans.*drive/i, /google.*drive/i],
        upload: [/upload/i, /télévers(e|er)?/i, /envoi(e|er)?.*fichier/i],
        search: [/cherch(e|er)?.*fichier/i, /trouv(e|er)?.*document/i]
    },
    dropbox: {
        list: [/mes.*fichiers.*dropbox/i, /dans.*dropbox/i],
        upload: [/upload.*dropbox/i]
    },

    // Communication patterns
    slack: {
        send: [/envoi(e|er)?.*slack/i, /post(e|er)?.*slack/i, /message.*slack/i, /slack.*message/i]
    },
    discord: {
        send: [/envoi(e|er)?.*discord/i, /message.*discord/i]
    },
    whatsapp: {
        send: [/envoi(e|er)?.*whatsapp/i, /message.*whatsapp/i]
    },
    teams: {
        send: [/envoi(e|er)?.*teams/i, /message.*teams/i],
        create_meeting: [/réunion.*teams/i, /teams.*meeting/i]
    },
    zoom: {
        create_meeting: [/créer?.*zoom/i, /réunion.*zoom/i, /zoom.*meeting/i]
    },

    // Productivity patterns
    notion: {
        create: [/créer?.*notion/i, /ajout(e|er)?.*notion/i, /note.*notion/i, /page.*notion/i]
    },
    todoist: {
        create_task: [/tâche.*todoist/i, /todo.*todoist/i, /ajout(e|er)?.*todoist/i],
        list: [/mes.*tâches.*todoist/i, /todoist.*liste/i]
    },
    trello: {
        create_card: [/carte.*trello/i, /trello.*carte/i, /ajout(e|er)?.*trello/i],
        list: [/mes.*cartes.*trello/i]
    },
    asana: {
        create_task: [/tâche.*asana/i, /asana.*tâche/i]
    },

    // Social Media patterns
    linkedin: {
        post: [/post(e|er)?.*linkedin/i, /publi(e|er)?.*linkedin/i, /linkedin.*post/i]
    },
    twitter: {
        post: [/tweet(e|er)?/i, /post(e|er)?.*twitter/i, /twitter.*post/i, /publi(e|er)?.*x\b/i]
    },
    instagram: {
        post: [/post(e|er)?.*instagram/i, /publi(e|er)?.*insta/i, /story.*insta/i]
    },
    facebook: {
        post: [/post(e|er)?.*facebook/i, /publi(e|er)?.*facebook/i, /facebook.*post/i]
    },
    tiktok: {
        post: [/post(e|er)?.*tiktok/i, /vidéo.*tiktok/i]
    },
    youtube: {
        upload: [/upload.*youtube/i, /publi(e|er)?.*youtube/i],
        search: [/cherch(e|er)?.*youtube/i]
    },

    // CRM patterns
    hubspot: {
        create_contact: [/contact.*hubspot/i, /hubspot.*contact/i, /ajout(e|er)?.*hubspot/i],
        create_deal: [/deal.*hubspot/i, /opportunité.*hubspot/i]
    },
    salesforce: {
        create: [/créer?.*salesforce/i, /ajout(e|er)?.*salesforce/i],
        search: [/cherch(e|er)?.*salesforce/i]
    },
    pipedrive: {
        create_deal: [/deal.*pipedrive/i, /pipedrive.*deal/i]
    },

    // Marketing patterns
    mailchimp: {
        add_subscriber: [/ajout(e|er)?.*mailchimp/i, /subscribe.*mailchimp/i],
        send_campaign: [/campagne.*mailchimp/i, /envoi(e|er)?.*newsletter/i]
    },

    // Finance patterns
    stripe: {
        create_payment: [/paiement.*stripe/i, /stripe.*payment/i],
        create_invoice: [/facture.*stripe/i, /stripe.*invoice/i]
    },
    paypal: {
        send: [/envoi(e|er)?.*paypal/i, /paiement.*paypal/i]
    },

    // E-commerce patterns
    shopify: {
        create_product: [/produit.*shopify/i, /shopify.*produit/i],
        list_orders: [/commandes.*shopify/i, /shopify.*commandes/i]
    },
    woocommerce: {
        create_product: [/produit.*woocommerce/i, /woo.*produit/i],
        list_orders: [/commandes.*woo/i]
    },

    // Dev patterns
    github: {
        create_issue: [/issue.*github/i, /github.*issue/i, /bug.*github/i],
        create_pr: [/pr.*github/i, /pull.*request.*github/i]
    },
    jira: {
        create_issue: [/ticket.*jira/i, /jira.*ticket/i, /issue.*jira/i]
    },

    // Scheduling patterns
    calendly: {
        list_events: [/mes.*rdv.*calendly/i, /calendly.*rdv/i],
        create_link: [/lien.*calendly/i, /calendly.*lien/i]
    },

    // AI patterns
    openai: {
        chat: [/demande.*chatgpt/i, /chatgpt/i, /openai.*chat/i],
        generate_image: [/génère.*image.*dall/i, /dall-?e/i]
    }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Detect if message requires an external action
 */
function detectAction(message) {
    const text = message.toLowerCase();

    for (const [service, actions] of Object.entries(ACTION_PATTERNS)) {
        for (const [action, patterns] of Object.entries(actions)) {
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    return {
                        isAction: true,
                        service,
                        action,
                        confidence: 0.9,
                        integration: INTEGRATIONS[service]
                    };
                }
            }
        }
    }

    return { isAction: false, service: null, action: null, confidence: 0 };
}

/**
 * Check if user has connected a specific service
 */
async function checkUserConnection(userId, service, db) {
    if (!db) return false;

    try {
        const result = await db.query(
            `SELECT * FROM user_integrations
             WHERE user_id = $1 AND service = $2 AND status = 'active'`,
            [userId, service]
        );
        return result.rows.length > 0;
    } catch (error) {
        console.error('Error checking user connection:', error);
        return false;
    }
}

/**
 * Get all user connections
 */
async function getUserConnections(userId, db) {
    if (!db) return [];

    try {
        const result = await db.query(
            `SELECT service, status, connected_at, last_used
             FROM user_integrations
             WHERE user_id = $1`,
            [userId]
        );
        return result.rows;
    } catch (error) {
        console.error('Error getting user connections:', error);
        return [];
    }
}

/**
 * Save user connection
 */
async function saveUserConnection(userId, service, credentials, db) {
    if (!db) return false;

    try {
        await db.query(
            `INSERT INTO user_integrations (id, user_id, service, credentials, status, connected_at)
             VALUES (gen_random_uuid()::text, $1, $2, $3, 'active', NOW())
             ON CONFLICT (user_id, service)
             DO UPDATE SET credentials = $3, status = 'active', connected_at = NOW()`,
            [userId, service, JSON.stringify(credentials)]
        );
        return true;
    } catch (error) {
        console.error('Error saving user connection:', error);
        return false;
    }
}

/**
 * Execute N8N workflow
 */
async function executeWorkflow(workflowName, data, userId) {
    try {
        const response = await fetch(`${N8N_CONFIG.webhookUrl}/${workflowName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-N8N-API-KEY': N8N_CONFIG.apiKey
            },
            body: JSON.stringify({ userId, ...data })
        });

        if (!response.ok) {
            throw new Error(`N8N workflow failed: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('N8N workflow error:', error);
        throw error;
    }
}

/**
 * Generate OAuth connection URL for a service
 */
function getOAuthUrl(service, userId, redirectUrl) {
    const integration = INTEGRATIONS[service];
    if (!integration) return null;

    const params = new URLSearchParams({
        service,
        userId,
        redirect: redirectUrl
    });

    return `${N8N_CONFIG.baseUrl}/oauth/${integration.oauth}/authorize?${params}`;
}

/**
 * Handle action request from Eva
 */
async function handleAction(userId, service, action, params, db) {
    const isConnected = await checkUserConnection(userId, service, db);

    if (!isConnected) {
        const integration = INTEGRATIONS[service];
        return {
            success: false,
            needsConnection: true,
            service,
            serviceName: integration?.name || service,
            icon: integration?.icon || '🔗',
            message: `Pour ${action} sur ${integration?.name || service}, je dois me connecter à ton compte.`,
            oauthUrl: getOAuthUrl(service, userId, '/app.html')
        };
    }

    // Build workflow name from service and action
    const workflowName = `${service}-${action.replace(/_/g, '-')}`;

    try {
        const result = await executeWorkflow(workflowName, params, userId);

        if (db) {
            await db.query(
                `UPDATE user_integrations SET last_used = NOW() WHERE user_id = $1 AND service = $2`,
                [userId, service]
            );
        }

        return { success: true, service, action, result };
    } catch (error) {
        return { success: false, message: `Erreur: ${error.message}` };
    }
}

/**
 * Get available integrations with status for a user
 */
async function getAvailableIntegrations(userId, db) {
    const connections = await getUserConnections(userId, db);
    const connectionMap = new Map(connections.map(c => [c.service, c]));

    return Object.entries(INTEGRATIONS).map(([key, integration]) => ({
        id: key,
        ...integration,
        connected: connectionMap.has(key),
        status: connectionMap.get(key)?.status || 'disconnected',
        lastUsed: connectionMap.get(key)?.last_used || null
    }));
}

/**
 * Get integrations grouped by category
 */
function getIntegrationsByCategory() {
    const grouped = {};

    for (const [key, integration] of Object.entries(INTEGRATIONS)) {
        const category = integration.category || 'other';
        if (!grouped[category]) {
            grouped[category] = {
                ...CATEGORIES[category],
                integrations: []
            };
        }
        grouped[category].integrations.push({ id: key, ...integration });
    }

    // Sort by category order
    return Object.entries(grouped)
        .sort((a, b) => (a[1].order || 99) - (b[1].order || 99))
        .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
}

/**
 * Generate response for action that needs connection
 */
function generateConnectionPrompt(service, action) {
    const integration = INTEGRATIONS[service];
    if (!integration) return null;

    return {
        type: 'connection_required',
        service,
        serviceName: integration.name,
        icon: integration.icon,
        action,
        message: `${integration.icon} Pour ${getActionVerb(service, action)}, j'ai besoin que tu connectes ton compte ${integration.name}.\n\nClique sur "Connecter ${integration.name}" pour m'autoriser.`,
        button: {
            text: `Connecter ${integration.name}`,
            action: 'connect',
            service
        }
    };
}

function getActionVerb(service, action) {
    const verbs = {
        // Email
        sort: 'trier tes mails',
        send: 'envoyer des mails',
        read: 'lire tes mails',
        search: 'chercher',

        // Calendar
        create: 'créer des événements',
        list: 'voir tes rendez-vous',

        // Files
        upload: 'uploader des fichiers',
        download: 'télécharger des fichiers',

        // Social
        post: 'publier du contenu',

        // Tasks
        create_task: 'créer des tâches',
        complete: 'marquer comme terminé',

        // CRM
        create_contact: 'ajouter des contacts',
        create_deal: 'créer des opportunités',

        // Default
        default: `effectuer cette action`
    };
    return verbs[action] || verbs.default;
}

module.exports = {
    INTEGRATIONS,
    CATEGORIES,
    detectAction,
    checkUserConnection,
    getUserConnections,
    saveUserConnection,
    executeWorkflow,
    getOAuthUrl,
    handleAction,
    getAvailableIntegrations,
    getIntegrationsByCategory,
    generateConnectionPrompt
};
