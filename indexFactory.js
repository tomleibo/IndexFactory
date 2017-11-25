/**
 * This class handles documents extracted from the profilingInfo collection and turns them into indices.
 * exported method: convertQueryToIndex
 */

var Index = require("./mongoIndex.js"),
    ObjectID = require('mongodb').ObjectID;

/**
 * Full list of operators by category. This is later re-classified into equality operators and range operators.
 * Copied from https://docs.mongodb.com/manual/reference/operator/query/
 */
const equalityComparisonOperators = ["$eq", "$ne", "$in", "$nen"];
const rangeComparisonOperators = ["$gt","$gte", "$lt", "$lte"];
const logicalOperators = ["$and", "$not", "$nor", "$or"];
const elementOperatos = ["$exists", "$type"];
const evaluationOperators = ["$mod", "$regex", "$text", "$where"];
const geoSpatialOperators = ["$geoIntersects", "$geoWithin", "$near", "$nearSphere"];
const equalityArrayOperators = ["$size"];
const recursiveArrayOperators = ["$all", "$elemMatch"];
const bitwiseOperators = ["$bitsAllClear", "$bitsAllSet", "$bitsAnyClear", "$bitsAnySet"];
const projectionOperators = ["$", "$meta", "$slice"];

/** Combined lists of operators by type  */
const equalityOperators = equalityComparisonOperators.concat(elementOperatos, evaluationOperators, equalityArrayOperators, bitwiseOperators, projectionOperators, geoSpatialOperators);
const rangeOperators = rangeComparisonOperators;
const recursiveOperators = recursiveArrayOperators.concat(logicalOperators);
const simpleEqualityObjectTypes = ['ObjectID', 'Date'];

/** sort orders */
const ASCENDING = 1;
const DESCENDING = -1;

/**
 * Converts a query profiling info into an Index object.
 * @param profilingInfoDoc - one profiling info document
 * @return {Index} parsed index or null in case profiling info doc is weird
 */
var convertQueryToIndex = function(profilingInfoDoc) {
    if (profilingInfoDoc.command && profilingInfoDoc.command.mapreduce) {
        return buildIndexFromMapReduce(profilingInfoDoc);
    }
    if (profilingInfoDoc.command && profilingInfoDoc.command.aggregate) {
        return buildIndexFromAggregation(profilingInfoDoc);
    }
    if ((profilingInfoDoc.query && profilingInfoDoc.ns) || (profilingInfoDoc.command && (profilingInfoDoc.command.findandmodify || profilingInfoDoc.command.count))) {
        return buildIndexFromFind(profilingInfoDoc);
    }
    console.log("info doc is in a format not implemented yet:  "+JSON.stringify(profilingInfoDoc));
    return null;
};

/**
 * Builds an index from the given profiling info parameter, assuming the audited query is of type mapreduce
 * @param profilingInfo profiling info document
 * @return {Index} The index created
 */
var buildIndexFromMapReduce = function (profilingInfo) {
    var collection = profilingInfo.command.mapreduce;
    if (!collection) {
        return null;
    }
    var filter = parseFilter(profilingInfo.command.query);
    var sort = parseSort(profilingInfo.command.sort);
    return buildIndexFromColumnsAndOrders(filter, sort, collection);
};

/**
 * Builds an index from the given profiling info parameter, assuming the audited query is of type aggregation
 * @param profilingInfo profiling info document
 * @return {Index} The index created
 */
function buildIndexFromAggregation(profilingInfo) {
    var collection = profilingInfo.command.aggregate;
    var firstMatchPosition = 0;
    var pipeline = profilingInfo.command.pipeline;
    for (; firstMatchPosition < pipeline.length; firstMatchPosition++) {
        if (pipeline[firstMatchPosition].hasOwnProperty("$match")) {
            break;
        }
    }
    var equalityAndRange = parseFilter(pipeline[firstMatchPosition]["$match"]);
    var equalityOrders = Array(equalityAndRange.equality.length).fill(ASCENDING);
    var rangeOrders = Array(equalityAndRange.equality.length).fill(ASCENDING);
    var result = concatUniqueColsAndOrders(equalityAndRange.equality,equalityOrders, equalityAndRange.range, rangeOrders);
    var flippableOrders = [];
    for (var i=0; i<equalityAndRange.equality.length; i++) {
        flippableOrders.push(i);
    }
    return new Index(collection,result.cols,result.orders,flippableOrders);
}

/**
 * Builds an index from parsed filter and sort data.
 * @param filterColsAndOrders array of columns and sort orders used for the filter part of the query
 * @param sortColsAndOrders array of columns and sort orders used for the sort part of the query
 * @param collection collection name
 * @return {Index} The index created
 */
function buildIndexFromColumnsAndOrders(filterColsAndOrders, sortColsAndOrders, collection) {
    var cols = filterColsAndOrders.equality;
    var equalitySize = cols.length;
    var orders = Array(equalitySize).fill(ASCENDING);
    var result = concatUniqueColsAndOrders(cols,orders,sortColsAndOrders.cols,sortColsAndOrders.orders);
    var range = filterColsAndOrders.range;
    var rangeOrders = Array(range.length).fill(ASCENDING);
    result = concatUniqueColsAndOrders(result.cols,result.orders,range,rangeOrders);
    var flippableOrders = [];
    // if only sort then all columns are flippable
    if (equalitySize === 0 && range.length === 0) {
        for (var p = 0; p < cols.length; p++) {
            flippableOrders.push(p);
        }
    } else {
        for (var p = 0; p < filterColsAndOrders.equality.length; p++) {
            flippableOrders.push(p);
        }
        for (var p = 0; p < rangeOrders.length; p++) {
            var flippableRangePos = sortColsAndOrders.cols.length + equalitySize + p;
            flippableOrders.push(flippableRangePos);
        }
    }
    // TODO duplicate columns can be found in different positions but mongo seems to ignore them
    return new Index(collection, result.cols, result.orders, flippableOrders);
}


/**
 * Builds an index from the given profiling info parameter, assuming the audited query is of type find
 * @param profilingInfo profiling info document
 * @return {Index} The index created
 */
function buildIndexFromFind(profilingInfo) {
    var collection = findCollectionInFindQuery(profilingInfo);
    if (!collection) {
        return null;
    }
    var filter = profilingInfo.query ? (profilingInfo.query.filter || profilingInfo.query["$query"] || profilingInfo.query) : profilingInfo.command.query;
    var equalityAndRange = parseFilter(filter);
    var sort = profilingInfo.query ? (profilingInfo.query.sort || profilingInfo.query["$orderby"]) : null;
    var sortColsAndOrders = parseSort(sort);
    return buildIndexFromColumnsAndOrders(equalityAndRange, sortColsAndOrders, collection);
}

/**
 * Collection name can be found in weird places for different query types.
 * This method handles all the options I found out.
 * TODO Might be more options
 * @param profilingInfo one profiling query document
 * @return collection name
 */
function findCollectionInFindQuery(profilingInfo) {
    var collection = (profilingInfo.query && profilingInfo.query.find) || (profilingInfo.command && (profilingInfo.command.count || profilingInfo.command.findandmodify));
    if (!collection) {
        var ns = profilingInfo.ns.split('.');
        if (!ns || !ns.length) {
            collection = null;
        } else {
            collection = ns[ns.length-1];
        }
    }
    if (!collection || collection === "$cmd") {
        console.log("couldn't find collection name for "+JSON.stringify(profilingInfo)+"     returning "+collection);
    }
    return collection;
}

function pushUnique(ar, el) {
    if (ar.indexOf(el) == -1) {
        ar.push(el);
    }
}

function concatUniqueColsAndOrders(cols1, orders1, cols2, orders2) {
    var cols = cols1.slice(), orders = orders1.slice();
    for (var i=0; i < cols2.length; i++) {
        if (cols.indexOf(cols2[i]) == -1) {
            cols.push(cols2[i]);
            orders.push(orders2[i]);
        }
    }
    return {cols: cols, orders: orders};
}

/**
 * recursively parse filter object into two arrays - one for column names by which we query for equality, and a second for querying by range.
 * @param filter filter object or an inner object of filter.
 * @return {range: Array, equality: Array} - an object with two arrays - equality and range, each holding a list of column names.
 */
function parseFilter(filter) {
    var equality = [];
    var range = [];
    for (var key in filter) {
        if (!filter.hasOwnProperty(key)) {
            continue;
        }
        var value = filter[key];
        // simple value implies simple query {key=value}
        if (value !== Object(value) || value instanceof RegExp) {
            pushUnique(equality,key);
        }
        // query with operators -> value is object
        else if (typeof value == 'object') {
            var op = Object.keys(value)[0];
            // equality operators
            if (equalityOperators.indexOf(op) > -1) {
                pushUnique(equality,key);
            }
            // Known objects like:   _id : ObjectID("123")
            else if (simpleEqualityObjectTypes.indexOf(value.constructor.name) > -1) {
                pushUnique(equality,key);
            }
            //range operations
            else if (rangeOperators.indexOf(op) > -1) {
                pushUnique(range,key);
            }
            // recursive (logical) operations
            else if (recursiveOperators.indexOf(key) > -1 && value.constructor === Array) {
                value.map(function(x) {
                    var clause = parseFilter(x);
                    return clause;
                }).forEach(function(x) {
                    equality = concatUniqueColsAndOrders(equality, [], x.equality, []).cols;
                    range = concatUniqueColsAndOrders(range, [], x.range, []).cols;

                });
            } else {
                // defaults to complex object equality check like phone: {countryCode: "+1", nationalNumber: "50505050"}
                pushUnique(equality,key);
            }
        }
         else {
            console.log("Unexpected combination of filter values: " + key + " = " + value);
        }
    }
    return {range: range, equality: equality};
}

/**
 * Parses sort clauses into two arrays of column names and index order
 * @param sort - sort clause
 * @return {{cols: Array, orders: Array}}
 */
function parseSort(sort) {
    var result = {cols:[], orders:[]};
    if (sort) {
        Object.keys(sort).forEach(function(x) {
            if (result.cols.indexOf(x) > -1) {
                pushUnique(result.cols,x);
                pushUnique(result.orders,sort[x]);
            }
        });
    }
    return result;
}

module.exports = convertQueryToIndex;
