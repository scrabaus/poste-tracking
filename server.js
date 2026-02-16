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
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
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
            try {
                await page.waitForSelector(cookieSelector, { timeout: 5000 });
                console.log("Cookie banner found, clicking...");
                await page.click(cookieSelector);
                await new Promise(r => setTimeout(r, 5000));
            } catch (e) {
                console.log("Cookie banner not found within timeout, skipping.");
            }
        } catch (e) {
            console.log("Cookie banner handling error:", e.message);
        }

        // Wait for results to load
        try {
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
            let status = "Sconosciuto";
            let timeline = [];

            // Extract main status (priority order)
            if (bodyText.match(/Consegnat[oa]/i)) status = "Consegnato";
            else if (bodyText.includes("In consegna")) status = "In consegna";
            else if (bodyText.includes("In transito")) status = "In transito";
            else if (bodyText.includes("Presa in carico")) status = "Presa in carico";
            else if (bodyText.includes("Non disponibile")) status = "Non disponibile";

            // Extract timeline/history from the page
            const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Look for status keywords
                if (line.match(/^(In transito|In consegna|Consegnat[oa]|Presa in carico|In giacenza)/i)) {
                    let eventStatus = line;
                    let eventDate = '';
                    let eventLocation = '';

                    // Try to find date in next few lines
                    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
                        const testLine = lines[j];
                        // Match Italian date format
                        if (testLine.match(/\d{1,2}\s+(Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\s+\d{4}/i)) {
                            eventDate = testLine;
                            // Check if there's location info on next line
                            if (j + 1 < lines.length && (lines[j + 1].includes('sede') || lines[j + 1].includes('Centro'))) {
                                eventLocation = lines[j + 1];
                            }
                            break;
                        }
                    }

                    if (eventDate || eventStatus) {
                        timeline.push({
                            status: eventStatus,
                            date: eventDate,
                            location: eventLocation
                        });
                    }
                }
            }

            return {
                status: status,
                timeline: timeline,
                raw_text: bodyText.substring(0, 5000)
            };
        });

        // Send back whatever we found
        res.json({
            code,
            status: data.status,
            raw_response: data,
            message: "Tracking data retrieved from Poste Italiane"
        });

    } catch (error) {
        console.error('Error tracking package:', error);
        res.status(500).json({ error: 'Failed to track package', details: error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
