var path = require('path')
  , Factory = require('./patterns/factory')
  , Singleton = require('./patterns/singleton')
  , Constructor = require('./patterns/constructor')
  , Prototype = require('./patterns/prototype')
  , Literal = require('./patterns/literal')
  , debug = require('debug')('ionic');


function Container() {
  this._o = {};
  this._loaders = [];
}

Container.prototype.create = function(id, parent) {
  if (parent && id[0] == '.') {
    // resolve relative component ID
    // TODO: Ensure that this uses '/' as a separator on Windows
    id = path.join(parent.id, '..', id);
  }
  
  var comp = this._o[id];
  if (!comp) {
    // No component is registered with the given ID.  Attempt to register the
    // component by loading its corresponding module.
    this._loadModule(id);
  }
  comp = this._o[id];
  if (!comp) {
    // After attemting auto-loading, the component ID is still unregistered,
    // which is a terminal condition.
    throw new Error("Unable to create component '" + id + "'");
  }
  
  return comp.create(this);
}

Container.prototype.factory = function(id, dependencies, fn) {
  if (typeof dependencies == 'function') {
    fn = dependencies;
    dependencies = [];
  }
  debug('register factory %s %s', id, dependencies);
  this.register(new Factory(id, dependencies, fn));
}

Container.prototype.singleton = function(id, dependencies, fn) {
  if (typeof dependencies == 'function') {
    fn = dependencies;
    dependencies = [];
  }
  debug('register singleton %s %s', id, dependencies);
  this.register(new Singleton(id, dependencies, fn));
}

Container.prototype.constructor = function(id, dependencies, ctor) {
  if (typeof dependencies == 'function') {
    ctor = dependencies;
    dependencies = [];
  }
  debug('register constructor %s %s', id, dependencies);
  this.register(new Constructor(id, dependencies, ctor));
}

Container.prototype.prototype = function(id, proto) {
  this.register(new Prototype(id, [], proto));
}

Container.prototype.literal = function(id, obj) {
  this.register(new Literal(id, [], obj));
}

Container.prototype.register = function(comp) {
  this._o[comp.id] = comp;
}

Container.prototype.loader = function(fn) {
  this._loaders.push(fn);
}

Container.prototype._loadModule = function(id) {
  var loaders = this._loaders
    , loader, mod;
  for (var i = 0, len = loaders.length; i < len; ++i) {
    loader = loaders[i];
    mod = loader(id);
    if (mod) {
      this._registerModule(id, mod);
      break;
    }
  }
}

Container.prototype._registerModule = function(id, mod) {
  var dependencies = mod['@require'] || []
    , pattern = 'literal';
  
  if (typeof mod == 'function') {
    var name = mod.name || 'anonymous'
      , arity = mod.length;
    if (name[0] == name[0].toUpperCase()) {
      pattern = 'constructor';
    } else {
      if (mod['@singleton']) {
        pattern = 'singleton';
      } else {
        pattern = 'factory';
      }
    }
  }
  
  switch (pattern) {
  case 'factory':
    this.factory(id, dependencies, mod);
    break;
  case 'singleton':
    this.singleton(id, dependencies, mod);
    break;
  case 'constructor':
    this.constructor(id, dependencies, mod);
    break;
  case 'literal':
    this.literal(id, mod);
    break;
  }
}

module.exports = Container;