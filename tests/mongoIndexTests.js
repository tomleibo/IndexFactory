/**
 * Created by tom on 9/27/17.
 */
var Index = require("../mongoIndex.js");

var index = new Index("contacts", ["imei", "lastName"], [1, -1], [0,1]);
var indexSecondOrderFlipped = new Index("contacts", ["imei", "lastName"], [1, 1], [0,1]);
var identical = new Index("contacts", ["imei", "lastName"], [1, -1], [0,1]);
var reverseIndex = new Index("contacts", ["imei", "lastName"], [-1, 1], [0,1]);
var nonReverseIndex = new Index("contacts", ["lastName", "imei"], [-1, 1], [0,1]);
var prefix = new Index("contacts", ["imei"], [1], [0]);

function testCreateIndexCommandQuery() {
    var query = index.buildIndexCommand();
    var queryExpected = "db.contacts.createIndex({'imei': 1, 'lastName': -1}, {})";
    return query === queryExpected;
}

function testIsReverse() {
    return index.isReverse(reverseIndex) && !index.isReverse(nonReverseIndex);
}

function testIsPrefix() {
    return index.isPrefix(prefix) && prefix.isCovered(index) && !reverseIndex.isPrefix(prefix);
}

function testEquals () {
    return index.equals(identical) && !index.equals(nonReverseIndex);
}

function testFlip () {
    index.flipOrders([1]);
    var equals = indexSecondOrderFlipped.equals(index);
    index.flipOrders([1]);
    return equals;
}

function testIsFlippable() {
    return index.isFlippable(reverseIndex) && !index.isFlippable(nonReverseIndex);
}

var result = testCreateIndexCommandQuery() && testIsReverse() && testIsPrefix() && testEquals() && testFlip() && testIsFlippable();

console.log(result);