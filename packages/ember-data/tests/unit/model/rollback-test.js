var env, store, Person;
var run = Ember.run;

module("unit/model/rollback - model.rollback() - deprecated", {
  setup: function() {
    Person = DS.Model.extend({
      firstName: DS.attr(),
      lastName: DS.attr()
    });

    env = setupStore({ person: Person });
    store = env.store;
  }
});

test("changes to attributes can be rolled back - deprecated", function() {
  var person;
  run(function() {
    person = store.push('person', { id: 1, firstName: 'Tom', lastName: 'Dale' });
    person.set('firstName', 'Thomas');
  });

  equal(person.get('firstName'), 'Thomas');

  run(function() {
    person.rollback();
  });

  equal(person.get('firstName'), 'Tom');
  equal(person.get('hasDirtyAttributes'), false);
});
