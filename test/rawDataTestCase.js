var assert = require("assert");

var Raw = require('../js/rawData.js');

describe('Teste da classe Raw', function() {
    
    var strings;
    before('populando carga',function() {
        
        strings = "123,0.1,1,2.2";
    });
    
    
    it('Popula dados e testa se esta correto', function() {
        var rawTest = new Raw();
        rawTest.pushData(strings);
        assert.strictEqual(rawTest.TR[0], 123);
        assert.strictEqual(rawTest.TL[0], 0.1);
        assert.strictEqual(rawTest.BR[0], 1);
        assert.strictEqual(rawTest.BL[0], 2.2);
        //assert.
    });
    
    
});