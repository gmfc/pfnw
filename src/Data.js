/**
 * @member {external:simple-statistics} sm
 */
var sm = require('simple-statistics');

/**
 * Classe responsável por administrar e receber os dados da plataforma.
 * Faz todos os cálculos com os dados da plataforma e gera relatórios.
 * @constructor
 * @param {number} pa - Medida entre o centro da plataforma e o centro de medição no eixo x.
 * @param {number} pb - Medida entre o centro da plataforma e o centro de medição no eixo y.
 * @class
 */
function PlatData(pa, pb) {
	/**
	 * Medida centro - lateral
	 * @type {number}
	 */
	this.a = pa;

	/**
	 * Medida centro - topo
	 * @type {number}
	 */
	this.b = pb;

	/**
	 * Timestamps das leituras
	 * @type {number[]}
	 */
	this.TI = [];

	/**
	 * Leituras do sensor
	 * Top Right
	 * @type {number[]}
	 */
	this.TR = [];

	/**
	 * Leituras do sensor
	 * Top Left
	 * @type {number[]}
	 */
	this.TL = [];

	/**
	 * Leituras do sensor
	 * Bottom Right
	 * @type {number[]}
	 */
	this.BR = [];

	/**
	 * Leituras do sensor
	 * Bottom Left
	 * @type {number[]}
	 */
	this.BL = [];

	/**
	 * Coordenadas X calculadas de cada COP
	 * @type {number[]}
	 */
	this.CPx = [];

	/**
	 * Coordenadas Y calculadas de cada COP
	 * @type {number[]}
	 */
	this.CPy = [];

	/**
	 * Frequência de medição em tempo real
	 * @type {number}
	 */
	this.tempDeltaTime = 0;

	/**
	 * Dados temporários usados pelo filtro
	 * @type {object}
	 */
	this.filterData = {
		gr: 10,
		lim: 3
	};

}

/**
 * Filtro. Tira a média dos ultimos filterData.gr valores lidos pelo ID.
 * @param {number} num - Integer com o valor lido.
 * @param {string} id - ID da leirura. Usado para separar os conjuntos de dados
 * a serem levados em conta no calculo da média.
 * @returns {number} - Média dos filterData.gr ultimos valoder de ID.
 */
PlatData.prototype.filter = function(num, id) {
	var result;
	num = Math.abs(num);
	if (this.filterData[id]) {
		var i = this.filterData[id].i;
		this.filterData[id].vals[i] = num;
		result = sm.median(this.filterData[id].vals);
		this.filterData[id].i = (this.filterData[id].i + 1) % this.filterData.gr;
	} else {
		this.filterData[id] = {
			i: 0,
			vals: [num]
		};
		result = num;
	}
	return result;
};

/**
 * Filtro. Ignora valores menores do que filterData.lim.
 * @param {number} ti - num com timestamp.
 * @param {number} tr - num com o valor lido.
 * @param {number} tl - num com o valor lido.
 * @param {number} br - num com o valor lido.
 * @param {number} bl - num com o valor lido.
 * @returns {number} - Valor limitado.
 */
PlatData.prototype.limiter = function(ti, tr, tl, br, bl) {
	if (tr < this.filterData.lim || tl < this.filterData.lim || br < this.filterData.lim || bl < this.filterData.lim) {
		return {
			TI: ti,
			TR: this.filterData.lim,
			TL: this.filterData.lim,
			BR: this.filterData.lim,
			BL: this.filterData.lim
		};
	} else {
		return {
			TI: ti,
			TR: tr,
			TL: tl,
			BR: br,
			BL: bl
		};
	}
};

/**
 * Recebe uma string formatada e separa a mesma em parametros.
 * Aplica os filtros.
 * @param {string} data - String formatada: 'TI;TR;TL;BR;BL'
 * @param {boolean} realtime - Flag que sinaliza se a leitura estará sendo
 * feita em tempo real.
 * @returns {object} - objeto com atributos TI;TR;TL;BR;BL.
 */
PlatData.prototype.splitData = function(data, realtime) {
	var arr = data.split(';').map(function(val) {
		return Number(val);
	});
	var result = {};
	if (realtime) {
		result = this.limiter(
			arr[0],
			this.filter(arr[1], 'rTR'),
			this.filter(arr[2], 'rTL'),
			this.filter(arr[3], 'rBR'),
			this.filter(arr[4], 'rBL')
		);
	} else {
		result = this.limiter(
			arr[0],
			this.filter(arr[1], 'TR'),
			this.filter(arr[2], 'TL'),
			this.filter(arr[3], 'BR'),
			this.filter(arr[4], 'BL')
		);
	}
	return result;
};

/**
 * Recebe dados da plataforma como String
 * extrai e trata os dados
 * @arg {string} data - String formatada: 'TI;TR;TL;BR;BL'
 * @returns {void}
 */
PlatData.prototype.pushData = function(data) {
	var result = this.splitData(data);
	this.TI.push(result.TI);
	this.TR.push(result.TR);
	this.TL.push(result.TL);
	this.BR.push(result.BR);
	this.BL.push(result.BL);
};

/**
 * Função usada no calculo do COP
 * Calcula força horizontal em X da placa
 * @param {number} a - Distancia centro lateral da plataforma
 * @param {number} fz1 - Leitura do sensor TR
 * @param {number} fz2 - Leitura do sensor TL
 * @param {number} fz3 - Leitura do sensor BL
 * @param {number} fz4 - Leitura do sensor BR
 * @return {number} Coordenada X do COP
 */
PlatData.prototype.Efax = function(a, fz1, fz2, fz3, fz4) {
	var X = a * (fz1 - fz2 - fz3 + fz4) / (fz1 + fz2 + fz3 + fz4);
	return X;
};

/**
 * Função usada no calculo do COP
 * Calcula força horizontal em Y da placa
 * @param {number} b - Distancia centro topo da plataforma
 * @param {number} fz1 - Leitura do sensor TR
 * @param {number} fz2 - Leitura do sensor TL
 * @param {number} fz3 - Leitura do sensor BL
 * @param {number} fz4 - Leitura do sensor BR
 * @return {number} Coordenada Y do COP
 */
PlatData.prototype.Efay = function(b, fz1, fz2, fz3, fz4) {
	var Y = b * (fz1 + fz2 - fz3 - fz4) / (fz1 + fz2 + fz3 + fz4);
	return Y;
};

/**
 * Percorre dados coletados dos 4 sensores (TR, TL, BR, BL) e calcula
 * as coordenadas de seus respectivos centros de pressão (COP)
 * @return {void}
 */
PlatData.prototype.calcCOP = function() {
	for (var i = 0; i < this.BR.length; i++) {
		this.CPx[i] = this.Efax(this.a, this.TR[i], this.TL[i], this.BL[i], this.BR[i]);
		this.CPy[i] = this.Efay(this.b, this.TR[i], this.TL[i], this.BL[i], this.BR[i]);
	}
};

/**
 * Calcula o COP para dada String recebida
 * Usado para calcular o COP em tempo real
 * @param {string} data - String formatada: 'TI;TR;TL;BR;BL'
 * @return {object} result - objeto com atributos x,y para coordenadas
 * e t para timestamp
 */
PlatData.prototype.RTCOP = function(data) {
	var phrased = this.splitData(data, true);
	var
		TI = phrased.TI,
		TR = phrased.TR,
		TL = phrased.TL,
		BR = phrased.BR,
		BL = phrased.BL;
	var result = {};
	result.t = TI - this.tempDeltaTime;
	this.tempDeltaTime = TI;
	result.x = this.Efax(this.a, TR, TL, BL, BR);
	result.y = this.Efay(this.b, TR, TL, BL, BR);
	return result;
};

/**
 * Calcula o deslocamento da oscilação total
 * DEPENDE DE calcCOP
 * @return {void}
 */
PlatData.prototype.calcDOT = function() {
	this.DOT = 0;
	for (var i = 1; i < this.CPx.length; i++) {
		this.DOT += Math.sqrt(
			Math.pow(this.CPy[i] - this.CPy[i - 1], 2) +
			Math.pow(this.CPx[i] - this.CPx[i - 1], 2)
		);
	}
};

/**
 * Calcula desvio padrão
 * DEPENDE DE calcCOP
 * @return {void}
 */
PlatData.prototype.calcDEV = function() {
	this.DevAP = sm.standardDeviation(this.CPy);
	this.DevML = sm.standardDeviation(this.CPx);
};

/**
 * Calcula a raiz do valor quadrático médio
 * DEPENDE DE calcCOP
 * @return {void}
 */
PlatData.prototype.calcRMS = function() {
	this.rmsAP = sm.rootMeanSquare(this.CPy);
	this.rmsML = sm.rootMeanSquare(this.CPx);
};

/**
 * Calcula a frequência da medição
 * PRECISA DOS DADOS EM TI[]
 * @return {void}
 */
PlatData.prototype.calcFREQ = function() {
	var deltas = [];
	for (var i = 1; i < this.TI.length; i++) {
		deltas.push(this.TI[i] - this.TI[i - 1]);
	}
	this.avgFrq = 1000 / sm.mean(deltas);
};

/**
 * Calcula a velocidade média de deslocação em AP e ML
 * chama calcFREQ previamente
 * @return {void}
 */
PlatData.prototype.calcVEL = function() {
	this.calcFREQ();
	var ApDeslocSum = 0;
	for (var i = 1; i < this.CPy.length; i++) {
		ApDeslocSum += Math.abs(this.CPy[i] - this.CPy[i - 1]);
	}
	var MlDeslocSum = 0;
	for (var i = 1; i < this.CPx.length; i++) {
		MlDeslocSum += Math.abs(this.CPx[i] - this.CPx[i - 1]);
	}
	this.VMap = (ApDeslocSum * this.avgFrq) / this.CPy.length;
	this.VMml = (MlDeslocSum * this.avgFrq) / this.CPx.length;
};

/**
 * Calcula a amplitude de deslocamento em AP e ML
 * DEPENDE DE calcCOP
 * @return {void}
 */
PlatData.prototype.calcAMPL = function() {
	this.ampAP = sm.max(this.CPy) - sm.min(this.CPy);
	this.ampML = sm.max(this.CPx) - sm.min(this.CPx);
};

/**
 * Calcula a velocidade de deslocamento
 * média total do COP
 * chama calcFREQ previamente
 * @return {void}
 */
PlatData.prototype.calcVELTotal = function() {
	this.calcFREQ();
	var sum = 0;
	for (var i = 1; i < this.CPx.length; i++) {
		sum += Math.sqrt(
			Math.pow(this.CPy[i] - this.CPy[i - 1], 2) +
			Math.pow(this.CPx[i] - this.CPx[i - 1], 2)
		);
	}
	this.VMT = sum * this.avgFrq / this.CPy.length;
};

/**
 * Calcula a área preenchida pelo deslocamento do COP
 * Utiliza uma oval tracada com base nas medianas das amplitudes em x e y do COP
 * Função desenhada para lidar com medições de baixa frequência.
 * @return {void}
 */
PlatData.prototype.calcAREA = function() {
	var medianAP = sm.median(this.CPy);
	var medianML = sm.median(this.CPx);
	var deltaAPmin = Math.abs(medianAP - sm.min(this.CPy));
	var deltaAPmax = Math.abs(sm.max(this.CPy) - medianAP);
	var deltaMLmin = Math.abs(medianML - sm.min(this.CPx));
	var deltaMLmax = Math.abs(sm.max(this.CPx) - medianML);
	var deltaAP = (deltaAPmin + deltaAPmax) / 2;
	var deltaML = (deltaMLmin + deltaMLmax) / 2;
	this.area = Math.PI * deltaAP * deltaML;
};

/**
 * Calcula a area preenchida pelo deslocamento do COP
 * Utiliza uma oval tracada com base nas amplitudes de x e y do COP
 * @todo Pode ser alterado para tracar um poligono com as coordenadas perifiricas
 * @deprecated desde v0.4.0
 * @return {void}
 */
PlatData.prototype.calcAreaSimple = function() {
	var rAP = (sm.max(this.CPy) - sm.min(this.CPy)) / 2;
	var rML = (sm.max(this.CPx) - sm.min(this.CPx)) / 2;
	this.area = Math.PI * rAP * rML;
};


/**
 * Calcula e gera relatório completo com base nas medições
 * coletadas previamente.
 * @return {Object} - todo o objeto Data (this).
 */
PlatData.prototype.fullReport = function() {
	this.calcCOP();
	this.calcDOT();
	this.calcDEV();
	this.calcRMS();
	this.calcFREQ();
	this.calcVEL();
	this.calcAMPL();
	this.calcVELTotal();
	this.calcAREA();
	return this;
};


/**
 * Função usada no cálculo do COP
 * Calcula força horizontal em X da placa
 * @deprecated desde v0.1.2
 * @return {number} fax - coordenada X do COP
 */
PlatData.prototype.fax = function(a, fz1, fz2, fz3, fz4, az0, fx12, fx34) {
	var t1 = a * (-fz1 + fz2 + fz3 - fz4);
	var t3 = fz1 + fz2 + fz3 + fz4;
	var t2 = az0 * (fx12 + fx34);
	return (-t1 - t2) / t3;
};

/**
 * Função usada no cálculo do COP
 * Calcula força horizontal em Y da placa
 * @deprecated desde v0.1.2
 * @return {number} fay - coordenada Y do COP
 */
PlatData.prototype.fay = function(b, fz1, fz2, fz3, fz4, az0, fy14, fy23) {
	var t1 = b * (fz1 + fz2 - fz3 - fz4);
	var t3 = fz1 + fz2 + fz3 + fz4;
	var t2 = az0 * (fy14 + fy23);
	return (t1 + t2) / t3;
};

/**
 * Arrendodador
 * Recebe um número e uma precisão. Arredonda de acordo com a precisão especificada.
 * @param {number} value - Valor a ser aredondado
 * @param {number} precision - Precisão a ser levada em conta.
 */
PlatData.prototype.roundTo = function(value, precision) {
	var multiplier = Math.pow(10, precision || 0);
	return Math.round(value * multiplier) / multiplier;
};

module.exports = PlatData;
