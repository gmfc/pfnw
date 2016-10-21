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
}

function btConnected(freq) {
	$('#statustxt').text(freq);
	$('#label').switchClass('blue yellow red', 'green');
	$('#status').switchClass('blue yellow red', 'green');

	$('#labeltxt').text('Conectado');

	$('#bt').addClass('disabled');
}

function btERR(err) {
	console.log('ERRO! ' + err);
	$('#label').switchClass('blue yellow green', 'red');
	$('#status').switchClass('blue yellow green', 'red');

	$('#labeltxt').text('Reset');
	$('#statustxt').text(err);
	//$('#bt').unbind(findPlat);

	$('#bt').removeClass('disabled');

}


function addPoint(tgx, tgy) {
	ctx.globalAlpha = 1;
	ctx.fillStyle = '#000000';
	ctx.beginPath();
	ctx.arc(tgx + 369, tgy + 334, 4, 0, Math.PI * 2);
	ctx.fill();
}

/**
 * Coleta dados emitidos pela plataforma
 * @param {char[]} dados - stream de dados em utf8
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
				//console.log('data received: ' + data);
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
	console.log('batata1 findPlat()');
	port = null;
	btConnecting();
	var found = false;
	browserserialport.list(function(err, ports) {
		var counter = 0;
		console.log('batata list');
		ports.forEach(function(port) {
			counter++;
			console.log('batata c++ forEach');
			if (port.manufacturer.indexOf('Arduino') !== -1 && !found) {
				console.log('batata achou e con' + port.comName);
				connect(port.comName);
				console.log(port.comName);
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

function playbtn() {
	if ($('#tempo').val() >= 1) {
		$('#play').addClass('green').removeClass('disabled');
	} else {
		$('#play').removeClass('green').addClass('disabled');
	}
}

function medir() {
	$('#stepduracao').addClass('completed').removeClass('active');
	$('#stepexec').addClass('active').removeClass('disabled');
	$('#tempoSelect').hide();
	$('#execute').show();
	$('#progress')
		.progress({
			total: $('#tempo').val()
		});
	startReading($('#tempo').val());
}

function genReport(temp) {
	$('#stepduracao').addClass('completed').removeClass('active');
	$('#stepexec').addClass('completed').removeClass('active');
	$('#steprelatorio').addClass('active').removeClass('disabled');
	$('#tempoSelect').hide();
	$('#execute').hide();
	$('#relatorio').show();

	estatograph(temp);
	estabilograph(temp);

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
	var doStep = function() {
		if (count >= -2) {
			clearInterval(timer);
			timer = setTimeout(callback, 1000);
		} else {
			console.log('ACABOU!');
			genReport(temp);
		}
	};
	console.log(temp);
	var timer = null;
	var count = temp;
	//count = count + 2;
	var callback = function() {
		if (count <= 0) {
			$('#status').html('Gerando relatório');
		} else {
			$('#status').html('Medindo');
		}
		console.log(count + ' of ' + temp);
		$('#progress').progress('increment');
		clearInterval(timer);
		timer = null;
		count--;
		doStep();
	};
	doStep();
}

$('#bt').click(findPlat);
$('#bt').click(play);
$('#tempo').on('input', playbtn);
