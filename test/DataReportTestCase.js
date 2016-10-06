var should = require('should');
var PlatData = require('../src/Data.js');


describe('Testes de geração de relatório da classe Data com dados reais', function() {
	var strings = require('./testData/dataString.json');
	var numbers = require('./testData/data.json');
	this.timeout(20000);
	var rawTest = new PlatData(24.76, 15.24);
	it('Report test ' + strings.length + ' linhas', function() {


		for (var i = 0; i < strings.length; i++) {
			rawTest.pushData(strings[i]);
		}

		for (var i = 0; i < numbers.length; i++) {
			rawTest.TI[i].should.be.exactly(numbers[i][0]);
			rawTest.TR[i].should.be.exactly(numbers[i][1]);
			rawTest.TL[i].should.be.exactly(numbers[i][2]);
			rawTest.BR[i].should.be.exactly(numbers[i][3]);
			rawTest.BL[i].should.be.exactly(numbers[i][4]);
		}

		var report = rawTest.fullReport();
		report.DOT.should.be.equal(126.18380999831666).and.not.be.NaN();
		report.DevAP.should.be.equal(1.9922037290478767).and.not.be.NaN();
		report.DevML.should.be.equal(2.1934201029090516).and.not.be.NaN();
		report.rmsAP.should.be.equal(2.421545965694047).and.not.be.NaN();
		report.rmsML.should.be.equal(2.50425636752085).and.not.be.NaN();
		report.avgFrq.should.be.equal(2).and.not.be.NaN();
		report.VMap.should.be.equal(4.925516889469856).and.not.be.NaN();
		report.VMml.should.be.equal(4.69599427181104).and.not.be.NaN();
		report.ampAP.should.be.equal(8.79596010661087).and.not.be.NaN();
		report.ampML.should.be.equal(10.120240926864637).and.not.be.NaN();
		report.VMT.should.be.equal(7.429399583141942).and.not.be.NaN();
		report.area.should.be.equal(69.9139732425667).and.not.be.NaN();
	});

});
