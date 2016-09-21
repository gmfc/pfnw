var should = require("should");
var PlatData = require("../src/Data.js");


describe("Testes da classe Data com dados REAIS", function () {
    var strings = require("./testData/dataString.json");
    var numbers = require("./testData/data.json");
    //var nDeLinhas = 20000;
    this.timeout(20000);
    var rawTest = new PlatData(24.76, 15.24, 0);

    before("populando linhas...", function () {
        describe("seta tamanho padrao", function () {
            rawTest.a = 24.76;
            rawTest.b = 15.24;
        });
    });


    it("Parse test " + strings.length + " linhas", function () {

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

    });


    it("Calcula CPx e CPy", function () {
        rawTest.calcCOP();
        for (var i = 0; i < rawTest.TR.length; i++) {
            rawTest.CPx[i].should.be.Number().and.not.be.NaN();
            rawTest.CPy[i].should.be.Number().and.not.be.NaN();
        }
    });

    it("Calcula CPx e CPy em tempo real", function () {
        var rx = rawTest.RTCOP("0;26.06017187;29.53458686;29.34599382;25.38331361").x;
        rx.should.be.exactly(0.10958122980771089);
        var ry = rawTest.RTCOP("0;26.06017187;29.53458686;29.34599382;25.38331361").y;
        ry.should.be.exactly(0.11955213645653447);
    });

    it("Calcula Deslocamento da oscilação total, DOT", function () {
        rawTest.calcDOT();
        rawTest.DOT.should.be.equal(126.18380999831666).and.not.be.NaN();
    });

    it("Calcula Desvio padrão (AP e ML)", function () {
        rawTest.calcDEV();
        rawTest.DevAP.should.be.equal(1.9922037290478767).and.not.be.NaN();
        rawTest.DevML.should.be.equal(2.1934201029090516).and.not.be.NaN();
    });

    it("Calcula RMS (Root Mean Square) AP e ML", function () {
        rawTest.calcRMS();
        rawTest.rmsAP.should.be.equal(2.421545965694047).and.not.be.NaN();
        rawTest.rmsML.should.be.equal(2.50425636752085).and.not.be.NaN();
    });

    it("Calcula Frequencia (hz)", function () {
        rawTest.calcFREQ();
        rawTest.avgFrq.should.be.equal(2).and.not.be.NaN();
    });

    it("Calcula Velocidade média (VM)", function () {
        rawTest.calcVEL();
        rawTest.VMap.should.be.equal(4.925516889469856).and.not.be.NaN();
        rawTest.VMml.should.be.equal(4.69599427181104).and.not.be.NaN();
    });

    it("Calcula Amplitude de deslocamento do CP", function () {
        rawTest.calcAMPL();
        rawTest.ampAP.should.be.equal(8.79596010661087).and.not.be.NaN();
        rawTest.ampML.should.be.equal(10.120240926864637).and.not.be.NaN();
    });

    it("Calcula Velocidade média total (VMT)", function () {
        rawTest.calcVELTotal();
        rawTest.VMT.should.be.equal(7.429399583141942).and.not.be.NaN();
    });

    it("Calcula Área", function () {
        rawTest.calcAREA();
        rawTest.area.should.be.equal(69.9139732425667).and.not.be.NaN();
    });




});