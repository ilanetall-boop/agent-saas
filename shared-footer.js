// Shared Footer Component - Include on all pages with: <script src="/shared-footer.js"></script>
(function() {
    // Footer HTML
    const footerHTML = `
    <footer class="shared-footer">
        <div class="container">
            <div class="footer-grid">
                <div class="footer-brand">
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
                    <p data-i18n="footer_tagline">Your personal AI agent that actually works. Code, automate, and execute—everywhere.</p>
                </div>

                <div class="footer-col">
                    <h4 data-i18n="footer_product">Product</h4>
                    <ul>
                        <li><a href="/#features" data-i18n="footer_features">Features</a></li>
                        <li><a href="/#pricing" data-i18n="footer_pricing">Pricing</a></li>
                        <li><a href="/#how" data-i18n="footer_how">How it works</a></li>
                        <li><a href="/app.html" data-i18n="footer_app">Launch App</a></li>
                    </ul>
                </div>

                <div class="footer-col">
                    <h4 data-i18n="footer_connect">Connect</h4>
                    <ul>
                        <li><a href="mailto:hello@mybestagent.io" data-i18n="footer_contact">Contact</a></li>
                        <li><a href="https://t.me/mybestagent" target="_blank" rel="noopener">Telegram</a></li>
                        <li><a href="https://twitter.com/mybestagent" target="_blank" rel="noopener">Twitter</a></li>
                    </ul>
                </div>

                <div class="footer-col">
                    <h4 data-i18n="footer_learn">Learn</h4>
                    <ul>
                        <li><a href="/success-stories.html" data-i18n="nav_success">Success Stories</a></li>
                        <li><a href="/case-study-alice.html" data-i18n="footer_case_studies">Case Studies</a></li>
                    </ul>
                </div>

                <div class="footer-col">
                    <h4 data-i18n="footer_legal">Legal</h4>
                    <ul>
                        <li><a href="/terms.html" data-i18n="footer_terms">Terms</a></li>
                        <li><a href="/privacy.html" data-i18n="footer_privacy">Privacy</a></li>
                    </ul>
                </div>
            </div>

            <div class="footer-bottom">
                <p data-i18n="footer_copyright">© 2026 My Best Agent. All rights reserved.</p>
            </div>
        </div>
    </footer>
    `;

    // Footer CSS
    const footerCSS = `
    <style id="shared-footer-styles">
        .shared-footer {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: rgba(255,255,255,0.8);
            padding: 80px 0 40px;
            margin-top: 80px;
        }

        .shared-footer .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 24px;
        }

        .shared-footer .footer-grid {
            display: grid;
            grid-template-columns: 2fr repeat(4, 1fr);
            gap: 48px;
            margin-bottom: 48px;
        }

        .shared-footer .footer-brand .logo {
            display: flex;
            align-items: center;
            gap: 10px;
            color: white;
            text-decoration: none;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 16px;
        }

        .shared-footer .footer-brand .logo-icon {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #635bff 0%, #00d4ff 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .shared-footer .footer-brand .logo-icon svg {
            width: 18px;
            height: 18px;
        }

        .shared-footer .footer-brand p {
            font-size: 14px;
            line-height: 1.6;
            color: rgba(255,255,255,0.6);
            max-width: 280px;
        }

        .shared-footer .footer-col h4 {
            color: white;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 16px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .shared-footer .footer-col ul {
            list-style: none;
            margin: 0;
            padding: 0;
        }

        .shared-footer .footer-col a {
            color: rgba(255,255,255,0.6);
            text-decoration: none;
            font-size: 14px;
            display: block;
            padding: 6px 0;
            transition: color 0.2s;
        }

        .shared-footer .footer-col a:hover {
            color: white;
        }

        .shared-footer .footer-bottom {
            padding-top: 32px;
            border-top: 1px solid rgba(255,255,255,0.1);
            text-align: center;
        }

        .shared-footer .footer-bottom p {
            font-size: 13px;
            color: rgba(255,255,255,0.5);
            margin: 0;
        }

        /* Responsive */
        @media (max-width: 1024px) {
            .shared-footer .footer-grid {
                grid-template-columns: repeat(3, 1fr);
            }
            .shared-footer .footer-brand {
                grid-column: 1 / -1;
                margin-bottom: 24px;
            }
        }

        @media (max-width: 768px) {
            .shared-footer {
                padding: 60px 0 32px;
            }
            .shared-footer .footer-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 32px;
            }
        }

        @media (max-width: 480px) {
            .shared-footer .footer-grid {
                grid-template-columns: 1fr;
                text-align: center;
            }
            .shared-footer .footer-brand {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .shared-footer .footer-brand .logo {
                justify-content: center;
            }
            .shared-footer .footer-brand p {
                text-align: center;
                max-width: 100%;
            }
        }
    </style>
    `;

    // Insert footer
    function insertFooter() {
        // Add CSS to head
        if (!document.getElementById('shared-footer-styles')) {
            document.head.insertAdjacentHTML('beforeend', footerCSS);
        }

        // Remove existing footer
        const existingFooter = document.querySelector('footer');
        if (existingFooter) {
            existingFooter.remove();
        }

        // Insert new footer before closing body tag
        document.body.insertAdjacentHTML('beforeend', footerHTML);

        // Apply translations if i18n is available
        if (typeof applyTranslations === 'function') {
            setTimeout(applyTranslations, 100);
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertFooter);
    } else {
        insertFooter();
    }
})();
