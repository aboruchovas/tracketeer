const puppeteer = require("puppeteer")
var Datastore = require('nedb')
var loggedHistory = new Datastore({ filename: 'history.db', autoload: true })

let currentMode = 'reference'
let status

function getTrackingWithReference(whenDone, referenceToUpdate) {
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

        // if no param supplied, track using inputted value
        if (typeof referenceToUpdate === 'undefined') {
            // 12422532 is an example of order number
            await page.type('#trkShipmentReference', ref)
        } else {
            await page.type('#trkShipmentReference', referenceToUpdate)
        }

        await page.select('#trkDestCountry', 'gb')

        // submit track request
        await page.click('#stApp_trkRefTrkBtn')

        // check status of request
        var isValid = true

        try {
            await page.waitForSelector('#stApp_SummaryTracked_packageStatusDesciption_0', { timeout: 2500 })
            status = await page.evaluate(() => document.querySelector('#stApp_SummaryTracked_packageStatusDesciption_0').textContent)
        }
        catch (error) {
            status = "INVALID"
            isValid = false
        }

        // if valid status, then add to database and refresh history log
        if (isValid && (typeof referenceToUpdate === 'undefined')) {
            var log = {
                type: "ref",
                reference: ref,
                status: status
            }

            loggedHistory.insert(log, function(err, doc) {
                console.log('added', doc.reference, 'with ID', doc._id);
            })

            loadHistory()
        } else if (isValid) {
            // update its status
            var logToUpdate

            loggedHistory.find({ type: "ref", reference: referenceToUpdate }, function(err, doc) {
                logToUpdate = doc[0]
                updateLog()
            })
            
            function updateLog() {
                loggedHistory.update({ _id: logToUpdate._id }, { $set: { status: status } })
            }

            loadHistory()
        }

        await browser.close()
        whenDone(status)
    })()
}

function getTrackingWithNumber(whenDone, numberToUpdate) {
    (async () => {
        const browser = await puppeteer.launch({ headless: true })
        const page = await browser.newPage()
        const num = document.querySelector('#tracking').value
      
        // go to UPS tracking page
        await page.goto('https://www.ups.com/track?loc=en_US&requester=ST/')

        // if no param supplied, track using inputted value
        if (typeof numberToUpdate === 'undefined') {
            // 1ZA612Y5DK92663860 is an example of tracking number
            await page.type('#stApp_trackingNumber', num)
        } else {
            await page.type('#stApp_trackingNumber', numberToUpdate)
        }

        // submit track request
        await page.click('#stApp_btnTrack')

        // check status of request
        var isValid = true

        try {
            await page.waitForSelector('#stApp_txtPackageStatus', { timeout: 2500 })
            status = await page.evaluate(() => document.querySelector('#stApp_txtPackageStatus').textContent)
        }
        catch (error) {
            status = "INVALID"
            isValid = false
        }

        // if valid status, then add to database and refresh history log
        if (isValid && (typeof numberToUpdate === 'undefined')) {
            var log = {
                type: "track_num",
                tracking_number: num,
                status: status
            }

            loggedHistory.insert(log, function(err, doc) {
                console.log('added', doc.tracking_number, 'with ID', doc._id);
            })

            loadHistory()
        } else if (isValid) {
            // update its status
            var logToUpdate

            loggedHistory.find({ type: "track_num", tracking_number: numberToUpdate }, function(err, doc) {
                logToUpdate = doc[0]
                updateLog()
            })
            
            function updateLog() {
                loggedHistory.update({ _id: logToUpdate._id }, { $set: { status: status } })
            }

            loadHistory()
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
            var historyItemRef = '<li>' + element.status.toUpperCase() + ': <a onclick="getTrackingWithReference(showStatus, ' + "'" + element.reference + "'" + ')">' + element.reference + '</a></li>' // FIX THIS DESGUSTENG
            var historyItemTrack = '<li>' + element.status.toUpperCase() + ': <a onclick="getTrackingWithNumber(showStatus, ' + "'" + element.tracking_number + "'" + ')">' + element.tracking_number + '</a></li>' // FIX THIS DESGUSTENG

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