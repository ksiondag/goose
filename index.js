'use strict';

// TODO: 2016/05/29
// Might be better to be capable of creating multiple seperate instances of
// goose, as multiple different setups could be of use in a single app

var assert = require('assert');

var models = {};

exports.model = function (name, props) {
    var Model = models[name];

    if (Model) {
        assert(Model.sameDefinition(props), 
            `ModelError: Multiple different definitions of ${name}`
        );
        return Model;
    }

    var propSet = {};
    Model = function (obj) {
        // TODO: 2016/05/29
        // Imperfect object checking
        // Doesn't verify that relationship members are of correct model
        // type
        this._id = null;
        Object.keys(propSet).forEach((key) => {
            if (!propSet.hasOwnProperty(key)) { return; }
            Object.defineProperty(this, key, propSet[key]());
        });

        Object.keys(obj).forEach((key) => {
            if (!obj.hasOwnProperty(key)) { return; }
            assert(propSet.hasOwnProperty(key),
                `Model has no property "${key}"`
            );
            this[key] = obj[key];
        });
    };

    var instances = [];
    Model.instances = {
        all: function () {
            return instances;
        },
        filter: function (params) {
            var results;

            if (!params) {
                params = {};
            }
            results = this.all().filter((instance) => {
                return Object.keys(params).every((key) => {
                    return params[key] === instance[key];
                });
            });

            return results;
        },
        get: function (params) {
            var results = this.filter(params);
            assert(results.length <= 1, 'More than one value meets criteria');
            return results[0] || null;
        }
    };

    Model.addProp = function (key, type) {
        if (type.relationship) {
            propSet[key] = type(name, key);
            return;
        }

        propSet[key] = function () {
            var val = null;
            return {
                get: function () {
                    return val;
                },
                set: function (newVal) {
                    if (newVal === null) {
                        val = newVal;
                        return;
                    }
                    val = type(newVal);
                },
                enumerable: true
            };
        };

        Model.instances.all().forEach((instance) => {
            Object.defineProperty(this, key, propSet[key]());
        });
    };

    models[name] = Model;
    Object.keys(props).forEach((key) => {
        if (!props.hasOwnProperty(key)) { return; }
        Model.addProp(key, props[key]);
    });

    Model.sameDefinition = function (definition) {
        // TODO: 2016/05/29
        // Imperfect comparison of definitions
        // Doesn't check that relationships are consistent

        if (!definition) {
            return true;
        }

        Object.keys(definition).forEach((key) => {
            if (!definition.hasOwnProperty(key)) { return; }
            if (!props.hasOwnProperty(key)) { 
                return false;
            }
        });

        Object.keys(props).forEach((key) => {
            if (!props.hasOwnProperty(key)) { return; }
            if (!definition.hasOwnProperty(key)) {
                return false;
            }
        });
    };

    var id = 0;
    Model.prototype.save = function () {
        if (this._id !== null) {
            return this;
        }
        this._id = id;
        id += 1;
        instances.push(this);
        return this;
    };

    return Model;
};

var relationship = function (func) {
    return function () {
        var ret;
        ret = func.apply(this, arguments);
        ret.relationship = true;
        return ret;
    };
};

exports.oneToOne = relationship(function (otherName) {
    var oneToOneAPI;

    oneToOneAPI = function (name, key) {
        var Model = models[name];
        var OtherModel = models[otherName];

        assert(Model, `No model with name ${name}`);
        assert(OtherModel, `No model with name ${otherName}`);

        var otherType = function () {
            return function () {
                return {
                    get: function () {
                        var search = {};
                        search[key] = this;
                        return Model.instances.get(search);
                    },
                    set: function (obj) {
                        var search;
                        var originalObj;

                        search = {
                            [key]: this._id
                        };

                        originalObj = Model.instances.get(search);

                        if (originalObj) {
                            originalObj[key] = null;
                        }

                        if (obj === null) {
                            return;
                        }

                        assert(obj instanceof Model,
                            `Assigning non-${name} instance to ${otherName}.${key}`
                        );

                        obj[key] = this;
                    },
                    enumerable: true
                };
            };
        };
        otherType.relationship = true;
        OtherModel.addProp(name.toLowerCase(), otherType);

        return function () {
            var otherId = null;
            return {
                get: function () {
                    if (otherId === null) {
                        return null;
                    }
                    return OtherModel.instances.get({_id: otherId});
                },
                set: function (otherObj) {
                    if (!otherObj) {
                        otherId = null;
                    }
                    assert(otherObj instanceof OtherModel,
                        `Assigning non-${otherName} instance to ${name}.${key}`
                    );
                    otherId = otherObj._id;
                },
                enumerable: true
            };
        };
    };

    return oneToOneAPI;
});

exports.manyToOne = relationship(function (otherName) {
    var manyToOneAPI;

    manyToOneAPI = function (name, key) {
        var Model = models[name];
        var OtherModel = models[otherName];

        assert(Model, `No model with name ${name}`);
        assert(OtherModel, `No model with name ${otherName}`);

        var otherType = function () {
            return function () {
                return {
                    get: function () {
                        var search = {};
                        search[key] = this;
                        return Model.instances.filter(search);
                    },
                    enumerable: true
                };
            };
        };
        otherType.relationship = true;
        OtherModel.addProp(name.toLowerCase() + 's', otherType);

        OtherModel.prototype['add' + name] = function (obj) {
            obj[key] = this;
        };

        OtherModel.prototype['remove' + name] = function (obj) {
            if (obj && obj[key] === this) {
                obj[key] = null;
            }
        };

        return function () {
            var otherId = null;
            return {
                get: function () {
                    if (otherId === null) {
                        return null;
                    }
                    return OtherModel.instances.get({_id: otherId});
                },
                set: function (otherObj) {
                    if (!otherObj) {
                        otherId = null;
                    }
                    assert(otherObj instanceof OtherModel,
                        `Assigning non-${otherName} instance to ${name}.${key}`
                    );
                    otherId = otherObj._id;
                },
                enumerable: true
            };
        };
    };

    return manyToOneAPI;
});

var manyMaps = {};
exports.manyToMany = relationship(function (otherName) {
    // TODO 2016/05/30
    var manyToManyAPI;

    manyToManyAPI = function (name, key) {
        var Model = models[name];
        var OtherModel = models[otherName];

        assert(Model, `No model with name ${name}`);
        assert(OtherModel, `No model with name ${otherName}`);

        var otherType = function () {
            return function () {
                return {
                    get: function () {
                        return Model.instances.all().filter((instance) => {
                            return instance[key].some((otherInstance) => {
                                return otherInstance === this;
                            });
                        });
                    },
                    set: function (objs) {
                        var oldObjs = this[name.toLowerCase() + 's'];
                        oldObjs.forEach((obj) => {
                            obj['remove' + otherName](this);
                        });
                        objs.forEach((obj) => {
                            obj['add' + otherName](this);
                        });
                    },
                    enumerable: true
                };
            };
        };
        otherType.relationship = true;
        OtherModel.addProp(name.toLowerCase() + 's', otherType);

        OtherModel.prototype['add' + name] = function (obj) {
            assert(obj instanceof Model,
                `Assigning non-${name} instance to ${otherName}.${key}`
            );
            obj['add' + otherName](this);
        };

        OtherModel.prototype['remove' + name] = function (obj) {
            obj['remove' + otherName](this);
        };

        Model.prototype['add' + otherName] = function (otherObj) {
            var otherObjs;
            assert(otherObj instanceof OtherModel,
                `Assigning non-${otherName} instance to ${name}.${key}`
            );

            otherObjs = this[key];
            // Other object already present in list, do nothing
            if(otherObjs.some((check) => check === otherObj)) {
                return;
            }
            otherObjs.push(otherObj);
            this[key] = otherObjs;
        };

        Model.prototype['remove' + otherName] = function (otherObj) {
            var index, otherObjs;
            otherObjs = this[key];
            index = otherObjs.indexOf(otherObj);
            if (index === -1) {
                return;
            }
            otherObjs.splice(index, 1);
            this[key] = otherObjs;
        };

        return function () {
            var otherIds = [];
            return {
                get: function () {
                    return otherIds.map((id) => {
                        return OtherModel.instances.get({_id: id});
                    });
                },
                set: function (otherObjs) {
                    otherIds = otherObjs.map((otherObj) => otherObj._id);
                },
                enumerable: true
            };
        };
    };

    return manyToManyAPI;
});

exports.purge = function () {
    models = {};
};

exports.dump = function (filename) {
    var name, Model, instances, dumpJSON = [];
    for (name in models) {
        if (!models.hasOwnProperty(name)) { continue; }
        Model = models[name];
        instances = Model.instances.all();
        instances.forEach((instance) => {
            var key, val, dumpRow;
            dumpRow = {
                name: name,
                id: instance._id,
                properties: {}
            };
            for (key in instance) {
                if (key === '_id' || !instance.hasOwnProperty(key)) {
                    continue;
                }
                val = instance[key];
                if (val._id) {
                    dumpRow.properties[key] = val._id;
                    continue;
                }
                dumpRow.properties[key] = val;
            }
            dumpJSON.push(dumpJSON);
        });
    }
};

exports.load = function (filename) {
};

