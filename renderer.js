const puppeteer = require("puppeteer")
var Datastore = require('nedb')
var loggedHistory = new Datastore({ filename: 'history.db', autoload: true })

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

            var log = {
                reference: ref,
                status: status
            }

            loggedHistory.insert(log, function(err, doc) {
                console.log('Inserted', doc.reference, 'with ID', doc._id);
            })

            loadHistory()
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

            var log = {
                tracking_number: num,
                status: status
            }

            loggedHistory.insert(log, function(err, doc) {
                console.log('Inserted', doc.tracking_number, 'with ID', doc._id);
            })

            loadHistory()
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
    animateStatus()
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

function loadHistory() {
    document.getElementById('list').innerHTML = ""

    loggedHistory.find({}, function(err, doc) {
        doc.forEach(element => {
            var historyItemRef = '<li>' + element.status.toUpperCase() + ': <a onclick="refreshStatus()">' + element.reference + '</a></li>'
            var historyItemTrack = '<li>' + element.status.toUpperCase() + ': <a onclick="refreshStatus()">' + element.tracking_number + '</a></li>'

            if (element.reference) {
                document.getElementById('list').innerHTML += historyItemRef
            }
            else if (element.tracking_number) {
                document.getElementById('list').innerHTML += historyItemTrack
            }
            else {
                console.log("Error! Not a tracking type.")
            }
        })
    })
}

function refreshStatus() {    
    loggedHistory.find({}, function(err, doc) {
        console.log(doc)
    })
}

function animateStatus() {
    // flash history box after log is added
    document.getElementById('history').className = 'flash'
    setTimeout(() => {
        document.getElementById('history').className = 'stop_flash'
    }, 1000)

    // jiggle status text
    document.getElementById('status').style.transform = "translateX(-20px)"

    setTimeout(() => {
        document.getElementById('status').style.transform = 'translateX(0px)'
    }, 1000)
}

document.querySelector('#check').addEventListener('click', async function() {
    if (currentMode == 'reference') {
        getTrackingWithReference(showStatus)
    } else if (currentMode == 'track_num') {
        getTrackingWithNumber(showStatus)
    }
})

loadHistory()