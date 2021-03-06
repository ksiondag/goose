'use strict';

// TODO: 2016/05/29
// Might be better to be capable of creating multiple seperate instances of
// goose, as multiple different setups could be of use in a single app

const assert = require('assert');

let models = {};

exports.model = function (name, props) {
    let Model = models[name];

    // TODO 2016/06/03
    // Not sure how I feel about being able to fetch an already-created Model
    // by its name
    if (!props) {
        return Model;
    }

    if (Model) {
        assert.ifError(`Model ${name} defined multiple times`);
    }

    let propSet = {};
    let bind = {
        create: [],
        save: []
        // TODO
        //delete: []
    };
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

        bind.create.forEach((func) => func(this));
    };

    let instances = [];
    Model.instances = {
        all: function () {
            return instances;
        },
        filter: function (params) {
            let results;

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
            let results = this.filter(params);
            assert(results.length <= 1, 'More than one value meets criteria');
            return results[0] || null;
        }
    };

    Model.addProp = function (key, type) {
        if ([String, Number].every((check) => check !== type)) {
            if (type.get) {
                Object.defineProperty(Model.prototype, key, type);
                return;
            } else {
                propSet[key] = type(name, key);
            }
        } else {
            propSet[key] = function () {
                let val = null;
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
        }

        Model.instances.all().forEach((instance) => {
            Object.defineProperty(instance, key, propSet[key]());
        });
    };

    Model.bind = function (when, func) {
        bind[when].push(func);
        // All instances that already exist should run the function if it isn't
        // a function to be executed upon instance deletion
        if (when !== 'delete') {
            Model.instances.all().forEach((instance) => func(instance));
        }
    };

    models[name] = Model;
    Model.serializeKeys = [];
    Object.keys(props).forEach((key) => {
        if (!props.hasOwnProperty(key)) { return; }
        Model.addProp(key, props[key]);
        Model.serializeKeys.push(key);
    });

    let id = 0;
    Model.prototype.save = function () {
        // TODO: 2016/06/03
        // Should id be in a closure? Only a select few things should set it
        if (!this._id) {
            this._id = id;
            id += 1;
        } else {
            id = Math.max(id, this._id + 1);
        }
        if (instances.indexOf(this) === -1) {
            instances.push(this);
        }

        bind.save.forEach((func) => func(this));

        return this;
    };

    // TODO: Model.prototype.delete

    return Model;
};

var forceInstance = function (Model, callback) {
    return function (obj) {
        if (typeof(obj) === 'number') {
            obj = Model.instances.get({_id: obj});
        }
        return callback.call(this, obj);
    };
};

exports.propClosure = function (func) {
    return function () {
        return func;
    };
};

exports.oneToOne = function (otherName) {
    return function (name, key) {
        let Model = models[name];
        let OtherModel = models[otherName];

        assert(Model, `No model with name ${name}`);
        assert(OtherModel, `No model with name ${otherName}`);

        OtherModel.addProp(name.toLowerCase(), {
            get: function () {
                let search = {};
                search[key] = this;
                return Model.instances.get(search);
            },
            set: forceInstance(Model, function (obj) {
                let search;
                let originalObj;

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
            }),
            enumerable: true
        });

        return function () {
            let otherId = null;
            return {
                get: function () {
                    if (otherId === null) {
                        return null;
                    }
                    return OtherModel.instances.get({_id: otherId});
                },
                set: forceInstance(OtherModel, function (otherObj) {
                    if (!otherObj) {
                        otherId = null;
                        return;
                    }
                    assert(otherObj instanceof OtherModel,
                        `Assigning non-${otherName} instance to ${name}.${key}`
                    );
                    otherId = otherObj._id;
                }),
                enumerable: true
            };
        };
    };
};

exports.manyToOne = function (otherName) {
    return function (name, key) {
        let Model = models[name];
        let OtherModel = models[otherName];

        assert(Model, `No model with name ${name}`);
        assert(OtherModel, `No model with name ${otherName}`);

        OtherModel.addProp(name.toLowerCase() + 's', {
            get: function () {
                let search = {};
                search[key] = this;
                return Model.instances.filter(search);
            },
            // TODO silent kat 2016/06/01
            // Setter
            enumerable: true
        });

        OtherModel.prototype['add' + name] = function (obj) {
            obj[key] = this;
        };

        OtherModel.prototype['remove' + name] = function (obj) {
            if (obj && obj[key] === this) {
                obj[key] = null;
            }
        };

        return function () {
            let otherId = null;
            return {
                get: function () {
                    if (otherId === null) {
                        return null;
                    }
                    return OtherModel.instances.get({_id: otherId});
                },
                set: forceInstance(OtherModel, function (otherObj) {
                    if (!otherObj) {
                        otherId = null;
                        return;
                    }
                    assert(otherObj instanceof OtherModel,
                        `Assigning non-${otherName} instance to ${name}.${key}`
                    );
                    otherId = otherObj._id;
                }),
                enumerable: true
            };
        };
    };
};

let manyMaps = {};
exports.manyToMany = function (otherName) {
    return function (name, key) {
        let Model = models[name];
        let OtherModel = models[otherName];

        assert(Model, `No model with name ${name}`);
        assert(OtherModel, `No model with name ${otherName}`);

        OtherModel.addProp(name.toLowerCase() + 's', {
            get: function () {
                return Model.instances.all().filter((instance) => {
                    return instance[key].some((otherInstance) => {
                        return otherInstance === this;
                    });
                });
            },
            set: function (objs) {
                let oldObjs = this[name.toLowerCase() + 's'];
                oldObjs.forEach((obj) => {
                    obj['remove' + otherName](this);
                });
                objs.forEach(forceInstance(Model, (obj) => {
                    obj['add' + otherName](this);
                }));
            },
            enumerable: true
        });

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
            let otherObjs;
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
            let index, otherObjs;
            otherObjs = this[key];
            index = otherObjs.indexOf(otherObj);
            if (index === -1) {
                return;
            }
            otherObjs.splice(index, 1);
            this[key] = otherObjs;
        };

        return function () {
            let otherIds = [];
            return {
                get: function () {
                    return otherIds.map((id) => {
                        return OtherModel.instances.get({_id: id});
                    });
                },
                set: function (otherObjs) {
                    otherIds = otherObjs.map(
                        forceInstance(
                            OtherModel,
                            (otherObj) => otherObj._id
                        )
                    );
                },
                enumerable: true
            };
        };
    };
};

exports.purge = function () {
    models = {};
};

exports.dump = function () {
    let jsonDump = [];
    Object.keys(models).forEach((name) => {
        let Model;

        if (!models.hasOwnProperty(name)) { return; }
        Model = models[name];

        Model.instances.all().forEach((instance) => {
            let instanceDump = {
                id: instance._id,
                name: name,
                properties: {}
            };
            Model.serializeKeys.forEach((key) => {
                let val = instance[key];
                if (val instanceof Array) {
                    val = val.map((obj) => obj._id);
                } else if (val instanceof Object) {
                    val = val._id;
                }
                instanceDump.properties[key] = val;
            });
            jsonDump.push(instanceDump);
        });
    });
    return JSON.stringify(jsonDump, null, 2);
};

exports.load = function (jsonString) {
    let json = JSON.parse(jsonString);

    json.forEach((definition) => {
        let Model = models[definition.name];
        let model = new Model(definition.properties);
        model._id = definition.id;
        model.save();
    });
};

