const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

async function scrapePosteItalianeOrSDA(code) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        // Try Poste Italiane first
        const posteUrl = `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${code}`;
        console.log(`Trying Poste Italiane: ${posteUrl}`);

        await page.goto(posteUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Handle Cookie Banner
        try {
            await page.waitForSelector('#truste-consent-button', { timeout: 5000 });
            await page.click('#truste-consent-button');
            await new Promise(r => setTimeout(r, 5000));
        } catch (e) {
            console.log("Cookie banner not found, skipping.");
        }

        // Wait for content
        try {
            await page.waitForFunction(
                () => document.body.innerText.includes('Spedizione') || document.body.innerText.includes('Non disponibile'),
                { timeout: 15000 }
            );
        } catch (e) {
            console.log("Timeout waiting for content, proceeding...");
        }

        // Extract data
        let data = await page.evaluate(() => {
            const bodyText = document.body.innerText;
            let status = "Sconosciuto";

            if (bodyText.match(/Consegnat[oa]/i)) status = "Consegnato";
            else if (bodyText.includes("In consegna")) status = "In consegna";
            else if (bodyText.includes("In transito")) status = "In transito";
            else if (bodyText.includes("Presa in carico")) status = "Presa in carico";
            else if (bodyText.includes("Non disponibile")) status = "Non disponibile";

            return {
                status: status,
                raw_text: bodyText.substring(0, 5000),
                source: 'poste'
            };
        });

        // If Poste didn't work, try SDA
        if (data.status === "Sconosciuto" || data.status === "Non disponibile") {
            console.log("Poste didn't return valid tracking, trying SDA...");

            // SDA website tracking
            const sdaUrl = `https://www.sda.it`;
            await page.goto(sdaUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Wait for search box and enter code
            try {
                await page.waitForSelector('input[name="letteraVettura"]', { timeout: 10000 });
                await page.type('input[name="letteraVettura"]', code);
                await page.click('button[type="submit"],input[type="submit"]');
                await new Promise(r => setTimeout(r, 5000));

                data = await page.evaluate(() => {
                    const bodyText = document.body.innerText;
                    let status = "Sconosciuto";

                    if (bodyText.match(/Consegnat[oa]/i)) status = "Consegnato";
                    else if (bodyText.includes("In consegna")) status = "In consegna";
                    else if (bodyText.includes("In giacenza")) status = "In giacenza";
                    else if (bodyText.includes("In transito")) status = "In transito";

                    return {
                        status: status,
                        raw_text: bodyText.substring(0, 5000),
                        source: 'sda'
                    };
                });
            } catch (e) {
                console.log("SDA tracking failed:", e.message);
            }
        }

        await browser.close();
        return data;
    } catch (error) {
        await browser.close();
        throw error;
    }
}

app.get('/api/track/:code', async (req, res) => {
    const { code } = req.params;
    console.log(`Tracking request for: ${code}`);

    if (!code) {
        return res.status(400).json({ error: 'Tracking code is required' });
    }

    try {
        const data = await scrapePosteItalianeOrSDA(code);

        res.json({
            code,
            status: data.status,
            raw_response: data,
            message: `Tracking data retrieved from ${data.source}`
        });

    } catch (error) {
        console.error('Error tracking package:', error);
        res.status(500).json({ error: 'Failed to track package', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
