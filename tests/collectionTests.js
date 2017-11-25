var Collection = require("../collection.js");
var Index = require("../mongoIndex.js");

var index1 = new Index("contacts", ["lastName","privateName"], [1,1], [0,1], {});
var index1Reversed = new Index("contacts", ["lastName","privateName"], [-1,-1], [0,1], {});
var index2 = new Index("contacts", ["imei"], [-1], [0],{});
var col = new Collection("contacts",
    [index1,
    index2]);

function testPreconditions() {
    var wrongCollectionName = col.addIndex(new Index("fsdfdsf",[],[],[],{}));
    var emptyColumns = col.addIndex(new Index("contacts",[],[],[],{}));
    var emptyOrders = true;
    try {
        col.addIndex(new Index("contacts",[],[1],[],{}));
    }
    catch (e) {
        emptyOrders = false;
    }
    return !wrongCollectionName.success && !emptyColumns.success && !emptyOrders.success;
}

function testEqualsAndReverse() {
    var equalsResult = col.addIndex(index1);
    var reverse = col.addIndex(index1Reversed);
    return equalsResult.success && !equalsResult.created && reverse.success && !reverse.created;
}

function testPrefixAndCovering() {
    var prefix = col.addIndex(new Index("contacts", ["lastName"], [1], [0], {}));
    var covering = col.addIndex(new Index("contacts", ["lastName","privateName", "imei"], [1,1,1], [0,1,2], {}));
    return prefix.success && !prefix.created && covering.success && covering.created;
}

function testFlippableIndex() {
    var addIndex = col.addIndex(new Index("contacts",["imei"],[1],[0],{}));
    return addIndex.success && !addIndex.created;
}

function testDisjointIndexCreated() {
    var result = col.addIndex(new Index("contacts",["asd"],[1],[0],{}));
    return result.success && result.created;
}

console.log(testPreconditions() && testEqualsAndReverse() && testPrefixAndCovering() && testFlippableIndex() && testDisjointIndexCreated());



