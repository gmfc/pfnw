'use strict'
// biblioteca de estatistica
var sm = require('simple-statistics');
/*
 *  Classe responsavel por administrar e receber os dados da plataforma
 *  Faz todos os calculos com os dados da plataforma e gera os valores para o relatorio
 */
function PlatData() {

	this.az0 = 0;
	this.a = 1;//24.76; //Medida centro -> lteral
	this.b = 1;//15.24; //Medida centro -> topo

	// timestamps
	this.TI = [];
	// arrays de cada sensor
	this.TR = []; // top right
	this.TL = []; // top left
	this.BR = []; // bottom right
	this.BL = []; // bottom left

	this.FxTRL = [];
	this.FxBLR = [];

	this.FxTBR = [];
	this.FxTBL = [];

	this.CPx = [];
	this.CPy = [];

}


// push leitura. Recebe String com leitura dos dados no ciclo
// e adiciona no final de cada array;
PlatData.prototype.pushData = function(data) {

	var arr = data.split(";").map(function(val) {
		return Number(val);
	});
	this.TI.push(arr[0]);
	this.TR.push(arr[1]);
	this.TL.push(arr[2]);
	this.BR.push(arr[3]);
	this.BL.push(arr[4]);
};

PlatData.prototype.calcFx = function() {
	for (var i = 0; i < this.BR.length; i++) {
		this.FxTRL[i] = this.TR[i] + this.TL[i];
		this.FxBLR[i] = this.BL[i] + this.BR[i];
		this.FxTBR[i] = this.TR[i] + this.BR[i];
		this.FxTBL[i] = this.TL[i] + this.BL[i];
	}
};

// COP = centro de pressao (x,y)
PlatData.prototype.calcCOP = function() {
	for (var i = 0; i < this.BR.length; i++) {
		this.CPx[i] = fax(this.a, this.TR[i], this.TL[i], this.BL[i], this.BR[i], this.az0, this.FxTRL[i], this.FxBLR[i]);
		this.CPy[i] = fay(this.b, this.TR[i], this.TL[i], this.BL[i], this.BR[i], this.az0, this.FxTBR[i], this.FxTBL[i]);
	}
};

PlatData.prototype.calcDOT = function() {
	this.DOT = 0;
	for (let i = 0; i < this.CPx.length; i++) {
		this.DOT += Math.sqrt(Math.pow(this.CPx[i], 2) + Math.pow(this.CPy[i], 2));
	}
}

// AP = y ML = x
PlatData.prototype.calcDEV = function() {
	this.DevAP = sm.standardDeviation(this.CPy);
	this.DevML = sm.standardDeviation(this.CPx);
}

PlatData.prototype.calcRMS = function() {
	this.rmsAP = sm.rootMeanSquare(this.CPy);
	this.rmsML = sm.rootMeanSquare(this.CPx);
}

PlatData.prototype.calcFREQ = function() {
	let deltas = [];
	for (let i = 1; i < this.TI.length; i++) {
		deltas.push(this.TI[i] - this.TI[i - 1]);
	}
	this.avgFrq = 1000 / sm.mean(deltas);

}

PlatData.prototype.calcVEL = function() {
	this.calcFREQ();
	// calc AP
	let ApDeslocSum = 0;
	for (let i = 1; i < this.CPy.length; i++) {
		ApDeslocSum += Math.abs(this.CPy[i] - this.CPy[i - 1])
	}
	// calc ML
	let MlDeslocSum = 0;
	for (let i = 1; i < this.CPx.length; i++) {
		MlDeslocSum += Math.abs(this.CPx[i] - this.CPx[i - 1])
	}

	this.VMap = (ApDeslocSum * this.avgFrq) / this.CPy.length;
	this.VMml = (MlDeslocSum * this.avgFrq) / this.CPx.length;
}

PlatData.prototype.calcAMPL = function() {
	this.ampAP = sm.max(this.CPy) - sm.min(this.CPy);
	this.ampML = sm.max(this.CPx) - sm.min(this.CPx);
}

PlatData.prototype.calcVELTotal = function() {
	let sum = 0;
	// sum(sqrt(diff(CPap).^2+diff(CPml).^2))
	for (let i = 1; i < this.CPx.length; i++) {
		sum += Math.sqrt(
			Math.pow(this.CPy[i] - this.CPy[i - 1], 2) +
			Math.pow(this.CPx[i] - this.CPx[i - 1], 2)
		)
	}
	// sum*freq/length(CPap)
	this.VMT = sum * this.avgFrq / this.CPy.length;
}

PlatData.prototype.calcAREA = function() {
	let medianAP = sm.median(this.CPy);
	let medianML = sm.median(this.CPx);

	let deltaAPmin = Math.abs(medianAP - sm.min(this.CPy));
	let deltaAPmax = Math.abs(sm.max(this.CPy) - medianAP);

	let deltaMLmin = Math.abs(medianML - sm.min(this.CPx));
	let deltaMLmax = Math.abs(sm.max(this.CPx) - medianML);

	let deltaAP = (deltaAPmin + deltaAPmax) / 2;
	let deltaML = (deltaMLmin + deltaMLmax) / 2;

	this.area = Math.PI * deltaAP * deltaML;
}

//////
// HELPERS
/////


function fax(a, fz1, fz2, fz3, fz4, az0, fx12, fx34) {
	var t1 = a * (-fz1 + fz2 + fz3 - fz4);
	var t3 = fz1 + fz2 + fz3 + fz4;
	var t2 = az0 * (fx12 + fx34);
	return (-t1 - t2) / t3;
}

function fay(b, fz1, fz2, fz3, fz4, az0, fy14, fy23) {
	var t1 = b * (fz1 + fz2 - fz3 - fz4);
	var t3 = fz1 + fz2 + fz3 + fz4;
	var t2 = az0 * (fy14 + fy23);
	return (t1 + t2) / t3;
}

// export the class
module.exports = PlatData;