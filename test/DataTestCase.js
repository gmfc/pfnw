var should = require('should');
var PlatData = require('../src/Data.js');


describe('Testes da classe Data com dados REAIS', function() {
	var strings = require('./testData/dataString.json');
	var numbers = require('./testData/data.json');
	this.timeout(20000);
	var rawTest = new PlatData(24.76, 15.24);


	it('Parse test ' + strings.length + ' linhas', function() {
		var delta = 25;
		for (var i = 0; i < strings.length; i++) {
			rawTest.pushData(strings[i]);
		}

		for (var i = 0; i < numbers.length; i++) {
			rawTest.TI[i].should.be.Number().and.not.be.NaN();
			rawTest.TR[i].should.be.Number().and.not.be.NaN();
			rawTest.TL[i].should.be.Number().and.not.be.NaN();
			rawTest.BR[i].should.be.Number().and.not.be.NaN();
			rawTest.BL[i].should.be.Number().and.not.be.NaN();
		}

	});


	it('Calcula CPx e CPy', function() {
		should(rawTest.calcCOP()).not.throw();
		rawTest.should.have.property('CPx').with.lengthOf(strings.length);
		rawTest.should.have.property('CPy').with.lengthOf(strings.length);
	});

	it('Calcula CPx e CPy em tempo real', function() {
		var result = rawTest.RTCOP('0;26.06017187;29.53458686;29.34599382;25.38331361');
		//var rx = .x;
		result.x.should.be.exactly(0.10958122980771089);
		//var ry = rawTest.RTCOP('0;26.06017187;29.53458686;29.34599382;25.38331361').y;
		result.y.should.be.exactly(0.11955213645653447);
	});

	it('Calcula Deslocamento da oscilação total, DOT', function() {
		rawTest.calcDOT();
		rawTest.DOT.should.be.equal(28.641778872449407).and.not.be.NaN();
	});

	it('Calcula Desvio padrão (AP e ML)', function() {
		rawTest.calcDEV();
		rawTest.DevAP.should.be.equal(0.6908236443032981).and.not.be.NaN();
		rawTest.DevML.should.be.equal(0.6659944741752033).and.not.be.NaN();
	});

	it('Calcula RMS (Root Mean Square) AP e ML', function() {
		rawTest.calcRMS();
		rawTest.rmsAP.should.be.equal(1.235419721755602).and.not.be.NaN();
		rawTest.rmsML.should.be.equal(1.6749503962022194).and.not.be.NaN();
	});

	it('Calcula Frequencia (hz)', function() {
		rawTest.calcFREQ();
		rawTest.avgFrq.should.be.equal(2).and.not.be.NaN();
	});

	it('Calcula Velocidade média (VM)', function() {
		rawTest.calcVEL();
		rawTest.VMap.should.be.equal(0.9521676900373655).and.not.be.NaN();
		rawTest.VMml.should.be.equal(0.9580868425302883).and.not.be.NaN();
	});

	it('Calcula Amplitude de deslocamento do CP', function() {
		rawTest.calcAMPL();
		rawTest.ampAP.should.be.equal(3.3540279792852234).and.not.be.NaN();
		rawTest.ampML.should.be.equal(3.1374854797464713).and.not.be.NaN();
	});

	it('Calcula Velocidade média total (VMT)', function() {
		rawTest.calcVELTotal();
		rawTest.VMT.should.be.equal(1.4320889436224704).and.not.be.NaN();
	});

	it('Calcula Área', function() {
		rawTest.calcAREA();
		rawTest.area.should.be.equal(8.264913014353198).and.not.be.NaN();
	});

	it('Report test ' + strings.length + ' linhas', function() {
		rawTest = new PlatData(24.76, 15.24);

		for (var i = 0; i < strings.length; i++) {
			rawTest.pushData(strings[i]);
		}

		var report = rawTest.fullReport();
		report.DOT.should.be.equal(28.641778872449407).and.not.be.NaN();
		report.DevAP.should.be.equal(0.69082364430329817).and.not.be.NaN();
		report.DevML.should.be.equal(0.6659944741752033).and.not.be.NaN();
		report.rmsAP.should.be.equal(1.235419721755602).and.not.be.NaN();
		report.rmsML.should.be.equal(1.6749503962022194).and.not.be.NaN();
		report.avgFrq.should.be.equal(2).and.not.be.NaN();
		report.VMap.should.be.equal(0.9521676900373655).and.not.be.NaN();
		report.VMml.should.be.equal(0.9580868425302883).and.not.be.NaN();
		report.ampAP.should.be.equal(3.3540279792852234).and.not.be.NaN();
		report.ampML.should.be.equal(3.1374854797464713).and.not.be.NaN();
		report.VMT.should.be.equal(1.4320889436224704).and.not.be.NaN();
		report.area.should.be.equal(8.264913014353198).and.not.be.NaN();
	});

});
