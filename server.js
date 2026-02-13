const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/api/track/:code', async (req, res) => {
    const { code } = req.params;
    console.log(`Tracking request for: ${code}`);

    if (!code) {
        return res.status(400).json({ error: 'Tracking code is required' });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Emulate a real browser to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Poste Italiane DoveQuando URL
        const url = `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${code}`;
        console.log(`Navigating to: ${url}`);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Handle Cookie Banner (TrustArc)
        try {
            const cookieSelector = '#truste-consent-button';
            // Wait a bit for the banner to appear, as it might be async
            try {
                await page.waitForSelector(cookieSelector, { timeout: 5000 });
                console.log("Cookie banner found, clicking...");
                await page.click(cookieSelector);
                // Wait for the banner to disappear/page to update
                await new Promise(r => setTimeout(r, 5000));
            } catch (e) {
                console.log("Cookie banner not found within timeout, skipping.");
            }
        } catch (e) {
            console.log("Cookie banner handling error:", e.message);
        }

        // Wait for results to load
        try {
            // Wait for something distinctive in the result text or specific element
            // "Spedizione" usually appears in the header "Spedizione [Type]"
            await page.waitForFunction(
                () => document.body.innerText.includes('Spedizione') || document.body.innerText.includes('Non disponibile'),
                { timeout: 15000 }
            );
        } catch (e) {
            console.log("Timeout waiting for 'Spedizione' text, proceeding to scrape...");
        }

        // Extract data
        const data = await page.evaluate(() => {
            const bodyText = document.body.innerText;
            const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            // Heuristic Parsing
            // Usually the Main Status is near the top, after "Spedizione ..."
            // But let's look for specific keywords in the whole text first for reliability.

            let status = "Sconosciuto";
            let history = [];

            // Keywords to detecting status (priority order)
            // Note: Poste uses "Consegnata" for shipment (feminine)
            if (bodyText.match(/Consegnat[oa]/i)) status = "Consegnato";
            else if (bodyText.includes("In consegna")) status = "In consegna";
            else if (bodyText.includes("In transito")) status = "In transito";
            else if (bodyText.includes("Presa in carico")) status = "Presa in carico";
            else if (bodyText.includes("Non disponibile")) status = "Non disponibile";

            // Attempt to parse history
            // We look for lines that look like dates "28 Gennaio 2026"
            // This is a rough heuristic.

            return {
                status: status,
                raw_text: bodyText.substring(0, 5000) // Capture enough text for debugging
            };
        });

        // Send back whatever we found
        res.json({
            code,
            status: data.status,
            raw_response: data,
            message: "Tracking data retrieved"
        });

    } catch (error) {
        console.error('Error tracking package:', error);
        res.status(500).json({ error: 'Failed to track package', details: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
