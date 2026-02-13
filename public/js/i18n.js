// i18n - Language switching
document.addEventListener('DOMContentLoaded', function() {
    var LANGS = ['en', 'fr', 'es', 'de', 'it', 'pt', 'zh', 'ja', 'ru', 'ar', 'he'];
    var RTL = ['ar', 'he'];
    
    // Detect language
    var stored = localStorage.getItem('mba_lang');
    var browser = (navigator.language || 'en').split('-')[0];
    var lang = stored || (LANGS.indexOf(browser) >= 0 ? browser : 'en');
    
    console.log('[i18n] Language:', lang, '| Stored:', stored);
    
    // Set HTML attributes
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL.indexOf(lang) >= 0 ? 'rtl' : 'ltr';
    
    // Setup selector
    var sel = document.getElementById('langSelector');
    if (sel) {
        sel.value = lang;
        sel.addEventListener('change', function() {
            console.log('[i18n] Changing to:', sel.value);
            localStorage.setItem('mba_lang', sel.value);
            location.reload();
        });
    }
    
    // Load translations (skip English - it's the default)
    if (lang !== 'en') {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/i18n/' + lang + '.json', true);
        xhr.onload = function() {
            console.log('[i18n] XHR status:', xhr.status);
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var els = document.querySelectorAll('[data-i18n]');
                    console.log('[i18n] Applying to', els.length, 'elements');
                    for (var i = 0; i < els.length; i++) {
                        var key = els[i].getAttribute('data-i18n');
                        if (data[key]) els[i].textContent = data[key];
                    }
                } catch(e) { console.error('[i18n] Parse error:', e); }
            }
        };
        xhr.onerror = function() { console.error('[i18n] XHR error'); };
        xhr.send();
    }
});
