const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const code = '287513I017308';
    console.log(`Debug tracking for: ${code}`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const url = `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${code}`;
        console.log(`Navigating to: ${url}`);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log("Navigation complete (domcontentloaded). Waiting for body...");

        // Wait a bit for JS to render
        await new Promise(r => setTimeout(r, 5000));

        // Capture HTML
        let html = await page.content();
        fs.writeFileSync('debug_page.html', html);
        console.log("HTML saved to debug_page.html");

        // Try to handle cookie banner blindly to see if it helps
        try {
            console.log("Checking for TrustArc banner...");
            await page.waitForSelector('#truste-consent-button', { timeout: 5000 });
            await page.click('#truste-consent-button');
            console.log("Clicked TrustArc consent button. Waiting for update...");
            await new Promise(r => setTimeout(r, 5000));
        } catch (e) {
            console.log("TrustArc button not found or timeout.");
        }

        // Capture HTML & Text
        html = await page.content();
        fs.writeFileSync('debug_page.html', html);

        const text = await page.evaluate(() => document.body.innerText);
        fs.writeFileSync('debug_text.txt', text);
        console.log("Text saved to debug_text.txt");

        console.error('Error:', error);
    } finally {
        if (browser) await browser.close();
    }
})();
