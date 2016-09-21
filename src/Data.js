// biblioteca de estatistica
var sm = require('simple-statistics');
//  Classe responsavel por administrar e receber os dados da plataforma
//  Faz todos os calculos com os dados da plataforma e gera os valores para o relatorio
function PlatData(pa, pb) {
    // Deslocamento vertical da plataforma
    this.a = pa;
    this.b = pb;
    //Medida centro -> topo

    // timestamps
    this.TI = [];
    // arrays de cada sensor
    // top right
    this.TR = [];
    // top left
    this.TL = [];
    // bottom right
    this.BR = [];
    // bottom left
    this.BL = [];

    // COP
    this.CPx = [];
    this.CPy = [];

}

// Adiciona dados recebidos como String e adiciona a Arrays
// Split em ';'
// Inicializa TI, TR, TL, BR e BL
PlatData.prototype.pushData = function (data) {
    var arr = data.split(";").map(function (val) {
        return Number(val);
    });
    this.TI.push(arr[0]);
    this.TR.push(arr[1]);
    this.TL.push(arr[2]);
    this.BR.push(arr[3]);
    this.BL.push(arr[4]);
};


// Calcula Centro de pressao (COP) para cada entrada
// Inicializa CPx e CPy. chama calcFx previamente
PlatData.prototype.calcCOP = function () {
    for (var i = 0; i < this.BR.length; i++) {
        this.CPx[i] = Efax(this.a, this.TR[i], this.TL[i], this.BL[i], this.BR[i]);
        this.CPy[i] = Efay(this.b, this.TR[i], this.TL[i], this.BL[i], this.BR[i]);
    }
};


// Calcula o COP para dada String recebida
// Usado para exibir o COP em tempo real
PlatData.prototype.RTCOP = function (data) {
    var arr = data.split(";").map(function (val) {
        return Number(val);
    });
    var TR = arr[1],
        TL = arr[2],
        BR = arr[3],
        BL = arr[4];

    var result = {};

    result.x = Efax(this.a, TR, TL, BL, BR);
    result.y = Efay(this.b, TR, TL, BL, BR);
    return result;
}

// Calcula o deslocamento da oscilacao total
// DEPENDE DE calcCOP
PlatData.prototype.calcDOT = function () {
    this.DOT = 0;
    for (var i = 0; i < this.CPx.length; i++) {
        this.DOT += Math.sqrt(Math.pow(this.CPx[i], 2) + Math.pow(this.CPy[i], 2));
    }
}

// Calcula desvio padrao
// DEPENDE DE calcCOP
PlatData.prototype.calcDEV = function () {
    this.DevAP = sm.standardDeviation(this.CPy);
    this.DevML = sm.standardDeviation(this.CPx);
}

// Calcula a raiz do valor quadratico medio
// DEPENDE DE calcCOP
PlatData.prototype.calcRMS = function () {
    this.rmsAP = sm.rootMeanSquare(this.CPy);
    this.rmsML = sm.rootMeanSquare(this.CPx);
}

// Calcula a frequencia da medicao
// PRECISA DOS DADOS EM TI[]
PlatData.prototype.calcFREQ = function () {
    var deltas = [];
    for (var i = 1; i < this.TI.length; i++) {
        deltas.push(this.TI[i] - this.TI[i - 1]);
    }
    this.avgFrq = 1000 / sm.mean(deltas);
}

// Calcula a velocidade media de deslocacao em AP e ML
// chama calcFREQ previamente
PlatData.prototype.calcVEL = function () {
    this.calcFREQ();
    var ApDeslocSum = 0;
    for (var i = 1; i < this.CPy.length; i++) {
        ApDeslocSum += Math.abs(this.CPy[i] - this.CPy[i - 1])
    }
    var MlDeslocSum = 0;
    for (var i = 1; i < this.CPx.length; i++) {
        MlDeslocSum += Math.abs(this.CPx[i] - this.CPx[i - 1])
    }
    this.VMap = (ApDeslocSum * this.avgFrq) / this.CPy.length;
    this.VMml = (MlDeslocSum * this.avgFrq) / this.CPx.length;
}

// Calcula a amplitude de deslocamento em AP e ML
// DEPENDE DE calcCOP
PlatData.prototype.calcAMPL = function () {
    this.ampAP = sm.max(this.CPy) - sm.min(this.CPy);
    this.ampML = sm.max(this.CPx) - sm.min(this.CPx);
}

// Calcula a velocidade de deslocamento
// media total do COP
// chama calcFREQ previamente
PlatData.prototype.calcVELTotal = function () {
    this.calcFREQ();
    var sum = 0;
    for (var i = 1; i < this.CPx.length; i++) {
        sum += Math.sqrt(
            Math.pow(this.CPy[i] - this.CPy[i - 1], 2) +
            Math.pow(this.CPx[i] - this.CPx[i - 1], 2)
        )
    }
    this.VMT = sum * this.avgFrq / this.CPy.length;
}

// Calcula a area preenchida pelo deslocamento do COP
// Utiliza uma oval tracada com base nas medianas das amplitudes em x e y do COP
// DEPENDE DE calcCOP
// 
// Pode ser alterado para tracar um poligono com as coordenadas perifiricas
PlatData.prototype.calcAREA = function () {
    var medianAP = sm.median(this.CPy);
    var medianML = sm.median(this.CPx);
    var deltaAPmin = Math.abs(medianAP - sm.min(this.CPy));
    var deltaAPmax = Math.abs(sm.max(this.CPy) - medianAP);
    var deltaMLmin = Math.abs(medianML - sm.min(this.CPx));
    var deltaMLmax = Math.abs(sm.max(this.CPx) - medianML);
    var deltaAP = (deltaAPmin + deltaAPmax) / 2;
    var deltaML = (deltaMLmin + deltaMLmax) / 2;
    this.area = Math.PI * deltaAP * deltaML;
}

// # HELPERS

// Funcao usada no calculo do COP
// Calcula forca horizontal em X da placa
//fz1 = TR, fz2 = TL, fz3 = BL, fz4 = BR
function Efax(a, fz1, fz2, fz3, fz4) {
    var X = a * (fz1 - fz2 - fz3 + fz4) / (fz1 + fz2 + fz3 + fz4);
    return X;
}

// Funcao usada no calculo do COP
// Calcula forca horizontal em Y da placa
//fz1 = TR, fz2 = TL, fz3 = BL, fz4 = BR
function Efay(b, fz1, fz2, fz3, fz4) {
    var Y = b * (fz1 + fz2 - fz3 - fz4) / (fz1 + fz2 + fz3 + fz4);
    return Y;
}

// ## funcoes antigas nao mais usadas

// Funcao usada no calculo do COP
// Calcula forca horizontal em X da placa
function fax(a, fz1, fz2, fz3, fz4, az0, fx12, fx34) {
    var t1 = a * (-fz1 + fz2 + fz3 - fz4);
    var t3 = fz1 + fz2 + fz3 + fz4;
    var t2 = az0 * (fx12 + fx34);
    return (-t1 - t2) / t3;
}

// Funcao usada no calculo do COP
// Calcula forca horizontal em Y da placa
function fay(b, fz1, fz2, fz3, fz4, az0, fy14, fy23) {
    var t1 = b * (fz1 + fz2 - fz3 - fz4);
    var t3 = fz1 + fz2 + fz3 + fz4;
    var t2 = az0 * (fy14 + fy23);
    return (t1 + t2) / t3;
}

// Exporta a classe
module.exports = PlatData;