'use strict'
var should = require('should');
var PlatData = require('../js/Data.js');


describe('Testes da classe Data com dados aleatorios', function() {
	var strings = [];
	var numbers = [];
	var nDeLinhas = 20000;
	this.timeout(20000);
	var rawTest = new PlatData();
	
	before('populando linhas...', function() {
		for (var i = 0; i < nDeLinhas; i++) {
			var TI =  Math.floor(Math.random() * 8) + 5,
				TR = Math.random()*100,
				TL = Math.random()*100,
				BR = Math.random()*100,
				BL = Math.random()*100;
			numbers[i] = [TI,TR, TL, BR, BL];
			strings[i] = TI + ";" + TR + ";" + TL + ";" + BR + ";" + BL;
		}
	});


	it('Phrase test ' + nDeLinhas + ' linhas', function() {

		for (let i = 0; i < nDeLinhas; i++) {
			rawTest.pushData(strings[i]);
		}

		for (let i = 0; i < nDeLinhas; i++) {
			rawTest.TI[i].should.be.exactly(numbers[i][0]);
			rawTest.TR[i].should.be.exactly(numbers[i][1]);
			rawTest.TL[i].should.be.exactly(numbers[i][2]);
			rawTest.BR[i].should.be.exactly(numbers[i][3]);
			rawTest.BL[i].should.be.exactly(numbers[i][4]);

		}

	});

	it('Calcula Fx12,Fx34,Fx14,Fx23', function() {
		rawTest.calcFx();
		for (var i = 0; i < rawTest.TR.length; i++) {
			rawTest.FxTRL[i].should.be.Number();
			rawTest.FxBLR[i].should.be.Number();
			rawTest.FxTBR[i].should.be.Number();
			rawTest.FxTBL[i].should.be.Number();
		}
	});

	it('Calcula CPx e CPy', function() {
		rawTest.calcCOP();
		for (var i = 0; i < rawTest.TR.length; i++) {
			rawTest.CPx[i].should.be.Number();
			rawTest.CPy[i].should.be.Number();
		}
	});


	it('Calcula Deslocamento da oscilação total, DOT', function() {
		rawTest.calcDOT();
		rawTest.DOT.should.be.Number();
	});

	it('Calcula Desvio padrão (AP e ML)', function() {
		rawTest.calcDEV();
		rawTest.DevAP.should.be.Number();
		rawTest.DevML.should.be.Number();
	});
	
	it('Calcula RMS (Root Mean Square) AP e ML', function() {
		rawTest.calcRMS();
		rawTest.rmsAP.should.be.Number();
		rawTest.rmsML.should.be.Number();
	});
	
	it('Calcula Frequencia', function() {
		rawTest.calcFREQ();
		rawTest.avgFrq.should.be.Number();
	});
	
	it('Calcula Velocidade média (VM)');
	it('Calcula Amplitude de deslocamento do CP');
	it('Calcula Velocidade média total (VMT)');
	it('Calcula Área');




});