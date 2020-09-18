import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('integration/relationships/one_to_many_test - OneToMany relationships', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    const User = Model.extend({
      name: attr('string'),
      messages: hasMany('message', { async: true }),
      accounts: hasMany('account', { async: false }),
    });

    const Account = Model.extend({
      state: attr(),
      user: belongsTo('user', { async: false }),
    });

    const Message = Model.extend({
      title: attr('string'),
      user: belongsTo('user', { async: true }),
    });

    const ApplicationAdapter = Adapter.extend({
      deleteRecord: () => resolve(),
    });

    this.owner.register('model:user', User);
    this.owner.register('model:message', Message);
    this.owner.register('model:account', Account);

    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', JSONAPISerializer.extend());
  });

  /*
    Server loading tests
  */

  test('Relationship is available from the belongsTo side even if only loaded from the hasMany side - async', function(assert) {
    let store = this.owner.lookup('service:store');

    var user, message;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            messages: {
              data: [
                {
                  id: '2',
                  type: 'message',
                },
              ],
            },
          },
        },
      });
      message = store.push({
        data: {
          id: '2',
          type: 'message',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
    });
    run(function() {
      message.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, user, 'User relationship was set up correctly');
      });
    });
  });

  test('Relationship is available from the belongsTo side even if only loaded from the hasMany side - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var account, user;
    run(function() {
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
        },
      });
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            accounts: {
              data: [
                {
                  id: '2',
                  type: 'account',
                },
              ],
            },
          },
        },
      });
    });
    assert.equal(account.get('user'), user, 'User relationship was set up correctly');
  });

  test('Relationship is available from the hasMany side even if only loaded from the belongsTo side - async', function(assert) {
    let store = this.owner.lookup('service:store');

    var user, message;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
        },
      });
      message = store.push({
        data: {
          id: '2',
          type: 'message',
          attributes: {
            title: 'EmberFest was great',
          },
          relationships: {
            user: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });
    });
    run(function() {
      user.get('messages').then(function(fetchedMessages) {
        assert.equal(fetchedMessages.objectAt(0), message, 'Messages relationship was set up correctly');
      });
    });
  });

  test('Relationship is available from the hasMany side even if only loaded from the belongsTo side - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var user, account;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
        },
      });
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
          relationships: {
            user: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });
    });
    run(function() {
      assert.equal(user.get('accounts').objectAt(0), account, 'Accounts relationship was set up correctly');
    });
  });

  test('Fetching a belongsTo that is set to null removes the record from a relationship - async', function(assert) {
    let store = this.owner.lookup('service:store');

    var user;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            messages: {
              data: [
                {
                  id: '1',
                  type: 'message',
                },
                {
                  id: '2',
                  type: 'message',
                },
              ],
            },
          },
        },
      });
    });
    run(function() {
      store.push({
        data: [
          {
            id: '1',
            type: 'message',
            attributes: {
              title: 'EmberFest was great',
            },
            relationships: {
              user: {
                data: {
                  id: '1',
                  type: 'user',
                },
              },
            },
          },
          {
            id: '2',
            type: 'message',
            attributes: {
              title: 'EmberConf will be better',
            },
            relationships: {
              user: {
                data: null,
              },
            },
          },
        ],
      });
    });
    run(function() {
      user.get('messages').then(function(fetchedMessages) {
        assert.equal(get(fetchedMessages, 'length'), 1, 'Messages relationship was set up correctly');
      });
    });
  });

  test('Fetching a belongsTo that is set to null removes the record from a relationship - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var user;
    run(function() {
      store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
        },
      });

      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            accounts: {
              data: [
                {
                  id: '2',
                  type: 'account',
                },
              ],
            },
          },
        },
      });

      store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
          relationships: {
            user: {
              data: null,
            },
          },
        },
      });
    });

    run(function() {
      assert.equal(user.get('accounts').objectAt(0), null, 'Account was sucesfully removed');
    });
  });

  test('Fetching a belongsTo that is not defined does not remove the record from a relationship - async', function(assert) {
    let store = this.owner.lookup('service:store');

    var user;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            messages: {
              data: [
                {
                  id: '1',
                  type: 'message',
                },
                {
                  id: '2',
                  type: 'message',
                },
              ],
            },
          },
        },
      });
    });
    run(function() {
      store.push({
        data: [
          {
            id: '1',
            type: 'message',
            attributes: {
              title: 'EmberFest was great',
            },
            relationships: {
              user: {
                data: {
                  id: '1',
                  type: 'user',
                },
              },
            },
          },
          {
            id: '2',
            type: 'message',
            attributes: {
              title: 'EmberConf will be better',
            },
          },
        ],
      });
    });
    run(function() {
      user.get('messages').then(function(fetchedMessages) {
        assert.equal(get(fetchedMessages, 'length'), 2, 'Messages relationship was set up correctly');
      });
    });
  });

  test('Fetching a belongsTo that is not defined does not remove the record from a relationship - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var account, user;
    run(function() {
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
        },
      });
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            accounts: {
              data: [
                {
                  id: '2',
                  type: 'account',
                },
              ],
            },
          },
        },
      });
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
        },
      });
    });

    run(function() {
      assert.equal(user.get('accounts').objectAt(0), account, 'Account was sucesfully removed');
    });
  });

  test("Fetching the hasMany that doesn't contain the belongsTo, sets the belongsTo to null - async", function(assert) {
    let store = this.owner.lookup('service:store');

    let user, message, message2;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            messages: {
              data: [
                {
                  id: '1',
                  type: 'message',
                },
              ],
            },
          },
        },
      });
      message = store.push({
        data: {
          id: '1',
          type: 'message',
          attributes: {
            title: 'EmberFest was great',
          },
          relationships: {
            user: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });
      message2 = store.push({
        data: {
          id: '2',
          type: 'message',
          attributes: {
            title: 'EmberConf is gonna be better',
          },
        },
      });
    });
    run(function() {
      store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            messages: {
              data: [
                {
                  id: '2',
                  type: 'message',
                },
              ],
            },
          },
        },
      });
    });
    run(function() {
      message.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, null, 'User was removed correctly');
      });

      message2.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, user, 'User was set on the second message');
      });
    });
  });

  test("Fetching the hasMany that doesn't contain the belongsTo, sets the belongsTo to null - sync", function(assert) {
    let store = this.owner.lookup('service:store');

    let account1;
    let account2;
    let user;

    run(function() {
      // tell the store user:1 has account:1
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            accounts: {
              data: [{ id: '1', type: 'account' }],
            },
          },
        },
      });

      // tell the store account:1 has user:1
      account1 = store.push({
        data: {
          id: '1',
          type: 'account',
          attributes: {
            state: 'great',
          },
          relationships: {
            user: {
              data: { id: '1', type: 'user' },
            },
          },
        },
      });

      // tell the store account:2 has no user
      account2 = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'awesome',
          },
        },
      });

      // tell the store user:1 has account:2 and not account:1
      store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            accounts: {
              data: [{ id: '2', type: 'account' }],
            },
          },
        },
      });
    });

    run(function() {
      assert.ok(account1.get('user') === null, 'User was removed correctly');
      assert.ok(account2.get('user') === user, 'User was added correctly');
    });
  });

  test('Fetching the hasMany side where the hasMany is undefined does not change the belongsTo side - async', function(assert) {
    let store = this.owner.lookup('service:store');

    var message, user;
    run(function() {
      store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            messages: {
              data: [
                {
                  id: '1',
                  type: 'message',
                },
              ],
            },
          },
        },
      });
      message = store.push({
        data: {
          id: '1',
          type: 'message',
          attributes: {
            title: 'EmberFest was great',
          },
          relationships: {
            user: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
        },
      });
    });

    run(function() {
      message.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, user, 'User was not removed');
      });
    });
  });

  test('Fetching the hasMany side where the hasMany is undefined does not change the belongsTo side - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var account, user;
    run(function() {
      store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            accounts: {
              data: [
                {
                  id: '1',
                  type: 'account',
                },
              ],
            },
          },
        },
      });
      account = store.push({
        data: {
          id: '1',
          type: 'account',
          attributes: {
            state: 'great',
          },
          relationships: {
            user: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });
      store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'awesome',
          },
        },
      });
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
        },
      });
    });

    run(function() {
      assert.equal(account.get('user'), user, 'User was not removed');
    });
  });

  /*
    Local edits
  */

  test('Pushing to the hasMany reflects the change on the belongsTo side - async', function(assert) {
    let store = this.owner.lookup('service:store');

    var user, message2;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            messages: {
              data: [
                {
                  id: '1',
                  type: 'message',
                },
              ],
            },
          },
        },
      });
      store.push({
        data: {
          id: '1',
          type: 'message',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
      message2 = store.push({
        data: {
          id: '2',
          type: 'message',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
    });

    run(function() {
      user.get('messages').then(function(fetchedMessages) {
        fetchedMessages.pushObject(message2);
        message2.get('user').then(function(fetchedUser) {
          assert.equal(fetchedUser, user, 'user got set correctly');
        });
      });
    });
  });

  test('Pushing to the hasMany reflects the change on the belongsTo side - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var user, account2;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            accounts: {
              data: [
                {
                  id: '1',
                  type: 'account',
                },
              ],
            },
          },
        },
      });
      store.push({
        data: {
          id: '1',
          type: 'account',
          attributes: {
            state: 'great',
          },
          relationships: {
            user: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });

      account2 = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'awesome',
          },
        },
      });
      user.get('accounts').pushObject(account2);
    });

    assert.equal(account2.get('user'), user, 'user got set correctly');
  });

  test('Removing from the hasMany side reflects the change on the belongsTo side - async', function(assert) {
    let store = this.owner.lookup('service:store');

    var user, message;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            messages: {
              data: [
                {
                  id: '1',
                  type: 'message',
                },
              ],
            },
          },
        },
      });
      message = store.push({
        data: {
          id: '1',
          type: 'message',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
    });

    run(function() {
      user.get('messages').then(function(fetchedMessages) {
        fetchedMessages.removeObject(message);
        message.get('user').then(function(fetchedUser) {
          assert.equal(fetchedUser, null, 'user got removed correctly');
        });
      });
    });
  });

  test('Removing from the hasMany side reflects the change on the belongsTo side - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var user, account;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attirbutes: {
            name: 'Stanley',
          },
          relationships: {
            accounts: {
              data: [
                {
                  id: '1',
                  type: 'account',
                },
              ],
            },
          },
        },
      });
      account = store.push({
        data: {
          id: '1',
          type: 'account',
          attirbutes: {
            state: 'great',
          },
          relationships: {
            user: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });
    });
    run(function() {
      user.get('accounts').removeObject(account);
    });

    assert.equal(account.get('user'), null, 'user got removed correctly');
  });

  test('Pushing to the hasMany side keeps the oneToMany invariant on the belongsTo side - async', function(assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');

    var user, user2, message;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            messages: {
              data: [
                {
                  id: '1',
                  type: 'message',
                },
              ],
            },
          },
        },
      });
      user2 = store.push({
        data: {
          id: '2',
          type: 'user',
          attributes: {
            name: 'Tomhuda',
          },
        },
      });
      message = store.push({
        data: {
          id: '1',
          type: 'message',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
    });

    run(function() {
      user2.get('messages').then(function(fetchedMessages) {
        fetchedMessages.pushObject(message);

        message.get('user').then(function(fetchedUser) {
          assert.equal(fetchedUser, user2, 'user got set correctly');
        });

        user.get('messages').then(function(newFetchedMessages) {
          assert.equal(get(newFetchedMessages, 'length'), 0, 'message got removed from the old messages hasMany');
        });
      });
    });
  });

  test('Pushing to the hasMany side keeps the oneToMany invariant - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var user, user2, account;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            accounts: {
              data: [
                {
                  id: '1',
                  type: 'account',
                },
              ],
            },
          },
        },
      });
      user2 = store.push({
        data: {
          id: '2',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
        },
      });
      account = store.push({
        data: {
          id: '1',
          type: 'account',
          attributes: {
            state: 'great',
          },
        },
      });
      user2.get('accounts').pushObject(account);
    });
    assert.equal(account.get('user'), user2, 'user got set correctly');
    assert.equal(user.get('accounts.length'), 0, 'the account got removed correctly');
    assert.equal(user2.get('accounts.length'), 1, 'the account got pushed correctly');
  });

  test('Setting the belongsTo side keeps the oneToMany invariant on the hasMany- async', function(assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');

    var user, user2, message;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            messages: {
              data: [
                {
                  id: '1',
                  type: 'message',
                },
              ],
            },
          },
        },
      });
      user2 = store.push({
        data: {
          id: '2',
          type: 'user',
          attributes: {
            name: 'Tomhuda',
          },
        },
      });
      message = store.push({
        data: {
          id: '1',
          type: 'message',
          attributes: {
            title: 'EmberFest was great',
          },
          relationships: {
            user: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });
      message.set('user', user2);
    });

    run(function() {
      user.get('messages').then(function(fetchedMessages) {
        assert.equal(get(fetchedMessages, 'length'), 0, 'message got removed from the first user correctly');
      });
    });
    run(function() {
      user2.get('messages').then(function(fetchedMessages) {
        assert.equal(get(fetchedMessages, 'length'), 1, 'message got added to the second user correctly');
      });
    });
  });

  test('Setting the belongsTo side keeps the oneToMany invariant on the hasMany- sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var user, user2, account;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            accounts: {
              data: [
                {
                  id: '1',
                  type: 'account',
                },
              ],
            },
          },
        },
      });
      user2 = store.push({
        data: {
          id: '2',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
        },
      });
      account = store.push({
        data: {
          id: '1',
          type: 'account',
          attributes: {
            state: 'great',
          },
          relationships: {
            user: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });
      account.set('user', user2);
    });
    assert.equal(account.get('user'), user2, 'user got set correctly');
    assert.equal(user.get('accounts.length'), 0, 'the account got removed correctly');
    assert.equal(user2.get('accounts.length'), 1, 'the account got pushed correctly');
  });

  test('Setting the belongsTo side to null removes the record from the hasMany side - async', function(assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');

    var user, message;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            messages: {
              data: [
                {
                  id: '1',
                  type: 'message',
                },
              ],
            },
          },
        },
      });
      message = store.push({
        data: {
          id: '1',
          type: 'message',
          attributes: {
            title: 'EmberFest was great',
          },
          relationships: {
            user: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });
      message.set('user', null);
    });
    run(function() {
      user.get('messages').then(function(fetchedMessages) {
        assert.equal(get(fetchedMessages, 'length'), 0, 'message got removed from the  user correctly');
      });
    });

    run(function() {
      message.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, null, 'user got set to null correctly');
      });
    });
  });

  test('Setting the belongsTo side to null removes the record from the hasMany side - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var user, account;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            accounts: {
              data: [
                {
                  id: '1',
                  type: 'account',
                },
              ],
            },
          },
        },
      });
      account = store.push({
        data: {
          id: '1',
          type: 'account',
          attributes: {
            state: 'great',
          },
          relationships: {
            user: {
              data: {
                id: '1',
                type: 'user',
              },
            },
          },
        },
      });
      account.set('user', null);
    });

    assert.equal(account.get('user'), null, 'user got set to null correctly');

    assert.equal(user.get('accounts.length'), 0, 'the account got removed correctly');
  });

  /*
  Rollback attributes from deleted state
  */

  test('Rollbacking attributes of a deleted record works correctly when the hasMany side has been deleted - async', function(assert) {
    let store = this.owner.lookup('service:store');

    var user, message;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            messages: {
              data: [
                {
                  id: '2',
                  type: 'message',
                },
              ],
            },
          },
        },
      });
      message = store.push({
        data: {
          id: '2',
          type: 'message',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
    });
    run(function() {
      message.deleteRecord();
      message.rollbackAttributes();
    });
    run(function() {
      message.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, user, 'Message still has the user');
      });
      user.get('messages').then(function(fetchedMessages) {
        assert.equal(fetchedMessages.objectAt(0), message, 'User has the message');
      });
    });
  });

  test('Rollbacking attributes of a deleted record works correctly when the hasMany side has been deleted - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var account, user;
    run(function() {
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
        },
      });
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            accounts: {
              data: [
                {
                  id: '2',
                  type: 'account',
                },
              ],
            },
          },
        },
      });
    });
    run(function() {
      account.deleteRecord();
      account.rollbackAttributes();
      assert.equal(user.get('accounts.length'), 1, 'Accounts are rolled back');
      assert.equal(account.get('user'), user, 'Account still has the user');
    });
  });

  test('Rollbacking attributes of deleted record works correctly when the belongsTo side has been deleted - async', function(assert) {
    let store = this.owner.lookup('service:store');

    var user, message;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            messages: {
              data: [
                {
                  id: '2',
                  type: 'message',
                },
              ],
            },
          },
        },
      });
      message = store.push({
        data: {
          id: '2',
          type: 'message',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
    });
    run(function() {
      user.deleteRecord();
      user.rollbackAttributes();
    });
    run(function() {
      message.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, user, 'Message has the user again');
      });
      user.get('messages').then(function(fetchedMessages) {
        assert.equal(fetchedMessages.get('length'), 1, 'User still has the messages');
      });
    });
  });

  test('Rollbacking attributes of a deleted record works correctly when the belongsTo side has been deleted - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var account, user;
    run(function() {
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
        },
      });
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            accounts: {
              data: [
                {
                  id: '2',
                  type: 'account',
                },
              ],
            },
          },
        },
      });
    });
    run(function() {
      user.deleteRecord();
      user.rollbackAttributes();
      assert.equal(user.get('accounts.length'), 1, 'User still has the accounts');
      assert.equal(account.get('user'), user, 'Account has the user again');
    });
  });

  /*
  Rollback attributes from created state
  */

  test('Rollbacking attributes of a created record works correctly when the hasMany side has been created - async', function(assert) {
    let store = this.owner.lookup('service:store');

    var user, message;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
        },
      });
      message = store.createRecord('message', {
        user: user,
      });
    });
    run(message, 'rollbackAttributes');
    run(function() {
      message.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, null, 'Message does not have the user anymore');
      });
      user.get('messages').then(function(fetchedMessages) {
        assert.equal(fetchedMessages.get('length'), 0, 'User does not have the message anymore');
        assert.equal(fetchedMessages.get('firstObject'), null, "User message can't be accessed");
      });
    });
  });

  test('Rollbacking attributes of a created record works correctly when the hasMany side has been created - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var user, account;
    run(function() {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
        },
      });
      account = store.createRecord('account', {
        user: user,
      });
    });
    run(account, 'rollbackAttributes');
    assert.equal(user.get('accounts.length'), 0, 'Accounts are rolled back');
    assert.equal(account.get('user'), null, 'Account does not have the user anymore');
  });

  test('Rollbacking attributes of a created record works correctly when the belongsTo side has been created - async', function(assert) {
    let store = this.owner.lookup('service:store');

    var message, user;
    run(function() {
      message = store.push({
        data: {
          id: '2',
          type: 'message',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
      user = store.createRecord('user');
    });
    run(function() {
      user.get('messages').then(function(messages) {
        messages.pushObject(message);
        user.rollbackAttributes();
        message.get('user').then(function(fetchedUser) {
          assert.equal(fetchedUser, null, 'Message does not have the user anymore');
        });
        user.get('messages').then(function(fetchedMessages) {
          assert.equal(fetchedMessages.get('length'), 0, 'User does not have the message anymore');
          assert.equal(fetchedMessages.get('firstObject'), null, "User message can't be accessed");
        });
      });
    });
  });

  test('Rollbacking attributes of a created record works correctly when the belongsTo side has been created - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var account, user;
    run(function() {
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
        },
      });
      user = store.createRecord('user');
    });
    run(function() {
      user.get('accounts').pushObject(account);
    });
    run(user, 'rollbackAttributes');
    assert.equal(user.get('accounts.length'), 0, 'User does not have the account anymore');
    assert.equal(account.get('user'), null, 'Account does not have the user anymore');
  });

  test('createRecord updates inverse record array which has observers', function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findAll = () => {
      return {
        data: [
          {
            id: '2',
            type: 'user',
            attributes: {
              name: 'Stanley',
            },
          },
        ],
      };
    };

    return store.findAll('user').then(users => {
      assert.equal(users.get('length'), 1, 'Exactly 1 user');

      let user = users.get('firstObject');
      assert.equal(user.get('messages.length'), 0, 'Record array is initially empty');

      // set up an observer
      user.addObserver('messages.@each.title', () => {});
      user.get('messages.firstObject');

      let message = store.createRecord('message', { user, title: 'EmberFest was great' });
      assert.equal(user.get('messages.length'), 1, 'The message is added to the record array');

      let messageFromArray = user.get('messages.firstObject');
      assert.ok(message === messageFromArray, 'Only one message record instance should be created');
    });
  });

  /* Adding to the Many side (Parent) of OneToMany should dirty the Child */

  test('Adding to the Many side (Parent) of OneToMany should dirty the Child', function(assert) {
    let store = this.owner.lookup('service:store');
    let user, message;
    run(() => {
      user = store.push({ data: { type: 'user', id: 1, attributes: { name: 'Stanley' } } });
      store.push({
        data: { type: 'message', id: 1, relationships: { user: { data: { type: 'user', id: 1 } } } },
      });
      message = store.push({ data: { type: 'message', id: 2, relationships: { user: { data: null } } } });
      user.get('messages').then(fetchedMessages => {
        fetchedMessages.addObject(message);
        message.get('user').then(m2User => {
          assert.equal(m2User, user, 'child has newly assigned parent');
          assert.equal(message.get('isDirty'), true, 'message (child) is dirtied when it has a new user (parent)');
          assert.equal(user.get('isDirty'), false, 'user (parent) is not dirty when its gets a new message (child)');
        });
      });
    });
  });

  /* Rollback from Dirty State */

  test('Rollback one-to-many relationships when the hasMany side has changed - async', function(assert) {
    let store = this.owner.lookup('service:store');
    let user, message1, message2;
    run(() => {
      user = store.push({ data: { type: 'user', id: 1, attributes: { name: 'Stanley' } } });
      message1 = store.push({
        data: { type: 'message', id: 1, relationships: { user: { data: { type: 'user', id: 1 } } } },
      });
      message2 = store.push({ data: { type: 'message', id: 2, relationships: { user: { data: null } } } });
      message2.set('user', user);
    });
    run(() => {
      message2.rollback();
      message2.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, null, 'Message does not have the user anymore');
      });
      user.get('messages').then(function(fetchedMessages) {
        assert.equal(fetchedMessages.get('length'), 1, 'User does not have the message anymore');
        assert.deepEqual(fetchedMessages.toArray(), [message1], 'User only has the original message');
      });
    });
  });

  test('Rollback one-to-many relationships when the hasMany side has changed - sync', function(assert) {
    let store = this.owner.lookup('service:store');
    let user, account1, account2;
    run(function() {
      user = store.push({ data: { type: 'user', id: 1, attributes: { name: 'Stanley' } } });
      account1 = store.push({
        data: { type: 'account', id: 1, relationships: { user: { data: { type: 'user', id: 1 } } } },
      });
      account2 = store.push({ data: { type: 'account', id: 2, relationships: { user: { data: null } } } });
      account2.set('user', user);
    });
    run(account2, 'rollback');
    assert.equal(account2.get('user'), null, 'Account does not have the user anymore');
    assert.equal(user.get('accounts.length'), 1, 'User does not have the account anymore');
    assert.deepEqual(user.get('accounts').toArray(), [account1], 'User only has the original account');
  });

  test('Rollback one-to-many relationships when the belongsTo side has changed - async', function(assert) {
    let store = this.owner.lookup('service:store');
    let user, message1, message2, message3, message4, message5, message6, message7, message8, message9;
    run(function() {
      user = store.push({ data: { type: 'user', id: 1, attributes: { name: 'Stanley' } } });
      message1 = store.push({
        data: { type: 'message', id: 1, relationships: { user: { data: { type: 'user', id: 1 } } } },
      });
      message2 = store.push({
        data: { type: 'message', id: 2, relationships: { user: { data: { type: 'user', id: 1 } } } },
      });
      message3 = store.push({
        data: { type: 'message', id: 3, relationships: { user: { data: { type: 'user', id: 1 } } } },
      });
      message4 = store.push({
        data: { type: 'message', id: 4, relationships: { user: { data: { type: 'user', id: 1 } } } },
      });
      message5 = store.push({
        data: { type: 'message', id: 5, relationships: { user: { data: { type: 'user', id: 1 } } } },
      });
      message6 = store.push({ data: { type: 'message', id: 6, relationships: { user: { data: null } } } });
      message7 = store.push({ data: { type: 'message', id: 7, relationships: { user: { data: null } } } });
      message8 = store.push({ data: { type: 'message', id: 8, relationships: { user: { data: null } } } });
      message9 = store.push({ data: { type: 'message', id: 9, relationships: { user: { data: null } } } });
      user.get('messages').addObject(message8);
      user.get('messages').addObject(message6);
      user.get('messages').removeObject(message3);
      user.get('messages').addObject(message9);
      user.get('messages').addObject(message7);
      user.get('messages').removeObject(message1);
      user.get('messages').removeObject(message5);
      user.get('messages').addObject(message3);
    });
    run(() => {
      [message1, message3, message5, message6, message7, message8, message9].forEach(m => m.rollback());
      message8.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, null, 'Message 8 does not belong to the user');
      });
      message6.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, null, 'Message 6 does not belong to the user');
      });
      message9.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, null, 'Message 9 does not belong to the user');
      });
      message7.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, null, 'Message 7 does not belong to the user');
      });
      message1.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, user, 'Message 1 does belong to the user');
      });
      message5.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, user, 'Message 5 does belong to the user');
      });
      message3.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, user, 'Message 3 does belong to the user');
      });
      user.get('messages').then(function(fetchedMessages) {
        assert.deepEqual(
          fetchedMessages.toArray(),
          [message1, message2, message3, message4, message5],
          'User still has the original 5 messages'
        );
      });
    });
  });

  test('Rollback one-to-many relationships when the belongsTo side has changed - sync', function(assert) {
    let store = this.owner.lookup('service:store');
    let user, account1, account2;
    run(() => {
      user = store.push({ data: { type: 'user', id: 1, attributes: { name: 'Stanley' } } });
      account1 = store.push({
        data: { type: 'account', id: 1, relationships: { user: { data: { type: 'user', id: 1 } } } },
      });
      account2 = store.push({ data: { type: 'account', id: 2, relationships: { user: { data: null } } } });
      user.get('accounts').pushObject(account2);
    });
    run(account2, 'rollback');
    assert.equal(account1.get('user'), user, 'Account 1 still has the user');
    assert.equal(account2.get('user'), null, 'Account 2 still does not have the user');
    assert.deepEqual(user.get('accounts').toArray(), [account1], 'User only has the original account');
  });

  test('Async hasMany does not fetch from remote after already fetched', function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let user = 0;
    let fetchCount = 0;

    const user1Data = {
      id: 1,
      type: 'user',
      attributes: { name: 'Stanley' },
      relationships: { messages: { links: { related: '/users/1/messages' } } },
    };

    const message1Data = {
      id: 1,
      type: 'message',
      attributes: { title: "This year's EmberFest was great" },
      relationships: { user: { data: { id: '1', type: 'user' } } },
    };

    adapter.removeDeletedFromRelationshipsPriorToSave = true;
    adapter.findHasMany = function(store, record, link) {
      if (link === '/users/1/messages') {
        assert.equal(fetchCount++ < 1, true, 'user 1 messages is fetched only once');
        return resolve({
          data: [message1Data],
        });
      }
      throw new Error('Invalid usage of test.');
    };

    run(() => {
      user = store.push({ data: user1Data });
      user.get('messages').then(function(messages) {
        assert.equal(messages.get('length'), 1, 'start out with 1 message');
        messages.objectAt(0).deleteRecord();
        assert.equal(messages.get('length'), 0, 'down to 0 messages');

        user.get('messages').then(function(messagesAgain) {
          assert.equal(messagesAgain.get('length'), 0, 'should still be at 0 messages');
          messagesAgain.createRecord();
          messagesAgain.createRecord();
          assert.equal(messagesAgain.get('length'), 2, 'back up to 2 with the new messages');

          user.get('messages').then(function(messagesThrice) {
            assert.equal(messagesThrice.get('length'), 2, 'should still be at 2 messages');
          });
        });
      });
    });
    adapter.removeDeletedFromRelationshipsPriorToSave = false;
  });
});
