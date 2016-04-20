var assert = require("assert");

describe('Deve dar certo', function() {
    
    var resultado;
    beforeEach(function() {
        resultado = true;
        console.log("Antes");
    });
    
    
    it('Da cerrto por padrao', function() {
        assert.equal(resultado, true);
    });
    
    
});
