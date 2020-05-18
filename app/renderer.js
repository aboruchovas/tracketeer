const ups = require('../libs/ups')

let Datastore     = require('nedb')
let loggedHistory = new Datastore({ filename: 'app/history.db', autoload: true })
let currentMode   = 'reference'

// used to find the status of a tracking number/reference
function findStatus(clickOnLog, type, value) {
    // check if clicked from history (so mode doesn't matter)
    if ((currentMode === 'reference' && !clickOnLog) || (clickOnLog && type === 'reference')) {
        ups.getReferenceStatus(value, function(status) {
            const tracking = {
                type: 'reference',
                value: value,
                status: status
            }

            parseStatus(status, 'reference', tracking)
        })
    } else if ((currentMode === 'track_num' && !clickOnLog) || (clickOnLog && type === 'track_num')) {
        ups.getTrackingNumStatus(value, function(status) {
            const tracking = {
                type: 'track_num',
                value: value,
                status: status
            }

            parseStatus(status, 'track_num', tracking)
        })
    }
}

// parse status and insert to db/update
function parseStatus(status, type, tracking) {
    if (status != 'NOT FOUND') {
        loggedHistory.find({ type: tracking.type, value: tracking.value }, function (err, docs) {
            if (docs.length > 0) {
                updateNumber(type, tracking.value, tracking.status)
            } else {
                loggedHistory.insert(tracking)
                loadHistory()
            }
        });
    }
    animateStatus(status)
}

// update if tracking already exists
function updateNumber(type, value, newStatus) {
    // NOTE: NeDB uses append only for performance reasons
    // requires to restart app to see updated statuses in log :(
    if (type == 'reference') {
        loggedHistory.find({ type: 'reference', value: value }, function(err, doc) {
            loggedHistory.update({ _id: doc[0]._id }, { $set: { status: newStatus } })
        })
    } else if (type == 'track_num') {
        loggedHistory.find({ type: 'track_num', value: value }, function(err, doc) {
            loggedHistory.update({ _id: doc[0]._id }, { $set: { status: newStatus } })
        })
    }
}

function animateStatus(status) {
    document.getElementById('status').innerHTML = status.toUpperCase()

    // flash history box after log is added
    if (document.getElementById('status').textContent !== 'NOT FOUND') {
        document.getElementById('history').className = 'flash'

        setTimeout(() => {
            document.getElementById('history').className = 'stop_flash'
        }, 1000)
    }
    
    // jiggle status text
    document.getElementById('status').style.transform = 'translateX(-20px)'

    setTimeout(() => {
        document.getElementById('status').style.transform = 'translateX(0px)'
    }, 1000)
}

function loadHistory() {
    document.getElementById('log_list').innerHTML = ''

    // find and show all logs to DOM
    loggedHistory.find({}, function(err, doc) {
        doc.forEach(element => {
            let historyItemRef = `
            <li>${element.status.toUpperCase()}: 
                <a onclick="findStatus(true, 'reference', '${element.value}')">${element.value}</a>
            </li>`

            let historyItemTrack = `
            <li>${element.status.toUpperCase()}:
                <a onclick="findStatus(true, 'track_num', '${element.value}')">${element.value}</a>
            </li>`

            if (element.type == 'reference') {
                document.getElementById('log_list').innerHTML += historyItemRef
            } else if (element.type == 'track_num') {
                document.getElementById('log_list').innerHTML += historyItemTrack
            } else {
                console.log('Error! Not a tracking type.')
            }
        })
    })
}

// called by a select button in the app
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
    let tracking_value = document.getElementById('tracking_input').value

    if (currentMode === 'reference') {
        findStatus(false, 'reference', tracking_value)
    } else if (currentMode === 'track_num') {
        findStatus(false, 'track_num', tracking_value)
    }
})

loadHistory() // load history on start up