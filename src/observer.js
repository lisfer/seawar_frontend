function Observer () {
  if (!Observer.singleton) {
    Observer.singleton = this;
  } else {
    return Observer.singleton;
  }
  var self = this;

  self.triggerList = [];

  self.once = function (message, handler, namespace) {
    self.add(message, handler, namespace, true);
  }

  self.add = function (message, handler, namespace, once=false) {
    namespace = namespace || 'base';
    if (!handler || ! (handler instanceof Function)) {
      console.warn ('Subscriber: handler should be function!', message);
      return false;
    }
    var check = self.triggerList.filter(function(el){
      return (el.namespace == namespace
        && el.handler == handler && el.message == message);
    })
    if (check.length == 0) {
      self.triggerList.push({
        handler: handler, message: message, namespace: namespace, once: once
      })
    }
  };


  self.reset = function() {
    self.triggerList = [];
  };

  self.remove = function (namespace, message=null) {
    self.triggerList = self.triggerList.filter(function(el){
      return namespace != el.namespace || (message && message != el.message);
    })
  }

  self.trigger = function (name, data) {
    let handlers = self.triggerList.filter(function(el){
      return el.message == name;
    });
    handlers.map(function(el){
      el.handler(data);
    })
    self.triggerList = self.triggerList.filter((el) => {
      return handlers.indexOf(el) == -1 || !el.once;
    });
    return true;
  };

  self.run = function(name, data) {
    let handlers = self.triggerList.filter(function(el){
      return el.message == name;
    });
    let results = handlers.map(function(el){
      return el.handler(data);
    })
    self.triggerList = self.triggerList.filter((el) => {
      return handlers.indexOf(el) == -1 || !el.once;
    });
    return results;
  }
}

export default Observer