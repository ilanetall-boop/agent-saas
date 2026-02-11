// Browser Automation Service (Puppeteer)
// Web scraping, form filling, clicking, screenshots

const puppeteer = require('puppeteer');

let browser = null;

// Launch browser (lazy load)
async function getBrowser() {
    if (!browser) {
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-gpu',
                    '--disable-dev-shm-usage' // Important pour Render
                ]
            });
            console.log('✅ Puppeteer browser launched');
        } catch (error) {
            console.error('❌ Failed to launch browser:', error);
            throw error;
        }
    }
    return browser;
}

// Visit URL and get content
async function visitUrl(url, timeout = 30000) {
    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout });
        
        const content = await page.content();
        await page.close();
        
        return { success: true, content };
    } catch (error) {
        console.error(`Failed to visit ${url}:`, error.message);
        return { success: false, error: error.message };
    }
}

// Take screenshot
async function takeScreenshot(url, options = {}) {
    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        const screenshot = await page.screenshot({
            fullPage: options.fullPage || true,
            type: options.type || 'png'
        });
        
        await page.close();
        
        return { success: true, screenshot };
    } catch (error) {
        console.error(`Failed to screenshot ${url}:`, error.message);
        return { success: false, error: error.message };
    }
}

// Click element
async function clickElement(url, selector) {
    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        
        await page.goto(url, { waitUntil: 'networkidle2' });
        await page.click(selector);
        
        await page.close();
        
        return { success: true };
    } catch (error) {
        console.error(`Failed to click ${selector}:`, error.message);
        return { success: false, error: error.message };
    }
}

// Fill form and submit
async function fillForm(url, formData, submitSelector = null) {
    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        // Fill each field
        for (const [selector, value] of Object.entries(formData)) {
            await page.fill(selector, value);
        }
        
        // Submit if selector provided
        if (submitSelector) {
            await page.click(submitSelector);
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
        }
        
        await page.close();
        
        return { success: true };
    } catch (error) {
        console.error('Failed to fill form:', error.message);
        return { success: false, error: error.message };
    }
}

// Extract data with selector
async function extractData(url, selectors = {}) {
    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        const data = {};
        for (const [key, selector] of Object.entries(selectors)) {
            data[key] = await page.$eval(selector, el => el.innerText).catch(() => null);
        }
        
        await page.close();
        
        return { success: true, data };
    } catch (error) {
        console.error('Failed to extract data:', error.message);
        return { success: false, error: error.message };
    }
}

// Execute JS on page
async function executeJS(url, jsCode) {
    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        const result = await page.evaluate(jsCode);
        
        await page.close();
        
        return { success: true, result };
    } catch (error) {
        console.error('Failed to execute JS:', error.message);
        return { success: false, error: error.message };
    }
}

// Graceful shutdown
async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
        console.log('✅ Browser closed');
    }
}

process.on('SIGINT', closeBrowser);
process.on('SIGTERM', closeBrowser);

module.exports = {
    visitUrl,
    takeScreenshot,
    clickElement,
    fillForm,
    extractData,
    executeJS,
    closeBrowser,
    getBrowser
};
