/**
 * RealTimeController, Controlador da tela de visualisação em tempo real
 * @module RealTimeController
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
 * Referência estática ao construtor SerialPort
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
 * Flag de status da comunicação serial
 * @member {boolean}  isConnected
 */
var isConnected = false;



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

function btConnected(freq) {
	if (isConnected === false) {
		$('#label').switchClass('blue yellow red', 'green');
		$('#status').switchClass('blue yellow red', 'green');
		$('#labeltxt').text('Conectado');
		$('#bt').addClass('disabled');
		isConnected = true;
	}
	$('#statustxt').text(freq);
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

/**
 * Plota um ponto na tela representando uma leitura do COP
 * @arg {Number} tgx - Coordenada X do COP
 * @arg {Number} tgy - Coordenada Y do COP
 * @returns {void}
 */
function update(tgx, tgy) {
	// fade effect
	tgy *= -1;
	ctx.globalAlpha = 0.02;
	ctx.fillStyle = '#f4f4f4';
	ctx.fillRect(0, 0, 738, 668);
	ctx.globalAlpha = 1;
	ctx.fillStyle = '#000000';
	ctx.beginPath();
	ctx.arc((tgx + calc.a) * 20, (tgy + calc.b) * 20, 2, 0, Math.PI * 2);
	ctx.fill();
}

/**
 * Coleta dados emitidos pela plataforma
 * @param {char[]} dados - stream de dados em utf8
 * @returns {void}
 */
function coleta(dados) {
	acc += dados.toString('utf8');
	var linhas = acc.split('#');
	acc = linhas.pop();
	linhas.forEach(function(part) {
		var result = calc.RTCOP(part);
		btConnected(Math.floor(1 / (result.t / 1000)) + ' Hz');
		update(result.x, result.y);
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
 * @returns {void}
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

$('#bt').click(findPlat);
$(window).unload(function() {
	port.close();
});
