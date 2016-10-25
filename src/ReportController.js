/**
 * @module RealTimeController
 * @see
 * ![alt text](./UML/RealTimeController.svg "Funcionamento")
 *
 */

/** JQuery */
global.$ = $;
/** @external  browser-serialport */
var browserserialport = require('browser-serialport');
var SerialPort = browserserialport.SerialPort;
var Plataforma = require('./Data.js');

/**  @member {SerialPort}  Plataforma*/
var calc = new Plataforma(369, 334);

/**  @member {calc}  port*/
var port;

/**  @member {string}  port*/
var acc = '';

/**  @member {2dContext}  ctx*/
var ctx = $('#canvas')[0].getContext('2d');

/**  @member {boolean}  recording, se o controlador esta gravando os dados*/
var recording = false;

/**  @member {boolean}  isConnected*/
var isConnected = false;

/**  @member {boolean}  result*/
var result;


////////////////////////////////
/// UI
///////////////////////////////

function btConnecting() {
	console.log('Conectando...');
	$('#label').switchClass('yellow green red', 'blue');
	$('#status').switchClass('yellow green red', 'blue');
	$('#labeltxt').text('Conectando');
	$('#statustxt').text('...');
	$('#bt').addClass('disabled');
}

function btDisconnected() {
	console.log('desconectado!');
	$('#label').switchClass('blue green red', 'yellow');
	$('#status').switchClass('blue green red', 'yellow');
	$('#labeltxt').text('Conectar');
	$('#statustxt').text('desconectado');
	$('#bt').removeClass('disabled');
	isConnected = false;
}

function btConnected() {
	if (isConnected === false) {
		$('#connect').switchClass('active', 'completed');
		$('#connect').switchClass('disabled', 'active');
		$('#tempoSelect').show();
		$('#statustxt').text("Conectado");
		$('#label').switchClass('blue yellow red', 'green');
		$('#status').switchClass('blue yellow red', 'green');
		$('#labeltxt').text('Conectado');
		$('#bt').addClass('disabled');
		isConnected = true;
	}
}

function btERR(err) {
	console.log('ERRO! ' + err);
	$('#label').switchClass('blue yellow green', 'red');
	$('#status').switchClass('blue yellow green', 'red');
	$('#labeltxt').text('Reset');
	$('#statustxt').text(err);
	$('#bt').removeClass('disabled');
	isConnected = false;
}


function addPoint(tgx, tgy) {
	ctx.globalAlpha = 1;
	ctx.fillStyle = '#000000';
	ctx.beginPath();
	ctx.arc(tgx + 369, tgy + 334, 4, 0, Math.PI * 2);
	ctx.fill();
}

function drawGraph(vetX, vetY) {
	for (var i = 0; i < vetX.length; i++) {
		addPoint(vetX[i], vetY[i]);
	}
}

/**
 * Coleta dados emitidos pela plataforma
 * @param {char[]} dados - stream de dados em utf8
 */
function coleta(dados) {
	btConnected();
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
 * @param {string} name - come da porta serial em que a Plataforma se encontra
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
				coleta(data);
			});
			port.on('close', function(data) {
				port = null;
				btDisconnected();
			});
			port.on('err', function(data) {
				btERR(data);
			});
		}
	});
}

/**
 * Reseta, e procura pela plataforma
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

function ACTUpdateTime() {
	if ($('#tempo').val() >= 1) {
		$('#play').switchClass('disabled', 'green');
	} else {
		$('#play').switchClass('green', 'disabled');
	}
}

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

function genReport() {
	$('#stepduracao').addClass('completed').removeClass('active');
	$('#stepexec').addClass('completed').removeClass('active');
	$('#steprelatorio').addClass('active').removeClass('disabled');
	$('#tempoSelect').hide();
	$('#execute').hide();
	$('#relatorio').show();
	$('#dump').text(result);

}

function processData() {
	result = calc.fullReport(); //JSON.stringify(, null, 2);
	drawGraph(result.CPx, result.CPy);
	genReport();
}

function reset() {
	$('#progress').progress('reset');
	$('#stepduracao').addClass('active').removeClass('completed');
	$('#stepexec').addClass('disabled').removeClass('completed').removeClass('active');
	$('#steprelatorio').addClass('disabled').removeClass('completed').removeClass('active');
	$('#tempoSelect').show();
	$('#execute').hide();
	$('#relatorio').hide();
	$('#graph1').html('');
	$('#graph2').html('');
}

function startReading(temp) {
	recording = true;
	var timer = null;
	var count = temp;
	var doStep = function() {
		if (count > 0) {
			clearInterval(timer);
			timer = setTimeout(callback, 1000);
			$('#progress').progress('increment');
		} else {
			console.log('ACABOU! ' + count);
			$('#status').html('Gerando relatório');
			recording = false;
			processData();
			genReport();
		}
	};
	var callback = function() {
		$('#status').html('Medindo');
		console.log(count + ' of ' + temp);
		clearInterval(timer);
		timer = null;
		count--;
		doStep();
	};
	doStep();
}

$('#bt').click(findPlat);
$('#play').click(ACTPlay);
$('#tempo').on('input', ACTUpdateTime);
