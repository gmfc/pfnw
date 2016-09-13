'use strict'
var should = require('should');
var PlatData = require('../js/Data.js');


describe('Testes da classe Data com dados REAIS', function() {
	var strings = require('./dataString.json');
	var numbers = require('./data.json');
	//var nDeLinhas = 20000;
	this.timeout(20000);
	var rawTest = new PlatData();


	it('Phrase test ' + strings.length + ' linhas', function() {

		for (let i = 0; i < strings.length; i++) {
			rawTest.pushData(strings[i]);
		}

		for (let i = 0; i < numbers.length; i++) {
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
		rawTest.DOT.should.be.equal(126.18380999831666);
	});

	it('Calcula Desvio padrão (AP e ML)', function() {
		rawTest.calcDEV();
		rawTest.DevAP.should.be.equal(1.9922037290478767);
		rawTest.DevML.should.be.equal(2.1934201029090516);
	});

	it('Calcula RMS (Root Mean Square) AP e ML', function() {
		rawTest.calcRMS();
		rawTest.rmsAP.should.be.equal(2.421545965694047);
		rawTest.rmsML.should.be.equal(2.50425636752085);
	});

	it('Calcula Frequencia (hz)', function() {
		rawTest.calcFREQ();
		rawTest.avgFrq.should.be.equal(2);
	});

	it('Calcula Velocidade média (VM)', function() {
		rawTest.calcVEL();
		rawTest.VMap.should.be.equal(4.925516889469856);
		rawTest.VMml.should.be.equal(4.69599427181104);
	});

	it('Calcula Amplitude de deslocamento do CP', function() {
		rawTest.calcAMPL();
		rawTest.ampAP.should.be.equal(8.79596010661087);
		rawTest.ampML.should.be.equal(10.120240926864637);
	});

	it('Calcula Velocidade média total (VMT)', function() {
		rawTest.calcVELTotal();
		rawTest.VMT.should.be.equal(7.429399583141942);
	});

	it('Calcula Área', function() {
		rawTest.calcAREA();
		rawTest.area.should.be.equal(69.9139732425667);
	});




});