// Shared Header Component - Include on all pages with: <script src="/shared-header.js"></script>
(function() {
    // Header HTML
    const headerHTML = `
    <!-- Navigation -->
    <nav class="shared-nav">
        <div class="container nav-inner">
            <a href="/" class="logo">
                <div class="logo-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                    </svg>
                </div>
                <span data-i18n="brand_name">My Best Agent</span>
            </a>

            <ul class="nav-links">
                <li><a href="/#how" data-i18n="nav_how">How it works</a></li>
                <li><a href="/#features" data-i18n="nav_features">Features</a></li>
                <li><a href="/success-stories.html" data-i18n="nav_success">Success Stories</a></li>
                <li><a href="/#pricing" data-i18n="nav_pricing">Pricing</a></li>
            </ul>

            <div class="nav-actions">
                <select class="lang-select" id="sharedLangSelector">
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="es">Español</option>
                    <option value="de">Deutsch</option>
                    <option value="it">Italiano</option>
                    <option value="pt">Português</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>
                    <option value="ru">Русский</option>
                    <option value="ar">العربية</option>
                    <option value="he">עברית</option>
                </select>
                <a href="/?auth=login" id="sharedSignInBtn" class="btn btn-secondary" data-i18n="nav_signin">Sign In</a>
                <a href="/?auth=register" id="sharedStartBtn" class="btn btn-primary" data-i18n="btn_start_free">Start free</a>
            </div>

            <!-- Hamburger Menu Button (Mobile) -->
            <button class="hamburger" id="sharedHamburgerBtn" aria-label="Menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </nav>

    <!-- Mobile Menu Overlay -->
    <div class="mobile-menu" id="sharedMobileMenu">
        <a href="/#how" data-i18n="nav_how">How it works</a>
        <a href="/#features" data-i18n="nav_features">Features</a>
        <a href="/success-stories.html" data-i18n="nav_success">Success Stories</a>
        <a href="/#pricing" data-i18n="nav_pricing">Pricing</a>

        <div class="mobile-menu-actions">
            <select class="mobile-lang-select" id="sharedMobileLangSelector">
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
                <option value="ru">Русский</option>
                <option value="ar">العربية</option>
                <option value="he">עברית</option>
            </select>
            <a href="/?auth=login" id="sharedMobileSignInBtn" class="btn btn-secondary" data-i18n="nav_signin">Sign In</a>
            <a href="/?auth=register" id="sharedMobileStartBtn" class="btn btn-primary" data-i18n="btn_start_free">Start free</a>
        </div>
    </div>
    `;

    // Header CSS
    const headerCSS = `
    <style id="shared-header-styles">
        /* Shared Navigation Styles */
        .shared-nav {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 1000;
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid #e2e8f0;
        }

        .shared-nav .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 24px;
        }

        .shared-nav .nav-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 64px;
            flex-wrap: nowrap;
        }

        .shared-nav .logo {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 10px;
            white-space: nowrap;
        }

        .shared-nav .logo-icon {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #635bff 0%, #00d4ff 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .shared-nav .logo-icon svg { width: 18px; height: 18px; }

        .shared-nav .nav-links {
            display: flex;
            align-items: center;
            gap: 24px;
            list-style: none;
            margin: 0;
            padding: 0;
            white-space: nowrap;
        }

        .shared-nav .nav-links a {
            font-size: 14px;
            font-weight: 500;
            color: #475569;
            text-decoration: none;
            transition: color 0.2s;
            white-space: nowrap;
        }

        .shared-nav .nav-links a:hover { color: #0f172a; }

        .shared-nav .nav-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .shared-nav .lang-select {
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: white;
            font-size: 13px;
            color: #475569;
            cursor: pointer;
        }

        .shared-nav .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 20px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 14px;
            text-decoration: none;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
        }

        .shared-nav .btn-secondary {
            background: white;
            color: #0f172a;
            border: 1px solid #e2e8f0;
        }

        .shared-nav .btn-secondary:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
        }

        .shared-nav .btn-primary {
            background: linear-gradient(135deg, #635bff 0%, #4f46e5 100%);
            color: white;
            box-shadow: 0 2px 8px rgba(99, 91, 255, 0.3);
        }

        .shared-nav .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(99, 91, 255, 0.4);
        }

        /* Hamburger Menu Button (hidden on desktop) */
        .shared-nav .hamburger {
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            width: 44px;
            height: 44px;
            cursor: pointer;
            background: transparent;
            border: none;
            padding: 8px;
            z-index: 1001;
        }

        .shared-nav .hamburger span {
            display: block;
            width: 24px;
            height: 2px;
            background: #0f172a;
            border-radius: 2px;
            transition: all 0.3s ease;
            margin: 3px 0;
        }

        .shared-nav .hamburger.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }

        .shared-nav .hamburger.active span:nth-child(2) {
            opacity: 0;
        }

        .shared-nav .hamburger.active span:nth-child(3) {
            transform: rotate(-45deg) translate(5px, -5px);
        }

        /* Mobile Menu Overlay (hidden by default) */
        .mobile-menu {
            display: none;
            position: fixed;
            top: 64px;
            left: 0;
            right: 0;
            bottom: 0;
            background: #ffffff;
            z-index: 999;
            padding: 24px;
            flex-direction: column;
            gap: 8px;
            overflow-y: auto;
        }

        .mobile-menu.active {
            display: flex;
        }

        .mobile-menu > a {
            display: block;
            padding: 16px 20px;
            font-size: 18px;
            font-weight: 500;
            color: #0f172a;
            text-decoration: none;
            border-radius: 12px;
            transition: background 0.2s;
        }

        .mobile-menu > a:hover {
            background: #f1f5f9;
        }

        .mobile-menu .mobile-menu-actions {
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .mobile-menu .mobile-menu-actions .btn {
            width: 100%;
            padding: 16px;
            font-size: 16px;
            text-align: center;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            font-weight: 600;
            text-decoration: none;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
        }

        .mobile-menu .mobile-menu-actions .btn-secondary {
            background: white;
            color: #0f172a;
            border: 1px solid #e2e8f0;
        }

        .mobile-menu .mobile-menu-actions .btn-primary {
            background: linear-gradient(135deg, #635bff 0%, #4f46e5 100%);
            color: white;
        }

        .mobile-menu .mobile-lang-select {
            width: 100%;
            padding: 16px;
            font-size: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: #ffffff;
            color: #0f172a;
            cursor: pointer;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            .shared-nav .nav-links { display: none !important; }
            .shared-nav .nav-actions .btn { display: none !important; }
            .shared-nav .nav-actions .lang-select { display: none !important; }
            .shared-nav .hamburger { display: flex !important; }
        }
    </style>
    `;

    // Insert header at the beginning of body
    function insertHeader() {
        // Add CSS to head
        document.head.insertAdjacentHTML('beforeend', headerCSS);

        // Check if there's already a nav element - if so, replace it
        const existingNav = document.querySelector('nav');
        if (existingNav) {
            existingNav.remove();
        }

        // Check if there's already a mobile-menu - if so, remove it
        const existingMobileMenu = document.querySelector('.mobile-menu');
        if (existingMobileMenu) {
            existingMobileMenu.remove();
        }

        // Insert header at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', headerHTML);

        // Initialize mobile menu functionality
        initMobileMenu();

        // Initialize language selector
        initLanguageSelector();

        // Apply translations if i18n is available
        if (typeof applyTranslations === 'function') {
            setTimeout(applyTranslations, 100);
        }
    }

    // Mobile menu toggle
    function initMobileMenu() {
        const hamburgerBtn = document.getElementById('sharedHamburgerBtn');
        const mobileMenu = document.getElementById('sharedMobileMenu');

        if (hamburgerBtn && mobileMenu) {
            hamburgerBtn.addEventListener('click', function() {
                hamburgerBtn.classList.toggle('active');
                mobileMenu.classList.toggle('active');
                document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
            });

            // Close menu when clicking a link
            mobileMenu.querySelectorAll('a').forEach(function(link) {
                link.addEventListener('click', function() {
                    hamburgerBtn.classList.remove('active');
                    mobileMenu.classList.remove('active');
                    document.body.style.overflow = '';
                });
            });
        }
    }

    // Language selector
    function initLanguageSelector() {
        const sharedLangSelector = document.getElementById('sharedLangSelector');
        const sharedMobileLangSelector = document.getElementById('sharedMobileLangSelector');

        // Get saved language or detect from browser
        const savedLang = localStorage.getItem('preferredLanguage') ||
                         navigator.language.split('-')[0] || 'en';

        // Set initial value
        if (sharedLangSelector) {
            sharedLangSelector.value = savedLang;
            sharedLangSelector.addEventListener('change', function() {
                changeSharedLanguage(this.value);
            });
        }

        if (sharedMobileLangSelector) {
            sharedMobileLangSelector.value = savedLang;
            sharedMobileLangSelector.addEventListener('change', function() {
                changeSharedLanguage(this.value);
            });
        }
    }

    // Change language function
    function changeSharedLanguage(lang) {
        localStorage.setItem('preferredLanguage', lang);

        // Sync both selectors
        const sharedLangSelector = document.getElementById('sharedLangSelector');
        const sharedMobileLangSelector = document.getElementById('sharedMobileLangSelector');

        if (sharedLangSelector) sharedLangSelector.value = lang;
        if (sharedMobileLangSelector) sharedMobileLangSelector.value = lang;

        // If there's a global changeLanguage function, call it
        if (typeof changeLanguage === 'function') {
            changeLanguage(lang);
        } else if (typeof applyTranslations === 'function') {
            applyTranslations();
        } else {
            // Reload page with new language
            window.location.reload();
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertHeader);
    } else {
        insertHeader();
    }
})();
