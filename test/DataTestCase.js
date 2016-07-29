var should = require('should');
var PlatData = require('../js/Data.js');


describe('Testes da classe Raw', function() {
    var strings = [];
    var numbers = [];
    var nDeLinhas = 20000;
    this.timeout(20000);
	var rawTest = new PlatData();
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
    
    it('Calcula Fx12,Fx34,Fx14,Fx23', function() {
		rawTest.calcFx();
		for(var i=0;i<rawTest.TR.length;i++){
			rawTest.FxTRL[i].should.be.Number();
			rawTest.FxBLR[i].should.be.Number();
			rawTest.FxTBR[i].should.be.Number();
			rawTest.FxTBL[i].should.be.Number();
		}
	});
	
    it('Calcula CPx e CPy', function() {
		rawTest.calcCOP();
		for(var i=0;i<rawTest.TR.length;i++){
			rawTest.CPx[i].should.be.Number();
			rawTest.CPy[i].should.be.Number();
		}
	});
    it('Calcula Deslocamento da oscilação total, DOT');
    it('Calcula Desvio padrão (AP e ML)'); 
    it('Calcula RMS (Root Mean Square) AP e ML');
    it('Calcula Velocidade média (VM)');
    it('Calcula Velocidade média (VM)');
    it('Calcula Amplitude de deslocamento do CP');
    it('Calcula Velocidade média total (VMT)');
    it('Calcula Área');
    
    
    
    
});