import initializeStoreService from 'ember-data/instance-initializers/initialize-store-service';

initializeStoreService.initialize = () => {};

export default {
  name: "ember-data",
  initialize: initializeStoreService
};
