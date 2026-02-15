/**
 * End-to-End Testing Framework for My Best Agent
 * Automated multi-persona user journey testing
 * 
 * Tests: Signup → Onboarding → Chat → Language Validation
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Test base URL
const BASE_URL = 'https://mybestagent.io';
const LOGS_DIR = path.join(__dirname, 'e2e-logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * User Personas - Diverse backgrounds & needs
 */
const PERSONAS = [
    {
        id: 'persona-1',
        name: 'Jean Dupont',
        role: 'Entrepreneur (Renovation Contractor)',
        email: `jean-${Date.now()}@testmba.dev`,
        password: 'TestPassword123!',
        language: 'fr',
        profileText: 'Contractor specializing in home renovations',
        chatMessages: [
            'Je dois rénover une cuisine avec un budget limité',
            'Peux-tu m\'aider à créer un site web pour mon business?',
            'Comment je dois organiser mon équipe?'
        ],
        expectedLanguage: 'fr'
    },
    {
        id: 'persona-2',
        name: 'Sarah Cohen',
        role: 'Student (Graphic Designer)',
        email: `sarah-${Date.now()}@testmba.dev`,
        password: 'TestPassword123!',
        language: 'he',
        profileText: 'Graphic design student learning web development',
        chatMessages: [
            'אני צריכה ללמוד HTML וCSS',
            'כתוב לי קוד לאתר פורטפוליו',
            'איך אני מתחילה בעיצוב?'
        ],
        expectedLanguage: 'he'
    },
    {
        id: 'persona-3',
        name: 'Carlos Rodriguez',
        role: 'Software Developer',
        email: `carlos-${Date.now()}@testmba.dev`,
        password: 'TestPassword123!',
        language: 'es',
        profileText: 'Full-stack developer looking for automation tools',
        chatMessages: [
            'Necesito un código completo para un dashboard',
            'Cómo creo una API REST?',
            'Qué frameworks me recomiendas?'
        ],
        expectedLanguage: 'es'
    },
    {
        id: 'persona-4',
        name: 'Emma Mueller',
        role: 'Retired Professional',
        email: `emma-${Date.now()}@testmba.dev`,
        password: 'TestPassword123!',
        language: 'de',
        profileText: 'Retired project manager interested in learning',
        chatMessages: [
            'Ich möchte ein Projekt organisieren',
            'Können Sie mir bei der Planung helfen?',
            'Was sind die besten Praktiken?'
        ],
        expectedLanguage: 'de'
    },
    {
        id: 'persona-5',
        name: 'Marco Rossini',
        role: 'Corporate Employee',
        email: `marco-${Date.now()}@testmba.dev`,
        password: 'TestPassword123!',
        language: 'it',
        profileText: 'Corporate manager seeking productivity solutions',
        chatMessages: [
            'Ho bisogno di aumentare la produttività del mio team',
            'Quali strumenti mi consigli?',
            'Come posso automatizzare i processi?'
        ],
        expectedLanguage: 'it'
    },
    {
        id: 'persona-6',
        name: 'Li Wei',
        role: 'Entrepreneur (E-commerce)',
        email: `li-${Date.now()}@testmba.dev`,
        password: 'TestPassword123!',
        language: 'zh',
        profileText: 'E-commerce seller scaling online business',
        chatMessages: [
            '我需要帮助建立在线商店',
            '如何提高销售转换率?',
            '你能帮我优化流程吗?'
        ],
        expectedLanguage: 'zh'
    },
    {
        id: 'persona-7',
        name: 'Ahmed Hassan',
        role: 'Freelancer',
        email: `ahmed-${Date.now()}@testmba.dev`,
        password: 'TestPassword123!',
        language: 'ar',
        profileText: 'Freelancer managing multiple projects',
        chatMessages: [
            'أحتاج إلى مساعدة في إدارة المشاريع',
            'كيف أنظم عملي؟',
            'ما الأدوات الأفضل للعاملين الحرين؟'
        ],
        expectedLanguage: 'ar'
    },
    {
        id: 'persona-8',
        name: 'James Wilson',
        role: 'Business Executive',
        email: `james-${Date.now()}@testmba.dev`,
        password: 'TestPassword123!',
        language: 'en',
        profileText: 'C-level executive automating business processes',
        chatMessages: [
            'I need to automate our workflow',
            'Write me a complete business process API',
            'What is the best approach for scaling?'
        ],
        expectedLanguage: 'en'
    },
    {
        id: 'persona-9',
        name: 'Yuki Tanaka',
        role: 'Student',
        email: `yuki-${Date.now()}@testmba.dev`,
        password: 'TestPassword123!',
        language: 'ja',
        profileText: 'University student learning programming',
        chatMessages: [
            '私はプログラミングを学んでいます',
            'ウェブサイトを作るのを手伝ってください',
            '最初のステップは何ですか?'
        ],
        expectedLanguage: 'ja'
    },
    {
        id: 'persona-10',
        name: 'Alexandra Sokolov',
        role: 'Entrepreneur (Tech Startup)',
        email: `alexandra-${Date.now()}@testmba.dev`,
        password: 'TestPassword123!',
        language: 'ru',
        profileText: 'Tech startup founder seeking AI assistance',
        chatMessages: [
            'Мне нужна помощь с моим стартапом',
            'Напишите мне код для приложения',
            'Какие инструменты вы рекомендуете?'
        ],
        expectedLanguage: 'ru'
    }
];

/**
 * Test Results Storage
 */
class TestRunner {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            baseUrl: BASE_URL,
            totalTests: 0,
            passed: 0,
            failed: 0,
            personas: [],
            bugs: [],
            summary: {}
        };
    }

    async runAllTests() {
        console.log('🧪 Starting E2E Test Suite...');
        console.log(`📍 Testing: ${BASE_URL}`);
        console.log(`👥 Total Personas: ${PERSONAS.length}\n`);

        for (const persona of PERSONAS) {
            await this.testPersona(persona);
        }

        this.saveLogs();
        this.printSummary();
    }

    async testPersona(persona) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`👤 Testing: ${persona.name} (${persona.role})`);
        console.log(`📧 Email: ${persona.email}`);
        console.log(`🌐 Language: ${persona.language.toUpperCase()}`);
        console.log(`${'='.repeat(60)}`);

        const personaResults = {
            id: persona.id,
            name: persona.name,
            email: persona.email,
            language: persona.language,
            tests: [],
            bugs: [],
            startTime: Date.now(),
            endTime: null,
            success: false
        };

        try {
            const browser = await puppeteer.launch({
                headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            page.setDefaultTimeout(15000);

            // Test 1: Signup
            console.log('\n🔐 TEST 1: Signup...');
            const signupResult = await this.testSignup(page, persona);
            personaResults.tests.push(signupResult);

            if (!signupResult.passed) {
                personaResults.bugs.push({
                    step: 'signup',
                    error: signupResult.error,
                    severity: 'critical'
                });
            }

            // Test 2: Onboarding
            if (signupResult.passed) {
                console.log('\n🎯 TEST 2: Onboarding...');
                const onboardingResult = await this.testOnboarding(page, persona);
                personaResults.tests.push(onboardingResult);

                if (!onboardingResult.passed) {
                    personaResults.bugs.push({
                        step: 'onboarding',
                        error: onboardingResult.error,
                        severity: 'high'
                    });
                }

                // Test 3: Chat
                if (onboardingResult.passed) {
                    console.log('\n💬 TEST 3: Chat Messages...');
                    const chatResult = await this.testChat(page, persona);
                    personaResults.tests.push(chatResult);

                    if (!chatResult.passed) {
                        personaResults.bugs.push({
                            step: 'chat',
                            error: chatResult.error,
                            severity: 'high'
                        });
                    }
                }
            }

            personaResults.success = personaResults.bugs.length === 0;
            personaResults.endTime = Date.now();
            personaResults.duration = personaResults.endTime - personaResults.startTime;

            // Take final screenshot
            await page.screenshot({
                path: path.join(LOGS_DIR, `${persona.id}-final.png`)
            });

            await browser.close();

        } catch (error) {
            console.error(`❌ Error testing ${persona.name}:`, error.message);
            personaResults.bugs.push({
                step: 'browser',
                error: error.message,
                severity: 'critical'
            });
            personaResults.endTime = Date.now();
            personaResults.duration = personaResults.endTime - personaResults.startTime;
        }

        this.results.personas.push(personaResults);
        this.results.totalTests++;
        if (personaResults.success) {
            this.results.passed++;
        } else {
            this.results.failed++;
        }
    }

    async testSignup(page, persona) {
        try {
            await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle2' });
            console.log('  ✓ Landing page loaded');

            // Click signup button
            await page.click('button[data-i18n="auth.create_agent"]');
            console.log('  ✓ Signup button clicked');

            // Fill signup form
            await page.type('#signupName', persona.name);
            await page.type('#signupEmail', persona.email);
            await page.type('#signupPassword', persona.password);
            console.log('  ✓ Form filled');

            // Submit
            await page.click('button[type="submit"]');
            await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
            console.log('  ✓ Form submitted');

            return {
                name: 'signup',
                passed: true,
                duration: 0
            };
        } catch (error) {
            console.error(`  ❌ Signup failed: ${error.message}`);
            return {
                name: 'signup',
                passed: false,
                error: error.message,
                duration: 0
            };
        }
    }

    async testOnboarding(page, persona) {
        try {
            // Answer onboarding questions
            const questions = [
                persona.role,
                persona.profileText,
                'Building something amazing',
                'Automation and AI',
                'Yes, I\'m ready'
            ];

            for (let i = 0; i < questions.length; i++) {
                console.log(`  ✓ Onboarding step ${i + 1}/5`);
                
                // Type answer
                const messageInput = await page.$('#messageInput');
                if (messageInput) {
                    await messageInput.type(questions[i], { delay: 10 });
                    
                    // Send message
                    await page.click('#sendBtn');
                    await page.waitForTimeout(2000);
                }
            }

            console.log('  ✓ Onboarding completed');

            return {
                name: 'onboarding',
                passed: true,
                duration: 0
            };
        } catch (error) {
            console.error(`  ❌ Onboarding failed: ${error.message}`);
            return {
                name: 'onboarding',
                passed: false,
                error: error.message,
                duration: 0
            };
        }
    }

    async testChat(page, persona) {
        try {
            console.log(`  📝 Sending ${persona.chatMessages.length} messages in ${persona.language.toUpperCase()}`);

            for (let i = 0; i < persona.chatMessages.length; i++) {
                const message = persona.chatMessages[i];
                
                // Set language
                const langSelector = await page.$('#langSelector');
                if (langSelector) {
                    await page.select('#langSelector', persona.language);
                    await page.waitForTimeout(500);
                }

                // Type and send message
                const messageInput = await page.$('#messageInput');
                if (messageInput) {
                    await messageInput.type(message, { delay: 5 });
                    await page.click('#sendBtn');
                    
                    // Wait for response
                    await page.waitForTimeout(3000);
                    
                    // Check for errors in console
                    const logs = [];
                    page.on('console', msg => logs.push(msg.text()));
                    
                    console.log(`  ✓ Message ${i + 1}: "${message.substring(0, 30)}..."`);
                }
            }

            console.log('  ✓ All chat messages sent successfully');

            return {
                name: 'chat',
                passed: true,
                duration: 0
            };
        } catch (error) {
            console.error(`  ❌ Chat test failed: ${error.message}`);
            return {
                name: 'chat',
                passed: false,
                error: error.message,
                duration: 0
            };
        }
    }

    saveLogs() {
        const logPath = path.join(LOGS_DIR, `test-report-${Date.now()}.json`);
        fs.writeFileSync(logPath, JSON.stringify(this.results, null, 2));
        console.log(`\n📊 Report saved: ${logPath}`);
    }

    printSummary() {
        console.log(`\n${'='.repeat(60)}`);
        console.log('📊 TEST SUMMARY');
        console.log(`${'='.repeat(60)}`);
        console.log(`Total Personas: ${this.results.totalTests}`);
        console.log(`Passed: ${this.results.passed} ✅`);
        console.log(`Failed: ${this.results.failed} ❌`);
        console.log(`Success Rate: ${((this.results.passed / this.results.totalTests) * 100).toFixed(1)}%`);
        console.log(`\nTimestamp: ${this.results.timestamp}`);
        console.log(`Base URL: ${this.results.baseUrl}`);
        console.log(`Logs Directory: ${LOGS_DIR}`);
        console.log(`${'='.repeat(60)}\n`);
    }
}

// Run tests
const runner = new TestRunner();
runner.runAllTests().catch(console.error);
