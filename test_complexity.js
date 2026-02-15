/**
 * Local test for complexity detection
 */

// Complexity detection patterns - ORDER MATTERS (website before simple)
const PATTERNS = {
    website: [
        /\b(portfolio|site|website|landing.?page|webpage|page web)\b/i,
        /\b(créer?|crée|fais|faire|génère|build|make|write).*(site|portfolio|page)/i,
        /\b(html|css).*(complet|professionnel|moderne)/i,
        /\b(restaurant|boutique|shop|business|entreprise).*(site|web)/i,
        /besoin d'un site/i,
        /site.*professionnel/i
    ],
    code: [
        /\b(code|function|script|program|debug|error|bug|fix|fonction)\b/i,
        /\b(javascript|typescript|python|java|sql|api|json|react|node)\b/i,
        /```[\s\S]*```/,
        /\b(implement|develop|program|écris|écrire)\b/i,
        /\b(algorithme|variable|boucle|array|objet)\b/i
    ],
    analysis: [
        /\b(analy[sz]e|explain|compare|evaluate|review|analyser|expliquer)\b/i,
        /\b(summarize|summary|digest|résumé|résumer)\b/i,
        /\b(data|report|chart|graph|spreadsheet|données)\b/i
    ],
    complex: [
        /\b(architect|design|strategy|plan|roadmap|stratégie|architecture)\b/i,
        /\b(research|investigate|deep.dive|recherche|approfondir)\b/i,
        /step.by.step|étape par étape/i,
        /\b(complex|difficult|challenging|optimize|complexe|difficile)\b/i,
        /\b(refactor|rewrite|migrate|réécrire|migrer)\b/i
    ],
    translate: [
        /tradui[st]|translate/i,
        /en (français|anglais|espagnol|allemand)/i,
        /to (french|english|spanish|german)/i
    ],
    simple: [
        /^(hi|hello|hey|bonjour|salut|coucou)[\s!?]*$/i,
        /^(yes|no|ok|okay|sure|oui|non|d'accord)[\s!?]*$/i,
        /^(thanks?|merci)[\s!?]*$/i,
        /^(how are you|ça va|comment vas)/i,
        /^je m'appelle \w+$/i
    ]
};

function analyzeComplexity(message) {
    const text = message.toLowerCase();
    const wordCount = text.split(/\s+/).length;

    const priorityOrder = ['website', 'code', 'complex', 'analysis', 'translate', 'simple'];

    for (const complexity of priorityOrder) {
        const patterns = PATTERNS[complexity];
        if (patterns) {
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    return complexity;
                }
            }
        }
    }

    if (wordCount > 200) return 'complex';
    if (wordCount > 100) return 'analysis';
    if (wordCount > 50) return 'code';

    return 'simple';
}

// Test cases
const testCases = [
    { input: "Salut", expected: "simple" },
    { input: "Je m'appelle Thomas", expected: "simple" },
    { input: "Crée-moi un portfolio pour montrer mes photos de mariage", expected: "website" },
    { input: "J'ai besoin d'un site web professionnel pour mon restaurant", expected: "website" },
    { input: "Écris-moi une fonction JavaScript qui valide un email", expected: "code" },
    { input: "C'est quoi le meilleur appareil photo?", expected: "simple" },
    { input: "Fais-moi un site pour mon restaurant La Dolce Vita", expected: "website" },
    { input: "Génère un portfolio", expected: "website" },
    { input: "Je veux un site pour mon business", expected: "website" },
    { input: "Traduis en anglais", expected: "translate" },
    { input: "Analyse ces données", expected: "analysis" },
    { input: "Crée une page web moderne", expected: "website" },
];

console.log("Testing complexity detection:\n");

let passed = 0;
let failed = 0;

for (const test of testCases) {
    const result = analyzeComplexity(test.input);
    const status = result === test.expected ? "✅ PASS" : "❌ FAIL";

    if (result === test.expected) {
        passed++;
    } else {
        failed++;
    }

    console.log(`${status} "${test.input.substring(0, 50)}${test.input.length > 50 ? '...' : ''}"`);
    console.log(`   Expected: ${test.expected} | Got: ${result}`);
}

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
