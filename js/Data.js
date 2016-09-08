'use strict'
/*
 *  Classe responsavel por administrar e receber os dados da plataforma
 *
 */
function PlatData() {

	this.az0 = 0;
	this.a = 24.76; //Medida centro -> lteral
	this.b = 15.24; //Medida centro -> topo

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

	//this.DOT = 0;

}


// push leitura. Recebe String com leitura dos dados no ciclo
// e adiciona no final de cada array;
PlatData.prototype.pushData = function(data) {

	var arr = data.split(";").map(function(val) {
		return Number(val);
	});
	this.TR.push(arr[0]);
	this.TL.push(arr[1]);
	this.BR.push(arr[2]);
	this.BL.push(arr[3]);
};

PlatData.prototype.getTR = function() {
	return this.TR;
};


PlatData.prototype.getTL = function() {
	return this.TL;
};


PlatData.prototype.getBR = function() {
	return this.BR;
};


PlatData.prototype.getBL = function() {
	return this.BL;
};

PlatData.prototype.calcFx = function() {
	for (var i = 0; i < this.BR.length; i++) {
		this.FxTRL[i] = this.TR[i] + this.TL[i];
		this.FxBLR[i] = this.BL[i] + this.BR[i];
		this.FxTBR[i] = this.TR[i] + this.BR[i];
		this.FxTBL[i] = this.TL[i] + this.BL[i];
	}
};

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
	this.DevAP = standardDeviation(this.CPy);
	this.DevML = standardDeviation(this.CPx);
}

PlatData.prototype.calcRMS = function() {
	
	// calc AP(y)
	let sumAP = 0;
	for(let i=0;i<this.CPy.length;i++){
		sumAP = this.CPy[i]*this.CPy[i];
	}
	
	// calc ML(x)
	let sumML = 0;
	for(let i=0;i<this.CPx.length;i++){
		sumML = this.CPx[i]*this.CPx[i];
	}

	this.rmsAP = Math.sqrt(sumAP/this.CPy.length);
	this.rmsML = Math.sqrt(sumML/this.CPx.length);
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


function standardDeviation(values) {
	var avg = average(values);

	var squareDiffs = values.map(function(value) {
		var diff = value - avg;
		var sqrDiff = diff * diff;
		return sqrDiff;
	});

	var avgSquareDiff = average(squareDiffs);

	var stdDev = Math.sqrt(avgSquareDiff);
	return stdDev;
}

function average(data) {
	var sum = data.reduce(function(sum, value) {
		return sum + value;
	}, 0);

	var avg = sum / data.length;
	return avg;
}



// export the class
module.exports = PlatData;