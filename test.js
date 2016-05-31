'use strict';

// Simple test setup because I don't want to think about which library to use
// right now

// TODO: 2016/05/29
// Think about which test library to use

var goose = require('./index.js');

var standalone = function (func) {
    return function () {
        func();
        goose.purge();
    };
};

var testBasic = standalone(function () {
    var User = goose.model('User', {
        email: String,
        password: String
    });

    var user = new User({
        email: 'testuser@example.com',
        password: 'testpassword'
    }).save();

    var user2 = new User({
        email: 'otheruser@example.com',
        password: 'otherpassword'
    }).save();

    var users = User.instances.all();

    if (user !== users[0]) {
        throw 'Unexpected first user';
    }

    if (user2 !== users[1]) {
        throw 'Unexpected second user';
    }
});

var testOneToOne = standalone(function () {
    var User = goose.model('User', {
        email: String
    });

    var Character = goose.model('Character', {
        user: goose.oneToOne('User')
    });

    var user = new User({
        email: 'testuser@example.com'
    }).save();

    var user2 = new User({
        email: 'otheruser@example.com'
    }).save();

    var character = new Character({
        user: user
    }).save();

    if (user.character !== character) {
        throw 'User does not have expected character';
    }
    if (character.user !== user) {
        throw 'Character does not have expected user';
    }

    user2.character = character;
    if (user2.character !== character) {
        throw 'user2.setCharacter did not work';
    }
    if (character.user !== user2) {
        throw 'User has right character but character has wrong user';
    }

    character.user = user;
    if (user.character !== character) {
        throw 'character.setUser did not work';
    }
    if (character.user !== user) {
        throw 'User has right character but character has wrong user';
    }
});

var testManyToOne = standalone(function () {
    var User = goose.model('User', {
        email: String
    });

    var Character = goose.model('Character', {
        user: goose.manyToOne('User')
    });

    var user = new User({
        email: 'testuser@example.com'
    }).save();

    var user2 = new User({
        email: 'otheruser@example.com'
    }).save();

    var character = new Character({
        user: user
    }).save();

    var character2 = new Character({
        user: user
    }).save();

    if (user.characters.length !== 2) {
        throw 'User does not have anticipated number of characters';
    }
    if (user2.characters.length !== 0) {
        throw 'User does not have anticipated number of characters';
    }

    user2.addCharacter(character2);

    if (user.characters.length !== 1) {
        throw 'User does not have anticipated number of characters';
    }
    if (user2.characters.length !== 1) {
        throw 'User does not have anticipated number of characters';
    }
});

var testManyToMany = standalone(function () {
    var User = goose.model('User', {});
    var Email = goose.model('Email', {
        users: goose.manyToMany('User')
    });

    var user = new User({}).save();
    var user2 = new User({}).save();

    var email = new Email({}).save();
    var email2 = new Email({}).save();

    user.addEmail(email);
    user.addEmail(email2);

    user2.addEmail(email);

    if (user.emails.length !== 2) {
        throw 'User does not have anticipated number of emails';
    }
    if (user2.emails.length !== 1) {
        throw 'User does not have anticipated number of emails';
    }
});

var main = function () {
    testBasic();
    testOneToOne();
    testManyToOne();
    testManyToMany();
};

if (require.main === module) {
    main();
}

