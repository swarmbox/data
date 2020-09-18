/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(ada)" }]*/

import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { Promise as EmberPromise } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import todo from '@ember-data/unpublished-test-infra/test-support/todo';

module('integration/relationships/many_to_many_test - ManyToMany relationships', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    const User = Model.extend({
      name: attr('string'),
      topics: hasMany('topic', { async: true }),
      accounts: hasMany('account', { async: false }),
    });

    const Account = Model.extend({
      state: attr(),
      users: hasMany('user', { async: false }),
    });

    const Topic = Model.extend({
      title: attr('string'),
      users: hasMany('user', { async: true }),
    });

    this.owner.register('model:topic', Topic);
    this.owner.register('model:user', User);
    this.owner.register('model:account', Account);

    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
  });

  /*
    Server loading tests
  */

  test('Loading from one hasMany side reflects on the other hasMany side - async', function(assert) {
    let store = this.owner.lookup('service:store');

    run(() => {
      store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            topics: {
              data: [
                {
                  id: '2',
                  type: 'topic',
                },
                {
                  id: '3',
                  type: 'topic',
                },
              ],
            },
          },
        },
      });
    });

    let topic = run(() => {
      return store.push({
        data: {
          id: '2',
          type: 'topic',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
    });

    return run(() => {
      return topic.get('users').then(fetchedUsers => {
        assert.equal(fetchedUsers.get('length'), 1, 'User relationship was set up correctly');
      });
    });
  });

  test('Relationship is available from one hasMany side even if only loaded from the other hasMany side - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    var account;
    run(() => {
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
        },
      });
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
                  id: '2',
                  type: 'account',
                },
              ],
            },
          },
        },
      });
    });

    run(() => {
      assert.equal(account.get('users.length'), 1, 'User relationship was set up correctly');
    });
  });

  test('Fetching a hasMany where a record was removed reflects on the other hasMany side - async', function(assert) {
    let store = this.owner.lookup('service:store');

    let user, topic;
    run(() => {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            topics: {
              data: [{ id: '2', type: 'topic' }],
            },
          },
        },
      });
      topic = store.push({
        data: {
          id: '2',
          type: 'topic',
          attributes: {
            title: 'EmberFest was great',
          },
          relationships: {
            users: {
              data: [],
            },
          },
        },
      });
    });

    return run(() => {
      return user.get('topics').then(fetchedTopics => {
        assert.equal(fetchedTopics.get('length'), 0, 'Topics were removed correctly');
        assert.equal(fetchedTopics.objectAt(0), null, "Topics can't be fetched");
        return topic.get('users').then(fetchedUsers => {
          assert.equal(fetchedUsers.get('length'), 0, 'Users were removed correctly');
          assert.equal(fetchedUsers.objectAt(0), null, "User can't be fetched");
        });
      });
    });
  });

  test('Fetching a hasMany where a record was removed reflects on the other hasMany side - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    let account, user;
    run(() => {
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
          relationships: {
            users: {
              data: [],
            },
          },
        },
      });
    });

    run(() => {
      assert.equal(user.get('accounts.length'), 0, 'Accounts were removed correctly');
      assert.equal(account.get('users.length'), 0, 'Users were removed correctly');
    });
  });

  /*
    Local edits
  */

  test('Pushing to a hasMany reflects on the other hasMany side - async', function(assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    let user, topic;

    run(() => {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            topics: {
              data: [],
            },
          },
        },
      });
      topic = store.push({
        data: {
          id: '2',
          type: 'topic',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
    });

    return run(() => {
      return topic.get('users').then(fetchedUsers => {
        fetchedUsers.pushObject(user);
        return user.get('topics').then(fetchedTopics => {
          assert.equal(fetchedTopics.get('length'), 1, 'User relationship was set up correctly');
        });
      });
    });
  });

  test('Pushing to a hasMany reflects on the other hasMany side - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    let account, stanley;
    run(() => {
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
        },
      });
      stanley = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
        },
      });
      stanley.get('accounts').pushObject(account);
    });

    run(() => {
      assert.equal(account.get('users.length'), 1, 'User relationship was set up correctly');
    });
  });

  test('Removing a record from a hasMany reflects on the other hasMany side - async', function(assert) {
    let store = this.owner.lookup('service:store');

    let user, topic;
    run(() => {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            topics: {
              data: [
                {
                  id: '2',
                  type: 'topic',
                },
              ],
            },
          },
        },
      });
      topic = store.push({
        data: {
          id: '2',
          type: 'topic',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
    });

    return run(() => {
      return user.get('topics').then(fetchedTopics => {
        assert.equal(fetchedTopics.get('length'), 1, 'Topics were setup correctly');
        fetchedTopics.removeObject(topic);
        return topic.get('users').then(fetchedUsers => {
          assert.equal(fetchedUsers.get('length'), 0, 'Users were removed correctly');
          assert.equal(fetchedUsers.objectAt(0), null, "User can't be fetched");
        });
      });
    });
  });

  test('Removing a record from a hasMany reflects on the other hasMany side - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    let account, user;
    run(() => {
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

    run(() => {
      assert.equal(account.get('users.length'), 1, 'Users were setup correctly');
      account.get('users').removeObject(user);
      assert.equal(user.get('accounts.length'), 0, 'Accounts were removed correctly');
      assert.equal(account.get('users.length'), 0, 'Users were removed correctly');
    });
  });

  /*
    Rollback Attributes tests
  */

  test('Rollbacking attributes for a deleted record that has a ManyToMany relationship works correctly - async', function(assert) {
    let store = this.owner.lookup('service:store');

    let user, topic;
    run(() => {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
          relationships: {
            topics: {
              data: [
                {
                  id: '2',
                  type: 'topic',
                },
              ],
            },
          },
        },
      });
      topic = store.push({
        data: {
          id: '2',
          type: 'topic',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
    });

    run(() => {
      topic.deleteRecord();
      topic.rollbackAttributes();
    });

    return run(() => {
      let users = topic.get('users').then(fetchedUsers => {
        assert.equal(fetchedUsers.get('length'), 1, 'Users are still there');
      });

      let topics = user.get('topics').then(fetchedTopics => {
        assert.equal(fetchedTopics.get('length'), 1, 'Topic got rollbacked into the user');
      });

      return EmberPromise.all([users, topics]);
    });
  });

  test('Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    let account, user;
    run(() => {
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

    run(() => {
      account.deleteRecord();
      account.rollbackAttributes();
      assert.equal(account.get('users.length'), 1, 'Users are still there');
      assert.equal(user.get('accounts.length'), 1, 'Account got rolledback correctly into the user');
    });
  });

  test('Rollbacking attributes for a created record that has a ManyToMany relationship works correctly - async', function(assert) {
    let store = this.owner.lookup('service:store');

    let user, topic;
    run(() => {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
        },
      });

      topic = store.createRecord('topic');
    });

    return run(() => {
      return user.get('topics').then(fetchedTopics => {
        fetchedTopics.pushObject(topic);
        topic.rollbackAttributes();

        let users = topic.get('users').then(fetchedUsers => {
          assert.equal(fetchedUsers.get('length'), 0, 'Users got removed');
          assert.equal(fetchedUsers.objectAt(0), null, "User can't be fetched");
        });

        let topics = user.get('topics').then(fetchedTopics => {
          assert.equal(fetchedTopics.get('length'), 0, 'Topics got removed');
          assert.equal(fetchedTopics.objectAt(0), null, "Topic can't be fetched");
        });

        return EmberPromise.all([users, topics]);
      });
    });
  });

  test('Deleting an unpersisted record via rollbackAttributes that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync', function(assert) {
    let store = this.owner.lookup('service:store');

    let account, user;
    run(() => {
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

    run(() => {
      account.get('users').pushObject(user);
      user.rollbackAttributes();
    });

    assert.equal(account.get('users.length'), 0, 'Users got removed');
    assert.equal(user.get('accounts.length'), 0, 'Accounts got rolledback correctly');
  });

  /* Relationship isDirty Tests */

  test('Relationship isDirty at correct times when adding back removed values', function(assert) {
    let store = this.owner.lookup('service:store');
    let user, topic1, topic2;
    run(() => {
      user = store.push({
        data: {
          type: 'user',
          id: 1,
          attributes: { name: 'Stanley' },
          relationships: { topics: { data: [{ type: 'topic', id: 1 }] } },
        },
      });
      // NOTE SB Pushing topics into store (even with updated values) does not dirty the user relationship
      topic1 = store.push({ data: { type: 'topic', id: 1, attributes: { title: "This year's EmberFest was great" } } });
      topic2 = store.push({ data: { type: 'topic', id: 2, attributes: { title: "Last year's EmberFest was great" } } });
      user.get('topics').then(function(topics) {
        const recordData = user._internalModel._recordData;
        assert.equal(
          recordData.isRelationshipDirty('topics'),
          false,
          'pushing topic1 into store does not dirty relationship'
        );
        assert.equal(user.get('isDirty'), false, 'pushing topic1 into store does not dirty user');
        topics.removeObject(topic1);
        assert.equal(recordData.isRelationshipDirty('topics'), true, 'removing topic1 dirties the relationship');
        assert.equal(user.get('isDirty'), true, 'removing topic1 dirties the user');
        topics.addObjects([topic1, topic2]);
        assert.equal(
          recordData.isRelationshipDirty('topics'),
          true,
          'adding topic1 and topic2 keeps the relationship dirty'
        );
        assert.equal(user.get('isDirty'), true, 'adding topic1 and topic2 keeps the user dirty');
        topics.removeObject(topic2);
        assert.equal(
          recordData.isRelationshipDirty('topics'),
          false,
          'removing topic2 make the relationship not dirty again'
        );
        assert.equal(user.get('isDirty'), false, 'removing topic2 make the user not dirty again');
      });
    });
  });

  test('Relationship isDirty at correct times for inverse relationships using links depending on fetched or not', function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let user, topic1, topic2;

    const user1Data = {
      id: 1,
      type: 'user',
      attributes: { name: 'Stanley' },
      relationships: { topics: { links: { related: '/users/1/topics' } } },
    };

    const topic1Data = {
      id: 1,
      type: 'topic',
      attributes: { title: "This year's EmberFest was great" },
      relationships: { users: { links: { related: '/topics/1/users' } } },
    };

    const topic2Data = {
      id: 2,
      type: 'topic',
      attributes: { title: "Last year's EmberFest was great" },
      relationships: { users: { links: { related: '/topics/2/users' } } },
    };

    adapter.findHasMany = function(store, record, link) {
      if (link === '/users/1/topics') {
        return EmberPromise.resolve({
          data: [topic1Data],
        });
      } else if (link === '/topics/1/users') {
        return EmberPromise.resolve({
          data: [user1Data],
        });
      } else if (link === '/topics/2/users') {
        return EmberPromise.resolve({
          data: [],
        });
      }
      throw new Error('Invalid usage of test.');
    };

    run(() => {
      user = store.push({ data: user1Data });
      // NOTE SB Pushing topics into store (even with updated values) does not dirty the user relationship
      topic1 = store.push({ data: topic1Data });
      topic2 = store.push({ data: topic2Data });
      user.get('topics').then(function(topics) {
        topics.removeObject(topic1);
        assert.equal(user.get('isDirty'), true, 'removing topic1 dirties the user');
        assert.equal(
          topic1.get('isDirty'),
          false,
          'removing topic1 does not dirty topic1 of the unresolved inverse relationship'
        );

        topics.addObjects([topic1, topic2]);
        assert.equal(
          topic2.get('isDirty'),
          false,
          'adding topic2 does not dirty topic2 of the unresolved inverse relationship'
        );

        topics.removeObject(topic2);
        assert.equal(topic1.get('isDirty'), false, 'topic1 is not dirty since we are back to original state');
        assert.equal(topic2.get('isDirty'), false, 'topic2 is not dirty since we are back to original state');

        // resolve inverse for topic2
        topic2.get('users').then(function() {
          topics.addObject(topic2);
          assert.equal(topic2.get('isDirty'), true, 'topic2 does dirty since its inverse is resolved');

          topics.removeObject(topic2);
          assert.equal(topic2.get('isDirty'), false, 'removing topic2 makes the inverse topic2 not dirty again');

          // resolve inverse for topic1
          topic1.get('users').then(function() {
            topics.removeObject(topic1);
            assert.equal(
              topic1.get('isDirty'),
              true,
              'removing topic1 does dirty topic1 of the resolved inverse relationship'
            );

            topics.addObject(topic1);
            assert.equal(topic1.get('isDirty'), false, 'removing topic1 makes the inverse topic1 not dirty again');
          });
        });
      });
    });
  });

  test('Relationship isDirty at correct times when removing values that were added', function(assert) {
    let store = this.owner.lookup('service:store');
    let user, topic1, topic2;
    run(() => {
      user = store.push({
        data: {
          type: 'user',
          id: 1,
          attributes: { name: 'Stanley' },
          relationships: { topics: { data: [{ type: 'topic', id: 1 }] } },
        },
      });
      // NOTE SB Pushing topics into store (even with updated values) does not dirty the user relationship
      topic1 = store.push({ data: { type: 'topic', id: 1, attributes: { title: "This year's EmberFest was great" } } });
      topic2 = store.push({ data: { type: 'topic', id: 2, attributes: { title: "Last year's EmberFest was great" } } });
      user.get('topics').then(function(topics) {
        const recordData = user._internalModel._recordData;
        assert.equal(
          recordData.isRelationshipDirty('topics'),
          false,
          'pushing topic1 into store does not dirty relationship'
        );
        topics.addObject(topic2);
        assert.equal(recordData.isRelationshipDirty('topics'), true, 'adding topic2 dirties the relationship');
        topics.removeObjects([topic1, topic2]);
        assert.equal(
          recordData.isRelationshipDirty('topics'),
          true,
          'removing topic1 and topic2 keeps the relationship dirty'
        );
        topics.addObject(topic1);
        assert.equal(
          recordData.isRelationshipDirty('topics'),
          false,
          'adding back topic1 makes relationship not dirty again'
        );
      });
    });
  });

  /* Rollback Relationships Tests */

  test('Rollback many-to-many relationships works correctly - async', function(assert) {
    let store = this.owner.lookup('service:store');
    let user, topic1, topic2;
    run(() => {
      user = store.push({
        data: {
          type: 'user',
          id: 1,
          attributes: { name: 'Stanley' },
          relationships: { topics: { data: [{ type: 'topic', id: 1 }] } },
        },
      });
      topic1 = store.push({ data: { type: 'topic', id: 1, attributes: { title: "This year's EmberFest was great" } } });
      topic2 = store.push({ data: { type: 'topic', id: 2, attributes: { title: "Last year's EmberFest was great" } } });
      topic2.get('users').addObject(user);
    });
    run(() => {
      topic2.rollback();
      topic1.get('users').then(function(fetchedUsers) {
        assert.deepEqual(fetchedUsers.toArray(), [user], 'Users are still there');
      });
      topic2.get('users').then(function(fetchedUsers) {
        assert.deepEqual(fetchedUsers.toArray(), [], 'Users are still empty');
      });
      user.get('topics').then(function(fetchedTopics) {
        assert.deepEqual(fetchedTopics.toArray(), [topic1], 'Topics are still there');
      });
    });
  });

  test('Rollback many-to-many relationships works correctly - sync', function(assert) {
    let store = this.owner.lookup('service:store');
    let user, account1, account2;
    run(() => {
      user = store.push({
        data: {
          type: 'user',
          id: 1,
          attributes: { name: 'Stanley' },
          relationships: { accounts: { data: [{ type: 'account', id: 1 }] } },
        },
      });
      account1 = store.push({ data: { type: 'account', id: 1, attributes: { state: 'lonely' } } });
      account2 = store.push({ data: { type: 'account', id: 2, attributes: { state: 'content' } } });
      account2.get('users').addObject(user);
    });
    run(account2, 'rollback');
    assert.deepEqual(user.get('accounts').toArray(), [account1], 'Accounts are still there');
    assert.deepEqual(account1.get('users').toArray(), [user], 'Users are still there');
    assert.deepEqual(account2.get('users').toArray(), [], 'Users are still empty');
  });

  todo(
    'Re-loading a removed record should re add it to the relationship when the removed record is the last one in the relationship',
    function(assert) {
      assert.expect(4);

      let store = this.owner.lookup('service:store');

      let account;

      run(() => {
        account = store.push({
          data: {
            id: '2',
            type: 'account',
            attributes: {
              state: 'account 1',
            },
          },
        });
        let ada = store.push({
          data: {
            id: '1',
            type: 'user',
            attributes: {
              name: 'Ada Lovelace',
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
        let byron = store.push({
          data: {
            id: '2',
            type: 'user',
            attributes: {
              name: 'Lord Byron',
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
        account.get('users').removeObject(byron);
        account = store.push({
          data: {
            id: '2',
            type: 'account',
            attributes: {
              state: 'account 1',
            },
            relationships: {
              users: {
                data: [
                  {
                    id: '1',
                    type: 'user',
                  },
                  {
                    id: '2',
                    type: 'user',
                  },
                ],
              },
            },
          },
        });
      });

      let state = account.hasMany('users').hasManyRelationship.canonicalMembers.list;
      let users = account.get('users');

      assert.todo.equal(users.get('length'), 1, 'Accounts were updated correctly (ui state)');
      assert.todo.deepEqual(
        users.map(r => get(r, 'id')),
        ['1'],
        'Accounts were updated correctly (ui state)'
      );
      assert.equal(state.length, 2, 'Accounts were updated correctly (server state)');
      assert.deepEqual(
        state.map(r => r.id),
        ['1', '2'],
        'Accounts were updated correctly (server state)'
      );
    }
  );
});
