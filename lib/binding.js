var _ = require('highland');

/**
 * Returns an object to generate and compose binding sources.
 *
 * A binding represents a specific assignement of a set of variables.
 * In practice, it is an object whose keys are the variable names and the values
 * are the corresponding assignments.
 *
 * A binding source is an object with a method
 * readBindings( { binding: bindingListener(binding),
 *                 error: errorListener(error)} ).
 *
 * @param [equalValue(a, b)] an application-dependent equality function for values:
 *        returns true iff a is considered equal to b.
 */
module.exports = function(equalValue) {

  if (!equalValue || !typeof equalValue === 'function') {
    equalValue = function(a, b) { return a === b; };
  }

  var singleBindingSource = function(binding) {
    return function() {
      return _([binding]);
    };
  };

  var tableBindingSource = function(bindingArray) {
    return function() {
      return _(bindingArray);
    };
  };

  var multiplyBindingSource = function(bindingSource, times) {
    return function() {
      return _(function (push) {
        for (var i = 0; i < times; i++) {
          push(null, bindingSource());
        }
        push(null, _.nil);
      }).sequence();
    };
  };

  var unionBindingSource = function(bindingSourceStream) {
    if (_.isStream(bindingSourceStream)) {
      return function() {
        return _(bindingSourceStream.map(function(source) {
          return source();
        })).merge();
      };
    } else {
      return function() {
        return unionBindingSource(_(bindingSourceStream))();
      };
    }
  };

  var extendBindingSource = function(bindingSource, newBinding) {
    return function() {
      return bindingSource().filter(function(binding) {
        for (var newVar in newBinding) {
          if (newVar in binding && !equalValue(newBinding[newVar], binding[newVar])) {
            return false;
          }
        }
        return true;
      }).map(function(binding) {
        return _.extend(binding, _.extend(newBinding, {}));
      });
    };
  };

  var binaryJoinBindingSource = function(leftBindingSource, rightBindingSource) {
    return function() {
      return unionBindingSource(rightBindingSource().map( function(rightBinding) {
          return extendBindingSource(leftBindingSource, rightBinding);
      }))();
    };
  };

  var joinBindingSource = function(bindingSourceList) {
    if (bindingSourceList.length === 0) {
      return singleBindingSource({});
    } else {
      return binaryJoinBindingSource(
        bindingSourceList[0],
        joinBindingSource(bindingSourceList.slice(1)));
    }
  };

  var projectBindingSource = function(bindingSource, vars) {
    return function() {
      return bindingSource().pick(vars);
    };
  };

  return {
    singleSource: singleBindingSource,
    table: tableBindingSource,
    multiply: multiplyBindingSource,
    union: unionBindingSource,
    extend: extendBindingSource,
    join: joinBindingSource,
    project: projectBindingSource,
    compatible: singleBindingSource({}),
    incompatible: unionBindingSource([])
  };

};
