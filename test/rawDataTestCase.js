var should = require('should');
var PlatData = require('../js/Data.js');


describe('Testes da classe Raw', function() {
    var strings = [];
    var numbers = [];
    var nDeLinhas = 20000;
    this.timeout(20000);
    before('populando linhas...',function() {
        for(var i=0;i<nDeLinhas;i++){
            var TR = Math.random(),
                TL = Math.random(),
                BR = Math.random(),
                BL = Math.random();
            numbers[i] = [TR,TL,BR,BL];
            strings[i] = TR + "," + TL + "," + BR + "," + BL;
            //console.log(numbers[i][0] + " - " + TR);
        }
    });
    
    
    it('Phrase test ' + nDeLinhas + ' linhas', function() {
        var rawTest = new PlatData();
        for(var i=0;i<nDeLinhas;i++){
            rawTest.pushData(strings[i]);
        }
        
        for(var i=0;i<nDeLinhas;i++){
            rawTest.TR[i].should.be.exactly(numbers[i][0]);
            rawTest.TL[i].should.be.exactly(numbers[i][1]);
            rawTest.BR[i].should.be.exactly(numbers[i][2]);
            rawTest.BL[i].should.be.exactly(numbers[i][3]);
            
        }
        
    });
    
    it('Calcula Fx12,Fx34,Fx14,Fx23');
    it('Calcula CPx e CPy');
    it('Calcula Deslocamento da oscilação total, DOT');
    it('Calcula Desvio padrão (AP e ML)'); 
    it('Calcula RMS (Root Mean Square) AP e ML');
    it('Calcula Velocidade média (VM)');
    it('Calcula Velocidade média (VM)');
    it('Calcula Amplitude de deslocamento do CP');
    it('Calcula Velocidade média total (VMT)');
    it('Calcula Área');
    
    
    
    
});