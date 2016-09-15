var should = require('should');
var PlatData = require('../js/Data.js');


describe('Testes da classe Data com dados aleatorios', function() {
	var strings = [];
	var numbers = [];
	var nDeLinhas = 2000;
	this.timeout(20000);
	var rawTest = new PlatData();

	before('populando linhas...', function() {
		for (var i = 0; i < nDeLinhas; i++) {
			var TI = Math.floor(Math.random() * 8) + 5,
				TR = Math.random() * 100,
				TL = Math.random() * 100,
				BR = Math.random() * 100,
				BL = Math.random() * 100;
			numbers[i] = [TI, TR, TL, BR, BL];
			strings[i] = TI + ";" + TR + ";" + TL + ";" + BR + ";" + BL;
		}
	});


	it('Parse test ' + nDeLinhas + ' linhas', function() {

		for (var i = 0; i < nDeLinhas; i++) {
			rawTest.pushData(strings[i]);
		}

		for (var i = 0; i < nDeLinhas; i++) {
			rawTest.TI[i].should.be.exactly(numbers[i][0]).and.not.be.NaN();
			rawTest.TR[i].should.be.exactly(numbers[i][1]).and.not.be.NaN();
			rawTest.TL[i].should.be.exactly(numbers[i][2]).and.not.be.NaN();
			rawTest.BR[i].should.be.exactly(numbers[i][3]).and.not.be.NaN();
			rawTest.BL[i].should.be.exactly(numbers[i][4]).and.not.be.NaN();

		}

	});

	it('Calcula CPx e CPy', function() {
		rawTest.calcCOP();
		for (var i = 0; i < rawTest.TR.length; i++) {
			rawTest.CPx[i].should.be.Number().and.not.be.NaN();
			rawTest.CPy[i].should.be.Number().and.not.be.NaN();
		}
	});

	it('Calcula Deslocamento da oscilação total, DOT', function() {
		rawTest.calcDOT();
		rawTest.DOT.should.be.Number().and.not.be.NaN();
	});

	it('Calcula Desvio padrão (AP e ML)', function() {
		rawTest.calcDEV();
		rawTest.DevAP.should.be.Number().and.not.be.NaN().and.be.above(0);
		rawTest.DevML.should.be.Number().and.not.be.NaN().and.be.above(0);
	});

	it('Calcula RMS (Root Mean Square) AP e ML', function() {
		rawTest.calcRMS();
		rawTest.rmsAP.should.be.Number().and.not.be.NaN();
		rawTest.rmsML.should.be.Number().and.not.be.NaN();
	});

	it('Calcula Frequencia', function() {
		rawTest.calcFREQ();
		rawTest.avgFrq.should.be.Number().and.not.be.NaN();
	});

	it('Calcula Velocidade média (VM)', function() {
		rawTest.calcVEL();
		rawTest.VMap.should.be.Number().and.not.be.NaN();
		rawTest.VMml.should.be.Number().and.not.be.NaN();
	});

	it('Calcula Amplitude de deslocamento do CP', function() {
		rawTest.calcAMPL();
		rawTest.ampAP.should.be.Number().and.not.be.NaN();
		rawTest.ampML.should.be.Number().and.not.be.NaN();
	});

	it('Calcula Velocidade média total (VMT)', function() {
		rawTest.calcVELTotal();
		rawTest.VMT.should.be.Number().and.not.be.NaN();
	});

	it('Calcula Área', function() {
		rawTest.calcAREA();
		rawTest.area.should.be.Number().and.not.be.NaN();
	});




});