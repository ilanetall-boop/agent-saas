// i18n.js - Internationalization utility
// Loads translations, handles language switching, persists user choice

class i18n {
    constructor() {
        this.supportedLanguages = ['en', 'fr', 'es', 'de', 'it', 'pt', 'zh', 'ja', 'ru', 'ar', 'he'];
        this.currentLanguage = localStorage.getItem('language') || this.detectBrowserLanguage();
        this.translations = {};
        
        // Validate language
        if (!this.supportedLanguages.includes(this.currentLanguage)) {
            console.warn('⚠️ i18n: Invalid language in localStorage:', this.currentLanguage, '→ fallback to en');
            this.currentLanguage = 'en';
        }
        console.log('🌍 i18n: Constructor - using language:', this.currentLanguage);
    }
    
    detectBrowserLanguage() {
        // Try to detect from browser language
        const browserLang = (typeof navigator !== 'undefined') ? (navigator.language || navigator.userLanguage || 'en') : 'en';
        if (!browserLang) return 'en';
        
        const baseLang = browserLang.split('-')[0];
        
        if (this.supportedLanguages && this.supportedLanguages.includes(baseLang)) {
            return baseLang;
        }
        
        return 'en'; // Default to English
    }
    
    async loadLanguage(lang) {
        if (this.translations[lang]) {
            console.log(`✅ i18n: Language ${lang} already cached`);
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            return this.translations[lang];
        }
        
        try {
            // Load JSON translation file
            const url = `/i18n/${lang}.json`;
            console.log(`🌍 i18n: Fetching translations from ${url}`);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`✅ i18n: Successfully loaded ${lang}.json with ${Object.keys(data).length} keys`);
            
            this.translations[lang] = data;
            this.currentLanguage = lang;
            localStorage.setItem('language', lang);
            return data;
        } catch (error) {
            console.error(`❌ i18n: Failed to load language ${lang}:`, error.message);
            // Fallback to English
            if (lang !== 'en') {
                console.log(`🌍 i18n: Falling back to English...`);
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
    
    console.log('🌍 i18n: Detected language =', i18nInstance.currentLanguage);
    console.log('🌍 i18n: localStorage.language =', localStorage.getItem('language'));

    // Load current language and update DOM
    try {
        const loaded = await i18nInstance.loadLanguage(i18nInstance.currentLanguage);
        console.log('🌍 i18n: Loaded translations for', i18nInstance.currentLanguage, '=', Object.keys(loaded).length, 'keys');
        console.log('🌍 i18n: Sample translations =', loaded.brand_name, loaded.hero_title_1);
    } catch (e) {
        console.error('🌍 i18n: Error loading language:', e);
    }
    
    updatePageTranslations();
    console.log('🌍 i18n: Updated page translations');
});

// Function to update all text elements with translations
function updatePageTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = i18nInstance.t(key);
        
        // Handle input/textarea placeholders
        if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'email' || element.type === 'password')) {
            element.placeholder = translation;
        } else if (element.tagName === 'TEXTAREA') {
            element.placeholder = translation;
        } else {
            // Set text for all other elements
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

// Language selector initialization - syncs selector with localStorage and adds event listener
function initLangSelector() {
    const selector = document.getElementById('langSelector');
    if (selector) {
        // Sync with localStorage
        const savedLang = localStorage.getItem('language');
        if (savedLang && selector.querySelector(`option[value="${savedLang}"]`)) {
            selector.value = savedLang;
        }

        // Add change event listener (CSP-compliant - no inline handlers)
        if (!selector.hasAttribute('data-listener-added')) {
            selector.addEventListener('change', function() {
                changeLanguage(this.value);
            });
            selector.setAttribute('data-listener-added', 'true');
        }
    }
}

// Change language and reload page
function changeLanguage(lang) {
    localStorage.setItem('language', lang);
    window.location.reload();
}

// Initialize selector on DOM ready and immediately
initLangSelector();
document.addEventListener('DOMContentLoaded', initLangSelector);

// Make functions globally accessible
window.initLangSelector = initLangSelector;
window.changeLanguage = changeLanguage;

// Update case study links based on current language
function updateCaseStudyLinks() {
    const lang = localStorage.getItem('language') || 'en';
    const links = document.querySelectorAll('.case-study-link');
    links.forEach(link => {
        const caseName = link.getAttribute('data-case');
        if (caseName) {
            if (lang === 'en') {
                link.href = `/case-study-${caseName}.html`;
            } else {
                link.href = `/case-study-${caseName}-${lang}.html`;
            }
        }
    });
}

// Initialize case study links on DOM ready
document.addEventListener('DOMContentLoaded', updateCaseStudyLinks);

// Make function globally accessible
window.updateCaseStudyLinks = updateCaseStudyLinks;

// Export for use in other scripts (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { i18nInstance, updatePageTranslations, switchLanguage, initLangSelector, changeLanguage };
}
