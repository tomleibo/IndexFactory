var Index = require("./mongoIndex.js");

/**
 * Constructor for the Collection class.
 * Represents a collection with its indices. Whenever an index is added, the addIndex method tries to optimize the index set.
 * This optimization is checking if the index already exists, a prefix exists, a reverse exists and so on.
 * @param name collection name
 * @param indices array of indices
 */
var Collection = function(name, indices) {
    this.name = name;
    this.indices = indices || [];
};

/**
 * Tries to find an existing index that satisfies the given index requirements. (such as covering index, equal index and so on...)
 * If no such index is found the given index is added to the indices array.
 * @param index the new index to add to the collection
 * @return {success:boolean,created:boolean,message:String} success is true iff the index is satisfied or added. created is true iff the index was added.
 */
Collection.prototype.addIndex = function(index) {
    if (index.collection !== this.name) {
        return {success: false, created: false, message: 'Collection names do not match'};
    }
    if (!index.cols || index.cols.length == 0) {
        return {success: false, created: false, message: 'cols field is empty'};
    }
    if (!index.orders|| index.orders.length == 0) {
        return {success: false, created: false, message: 'orders field is empty'};
    }
    if (this.findEquals(index) > -1) {
        return {success: true, created: false, message: 'Index already exists'};
    }
    if (this.findReversed(index) > -1) {
        return {success: true, created: false, message: 'Reverse Index exists'};
    }
    if (this.findPrefix(index) > -1) {
        return {success: true, created: false, message: 'Index given is a prefix of an existing index'};
    }
    var coveringIndexPosition = this.findCovering(index);
    if (coveringIndexPosition > -1) {
        this.indices[coveringIndexPosition] = index;
        return {success: true, created: true, message: "The given index replaced an existing index which its prefix"}
    }
    var flippablePosition = this.findFlippable(index);
    if (flippablePosition > -1) {
        return {success: true, created: false, message: "A similar index can be used, with the same columns but different index directions"}
    }
    this.indices.push(index);
    return {success: true, created: true, message: "Index created"}
}

/**
 * Iterates the array of indices and checks the Index Predicate f for a positive result.
 * if f's return value is false, checks the next index, otherwise returns the index position.
 * assuming index collection name and this.collection are equal
 * @param index candidate index
 * @param f Index Predicate (one of Index's methods that receive another index and return a boolean)
 * @return {int} position of viable (by f) index position or -1 if such index wasn't found
 */
Collection.prototype.findInIndicesByPredicate = function(index, f) {
    if (this.indices.length == 0) {
        return -1;
    }
    for (var i=0; i<this.indices.length; i++) {
        if (f.call(this.indices[i], index)) {
            return i;
        }
    }
    return -1;
};

/**
 * Find a position of index in this.indices which the index given is a prefix of
 */
Collection.prototype.findPrefix = function(index) {
    return this.findInIndicesByPredicate(index,Index.prototype.isPrefix);
};

/**
 * Find a position of index in this.indices which is a prefix of the given index
 */
Collection.prototype.findCovering = function (index) {
    return this.findInIndicesByPredicate(index,Index.prototype.isCovered);
}

/**
 * Find a position of index in this.indices which is a reversed index of the given index
 */
Collection.prototype.findReversed = function (index) {
    return this.findInIndicesByPredicate(index,Index.prototype.isReverse);
}

/**
 * Find a position of index in this.indices which equals to the given index
 */
Collection.prototype.findEquals = function (index) {
    return this.findInIndicesByPredicate(index,Index.prototype.equals);
}

/**
 * Find a position of index in this.indices which has the same indexes in different orders as the given index
 */
Collection.prototype.findFlippable = function (index) {
    return this.findInIndicesByPredicate(index,Index.prototype.isFlippable);
}

Collection.prototype.getIndices = function() {
    return this.indices;
}

Collection.prototype.getName = function() {
    return this.name;
}

module.exports = Collection;