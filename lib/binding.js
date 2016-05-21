var _ = require('lodash');

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

  if (!_.isFunction(equalValue)) {
    equalValue = function(a, b) { return a === b; };
  }

  var singleBindingSource = function(binding) {
    return {
      readBindings: function(outStream) {
        outStream.binding(binding);
      }
    };
  };

  var unionBindingSource = function(bindingSourceList) {
    return {
      readBindings: function(outStream) {
        bindingSourceList.forEach( function(bindingSource) {
          bindingSource.readBindings({
            binding: function(binding) { outStream.binding(binding); },
            error: function(err) { outStream.error(err); }
          });
        });
      }
    };
  };

  var extendBindingSource = function(bindingSource, newBinding) {
    return {
      readBindings: function(outStream) {
        bindingSource.readBindings({
          binding: function(binding) {
            var bindingExtension = {};
            var compatible = true;
            for (var newBindingKey in newBinding) {
              if (newBindingKey in binding) {
                if (!equalValue(newBinding[newBindingKey], binding[newBindingKey])) {
                  compatible = false;
                  break;
                }
              } else {
                bindingExtension[newBindingKey] = newBinding[newBindingKey];
              }
            }
            if (compatible) {
              outStream.binding(_.assign({}, binding, bindingExtension) );
            }
          },
          error: function(err) { outStream.error(err); }
        });
      }
    };
  };

  var binaryJoinBindingSource = function(leftBindingSource, rightBindingSource) {
    return {
      readBindings: function(outStream) {
        leftBindingSource.readBindings({
          binding: function(leftBinding) {
            rightBindingSource.readBindings({
              binding: function(rightBinding) {
                var bindingExtension = {};
                var compatible = true;
                for (var rightBindingKey in rightBinding) {
                  if (rightBindingKey in leftBinding) {
                    if (!equalValue(rightBinding[rightBindingKey], leftBinding[rightBindingKey])) {
                      compatible = false;
                      break;
                    }
                  } else {
                    bindingExtension[rightBindingKey] = rightBinding[rightBindingKey];
                  }
                }
                if (compatible) {
                  outStream.binding(_.assign({}, leftBinding, bindingExtension) );
                }
              },
              error: function(err) { outStream.error(err); }
            });
          },
          error: function(err) { outStream.error(err); }
        });
      }
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
    return {
      readBindings: function(outStream) {
        bindingSource.readBindings({
          binding: function(binding) {
            outStream.binding(_.pick(binding, vars));
          },
          error: function(err) {
            outStream.error(err);
          }
        });
      }
    };
  };

  return {
    singleSource: singleBindingSource,
    union: unionBindingSource,
    extend: extendBindingSource,
    join: joinBindingSource,
    project: projectBindingSource,
    compatible: singleBindingSource({}),
    incompatible: unionBindingSource([])
  };

};
