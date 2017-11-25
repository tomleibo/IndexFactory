/**
 * This class represents an index in a collection.
 * @param collection - collection name
 * @param cols - array of column names
 * @param orders - array of orders in the same position of cols
 * @param flippableOrders - index positions which can be flipped from 1 to -1 or vice versa
 * @param options - object of options for the createIndex function
 */
var Index = function(collection, cols, orders, flippableOrders, options) {
    if (!collection || !cols || !orders) {
        throw "empty collection, orders or columns";
    }
    if (cols.length !== orders.length) {
        throw "cols and orders lengths do not match";
    }
    flippableOrders.forEach(function(x) {
        if (x >= cols.length) {
            throw "column position is out of bounds";
        }
    });
    this.collection = collection;
    this.cols = cols;
    this.orders = orders;
    this.flippableOrders = flippableOrders;
    this.options = options || {};
};

/**
 * Builds the createIndex command from this Index object
 * @returns {String} the full command
 */
Index.prototype.buildIndexCommand = function() {
    const queryPostfix = ")";
    var queryPrefix = "db." + this.collection + ".createIndex(";
    var indexes = "{";
    var indexPrefix = "";
    for (var i=0; i<this.cols.length; i++) {
        indexes += indexPrefix + "'" + this.cols[i] + "'" + ": " + this.orders[i];
        indexPrefix = ", ";
    }
    indexes += "}";
    return queryPrefix + indexes + ", " + JSON.stringify(this.options) + queryPostfix;
};

/**
 * Checks if the index given is a reverse of this index
 * Index Predicate
 * @param index - the index to check against this
 * @returns true iff the index given is a reverse of this one
 */
Index.prototype.isReverse = function(index) {
    if (this.collection !== index.collection) {
        return false;
    }
    for (var i=0; i<this.cols.length; i++) {
        if (this.cols[i] !== index.cols[i] || this.orders[i] * index.orders[i] !== -1) {
            return false;
        }
    }
    return true;
};

/**
 * Checks if the given index is a prefix of this Index (including full prefix, i.e: full equality)
 * Index Predicate
 * @param index - the index to check against this
 * @returns true iff the index given is a prefix of this Index
 */
Index.prototype.isPrefix = function(index) {
    if (this.collection !== index.collection || index.cols.length > this.cols.length) {
        return false;
    }
    for (var i=0; i<index.cols.length; i++) {
        if (this.cols[i] !== index.cols[i] || this.orders[i] !== index.orders[i]) {
            return false;
        }
    }
    return true;
};

/**
 * Checks if the given index is identical in columns, ignoring the index directions (-1 / 1)
 * @param index index to check against this
 * @return true iff the index given is identical in columns
 */
Index.prototype.isFlippable = function(index) {
    if (this.collection !== index.collection || index.cols.length !== this.cols.length) {
        return false;
    }
    for (var i=0; i<index.cols.length; i++) {
        if (this.cols[i] !== index.cols[i] || index.flippableOrders.indexOf(i) < 0) {
            return false;
        }
    }
    return true;
}

/**
 * Flips the orders in given positions
 * This allows for changing the index for bits that don't matter.
 * @param true iff the operation succeeded
 */
Index.prototype.flipOrders = function(positions) {
    for (var p in positions) {
        var pos = positions[p];
        if (this.flippableOrders.indexOf(pos) < 0) {
            return false;
        }
        this.orders[pos] *= -1;
    }
    return true;
}

/**
 * Checks if this index is already satisfied by the given index
 * Index Predicate
 * @param index - index to check if covers this Index
 * @returns true iff the given index covers this index
 */
Index.prototype.isCovered = function(index) {
    return index.isPrefix(this);
};

/**
 * Lazy way to implement equals.
 * @param Index Predicate
 */
Index.prototype.equals = function(index) {
    return this.isPrefix(index) && index.isPrefix(this);
};

/**
 * Setter for options.
 * The allows setting index options just before running the buildIndexCommand function.
 */
Index.prototype.setOptions = function(options) {
    this.options = options;
}

module.exports = Index;
