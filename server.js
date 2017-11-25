/**
 * A server for initializing the mongo profiling, running the indexOptimizer remotely and getting the results to the browser.
 */

var config = require('./config.json');
var optimizer = require('./indexOptimizer');
var analyzer = require('./indexAnalyzer');
var mongodb = require('mongodb');
const express = require('express');
const app = express();
var MongoClient = mongodb.MongoClient,
expressServer = null, systemDb = null;

app.get('/', function(req,res) {
	systemDb.profilingInfo(function(err, infos) {
		if (err) {
			console.log(err);
			return;
		}
		if (!infos || !infos.length) {
			console.log("profiling info is empty");
			return;
		}
		console.log("Parsing " + infos.length + " saved queries");
		var result = optimizer(infos);
		analyzer(infos);
		res.send(result);
	});
});

var userPass = config.authenticate ? config.dbUser+":"+config.dbPass+"@" : "";
var url = "mongodb://" + userPass + config.dbhost+":"+config.dbport+"/"+config.dbname;
MongoClient.connect(url, config.connectionOptions, function(err, db) {
	if (err) {
		console.log(err);
		return;
	}
	var adminDb = db.admin();
	if (config.authenticate) {
        adminDb.authenticate(config.adminDbUser, config.adminDbPass,{},function (err, res) {
            if (err) {
                console.log(err);
                return;
            }
            startProfilingAndListen(db,adminDb);
        });
    } else {
      startProfilingAndListen(db,adminDb);
    }

});

function startProfilingAndListen(db,adminDb) {
    db.command({profile: 1, slowms: config.slow}, function (err, res) {
        if (err) {
            console.log(err);
            return;
        }
        console.log(res);
        expressServer = app.listen(config.expressPort);
        systemDb = adminDb;
    });
}

