var should = require('should');
var PlatData = require('../src/Data.js');
var seedrandom = require('seedrandom');
var rng = seedrandom('seed');

function populate(tam, periodo) {
	var numbers = [];
	var strings = [];
	var oldTI = 0;
	var maxReading = 100000;
	for (var i = 0; i < tam; i++) {
		var TI = Math.floor(oldTI += rng() * (periodo * 2)),
			TR = rng() * maxReading,
			TL = rng() * maxReading,
			BR = rng() * maxReading,
			BL = rng() * maxReading;
		numbers[i] = [TI, TR, TL, BR, BL];
		strings[i] = TI + ';' + TR + ';' + TL + ';' + BR + ';' + BL;
	}
	var result = {};
	result.strings = strings;
	result.numbers = numbers;
	return result;
}


describe('Testes da classe Data com dados aleatorios', function() {
	var strings = [];
	var numbers = [];
	var copXResult = [];
	var copYResult = [];
	var nDeLinhas = 20000;
	var periodo = 12.5;
	this.timeout(20000);
	var rawTest = new PlatData(24.76, 15.24, 0);

	before('populando linhas...', function() {
		var result = populate(nDeLinhas, periodo);
		strings = result.strings;
		numbers = result.numbers;
	});


	it('Parse test ' + nDeLinhas + ' linhas', function() {
		for (var i = 0; i < nDeLinhas; i++) {
			rawTest.pushData(strings[i]);
		}
		for (var i = 0; i < nDeLinhas; i++) {
			rawTest.TI[i].should.be.Number().and.not.be.NaN();
			rawTest.TR[i].should.be.Number().and.not.be.NaN();
			rawTest.TL[i].should.be.Number().and.not.be.NaN();
			rawTest.BR[i].should.be.Number().and.not.be.NaN();
			rawTest.BL[i].should.be.Number().and.not.be.NaN();
		}
	});

	it('Calcula CPx e CPy', function() {
		rawTest.calcCOP();
		for (var i = 0; i < rawTest.TR.length; i++) {
			rawTest.CPx[i].should.be.Number().and.not.be.NaN();
			rawTest.CPy[i].should.be.Number().and.not.be.NaN();
			copXResult.push(rawTest.CPx[i]);
			copYResult.push(rawTest.CPy[i]);
		}
	});

	it('Calcula CPx e CPy em tempo real', function() {
		for (var i = 0; i < nDeLinhas; i++) {
			var result = rawTest.RTCOP(strings[i]);
			result.x.should.be.Number().and.not.be.NaN();
			result.y.should.be.Number().and.not.be.NaN();
			result.t.should.be.Number().and.not.be.NaN();
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
		rawTest.avgFrq.should.be.Number().and.not.be.NaN().and.be.approximately(80, 1);
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

describe('(stress test) Testes de geração de relatório com dados aleatórios', function() {

	var tests = [{
		tam: 20
	}, {
		tam: 200
	}, {
		tam: 2000
	}, {
		tam: 20000
	}];
	var periodo = 12.5;

	tests.forEach(function(test) {
		var data = populate(test.tam, periodo);
		var rawTest = new PlatData(100, 100);
		it('Report test ' + test.tam + ' linhas duração maxima: ' + (periodo * test.tam) + 'ms', function(done) {
			this.timeout(17 * test.tam);
			for (var i = 0; i < test.tam; i++) {
				rawTest.pushData(data.strings[i]);
			}
			for (var i = 0; i < test.tam; i++) {
				rawTest.TI[i].should.be.Number().and.not.be.NaN();
				rawTest.TR[i].should.be.Number().and.not.be.NaN();
				rawTest.TL[i].should.be.Number().and.not.be.NaN();
				rawTest.BR[i].should.be.Number().and.not.be.NaN();
				rawTest.BL[i].should.be.Number().and.not.be.NaN();
			}
			var report = rawTest.fullReport();
			report.should.have.property('CPx').with.lengthOf(test.tam);
			report.should.have.property('CPy').with.lengthOf(test.tam);
			report.DOT.should.be.Number().and.not.be.NaN();
			report.DevAP.should.be.Number().and.not.be.NaN().and.be.above(0);
			report.DevML.should.be.Number().and.not.be.NaN().and.be.above(0);
			report.rmsAP.should.be.Number().and.not.be.NaN();
			report.rmsML.should.be.Number().and.not.be.NaN();
			report.avgFrq.should.be.Number().and.not.be.NaN();
			report.VMap.should.be.Number().and.not.be.NaN();
			report.VMml.should.be.Number().and.not.be.NaN();
			report.ampAP.should.be.Number().and.not.be.NaN();
			report.ampML.should.be.Number().and.not.be.NaN();
			report.VMT.should.be.Number().and.not.be.NaN();
			report.area.should.be.Number().and.not.be.NaN();
			done();
		});
	});
});
