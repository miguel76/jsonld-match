var jsonld = require('jsonld'),
    async = require('async'),
    bind = require('./binding')(jsonld.compareValues);

/**
 * Match an object in the pattern against a graph.
 *
 * @param subject a subject of the JSON-LD input graph.
 * @param predicate a predicate of the JSON-LD input graph.
 * @param matchObject an object of a JSON-LD pattern.
 * @param vars an array of ids of variables in the pattern.
 * @return a binding source with the result of the matching
 */
var matchObjectBindingSource = function(subject, predicate, matchObject, vars) {
  return (matchObject['@id'] && isVarOrBnode(matchObject['@id'], vars)) ?
    bind.union(
      jsonld.getValues(subject, predicate).map(function(objectValue) {
        var binding = {};
        binding[matchObject['@id']] = objectValue;
        return bind.singleSource(binding);
      })) :
    ( jsonld.hasValue(subject, predicate, matchObject) ?
        bind.compatible :
        bind.incompatible );
};

var matchObjectListBindingSource = function(subject, predicate, matchObjectList, vars) {
  return bind.join(matchObjectList.map(function(matchObject) {
    return matchObjectBindingSource(subject, predicate, matchObject, vars);
  }));
};

var getPredicates = function(subject) {
  return Object.keys(subject).filter(function(key) {
    return (key !== '@id');
  });
};

/**
 * Match a predicate in the pattern against a graph.
 *
 * @param subject a subject of the JSON-LD input graph.
 * @param matchSubject a subject of a JSON-LD pattern.
 * @param matchPredicate a predicate of a JSON-LD pattern.
 * @param vars an array of ids of variables in the pattern.
 * @return a binding source with the result of the matching
 */
var matchPredicateBindingSource = function(subject, matchSubject, matchPredicate, vars) {
  return (isVarOrBnode(matchPredicate, vars)) ?
    bind.union(
      getPredicates(subject).map(function(predicateValue) {
        var binding = {};
        binding[matchPredicate] = predicateValue;
        return bind.extend(
          matchObjectListBindingSource(
            subject, matchPredicate,
            jsonld.getValues(matchSubject, matchPredicate), vars),
          binding);
      })) :
    ( jsonld.hasProperty(subject, matchPredicate) ?
        matchObjectListBindingSource(
          subject, matchPredicate,
          jsonld.getValues(matchSubject, matchPredicate), vars) :
        bind.incompatible );
};

var matchPredicateListBindingSource = function(subject, matchSubject, matchPredicateList, vars) {
  return bind.join(matchPredicateList.map(function(matchPredicate) {
    return matchPredicateBindingSource(subject, matchSubject, matchPredicate, vars);
  }));
};

var getSubject = function(graph, matchSubject) {
  return graph.filter(function(key) {
    return (jsonld.compareValues(key, matchSubject));
  })[0];
};

var isVar = function(id, vars) {
  return vars.indexOf(id) !== -1;
};

var isBnode = function(id) {
  return id.substr(0,2) === '_:';
};

var isVarOrBnode = function(id, vars) {
  return isBnode(id) || isVar(id, vars);
};

/**
 * Match a subject in the pattern against a graph.
 *
 * @param graph a JSON-LD flattened input graph.
 * @param matchSubject a subject of a JSON-LD pattern.
 * @param vars an array of ids of variables in the pattern.
 * @return a binding source with the result of the matching
 */
var matchSubjectBindingSource = function(graph, matchSubject, vars) {
  if (isVarOrBnode(matchSubject['@id'], vars)) {
    return bind.union(
      graph.map(function(subjectValue) {
        var binding = {};
        binding[matchSubject['@id']] = subjectValue;
        return bind.extend(
          matchPredicateListBindingSource(
            subjectValue, matchSubject,
            getPredicates(matchSubject), vars),
          binding);
      }));
  } else {
    var subject = getSubject(graph, matchSubject);
    if (subject) {
      return matchPredicateListBindingSource(
        subject, matchSubject,
        getPredicates(matchSubject));
    } else {
      return bind.incompatible;
    }
  }
};

var matchSubjectListBindingSource = function(graph, matchSubjectList, vars) {
  return bind.join(matchSubjectList.map(function(matchSubject) {
    return matchSubjectBindingSource(graph, matchSubject, vars);
  }));
};

var matchBindingSource = function(graph, matchGraph, vars) {
  return bind.project(matchSubjectListBindingSource(graph, matchGraph, vars), vars);
};

/**
 * Match some patterns against a graph.
 *
 * A match is a js object with the following keys:
 *   @pattern a JSON-LD graph representing the graph pattern.
 *   @var the array of variable ids used in the graph pattern.
 *   @action(binding) a function executed for each binding.
 *
 * @param input a JSON-LD input graph.
 * @param matches list of matches.
 * @param matchesCtx JSON-LD context used to expand the matches.
 * @param callback(error) callback function.
 */
module.exports = function(input, matches, matchesCtx, callback) {
  async.waterfall([
    async.apply(async.parallel, {
      input: async.apply( jsonld.flatten, input),
      matchPatterns: async.apply( async.map, matches, function(match, callback) {
        async.waterfall([
          async.constant(match['@pattern'], null, {expandContext: matchesCtx}),
          jsonld.flatten
        ], callback);
      })
    }),
    function(flattened, callback) {
      var error = null;
      matches.forEach(function(match, matchIndex) {
        var bindingSource = matchBindingSource(
          flattened.input,
          flattened.matchPatterns[matchIndex],
          match['@var']);
        bindingSource.readBindings({
          binding: function(binding) {
            console.log(binding);
            match['@action'](binding);
          },
          error: function(err) { error = err; }
        });
      });
      callback(error);
    }], callback);
};
