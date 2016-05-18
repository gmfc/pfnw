var assert = require("assert");

describe('Teste do sistema de testes', function() {
    
    var resultado;
    beforeEach(function() {
        console.log("Configurando variaveis");
        resultado = true;
    });
    
    
    it('Compara true com true...', function() {
        assert.equal(resultado, true);
    });
    
    
});
