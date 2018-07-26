//einzelne tankstelle https://creativecommons.tankerkoenig.de/json/detail.php?id=005056ba-7cb6-1ed2-bceb-90e59ad2cd35&apikey=f5581dae-81e9-31ed-f84b-79c11b69d9f6
//umkreissuche https://creativecommons.tankerkoenig.de/json/list.php?lat=52.52099975265203&lng=13.43803882598877&rad=4&sort=price&type=diesel&apikey=f5581dae-81e9-31ed-f84b-79c11b69d9f6


const http = require('http');
const https = require('https');
const url = require('url');
const request = require('request');
//var rp = require('request-promise')
const async = require('async');
const port = process.env.PORT || 8080;
const apikey = process.env.TK_API || "f5581dae-81e9-31ed-f84b-79c11b69d9f6";
const apiurl = "https://creativecommons.tankerkoenig.de/json/list.php?apikey=" + apikey;
const gMapsAPI = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const gMapsAPIKey = process.env.GMAPS || "";




http.createServer(async function (req, res) {

    if (req.method === 'OPTIONS') {
        console.log('!OPTIONS');
        var headers = {};
        // IE8 does not allow domains to be specified, just the *
        // headers["Access-Control-Allow-Origin"] = req.headers.origin;
        headers["Access-Control-Allow-Origin"] = "*";
        headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Credentials"] = false;
        headers["Access-Control-Max-Age"] = '86400'; // 24 hours
        headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
        res.writeHead(200, headers);
        res.end();
    } else if (req.method === 'POST') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        let body = [];
        req.on('data', (chunk) => {
            body.push(chunk);
        }).on('end', async () => {
            let fuelarray = ["e10", "e5", "diesel"];
            let xml = "error";
            let bodyjson = JSON.parse(Buffer.concat(body).toString());
            if (bodyIsUndefined(bodyjson)) {
                xml = "One or more parameters are not set";
                res.writeHead(200, {'Content-Type': 'text/plain'});
            } else if (isNaN(bodyjson.lat) || isNaN(bodyjson.lng) || isNaN(bodyjson.radius)) {
                xml = "Lat, Lng and Radius have to be numbers";
                res.writeHead(200, {'Content-Type': 'text/plain'});
            } else if (fuelarray.indexOf(bodyjson.fuel) < 0) {
                xml = "Please select a valid fuel";
                res.writeHead(200, {'Content-Type': 'text/plain'});
            } else if ((bodyjson.lat < 47.40734 || bodyjson.lat > 54.9079) || (bodyjson.lng < 5.98815 || bodyjson.lng > 14.98853)) {
                //Lat-long coorditates for cities in Germany are in range: Latitude from 47.40724 to 54.9079 and longitude from 5.98815 to 14.98853.
                //xml = "Lat must be between -90 and 90 and Lng must be between -180 and 180";
                xml = "Lat and Lng have to be in Germania";
                res.writeHead(200, {'Content-Type': 'text/plain'});
            } else if (bodyjson.radius < 1) {
                xml = "Radius must be bigger than 1";
                res.writeHead(200, {'Content-Type': 'text/plain'});
            } else {
                xml = await
                    formData(bodyjson.lat, bodyjson.lng, bodyjson.radius, bodyjson.fuel, bodyjson.isEdge);
                res.writeHead(200, {'Content-Type': 'application/xml'});//text/plan .. application/xml
            }
            res.end(xml);
            console.log("response succesful");
        });
    }
}).listen(port);
console.log("Server started at "+port);

function bodyIsUndefined(reqBody) {
    return (typeof reqBody.lat == 'undefined' ||
        typeof reqBody.lng == 'undefined' ||
        typeof reqBody.radius == 'undefined' ||
        typeof reqBody.fuel == 'undefined');
}

//showData();
function addXMLTag(tagname, tagvalue) {
    return ("<" + tagname + ">" + tagvalue + "</" + tagname + ">\n");
}

function getData(lat, long, radius, fuel) {
    let adr = apiurl + "&type=" + fuel + "&rad=" + radius + "&lng=" + long + "&lat=" + lat + "&sort=price";
    console.log("getData: getting data");
    return new Promise(function (resolve, reject) {
        request(adr, function (error, response, body) {
            json = JSON.parse(body);
            for (let i = 0; i < json.stations.length; i++) {
                //TODO search the whole array
                if (!isNaN(json.stations[i].price) && json.stations[i].price !== null) {
                    json.stations.splice(0, i);
                    break;
                }
            }
            resolve(json);
        });
    });

}

async function retrieveURL(adr) {
    return new Promise(function (resolve, reject) {
        request(adr, function (error, response, body) {
            resolve(body);
        });
    });
}

async function formData(lat, lng, radius, fuel, isEdge) {
    console.log("formData: start"+"lat "+lat+",lng "+lng+",radius "+radius+",fuel "+fuel);
    let json = await getData(lat, lng, radius, fuel); //TODO variable fuel type
    let ratings = await augmentWithRatings(json);
    //let openingHours = await augmentWithOpeningHours(json);
    //rating = JSON.parse(res[0]);
    //console.log(rating);
    var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\n";
    if(!isEdge) {
        xml += "<!DOCTYPE tankstellen SYSTEM \"" + process.env.DTD_URL + "\">\n";
    }
    xml += "<tankstellen>\n";
    for (let i = 0; i < json.stations.length; i++) {
        xml += "<tankstelle>\n";
        xml += addXMLTag("id", i);
        xml += addXMLTag("name", json.stations[i].name);
        xml += addXMLTag("price", json.stations[i].price);
        xml += addXMLTag("brand", json.stations[i].brand);
        xml += addXMLTag("street", json.stations[i].street);
        xml += addXMLTag("place", json.stations[i].place);
        xml += addXMLTag("postCode", json.stations[i].postCode);
        xml += addXMLTag("lat", json.stations[i].lat);
        xml += addXMLTag("lng", json.stations[i].lng);
        xml += addXMLTag("dist", json.stations[i].dist);
        xml += addXMLTag("isOpen", json.stations[i].isOpen);
        xml += addXMLTag("rating", ratings[i]);
        xml += "</tankstelle>\n";

    }
    xml += "</tankstellen>";
    console.log("formData: end");
    return xml;

}


function augmentWithRatings(data) {
    //TODOne fixed by morten

    let ratings = [];
    let functions = [];
    console.log("augmentWithRatings: getting ratings");
    for (let i = 0; i < data.stations.length; i++) {
        //let adr = gMapsAPI + "?location=" + data.stations[i].lat + "," + data.stations[i].lng + "&radius=500&type=gas_station&key=" + gMapsAPIKey;
        functions[i] = async.reflect(function (callback) {
            setTimeout(async function () {
                //console.log(gMapsAPI + "?location=" + data.stations[i].lat + "," + data.stations[i].lng + "&radius=500&type=gas_station&key=" + gMapsAPIKey);
                let answer = await retrieveURL(gMapsAPI + "?location=" + data.stations[i].lat + "," + data.stations[i].lng + "&radius=1000&type=gas_station&key=" + gMapsAPIKey);
                //console.log(answer.length+" number:"+i);
                callback(null, answer);
            }, 100);
        })

    }
    return new Promise(function (resolve, reject) {
        async.parallel(functions, function (err, results) {
            // the results array will equal ['one','two'] even though
            // the second function had a shorter timeout.
            //console.log(results.length);
            //console.log(results[0].value);
            //console.log(data);
            let ratings = [];
            for (let i = 0; i < results.length; i++) {
                rating = JSON.parse(results[i].value);

 /*               if(!(rating.results.length <= 0 ||typeof rating.results[0].opening_hours == 'undefined')) {
                    console.log(rating.results[0].opening_hours);
                }*/
                if (rating.results.length <= 0 || typeof rating.results[0].rating == 'undefined') {
                    ratings[i] = -1;
                } else {
                    ratings[i] = rating.results[0].rating;
                    //console.log(addXMLTag("rating",rating.results[0].rating));
                }
            }
            resolve(ratings);
        });
    });
}


/*function augmentWithOpeningHours(data) {
    //TODOne fixed by morten

    let ratings = [];
    let functions = [];
    for (let i = 0; i < data.stations.length; i++) {
        functions[i] = async.reflect(function (callback) {
            setTimeout(async function () {
                let answer = await retrieveURL("https://creativecommons.tankerkoenig.de/json/detail.php?id="+data.stations[i].id+"&apikey=f5581dae-81e9-31ed-f84b-79c11b69d9f6");
                //console.log(answer.length+" number:"+i);
                callback(null, answer);
            }, 100);
        })

    }
    return new Promise(function (resolve, reject) {
        async.parallel(functions, function (err, results) {
            // the results array will equal ['one','two'] even though
            // the second function had a shorter timeout.
            //console.log(results.length);
            //console.log(results[0].value);
            //console.log(data);
            let openinghours = [];
            for (let i = 0; i < results.length; i++) {
                console.log(results[i].value)
            }
            resolve(openinghours);
        });
    });
}*/

