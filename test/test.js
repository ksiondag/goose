'use strict';

// Simple test setup because I don't want to think about which library to use
// right now

// TODO: 2016/05/29
// Think about which test library to use
const goose = require('../index.js');
const assert = require('assert');

describe('goose', function () {
    beforeEach(function () {
        goose.purge();
    });

    afterEach(function () {
        goose.purge();
    });

    describe('#models', function () {
        it('should handle simple, non-relational models', function () {
            const User = goose.model('User', {
                email: String,
                password: String
            });

            const user = new User({
                email: 'testuser@example.com',
                password: 'testpassword'
            }).save();

            const user2 = new User({
                email: 'otheruser@example.com',
                password: 'otherpassword'
            }).save();

            const users = User.instances.all();

            assert.equal(user, users[0], 'Unexpected first user');
            assert.equal(user2, users[1], 'Unexpected second user');
        });

        it('should handle one-to-one relationships', function () {
            const User = goose.model('User', {
                email: String
            });

            const Character = goose.model('Character', {
                user: goose.oneToOne('User')
            });

            const user = new User({
                email: 'testuser@example.com'
            }).save();

            const user2 = new User({
                email: 'otheruser@example.com'
            }).save();

            const character = new Character({
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
            const User = goose.model('User', {
                email: String
            });

            const Character = goose.model('Character', {
                user: goose.manyToOne('User')
            });

            const user = new User({
                email: 'testuser@example.com'
            }).save();

            const user2 = new User({
                email: 'otheruser@example.com'
            }).save();

            const character = new Character({
                user: user
            }).save();

            const character2 = new Character({
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

            user2.removeCharacter(character2);
            assert.equal(user.characters.length, 1,
                'User does not have anticipated number of characters'
            );
            assert.equal(user2.characters.length, 0,
                'User2 does not have anticipated number of characters'
            );
        });

        it('should handdle many-to-many relationships', function () {
            const User = goose.model('User', {});
            const Email = goose.model('Email', {
                users: goose.manyToMany('User')
            });

            const user = new User({}).save();
            const user2 = new User({}).save();

            const email = new Email({}).save();
            const email2 = new Email({}).save();

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

        it('should dump and load properly', function () {
            let User = goose.model('User', {
                username: String
            });

            let Email = goose.model('Email', {
                address: String,
                user: goose.oneToOne('User')
            });

            let Character = goose.model('Character', {
                name: String,
                user: goose.manyToOne('User')
            });

            let Group = goose.model('Group', {
                name: String,
                users: goose.manyToMany('User')
            });

            const user = new User({
                username: 'Foo'
            }).save();
            const user2 = new User({
                username: 'Bar'
            }).save();

            const email = new Email({
                address: 'foo@example.com'
            }).save();
            const email2 = new Email({
                address: 'bar@example.com'
            }).save();

            const character = new Character({
                name: 'Jace the Mind Sculpter'
            });
            const character2 = new Character({
                name: 'Elflord'
            });

            const group = new Group({
                name: 'Elves'
            }).save();
            const group2 = new Group({
                name: 'Wizards'
            }).save();

            user.addGroup(group);
            user.addGroup(group2);

            user2.addGroup(group);

            const dump = goose.dump();

            goose.purge()

            User = goose.model('User', {
                username: String
            });

            Email = goose.model('Email', {
                address: String,
                user: goose.oneToOne('User')
            });

            Character = goose.model('Character', {
                name: String,
                user: goose.manyToOne('User')
            });

            Group = goose.model('Group', {
                name: String,
                users: goose.manyToMany('User')
            });

            goose.load(dump);

            const assert = require('assert');
            assert.equal(dump, goose.dump(),
                'Loaded JSON contents did not recreate database perfectly'
            );
        });

        it('binds new properties to already existing instances', function () {
            const User = goose.model('User', {
                username: String
            });

            const user = new User({
                username: 'Foo'
            }).save();

            const Email = goose.model('Email', {
                address: String,
                user: goose.oneToOne('User')
            });

            const email = new Email({
                address: 'foo@example.com',
                user: user
            }).save();

            assert.ok(user.email, 'user does not have an email property');
            assert.equal(user.email,  email, 'user.email is incorrect');
        });

        it('should have working prop closure helper method', function () {
            const User = goose.model('User', {
                username: String
            });

            User.addProp('email', goose.propClosure(function () {
                return {
                    get: function () {
                        return `${this.username.toLowerCase()}@example.com`;
                    }
                }
            }));

            const user = new User({
                username: 'Foo'
            }).save();

            assert.equal(user.email, 'foo@example.com',
                'Email property not setup properly'
            );
        });

        it('should make properties out of getter object', function () {
            const User = goose.model('User', {
                username: String
            });

            User.addProp('email', {
                get: function () {
                    return `${this.username.toLowerCase()}@example.com`;
                }
            });

            const user = new User({
                username: 'Foo'
            }).save();

            const user2 = new User({
                username: 'Bar'
            }).save();

            assert.equal(user.email, 'foo@example.com',
                'Email property not setup properly'
            );

            assert.equal(user2.email, 'bar@example.com',
                'Email property not setup properly'
            );
        });
    });
});

