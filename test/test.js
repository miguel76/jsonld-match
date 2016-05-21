/*eslint-env node, mocha */

var expect = require('chai').expect,
    async = require('async'),
    binding = require('../lib/binding');

var check = function(source, bindingCheck, order) {
  return function(done) {
    source().toArray(function(res) {
      try {
        if (order) {
          expect(res).to.be.deep.equal(bindingCheck);
        } else {
          expect(res).to.have.lengthOf(bindingCheck.length);
          expect(res).to.have.deep.members(bindingCheck);
        }
        done();
      } catch(error) {
        error.showDiff = true;
        throw error;
      }
    });
  };
};

var checkWithSource = function(source, checkSource, order) {
  return function(done) {
    checkSource().toArray(function(bindingCheck) {
      check(source, bindingCheck, order)(done);
    });
  };
};

describe('Binding', function() {

  var equalMod10 = function(a, b) { return a % 10 === b % 10; };

  var bind = binding(equalMod10);

  var binding1 = {a: 1, b: 2, c: 3};
  var binding2 = {a: 11, c: 13, d: 14};
  var binding3 = {a: 21, c: 33 };
  var binding4 = {c: 43, d: 44, e: 45};
  var binding5 = {d: 53};
  var binding6 = {a: 61, b: 61, c: 63, d: 63};

  var singleSource0 = bind.singleSource({});
  var singleSource1 = bind.singleSource(binding1);
  var singleSource2 = bind.singleSource(binding2);
  var singleSource3 = bind.singleSource(binding3);
  var singleSource4 = bind.singleSource(binding4);
  var singleSource5 = bind.singleSource(binding5);
  var singleSource6 = bind.singleSource(binding6);

  describe('#singleSource()', function () {
    it('should produce a single binding (its parameter)',
      check(singleSource1, [binding1]));
  });

  var tableEmpty = bind.table([]);
  var table0_1 = bind.table([{}]);
  var table0_2 = bind.table([{}, {}]);
  var table0_3 = bind.table([{}, {}, {}]);
  var table1 = bind.table([binding1]);
  var table1_3 = bind.table([binding1, binding1, binding1]);
  var table123 = bind.table([binding1, binding2, binding3]);

  describe('#table()', function () {
    it('should produce a binding for each element of the array (its parameter)',
      async.seq(
        check(tableEmpty, []),
        check(table0_1, [{}]),
        check(table0_2, [{}, {}]),
        check(table0_3, [{}, {}, {}]),
        check(table1, [binding1]),
        check(table1_3, [binding1, binding1, binding1]),
        check(table123, [binding1, binding2, binding3])
      ));
  });

  var mulEmpty_0 = bind.multiply(tableEmpty, 0);
  var mulEmpty_1 = bind.multiply(tableEmpty, 1);
  var mulEmpty_3 = bind.multiply(tableEmpty, 3);
  var mul0_0 = bind.multiply(singleSource0, 0);
  var mul0_1 = bind.multiply(singleSource0, 1);
  var mul0_3 = bind.multiply(singleSource0, 3);
  var mul1_0 = bind.multiply(singleSource1, 0);
  var mul1_1 = bind.multiply(singleSource1, 1);
  var mul1_3 = bind.multiply(singleSource1, 3);
  var mul123_3 = bind.multiply(table123, 3);

  describe('#multiply()', function () {
    it('should be empty if input source is empty',
      async.seq(
        check(mulEmpty_0, []),
        check(mulEmpty_1, []),
        check(mulEmpty_3, [])
      ));
    it('should produce n times the input source',
      async.seq(
        check(mul0_0, []),
        checkWithSource(mul0_1, table0_1),
        checkWithSource(mul0_3, table0_3),
        check(mul1_0, []),
        checkWithSource(mul1_1, table1),
        checkWithSource(mul1_3, table1_3),
        check(mul123_3, [
          binding1, binding2, binding3,
          binding1, binding2, binding3,
          binding1, binding2, binding3
        ])
      ));
  });

  var emptyUnion = bind.union([]);
  var emptyUnionTwice = bind.union([emptyUnion, emptyUnion]);
  var union1 = bind.union([singleSource1]);
  var union123 = bind.union([singleSource1, singleSource2, singleSource3]);
  var union145 = bind.union([singleSource1, emptyUnion, singleSource4, singleSource5]);
  var union456 = bind.union([emptyUnion, singleSource4, singleSource5, singleSource6]);
  var union123_145 = bind.union([union123, union145]);
  var union456__123_145 = bind.union([union456, union123_145, emptyUnion]);

  describe('#union()', function () {
    it('should produce no bindings if empty',
      check(emptyUnion, []));
    it('should produce no bindings if contains just empty sources',
      check(emptyUnionTwice, []));
    it('should produce a single binding with a single source',
      check(union1, [binding1]));
    it('should produce a binding for each single source combined',
      async.seq(
        check(union123_145, [
          {a: 1, b: 2, c: 3},
          {a: 11, c: 13, d: 14},
          {a: 21, c: 33 },
          {a: 1, b: 2, c: 3},
          {c: 43, d: 44, e: 45},
          {d: 53}
        ]),
        check(union456__123_145, [
          {c: 43, d: 44, e: 45},
          {d: 53},
          {a: 61, b: 61, c: 63, d: 63},
          {a: 1, b: 2, c: 3},
          {a: 11, c: 13, d: 14},
          {a: 21, c: 33 },
          {a: 1, b: 2, c: 3},
          {c: 43, d: 44, e: 45},
          {d: 53}
        ])
      ));
  });

  var emptyExt = bind.extend(emptyUnionTwice, binding4);
  var unionZeroExt = bind.extend(union456__123_145, {});
  var unionZeroExtTwice = bind.extend(unionZeroExt, {});
  var unionExt = bind.extend(union456__123_145, binding6);
  var unionExtTwice = bind.extend(unionExt, binding4);
  var source0Ext = bind.extend(singleSource0, binding1);
  var source0ExtTwice = bind.extend(source0Ext, binding4);

  describe('#extend()', function () {
    it('should produce no bindings if an empty source is extended',
      check(emptyExt, []));
    it('should be an identity if the new binding has no variables',
      async.seq(
        checkWithSource(unionZeroExt, union456__123_145),
        checkWithSource(unionZeroExtTwice, union456__123_145)));
    it('should be always a single source when extending a compatible single source',
      async.seq(
        checkWithSource(source0Ext, singleSource1),
        check(source0ExtTwice, [{a: 1, b: 2, c: 3, d: 44, e: 45}])));
    it('should produce bindings only when the extension is compatible with the source',
      async.seq(
        check(unionExt, [
          {a: 61, b: 61, c: 63, d: 53},
          {a: 61, b: 61, c: 63, d: 63},
          {a: 21, b: 61, c: 33, d: 63},
          {a: 61, b: 61, c: 63, d: 53}
        ]),
        check(unionExtTwice, [])));
  });

  var everyJoin0 = bind.join([]);
  var everyJoin1 = bind.join([singleSource0]);
  var everyJoin3 = bind.join([singleSource0, singleSource0, singleSource0]);

  var emptyJoin = bind.join([emptyExt]);
  var emptyJoin1 = bind.join([emptyExt, union456__123_145]);
  var emptyJoin2 = bind.join([union123_145, emptyExt]);
  var emptyJoin3 = bind.join([union123_145, emptyExt, union456__123_145]);

  var join123_1 = bind.join([union123]);
  var join123_2 = bind.join([union123, table0_2]);
  var join123_3 = bind.join([table0_3, table0_1, union123]);
  var join123_6_a = bind.join([table0_3, union123, table0_2]);
  var join123_6_b = bind.join([table0_1, table0_3, table0_1, join123_2, table0_1]);
  var join123_456 = bind.join([union123, union456]);

  describe('#join()', function () {
    it('should produce a single no-var binding if input is an empty list',
      check(everyJoin0, [{}]));
    it('should produce a single no-var binding if inputs are all single no-var bindings',
      async.seq(
        check(everyJoin1, [{}]),
        check(everyJoin3, [{}])));
    it('should produce no bindings if an empty source joins anything',
      async.seq(
        check(emptyJoin, []),
        check(emptyJoin1, []),
        check(emptyJoin2, []),
        check(emptyJoin3, [])));
    it('should be as multiply for a source joined with just no-vars binding sources',
      async.seq(
        checkWithSource(join123_1, bind.multiply(union123, 1)),
        checkWithSource(join123_2, bind.multiply(union123, 2)),
        checkWithSource(join123_3, bind.multiply(union123, 3)),
        checkWithSource(join123_6_a, bind.multiply(union123, 6)),
        checkWithSource(join123_6_b, bind.multiply(union123, 6))));
    it('should be the cartesian product minus incompatible combinations',
      async.seq(
        check(join123_456, [
          {a: 1, b: 2, c: 3, d: 44, e: 45}, {a: 11, c: 13, d: 14, e: 45}, {a: 21, c: 33, d: 44, e: 45},
          {a: 1, b: 2, c: 3, d: 53}, {a: 21, c: 33, d: 53},
          {a: 21, c: 33, b: 61, d: 63}
        ]),
        check(bind.join([singleSource6, join123_6_b, table123]), [
          {a: 21, b: 61, c: 33, d: 53},
          {a: 21, b: 61, c: 33, d: 63}
        ])));

        // var binding1 = {a: 1, b: 2, c: 3};
        // var binding2 = {a: 11, c: 13, d: 14};
        // var binding3 = {a: 21, c: 33 };
        // var binding4 = {c: 43, d: 44, e: 45};
        // var binding5 = {d: 53};
        // var binding6 = {a: 61, b: 61, c: 63, d: 63};

  });

  var emptyProj = bind.project(emptyUnionTwice, ['a', 'b', 'c']);
  var emptyProjTwice = bind.project(emptyProj,  ['b', 'c', 'd']);
  var unionProj1 = bind.project(union456__123_145, ['f', 'g']);
  var unionProj2 = bind.project(union456__123_145, ['c', 'f', 'g', 'a']);

  describe('#project()', function () {
    it('should produce no bindings if an empty source is projected',
      async.seq(
        check(emptyProj, []),
        check(emptyProjTwice, [])));
    it('should produce zero-vars bindings if the projected variables are not found',
      check(unionProj1, [{}, {}, {}, {}, {}, {}, {}, {}, {}]));
    it('should produce bindings wiht only the projected variables found',
      check(unionProj2, [
        {c: 43},
        {},
        {a: 61, c: 63},
        {a: 1, c: 3},
        {a: 11, c: 13},
        {a: 21, c: 33 },
        {a: 1, c: 3},
        {c: 43},
        {}
      ]));
  });

  describe('#compatible', function () {
    it('should produce a single empty binding',
      check(bind.compatible, [{}]));
  });

  describe('#incompatible', function () {
    it('should produce no bindings',
      check(bind.incompatible, []));
  });

});
