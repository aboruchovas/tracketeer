const puppeteer = require("puppeteer")

let currentMode = 'reference'
let status

function getTrackingWithReference(whenDone) {
    (async () => {
        const browser = await puppeteer.launch({ headless: true })
        const page = await browser.newPage()
        const ref = document.querySelector('#tracking').value
      
        // go to UPS tracking page
        await page.goto('https://www.ups.com/track?loc=en_US&requester=ST/')
      
        // click track by reference
        await page.click('#stApp_btn_refTrack')
      
        // type in order number and choose UK region
        await page.waitForSelector('#trkShipmentReference')
        // 12422532 is an example of order number
        await page.type('#trkShipmentReference', ref)
        await page.select('#trkDestCountry', 'gb')

        // submit track request
        await page.click('#stApp_trkRefTrkBtn')

        // check status of request
        try {
            await page.waitForSelector('#stApp_SummaryTracked_packageStatusDesciption_0', { timeout: 2500 })
            status = await page.evaluate(() => document.querySelector('#stApp_SummaryTracked_packageStatusDesciption_0').textContent)
        }
        catch (error) {
            status = "INVALID"
        }

        await browser.close()

        whenDone(status)
    })()
}

function getTrackingWithNumber(whenDone) {
    (async () => {
        const browser = await puppeteer.launch({ headless: true })
        const page = await browser.newPage()
        const num = document.querySelector('#tracking').value
      
        // go to UPS tracking page
        await page.goto('https://www.ups.com/track?loc=en_US&requester=ST/')

        // 1ZA612Y5DK92663860 is an example of tracking number
        await page.type('#stApp_trackingNumber', num)

        // submit track request
        await page.click('#stApp_btnTrack')

        // check status of request
        try {
            await page.waitForSelector('#stApp_txtPackageStatus', { timeout: 2500 })
            status = await page.evaluate(() => document.querySelector('#stApp_txtPackageStatus').textContent)
        }
        catch (error) {
            status = "INVALID"
        }

        await browser.close()

        whenDone(status)
    })()
}

function showStatus(status) {
    document.getElementById('status').innerHTML = status.toUpperCase()
}

function changeMode() {
    document.getElementById('status').innerHTML = null
    document.getElementById('tracking').value = null

    const mode = document.getElementById('tracking_mode').value
    if (mode == 'reference') {
        document.getElementById('tracking').placeholder = 'ORDER NUMBER'
        currentMode = 'reference'
    } else if (mode == 'track_num') {
        document.getElementById('tracking').placeholder = 'TRACKING NUMBER'
        currentMode = 'track_num'
    }
}

document.querySelector('#check').addEventListener('click', async function() {
    if (currentMode == 'reference') {
        getTrackingWithReference(showStatus)
    } else if (currentMode == 'track_num') {
        getTrackingWithNumber(showStatus)
    }
})
