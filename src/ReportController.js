/**
 * ReportController, Controlador do gerador de relatórios
 * @module ReportController
 */

/**
 * @member {external:jQuery} $
 */
global.$ = $;

/**
 * @member {external:browser-serialport} browserserialport
 */
var browserserialport = require('browser-serialport');
var Plataforma = require('./Data.js');

/**
 * Refêrencia estática ao construtor SerialPort
 * @member {external:SerialPort} SerialPort
 */
var SerialPort = browserserialport.SerialPort;

/**
 * Fabrica de relatórios e biblioteca de fórmulas de análise de COP
 * @member {PlatData}  Plataforma
 */
var calc = new Plataforma(18.4, 16.7);

/**
 * Porta usada para acessar interfaces USB
 * @member {SerialPort} port
 */
var port;

/**
 * Buffer de bytes recebidos via serial
 * @member {string} acc
 */
var acc = '';

/**
 * Canvas 2D
 * @member {2dContext}  ctx
 */
var ctx = $('#canvas')[0].getContext('2d');

/**
 * Flag que sinaliza se o controlador esta gravando os dados
 * @member {boolean}  recording
 */
var recording = false;

/**
 * Flag de status da comunicação serial
 * @member {boolean}  isConnected
 */
var isConnected = false;

/**
 * Relatório com dados da medição
 *@member {object}  result
 */
var resultReady;

////////////////////////////////
/// UI
///////////////////////////////

/**
 * Atualiza e valida input do temporizador.
 * @returns {void}
 */
function ACTUpdateTime() {
	if ($('#tempo').val() >= 1 && isConnected === true) {
		$('#play').switchClass('disabled', 'green');
	} else {
		$('#play').switchClass('green', 'disabled');
	}
}

function btConnecting() {
	$('#label').switchClass('yellow green red', 'blue');
	$('#status').switchClass('yellow green red', 'blue');
	$('#labeltxt').text('Conectando');
	$('#statustxt').text('...');
	$('#bt').addClass('disabled');
}

function btDisconnected() {
	$('#play').switchClass('green', 'disabled');
	$('#label').switchClass('blue green red', 'yellow');
	$('#status').switchClass('blue green red', 'yellow');
	$('#labeltxt').text('Conectar');
	$('#statustxt').text('desconectado');
	$('#bt').removeClass('disabled');
}

function btConnected() {
	if (!resultReady) {
		$('#connect').switchClass('active', 'completed');
		$('#stepduracao').switchClass('disabled', 'active');
		$('#tempoSelect').show();
		ACTUpdateTime();
	}
	$('#statustxt').text('Conectado');
	$('#label').switchClass('blue yellow red', 'green');
	$('#status').switchClass('blue yellow red', 'green');
	$('#labeltxt').text('Conectado');
	$('#bt').addClass('disabled');
}

function btERR(err) {
	$('#label').switchClass('blue yellow green', 'red');
	$('#status').switchClass('blue yellow green', 'red');
	$('#labeltxt').text('Reset');
	$('#statustxt').text(err);
	$('#bt').removeClass('disabled');
	isConnected = false;
}

/**
 * Usado por drawGraph.
 * Plota um ponto persitente no gráfico
 * @arg {Number} tgx - Coordenada X do COP
 * @arg {Number} tgy - Coordenada Y do COP
 * @returns {void}
 */
function addPoint(tgx, tgy) {
	tgy *= -1;
	ctx.globalAlpha = 0.25;
	ctx.fillStyle = '#000000';
	ctx.beginPath();
	ctx.arc((tgx + calc.a) * 20, (tgy + calc.b) * 20, 1, 0, Math.PI * 2);
	ctx.fill();
}

/**
 * Fabrica imagem para download
 * @returns {void}
 */
function prepImgDownload() {
	var canvas = document.getElementById('canvas');
	var graphBTN = document.getElementById('grapdownload');
	graphBTN.href = canvas.toDataURL();
	$('#grapdownload').show();
}

/**
 * Plota um gráfico a partir de vetores x e y
 * @arg {Number[]} vetX - Vetor de Coordenadas X do COP
 * @arg {Number[]} vetY - Vetor de Coordenadas Y do COP
 * @returns {void}
 */
function drawGraph(vetX, vetY) {
	ctx.globalAlpha = 1;
	ctx.fillStyle = '#f4f4f4';
	ctx.fillRect(0, 0, 738, 668);
	for (var i = 0; i < vetX.length; i++) {
		addPoint(vetX[i], vetY[i]);
	}
	prepImgDownload();
}

/**
 * Coleta dados emitidos pela plataforma e os adiciona em Data
 * @param {char[]} dados - stream de dados em utf8
 * @returns {void}
 */
function coleta(dados) {
	acc += dados.toString('utf8');
	var linhas = acc.split('#');
	acc = linhas.pop();
	linhas.forEach(function(part) {
		if (recording) {
			calc.pushData(part);
		}
	});
}

/**
 * Connecta com a plataforma
 * @param {string} name - Nome da porta serial em que a Plataforma se encontra
 * @returns {void}
 */
function connect(name) {
	port = new SerialPort(name, {
		baudrate: 57600
	}, false);
	port.open(function(error) {
		if (error) {
			btERR(error);
		} else {
			port.on('data', function(data) {
				if (isConnected === false) {
					isConnected = true;
					btConnected();
				}
				coleta(data);
			});
			port.on('close', function(data) {
				port = null;
				isConnected = false;
				btDisconnected();
			});
			port.on('err', function(data) {
				isConnected = false;
				btERR(data);
			});
		}
	});
}

/**
 * Reseta, e procura pela plataforma
 * @returns {void}
 */
function findPlat() {
	port = null;
	btConnecting();
	var found = false;
	browserserialport.list(function(err, ports) {
		var counter = 0;
		ports.forEach(function(port) {
			counter++;
			if (port.manufacturer.indexOf('Arduino') !== -1 && !found) {
				connect(port.comName);
				found = true;
			}
			if (counter === ports.length && !found) {
				btERR('Porta não encontrada!');
			}
		});
	});
}

$(window).unload(function() {
	port.close();
});

/**
 * Fabrica CSV para download.
 * @param {object} result - Objeto com dados do relatório.
 * @returns {void}
 */
function prepCSV(result) {
	var csvContent =
		'data:text/csv;charset=utf-8,' +
		'DOT;' + result.DOT.toString().replace('.', ',') + '\n' +
		'Desvio Padrao;\n' +
		'AP;' + result.DevAP.toString().replace('.', ',') + '\n' +
		'ML;' + result.DevML.toString().replace('.', ',') + '\n' +
		'RMS;\n' +
		'AP;' + result.rmsAP.toString().replace('.', ',') + '\n' +
		'ML;' + result.rmsML.toString().replace('.', ',') + '\n' +
		'Frequencia;' + result.avgFrq.toString().replace('.', ',') + '\n' +
		'Velocidade media;\n' +
		'AP;' + result.VMap.toString().replace('.', ',') + '\n' +
		'ML;' + result.VMml.toString().replace('.', ',') + '\n' +
		'Velocidade media total;' + result.VMT.toString().replace('.', ',') + '\n' +
		'Amplitude de deslocamento;\n' +
		'AP;' + result.ampAP.toString().replace('.', ',') + '\n' +
		'ML;' + result.ampML.toString().replace('.', ',') + '\n' +
		'Area;' + result.area.toString().replace('.', ',') + '\n';
	var encodedUri = encodeURI(csvContent);
	var csvBTN = document.getElementById('csvdownload');
	csvBTN.href = encodedUri;
	$('#csvdownload').show();
}

/**
 * Gera relatório.
 * @param {object} result - Objeto com dados do relatório.
 * @returns {void}
 */
function genReport(result) {
	prepCSV(result);
	$('#stepexec').switchClass('active', 'completed');
	$('#steprelatorio').switchClass('disabled', 'active');
	$('#tempoSelect').hide();
	$('#execute').hide();
	$('#relatorio').show();
	$('#dot').text(calc.roundTo(result.DOT, 2) + ' cm');
	$('#desAP').text('Ântero-posterior: ' + calc.roundTo(result.DevAP, 2) + ' cm');
	$('#desML').text('Médio-lateral: ' + calc.roundTo(result.DevML, 2) + ' cm');
	$('#rmsAP').text('Ântero-posterior: ' + calc.roundTo(result.rmsAP, 2) + ' cm');
	$('#rmsML').text('Médio-lateral: ' + calc.roundTo(result.rmsML, 2) + ' cm');
	$('#freq').text(calc.roundTo(result.avgFrq, 2) + 'Hz');
	$('#velAP').text('Ântero-posterior: ' + calc.roundTo(result.VMap, 2) + ' cm/s');
	$('#velML').text('Médio-lateral: ' + calc.roundTo(result.VMml, 2) + ' cm/s');
	$('#veltot').text(calc.roundTo(result.VMT, 2) + ' cm/s');
	$('#ampAP').text('Ântero-posterior: ' + calc.roundTo(result.ampAP, 2) + ' cm');
	$('#ampML').text('Médio-lateral: ' + calc.roundTo(result.ampML, 2) + ' cm');
	$('#area').text(calc.roundTo(result.area, 2) + ' cm²');
}

/**
 * Processa dados colhidos pela plataforma
 * @returns {void}
 */
function processData() {
	resultReady = true;
	var result = calc.fullReport();
	drawGraph(result.CPx, result.CPy);
	genReport(result);
}

/**
 * Trata erros fatais.
 * @returns {void}
 */
function fatalError() {
	$('.ui.basic.modal')
		.modal({
			closable: false,
			onApprove: function() {
				window.location.reload(false);
			}
		})
		.modal('show');
}

/**
 * Inicia a leitura e gravação dos dados
 * @arg {Number} temp - tempo de leitura
 * @returns {void}
 */
function startReading(temp) {
	recording = true;
	var timer = null;
	var count = temp;
	var doStep = function() {
		if (count > 0) {
			if (isConnected === false) {
				recording = false;
				fatalError();
			} else {
				clearInterval(timer);
				timer = setTimeout(callback, 1000);
				$('#progress').progress('increment');
			}
		} else {
			$('#status').html('Gerando relatório');
			recording = false;
			processData();
		}
	};
	var callback = function() {
		$('#status').html('Medindo');
		clearInterval(timer);
		timer = null;
		count--;
		doStep();
	};
	doStep();
}

/**
 * Inicia todo o processo.
 * @returns {void}
 */
function ACTPlay() {
	$('#stepduracao').switchClass('active', 'completed');
	$('#stepexec').switchClass('disabled', 'active');
	$('#tempoSelect').hide();
	$('#execute').show();
	$('#progress')
		.progress({
			total: $('#tempo').val()
		});
	startReading($('#tempo').val());
}

$('#bt').click(findPlat);
$('#play').click(ACTPlay);
$('#tempo').on('input', ACTUpdateTime);
);
