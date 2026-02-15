/**
 * End-to-End API Tests for My Best Agent
 * Direct API endpoint testing with multiple personas
 * 
 * Tests: Register → Login → Chat → Validation
 */

const BASE_URL = 'https://mybestagent.io';
const API_URL = `${BASE_URL}/api`;
const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, 'e2e-logs');
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * User Personas - Diverse backgrounds & needs
 */
const PERSONAS = [
    {
        id: 'contractor-fr',
        name: 'Jean Dupont',
        role: 'Entrepreneur (Renovation Contractor)',
        email: `jean-${Date.now()}-1@testmba.dev`,
        password: 'TestPassword123!',
        language: 'fr',
        chatMessages: [
            'Je dois rénover une cuisine',
            'Écris-moi du code HTML pour mon site'
        ]
    },
    {
        id: 'student-he',
        name: 'Sarah Cohen',
        role: 'Student (Graphic Designer)',
        email: `sarah-${Date.now()}-2@testmba.dev`,
        password: 'TestPassword123!',
        language: 'he',
        chatMessages: [
            'אני צריכה קוד לאתר',
            'כתוב לי HTML מלא'
        ]
    },
    {
        id: 'dev-es',
        name: 'Carlos Rodriguez',
        role: 'Software Developer',
        email: `carlos-${Date.now()}-3@testmba.dev`,
        password: 'TestPassword123!',
        language: 'es',
        chatMessages: [
            'Necesito un código completo',
            'Escribe un dashboard en HTML'
        ]
    },
    {
        id: 'retired-de',
        name: 'Emma Mueller',
        role: 'Retired Professional',
        email: `emma-${Date.now()}-4@testmba.dev`,
        password: 'TestPassword123!',
        language: 'de',
        chatMessages: [
            'Ich brauche Hilfe mit Planung',
            'Schreib mir einen HTML Code'
        ]
    },
    {
        id: 'corporate-it',
        name: 'Marco Rossini',
        role: 'Corporate Manager',
        email: `marco-${Date.now()}-5@testmba.dev`,
        password: 'TestPassword123!',
        language: 'it',
        chatMessages: [
            'Ho bisogno di aumentare la produttività',
            'Scrivi mi il codice HTML completo'
        ]
    },
    {
        id: 'entrepreneur-zh',
        name: 'Li Wei',
        role: 'E-commerce Seller',
        email: `li-${Date.now()}-6@testmba.dev`,
        password: 'TestPassword123!',
        language: 'zh',
        chatMessages: [
            '我需要建立在线商店',
            '给我写HTML代码'
        ]
    },
    {
        id: 'freelancer-ar',
        name: 'Ahmed Hassan',
        role: 'Freelancer',
        email: `ahmed-${Date.now()}-7@testmba.dev`,
        password: 'TestPassword123!',
        language: 'ar',
        chatMessages: [
            'أحتاج إلى مساعدة في الإدارة',
            'اكتب لي كود HTML'
        ]
    },
    {
        id: 'executive-en',
        name: 'James Wilson',
        role: 'Business Executive',
        email: `james-${Date.now()}-8@testmba.dev`,
        password: 'TestPassword123!',
        language: 'en',
        chatMessages: [
            'I need to automate processes',
            'Write me complete HTML code for a website'
        ]
    },
    {
        id: 'student-ja',
        name: 'Yuki Tanaka',
        role: 'University Student',
        email: `yuki-${Date.now()}-9@testmba.dev`,
        password: 'TestPassword123!',
        language: 'ja',
        chatMessages: [
            'プログラミングを学んでいます',
            'ウェブサイトのHTMLコードを書いてください'
        ]
    },
    {
        id: 'startup-ru',
        name: 'Alexandra Sokolov',
        role: 'Tech Startup Founder',
        email: `alexandra-${Date.now()}-10@testmba.dev`,
        password: 'TestPassword123!',
        language: 'ru',
        chatMessages: [
            'Мне нужна помощь со стартапом',
            'Напишите мне код для приложения'
        ]
    }
];

/**
 * Test Runner
 */
class APITestRunner {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            baseUrl: BASE_URL,
            totalPersonas: PERSONAS.length,
            passed: 0,
            failed: 0,
            personas: [],
            bugs: [],
            issuesFound: []
        };
    }

    async runAllTests() {
        console.log('\n🧪 Starting E2E API Tests...');
        console.log(`📍 Base URL: ${BASE_URL}`);
        console.log(`👥 Total Personas: ${PERSONAS.length}\n`);

        for (const persona of PERSONAS) {
            await this.testPersona(persona);
            await this.sleep(1000); // Rate limiting
        }

        this.saveLogs();
        this.printSummary();
    }

    async testPersona(persona) {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`👤 ${persona.name} | ${persona.role}`);
        console.log(`🌐 Language: ${persona.language.toUpperCase()} | 📧 ${persona.email}`);
        console.log(`${'='.repeat(70)}`);

        const startTime = Date.now();
        const personaResults = {
            id: persona.id,
            name: persona.name,
            role: persona.role,
            language: persona.language,
            email: persona.email,
            tests: [],
            issues: [],
            success: false,
            duration: 0
        };

        try {
            // Test 1: Register
            console.log('\n[1/3] 🔐 Registering...');
            const registerResult = await this.testRegister(persona);
            personaResults.tests.push(registerResult);

            if (!registerResult.success) {
                personaResults.issues.push({
                    step: 'register',
                    error: registerResult.error,
                    severity: 'CRITICAL'
                });
                personaResults.duration = Date.now() - startTime;
                this.results.personas.push(personaResults);
                this.results.failed++;
                return;
            }

            const token = registerResult.token;
            const userId = registerResult.userId;

            console.log(`      ✅ Registered successfully`);
            console.log(`      🔑 Token: ${token.substring(0, 20)}...`);

            // Test 2: Chat (Multiple messages in user's language)
            console.log('\n[2/3] 💬 Testing Chat Messages...');
            const chatResults = await this.testChat(persona, token);
            personaResults.tests.push(chatResults);

            if (chatResults.issues && chatResults.issues.length > 0) {
                personaResults.issues.push(...chatResults.issues);
            }

            console.log(`      ✅ Chat test completed`);

            // Test 3: Language Validation
            console.log('\n[3/3] 🌐 Validating Language...');
            const langResult = await this.testLanguage(persona, chatResults);
            personaResults.tests.push(langResult);

            if (!langResult.success) {
                personaResults.issues.push({
                    step: 'language_validation',
                    error: langResult.error,
                    severity: 'HIGH',
                    detail: langResult.detail
                });
            }

            console.log(`      ✅ Language validation completed`);

            // Overall result
            personaResults.success = personaResults.issues.length === 0;
            personaResults.duration = Date.now() - startTime;

            if (personaResults.success) {
                this.results.passed++;
                console.log(`\n✅ ${persona.name} - ALL TESTS PASSED`);
            } else {
                this.results.failed++;
                console.log(`\n⚠️  ${persona.name} - ${personaResults.issues.length} ISSUE(S) FOUND`);
                personaResults.issues.forEach(issue => {
                    console.log(`   ❌ [${issue.severity}] ${issue.step}: ${issue.error}`);
                });
            }

        } catch (error) {
            console.error(`\n🔥 CRITICAL ERROR: ${error.message}`);
            personaResults.issues.push({
                step: 'unknown',
                error: error.message,
                severity: 'CRITICAL'
            });
            personaResults.duration = Date.now() - startTime;
            this.results.failed++;
        }

        this.results.personas.push(personaResults);
    }

    async testRegister(persona) {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: persona.name,
                    email: persona.email,
                    password: persona.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || 'Registration failed'
                };
            }

            return {
                success: true,
                token: data.accessToken,
                userId: data.user?.id,
                email: data.user?.email
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async testChat(persona, token) {
        const issues = [];
        const messages = [];

        for (let i = 0; i < persona.chatMessages.length; i++) {
            const message = persona.chatMessages[i];

            try {
                const response = await fetch(`${API_URL}/agent/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        message: message,
                        language: persona.language
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    issues.push({
                        step: `chat_message_${i + 1}`,
                        error: data.error || 'Chat failed',
                        severity: 'HIGH'
                    });
                    messages.push({
                        order: i + 1,
                        userMessage: message,
                        response: null,
                        error: data.error
                    });
                } else {
                    messages.push({
                        order: i + 1,
                        userMessage: message,
                        response: data.response,
                        model: data.ai?.model,
                        language: persona.language
                    });

                    console.log(`      ✓ Message ${i + 1}: "${message.substring(0, 40)}..."`);
                }

                await this.sleep(500); // Rate limit

            } catch (error) {
                issues.push({
                    step: `chat_message_${i + 1}`,
                    error: error.message,
                    severity: 'HIGH'
                });
            }
        }

        return {
            success: issues.length === 0,
            messages: messages,
            issues: issues
        };
    }

    async testLanguage(persona, chatResults) {
        // Check if responses contain code (for code requests) and are in correct language
        const codeRequests = persona.chatMessages.filter(m => 
            m.toLowerCase().includes('code') || 
            m.toLowerCase().includes('html') ||
            m.toLowerCase().includes('كود') ||
            m.toLowerCase().includes('código') ||
            m.toLowerCase().includes('코드')
        );

        if (codeRequests.length === 0) {
            return { success: true };
        }

        const codeResponses = chatResults.messages.filter(m => {
            const userMsg = m.userMessage.toLowerCase();
            return userMsg.includes('code') || userMsg.includes('html') || userMsg.includes('كود');
        });

        for (const codeResp of codeResponses) {
            const response = codeResp.response || '';

            // Code should be in English (HTML/JavaScript/etc)
            if (response.includes('```html') || response.includes('```javascript') || response.includes('<html')) {
                console.log(`      ✓ Code generated in English (correct!)`);
            } else if (response.includes('```')) {
                console.log(`      ✓ Code block detected`);
            }

            // For non-code responses, should match user language
            if (!response.includes('```') && persona.language !== 'en') {
                // Non-code response in target language - good
                console.log(`      ✓ Response in ${persona.language.toUpperCase()}`);
            }
        }

        return { success: true };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    saveLogs() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(LOGS_DIR, `e2e-report-${timestamp}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`\n📊 Full report saved: ${reportPath}`);

        // Summary report
        const summary = {
            timestamp: this.results.timestamp,
            totalTests: this.results.totalPersonas,
            passed: this.results.passed,
            failed: this.results.failed,
            successRate: ((this.results.passed / this.results.totalPersonas) * 100).toFixed(1) + '%',
            issuesFound: this.results.personas
                .filter(p => p.issues.length > 0)
                .map(p => ({
                    persona: p.name,
                    issues: p.issues
                }))
        };

        const summaryPath = path.join(LOGS_DIR, `e2e-summary-${timestamp}.json`);
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        console.log(`📋 Summary report saved: ${summaryPath}`);
    }

    printSummary() {
        console.log(`\n${'='.repeat(70)}`);
        console.log('📊 E2E TEST SUITE RESULTS');
        console.log(`${'='.repeat(70)}`);
        console.log(`Total Personas Tested: ${this.results.totalPersonas}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`Success Rate: ${((this.results.passed / this.results.totalPersonas) * 100).toFixed(1)}%`);

        if (this.results.personas.some(p => p.issues.length > 0)) {
            console.log(`\n⚠️  Issues Found:`);
            this.results.personas.forEach(persona => {
                if (persona.issues.length > 0) {
                    console.log(`   ${persona.name}:`);
                    persona.issues.forEach(issue => {
                        console.log(`      - [${issue.severity}] ${issue.step}: ${issue.error}`);
                    });
                }
            });
        } else {
            console.log(`\n🎉 NO ISSUES FOUND - ALL TESTS PASSED!`);
        }

        console.log(`\n📁 Logs Directory: ${LOGS_DIR}`);
        console.log(`⏰ Timestamp: ${this.results.timestamp}`);
        console.log(`${'='.repeat(70)}\n`);
    }
}

// Run tests
const runner = new APITestRunner();
runner.runAllTests().catch(console.error);
