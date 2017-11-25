/**
 * This is a base for a more complex analysis class that could provide some useful data about the logged queries,
 * the indexing process and the outcome.
 * @param infos the array received from the profiling collection.
 * @param collections the outcome of the processing - an array of collections and their indices.
 */
var run = function(infos, collections) {
    var sum = 0;
    var count = 0;
    var max = -1;
    var maxQuery = 0;
    infos.forEach(function (x) {
        var runTime = x.millis;
        if (!runTime) {
            return
        }
        sum += runTime;
        count++;
        if (runTime > max) {
            max = runTime;
            maxQuery = x;
        }
    });

    console.log("Queries analyzed: "+count);
    console.log("Average query time: "+sum/count);
    console.log("Max query runtime: "+max);
    console.log("Max query:  " + JSON.stringify(maxQuery));
}

module.exports = run;