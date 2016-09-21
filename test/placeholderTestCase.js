var assert = require("assert");
var should = require("should");


describe("Teste do sistema de testes", function() {
    
    var resultado;
    beforeEach(function() {
        resultado = true;
    });
    
    
    it("Compara true com true... (ASSERT test)", function() {
        assert.equal(resultado, true);
    });
    
    it("Verifica diferenca... (ASSERT test)", function() {
        assert.notEqual(resultado, false);
    });
    
    it("Compara true com true... (SHOULD test)", function() {
        resultado.should.be.exactly(true);
    });
    
    it("Verifica diferenca... (SHOULD test)", function() {
        resultado.should.not.be.exactly(false);
    });
    
    
});
