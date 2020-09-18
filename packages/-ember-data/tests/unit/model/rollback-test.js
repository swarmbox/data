import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('unit/model/relationships/rollback - model.rollback()', function(hooks) {
  setupTest(hooks);
  let store, adapter;

  hooks.beforeEach(function() {
    const Person = Model.extend({
      firstName: attr(),
      lastName: attr(),
      dogs: hasMany({ async: true }),
    });

    const Dog = Model.extend({
      name: attr(),
      owner: belongsTo('person', { async: true }),
    });

    let { owner } = this;
    owner.register('model:person', Person);
    owner.register('model:dog', Dog);
    owner.register('adapter:application', Adapter.extend());
    owner.register('serializer:application', JSONAPISerializer.extend());

    store = owner.lookup('service:store');
    adapter = store.adapterFor('application');
  });

  test('saved changes to relationships should not roll back to a pre-saved state (from child)', function(assert) {
    let person1, person2, dog1, dog2, dog3;

    adapter.updateRecord = function(store, type, snapshot) {
      return resolve({
        data: { type: 'dog', id: 2, relationships: { owner: { data: { type: 'person', id: 1 } } } },
      });
    };

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: 1,
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale',
          },
        },
      });
      store.push({
        data: {
          type: 'person',
          id: 2,
          attributes: {
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      });
      store.push({
        data: {
          type: 'dog',
          id: 1,
          attributes: {
            name: 'Fido',
          },
          relationships: {
            owner: {
              data: {
                type: 'person',
                id: 1,
              },
            },
          },
        },
      });
      store.push({
        data: {
          type: 'dog',
          id: 2,
          attributes: {
            name: 'Bear',
          },
          relationships: {
            owner: {
              data: {
                type: 'person',
                id: 2,
              },
            },
          },
        },
      });
      store.push({
        data: {
          type: 'dog',
          id: 3,
          attributes: {
            name: 'Spot',
          },
        },
      });
      person1 = store.peekRecord('person', 1);
      person2 = store.peekRecord('person', 2);
      dog1 = store.peekRecord('dog', 1);
      dog2 = store.peekRecord('dog', 2);
      dog3 = store.peekRecord('dog', 3);
      person1.get('dogs').addObject(dog2);
    });

    run(() => {
      dog2.save().then(() => {
        person1.get('dogs').addObject(dog3);
        dog2.rollback();
        dog3.rollback();
        person1.get('dogs').then(function(dogs) {
          assert.deepEqual(dogs.toArray(), [dog1, dog2]);
        });
        person2.get('dogs').then(function(dogs) {
          assert.deepEqual(dogs.toArray(), []);
        });
        dog1.get('owner').then(function(owner) {
          assert.equal(owner, person1);
        });
        dog2.get('owner').then(function(owner) {
          assert.equal(owner, person1);
        });
      });
    });
  });

  //skip("saved changes to relationships should not roll back to a pre-saved state (from parent)", function (assert) {
  //  var person1, person2, dog1, dog2, dog3;
  //
  //  adapter.updateRecord = function (store, type, snapshot) {
  //    return resolve({ id: 1, dogs: [1] });
  //  };
  //
  //  run(function () {
  //    store.push({
  //      data: {
  //        type: 'person',
  //        id: 1,
  //        attributes: {
  //          firstName: "Tom",
  //          lastName: "Dale"
  //        },
  //        relationships: {
  //          dogs: {
  //            data: [
  //              {
  //                type: 'dog',
  //                id: 1
  //              }
  //            ]
  //          }
  //        }
  //      }
  //    });
  //    store.push({
  //      data: {
  //        type: 'person',
  //        id: 2,
  //        attributes: {
  //          firstName: "John",
  //          lastName: "Doe"
  //        },
  //        relationships: {
  //          dogs: {
  //            data: [
  //              {
  //                type: 'dog',
  //                id: 2
  //              }
  //            ]
  //          }
  //        }
  //      }
  //    });
  //    store.push({
  //      data: {
  //        type: 'dog',
  //        id: 1,
  //        attributes: {
  //          name: "Fido"
  //        },
  //        relationships: {
  //          owner: {
  //            data: {
  //              type: 'person',
  //              id: 1
  //            }
  //          }
  //        }
  //      }
  //    });
  //    store.push({
  //      data: {
  //        type: 'dog',
  //        id: 2,
  //        attributes: {
  //          name: "Bear"
  //        },
  //        relationships: {
  //          owner: {
  //            data: {
  //              type: 'person',
  //              id: 2
  //            }
  //          }
  //        }
  //      }
  //    });
  //    store.push({
  //      data: {
  //        type: 'dog',
  //        id: 3,
  //        attributes: {
  //          name: "Spot"
  //        },
  //        relationships: {
  //          owner: {
  //            data: null
  //          }
  //        }
  //      }
  //    });
  //    person1 = store.peekRecord('person', 1);
  //    person2 = store.peekRecord('person', 2);
  //    dog1 = store.peekRecord('dog', 1);
  //    dog2 = store.peekRecord('dog', 2);
  //    dog3 = store.peekRecord('dog', 3);
  //
  //    person1.get('dogs').addObject(dog2);
  //  });
  //
  //  run(function () {
  //    person1.save().then(function () {
  //      person1.get('dogs').addObject(dog3);
  //      return all([person1.rollback()]);
  //    }).then(function () {
  //      person1.get('dogs').then(function (dogs) {
  //        assert.deepEqual(dogs.toArray(), [dog1, dog2]);
  //      });
  //      person2.get('dogs').then(function (dogs) {
  //        assert.deepEqual(dogs.toArray(), []);
  //      });
  //      dog1.get('owner').then(function (owner) {
  //        assert.equal(owner, person1);
  //      }).then(function () {
  //        console.log(person1._internalModel._relationships.get('dogs').manyArray.currentState.map(function (i) { return i.id; }));
  //        console.log(dog2._internalModel._relationships.get('owner').get('id'));
  //        console.log(dog3._internalModel._relationships.get('owner').get('id'));
  //      });
  //      dog2.get('owner').then(function (owner) {
  //        assert.equal(owner, person1);
  //      });
  //    });
  //  });
  //});
});
