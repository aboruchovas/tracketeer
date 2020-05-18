const request = require('request')

// this custom-made library is used to find the status of UPS tracking numbers
// and UPS reference numbers (aka Supreme order numbers)

const ups = {}

const trackingNumOptions = {
    uri: 'https://www.ups.com/track/api/Track/GetStatus?loc=en_GB',
    method: 'POST',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36',
    },
    json: {
        Locale: 'en_GB',
        TrackingNumber: ['1ZT8YP21DK21680121']
    }
}

const referenceOptions = {
    uri: 'https://www.ups.com/track/api/Track/GetTrackByReference?loc=en_GB',
    method: 'POST',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36',
    },
    json: {
        dateRangeFrom: '17/04/2020',
        dateRangeTo: '17/05/2020',
        destinationCountry: 'gb',
        destinationPostalCode: '',
        locale: 'en_GB',
        shipmentReference: '1976479',
        shipmentType: 'Package',
        shipperAccoun: ''
    }
}

ups.getTrackingNumStatus = (trackingNum, callback) => {
    trackingNumOptions.json.TrackingNumber = [trackingNum]

    return request(
        trackingNumOptions,
        (error, res, body) => {
            if (error) {
                console.error(error)
                return
            }

            if (body['statusCode'] != '200') {
                // console.log('Tracking number not found in database')
                return callback('NOT FOUND')
            } else {
                // console.log(body['trackDetails'][0]['packageStatus'])
                return callback(body['trackDetails'][0]['packageStatus'])
                // return body['trackDetails'][0]['packageStatus']
            }
        }
    )
}

ups.getReferenceStatus = (reference, callback) => {
    referenceOptions.json.shipmentReference = reference

    return request(
        referenceOptions,
        (error, res, body) => {
            if (error) {
                console.error(error)
                return
            }
    
            if (body['statusCode'] != '200') {
                // console.log('Tracking number not found in database')
                return callback('NOT FOUND')
            } else {
                // console.log(body['referenceTrackSummaryDetails'][0]['packageStatus'])
                return callback(body['referenceTrackSummaryDetails'][0]['packageStatus'])
                // return body['referenceTrackSummaryDetails'][0]['packageStatus']
            }
        }
    )
    
}

module.exports = ups;
