// i18n.js - Internationalization utility
// Loads translations, handles language switching, persists user choice

class i18n {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || this.detectBrowserLanguage();
        this.translations = {};
        this.supportedLanguages = ['en', 'fr', 'es', 'de', 'it', 'pt', 'zh', 'ja', 'ru', 'ar', 'he'];
        
        // Validate language
        if (!this.supportedLanguages.includes(this.currentLanguage)) {
            this.currentLanguage = 'en';
        }
    }
    
    detectBrowserLanguage() {
        // Try to detect from browser language
        const browserLang = navigator.language || navigator.userLanguage;
        const baseLang = browserLang.split('-')[0];
        
        if (this.supportedLanguages.includes(baseLang)) {
            return baseLang;
        }
        
        return 'en'; // Default to English
    }
    
    async loadLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            return this.translations[lang];
        }
        
        try {
            // Load JSON translation file
            const response = await fetch(`/i18n/${lang}.json`);
            const data = await response.json();
            this.translations[lang] = data;
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            return data;
        } catch (error) {
            console.error(`Failed to load language ${lang}:`, error);
            // Fallback to English
            if (lang !== 'en') {
                return this.loadLanguage('en');
            }
            return {};
        }
    }
    
    t(key) {
        // Get translation by key (supports nested keys like "auth.login_title")
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage] || {};
        
        for (const k of keys) {
            value = value[k];
            if (!value) {
                return key; // Return key if translation not found
            }
        }
        
        return value;
    }
    
    setLanguage(lang) {
        return this.loadLanguage(lang);
    }
    
    getLanguages() {
        return this.supportedLanguages.map(code => ({
            code,
            name: this.translations[code]?.language || code
        }));
    }
    
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    getLanguageName(code) {
        return this.translations[code]?.language || code;
    }
}

// Global i18n instance (initialized on DOMContentLoaded)
let i18nInstance;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Create global i18n instance
    i18nInstance = new i18n();
    
    // Load current language and update DOM
    await i18nInstance.loadLanguage(i18nInstance.currentLanguage);
    updatePageTranslations();
});

// Function to update all text elements with translations
function updatePageTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = i18nInstance.t(key);
        
        if (element.tagName === 'INPUT' && element.type === 'text' || element.type === 'email' || element.type === 'password') {
            element.placeholder = translation;
        } else {
            element.textContent = translation;
        }
    });
    
    // Update page direction for RTL languages
    if (i18nInstance.translations[i18nInstance.currentLanguage]?.dir === 'rtl') {
        document.documentElement.dir = 'rtl';
    } else {
        document.documentElement.dir = 'ltr';
    }
}

// Language switcher function
async function switchLanguage(langCode) {
    await i18nInstance.setLanguage(langCode);
    updatePageTranslations();
}

// Make globally accessible (for browser + module exports)
window.switchLanguage = switchLanguage;
window.updatePageTranslations = updatePageTranslations;
window.i18nInstance = i18nInstance;

// Export for use in other scripts (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { i18nInstance, updatePageTranslations, switchLanguage };
}
