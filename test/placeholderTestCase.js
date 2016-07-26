var assert = require("assert");

describe('Teste do sistema de testes', function() {
    
    var resultado;
    beforeEach(function() {
        resultado = true;
    });
    
    
    it('Compara true com true...', function() {
        assert.equal(resultado, true);
    });
    
    
});
