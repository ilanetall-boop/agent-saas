// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileSignInBtn = document.getElementById('mobileSignInBtn');
    const mobileStartBtn = document.getElementById('mobileStartBtn');
    const mobileLangSelector = document.getElementById('mobileLangSelector');
    const langSelector = document.getElementById('langSelector');

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

        // Mobile Sign In button
        if (mobileSignInBtn) {
            mobileSignInBtn.addEventListener('click', function(e) {
                e.preventDefault();
                hamburgerBtn.classList.remove('active');
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
                if (typeof showLogin === 'function') showLogin();
            });
        }

        // Mobile Start button
        if (mobileStartBtn) {
            mobileStartBtn.addEventListener('click', function(e) {
                e.preventDefault();
                hamburgerBtn.classList.remove('active');
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
                if (typeof showRegister === 'function') showRegister();
            });
        }

        // Sync mobile language selector with main selector
        if (mobileLangSelector && langSelector) {
            mobileLangSelector.value = langSelector.value;
            mobileLangSelector.addEventListener('change', function() {
                langSelector.value = this.value;
            });
        }
    }

    // Auto-open auth modal if ?auth=login or ?auth=register parameter
    const urlParams = new URLSearchParams(window.location.search);
    const authParam = urlParams.get('auth');
    if (authParam === 'login') {
        window.history.replaceState({}, '', window.location.pathname);
        if (typeof showLogin === 'function') showLogin();
    } else if (authParam === 'register') {
        window.history.replaceState({}, '', window.location.pathname);
        if (typeof showRegister === 'function') showRegister();
    }
});
