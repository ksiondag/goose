'use strict';

// Simple test setup because I don't want to think about which library to use
// right now

// TODO: 2016/05/29
// Think about which test library to use
var goose = require('../index.js');
var assert = require('assert');

describe('goose', function () {
    beforeEach(function () {
        goose.purge();
    });

    describe('#models', function () {
        it('should handle simple, non-relational models', function () {
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

            assert.equal(user, users[0], 'Unexpected first user');
            assert.equal(user2, users[1], 'Unexpected second user');
        });

        it('should handle one-to-one relationships', function () {
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

            assert.equal(user.character, character,
                'User does not have expected character'
            );
            assert.equal(character.user, user,
                'Character does not have expected user'
            );

            user2.character = character;
            assert.equal(user2.character, character,
                'Setting user2.character did not work'
            );
            assert.equal(character.user, user2,
                'User has right character but character has wrong user'
            );

            character.user = user;
            assert.equal(user.character, character,
                'Setting character.user did not work'
            );
            assert.equal(character.user, user,
                'User has right character but character has wrong user'
            );
        });

        it('should handle many-to-one relationships', function () {
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

            assert.equal(user.characters.length, 2,
                'User does not have anticipated number of characters'
            );
            assert.equal(user2.characters.length, 0,
                'User2 does not have anticipated number of characters'
            );

            user2.addCharacter(character2);

            assert.equal(user.characters.length, 1,
                'User does not have anticipated number of characters'
            );
            assert.equal(user2.characters.length, 1,
                'User2 does not have anticipated number of characters'
            );
        });

        it('should handdle many-to-many relationships', function () {
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

            assert.equal(user.emails.length, 2,
                'User does not have anticipated number of emails'
            );
            assert.equal(user2.emails.length, 1,
                'User2 does not have anticipated number of emails'
            );
        });
    });

    afterEach(function () {
        goose.purge();
    });
});

