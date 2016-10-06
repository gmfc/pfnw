var should = require('should');
var PlatData = require('../src/Data.js');

function populate(tam) {
	var numbers = [];
	var strings = [];
	var oldTI = 0;
	for (var i = 0; i < tam; i++) {
		var TI = Math.floor(oldTI += Math.random() * 15),
			TR = Math.random() * 100,
			TL = Math.random() * 100,
			BR = Math.random() * 100,
			BL = Math.random() * 100;
		numbers[i] = [TI, TR, TL, BR, BL];
		strings[i] = TI + ';' + TR + ';' + TL + ';' + BR + ';' + BL;
	}
	var result = {};
	result.strings = strings;
	result.numbers = numbers;
	return result;
}


describe('Testes de geração de relatório da classe Data com dados aleatórios', function() {

	var tests = [{
		tam: 10
	}, {
		tam: 100
	}, {
		tam: 1000
	}, {
		tam: 10000
	}, {
		tam: 100000
	}];

	tests.forEach(function(test) {
		var data = populate(test.tam);
		var rawTest = new PlatData(100, 100);
		it('Report test ' + test.tam + ' linhas duração maxima: ' + (17 * test.tam) + 'ms', function(done) {
			this.timeout(17 * test.tam);
			for (var i = 0; i < test.tam; i++) {
				rawTest.pushData(data.strings[i]);
			}
			for (var i = 0; i < test.tam; i++) {
				rawTest.TI[i].should.be.exactly(data.numbers[i][0]).and.not.be.NaN();
				rawTest.TR[i].should.be.exactly(data.numbers[i][1]).and.not.be.NaN();
				rawTest.TL[i].should.be.exactly(data.numbers[i][2]).and.not.be.NaN();
				rawTest.BR[i].should.be.exactly(data.numbers[i][3]).and.not.be.NaN();
				rawTest.BL[i].should.be.exactly(data.numbers[i][4]).and.not.be.NaN();
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
