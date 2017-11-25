var queryConverter = require('./indexFactory.js');
var Index = require("./mongoIndex.js");
var Collection = require("./collection.js");

/**
 * Convenience class that receives all the profiling data, converts it into indices,
 * adds all indices into collections while optimizing index creation for each collection and finally,
 * takes all the indices and converts them into a script for building indices. (list of createIndex commands)
 * This script can then be run manually through the shell.
 * TODO: add an option to run the created indices here
 * @param infos profiling info array
 */

var run = function(infos) {
    var collections = {};
    infos.forEach(function(x) {
        var index = queryConverter(x);
        if (index == null) {
            console.log("Failed to convert query to Index object: "+JSON.stringify(index));
            return;
        }
        var collection = collections[index.collection];
        if (!collection) {
            collections[index.collection] = new Collection(index.collection,[index]);
        } else {
            collection.addIndex(index);
        }
    });
    return collectionsToScript(collections);
};

function collectionsToScript(collections) {
    var responseData = "";
    Object.values(collections).forEach(function(x) {
        x.getIndices().map(function(y) {
            return y.buildIndexCommand();
        }).forEach(function(z) {
            responseData += z + "\n";
        });
    });
    return responseData;
}

module.exports = run;