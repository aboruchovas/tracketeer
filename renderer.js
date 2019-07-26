const puppeteer = require("puppeteer")

var Datastore = require('nedb')
var loggedHistory = new Datastore({ filename: 'history.db', autoload: true })

let currentMode = 'reference'
let status

function getTrackingWithReference(whenDone, referenceToUpdate) {
    (async () => {
        const browser = await puppeteer.launch({ headless: true })
        const page = await browser.newPage()
        const ref = document.querySelector('#tracking_input').value
      
        // go to UPS tracking page
        await page.goto('https://www.ups.com/track?loc=en_US&requester=ST/')
      
        // click track by reference
        await page.click('#stApp_btn_refTrack')
      
        // type in order number and choose UK region
        await page.waitForSelector('#trkShipmentReference')

        // if no param supplied, track using inputted value, otherwise use clicked on value
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

        await browser.close()

        // if valid status, then add to database and refresh history log
        if (isValid && (typeof referenceToUpdate === 'undefined')) {
            var log = {
                type: "ref",
                reference: ref,
                status: status
            }

            // check if log already exists
            if (loggedHistory.find({ type: "ref", reference: ref })) {
                updateReference(ref)
            } else {
                loggedHistory.insert(log)
            }
        } else if (isValid) {
            updateReference(referenceToUpdate)
        }
        
        loadHistory()
        whenDone(status)
    })()
}

function getTrackingWithNumber(whenDone, numberToUpdate) {
    (async () => {
        const browser = await puppeteer.launch({ headless: true })
        const page = await browser.newPage()
        const num = document.querySelector('#tracking_input').value
      
        // go to UPS tracking page
        await page.goto('https://www.ups.com/track?loc=en_US&requester=ST/')

        // if no param supplied, track using inputted value, otherwise use clicked on value
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

        await browser.close()

        // if valid status, then add to database and refresh history log
        if (isValid && (typeof numberToUpdate === 'undefined')) {
            var log = {
                type: "track_num",
                tracking_number: num,
                status: status
            }

            // check if log already exists
            if (loggedHistory.find({ type: "track_num", tracking_number: num })) {
                updateTrackNum(num)
            } else {
                loggedHistory.insert(log)
            }
        } else if (isValid) {
            updateTrackNum(numberToUpdate)
        }

        loadHistory()
        whenDone(status)
    })()
}

function updateReference(ref) {
    // update if exists
    var logToUpdate

    loggedHistory.find({ type: "ref", reference: ref }, function(err, doc) {
        logToUpdate = doc[0]
        updateLog()
    })
    
    function updateLog() {
        loggedHistory.update({ _id: logToUpdate._id }, { $set: { status: status } })
    }
}

function updateTrackNum(num) {
    // update if exists
    var logToUpdate

    loggedHistory.find({ type: "track_num", tracking_number: num }, function(err, doc) {
        logToUpdate = doc[0]
        updateLog()
    })
    
    function updateLog() {
        loggedHistory.update({ _id: logToUpdate._id }, { $set: { status: status } })
    }
}

function showStatus(status) {
    document.getElementById('status').innerHTML = status.toUpperCase()
    animateStatus()
}

function animateStatus() {
    // flash history box after log is added
    if (document.getElementById('status').textContent !== "INVALID") {
        document.getElementById('history').className = 'flash'

        setTimeout(() => {
            document.getElementById('history').className = 'stop_flash'
        }, 1000)
    }
    
    // jiggle status text
    document.getElementById('status').style.transform = "translateX(-20px)"

    setTimeout(() => {
        document.getElementById('status').style.transform = 'translateX(0px)'
    }, 1000)
}

function loadHistory() {
    document.getElementById('log_list').innerHTML = ""

    // find and show all logs to DOM
    loggedHistory.find({}, function(err, doc) {
        doc.forEach(element => {
            var historyItemRef = '<li>' + element.status.toUpperCase() + ': <a onclick="getTrackingWithReference(showStatus, ' + 
                                "'" + element.reference + "'" + ')">' + element.reference + '</a></li>'

            var historyItemTrack = '<li>' + element.status.toUpperCase() + ': <a onclick="getTrackingWithNumber(showStatus, ' + 
                                "'" + element.tracking_number + "'" + ')">' + element.tracking_number + '</a></li>'

            if (element.reference) {
                document.getElementById('log_list').innerHTML += historyItemRef
            } else if (element.tracking_number) {
                document.getElementById('log_list').innerHTML += historyItemTrack
            } else {
                console.log("Error! Not a tracking type.")
            }
        })
    })
}

function changeMode() {
    document.getElementById('status').innerHTML = null
    document.getElementById('tracking_input').value = null

    const mode = document.getElementById('tracking_mode').value
    if (mode === 'reference') {
        document.getElementById('tracking_input').placeholder = 'ORDER NUMBER'
        currentMode = 'reference'
    } else if (mode === 'track_num') {
        document.getElementById('tracking_input').placeholder = 'TRACKING NUMBER'
        currentMode = 'track_num'
    }
}

document.querySelector('#check_button').addEventListener('click', async function () {
    if (currentMode === 'reference') {
        getTrackingWithReference(showStatus)
    } else if (currentMode === 'track_num') {
        getTrackingWithNumber(showStatus)
    }
})

loadHistory() // load history on start up