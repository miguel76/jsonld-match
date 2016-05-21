/*eslint-env node, mocha */

var expect = require('chai').expect,
    binding = require('../lib/binding');

describe('Binding', function() {

  var readBindings = function(bindingSource) {
    var error = null;
    var bindings = [];
    bindingSource.readBindings( {
      binding: function(binding) { bindings.push(binding); },
      error: function(newError) { error = newError; }
    } );
    return { error: error, bindings: bindings };
  };

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

  var emptyUnion = bind.union([]);
  var emptyUnionTwice = bind.union([emptyUnion, emptyUnion]);
  var union1 = bind.union([singleSource1]);
  var union123 = bind.union([singleSource1, singleSource2, singleSource3]);
  var union145 = bind.union([singleSource1, emptyUnion, singleSource4, singleSource5]);
  var union456 = bind.union([emptyUnion, singleSource4, singleSource5, singleSource6]);
  var union123_145 = bind.union([union123, union145]);
  var union456__123_145 = bind.union([union456, union123_145, emptyUnion]);

  var emptyExt = bind.extend(emptyUnionTwice, binding4);
  var unionZeroExt = bind.extend(union456__123_145, {});
  var unionZeroExtTwice = bind.extend(unionZeroExt, {});
  var unionExt = bind.extend(union456__123_145, binding6);
  var unionExtTwice = bind.extend(unionExt, binding4);
  var source0Ext = bind.extend(singleSource0, binding1);
  var source0ExtTwice = bind.extend(source0Ext, binding4);

  var emptyProj = bind.project(emptyUnionTwice, ['a', 'b', 'c']);
  var emptyProjTwice = bind.project(emptyProj,  ['b', 'c', 'd']);
  var unionProj1 = bind.project(union456__123_145, ['f', 'g']);
  var unionProj2 = bind.project(union456__123_145, ['c', 'f', 'g', 'a']);

  describe('#singleSource()', function () {
    it('should produce a single binding (its parameter)', function () {
      var res = readBindings(singleSource1);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.have.a.property('bindings').that.has.lengthOf(1);
      expect(res).to.have.a.deep.property('bindings[0]', binding1);
    });
  });

  describe('#union()', function () {
    it('should produce no bindings if empty', function () {
      var res = readBindings(emptyUnion);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.have.a.property('bindings').that.has.lengthOf(0);
    });
    it('should produce no bindings if contains just empty sources', function () {
      var res = readBindings(emptyUnionTwice);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.have.a.property('bindings').that.has.lengthOf(0);
    });
    it('should produce a single binding with a single source', function () {
      var res = readBindings(union1);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.have.a.property('bindings').that.has.lengthOf(1);
      expect(res).to.have.a.deep.property('bindings[0]', binding1);
    });
    it('should produce a binding for each single source combined', function () {
      var res = readBindings(union123_145);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.have.a.property('bindings').that.has.lengthOf(6);
      expect(res).to.have.a.property('bindings').that.is.deep.equal([
        {a: 1, b: 2, c: 3},
        {a: 11, c: 13, d: 14},
        {a: 21, c: 33 },
        {a: 1, b: 2, c: 3},
        {c: 43, d: 44, e: 45},
        {d: 53}
      ]);
      res = readBindings(union456__123_145);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.have.a.property('bindings').that.has.lengthOf(9);
      expect(res).to.have.a.property('bindings').that.is.deep.equal([
        {c: 43, d: 44, e: 45},
        {d: 53},
        {a: 61, b: 61, c: 63, d: 63},
        {a: 1, b: 2, c: 3},
        {a: 11, c: 13, d: 14},
        {a: 21, c: 33 },
        {a: 1, b: 2, c: 3},
        {c: 43, d: 44, e: 45},
        {d: 53}
      ]);
    });
  });

  describe('#extend()', function () {
    it('should produce no bindings if an empty source is extended', function () {
      var res = readBindings(emptyExt);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.have.a.property('bindings').that.has.lengthOf(0);
    });
    it('should be an identity if the new binding has no variables', function () {
      var base = readBindings(union456__123_145);
      var res = readBindings(unionZeroExt);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.be.deep.equal(base);
      res = readBindings(unionZeroExtTwice);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.be.deep.equal(base);
    });
    it('should be always a single source when extending a compatible single source', function () {
      var base = readBindings(singleSource1);
      var res = readBindings(source0Ext);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.be.deep.equal(base);
      res = readBindings(source0ExtTwice);
      var test = [{a: 1, b: 2, c: 3, d: 44, e: 45}];
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.have.a.property('bindings').that.is.deep.equal(test);
    });
    it('should produce bindings only when the extension is compatible with the source', function () {
      var res = readBindings(unionExt);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.have.a.property('bindings').that.has.lengthOf(4);
      var test = [
        {a: 61, b: 61, c: 63, d: 53},
        {a: 61, b: 61, c: 63, d: 63},
        {a: 21, b: 61, c: 33, d: 63},
        {a: 61, b: 61, c: 63, d: 53}
      ];
      expect(res).to.have.a.property('bindings').that.is.deep.equal(test);
      res = readBindings(unionExtTwice);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.have.a.property('bindings').that.has.lengthOf(0);
    });
  });

  describe('#project()', function () {
    it('should produce no bindings if an empty source is projected', function () {
      var res = readBindings(emptyProj);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.have.a.property('bindings').that.has.lengthOf(0);
      res = readBindings(emptyProjTwice);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.have.a.property('bindings').that.has.lengthOf(0);
    });
    it('should produce zero-vars bindings if the projected variables are not found', function (done) {
      var res = readBindings(unionProj1);
      expect(res).to.have.a.property('error').that.is.null;
      var test = [{}, {}, {}, {}, {}, {}, {}, {}, {}];
      expect(res).to.have.a.property('bindings').that.is.deep.equal(test);
      done();
    });
    it('should produce bindings wiht only the projected variables found', function () {
      var res = readBindings(unionProj2);
      expect(res).to.have.a.property('error').that.is.null;
      var test = [
        {c: 43},
        {},
        {a: 61, c: 63},
        {a: 1, c: 3},
        {a: 11, c: 13},
        {a: 21, c: 33 },
        {a: 1, c: 3},
        {c: 43},
        {}
      ];
      expect(res).to.have.a.property('bindings').that.is.deep.equal(test);
    });
  });

  describe('#compatible', function () {
    it('should produce a single empty binding', function () {
      var res = readBindings(bind.compatible);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.have.a.property('bindings').that.has.lengthOf(1);
      expect(res.bindings[0]).to.be.empty;
    });
  });

  describe('#incompatible', function () {
    it('should produce no bindings', function () {
      var res = readBindings(bind.incompatible);
      expect(res).to.have.a.property('error').that.is.null;
      expect(res).to.have.a.property('bindings').that.has.lengthOf(0);
    });
  });

});
