/**
 * DebugController, Controlador da tela de debug
 * @module DebugController
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
var calc = new Plataforma(184.5, 167);

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
 * Flag de status da comunicação serial
 * @member {boolean}  isConnected
 */
var isConnected = false;



////////////////////////////////
/// UI
///////////////////////////////

function btConnecting() {
	$('#label').switchClass('yellow green red', 'blue');
	$('#status').switchClass('yellow green red', 'blue');
	$('#labeltxt').text('Conectando');
	$('#statustxt').text('...');
	$('#bt').addClass('disabled');
}

function btDisconnected() {
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
	$('#label').switchClass('blue yellow green', 'red');
	$('#status').switchClass('blue yellow green', 'red');
	$('#labeltxt').text('Reset');
	$('#statustxt').text(err);
	$('#bt').removeClass('disabled');
	isConnected = false;
}

/**
 * Atualiza dados na tela de debug
 * @arg {Number} tgx - Coordenada X do COP
 * @arg {Number} tgy - Coordenada Y do COP
 * @arg {string} part - String formatada com dados de leitura
 * @returns {void}
 */
function update(tgx, tgy, part) {
	var split = part.split(';');
	$('#tr').text(split[1]);
	$('#tl').text(split[2]);
	$('#br').text(split[3]);
	$('#bl').text(split[4]);
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
		$('#raw').text(part);
		var result = calc.RTCOP(part);
		btConnected(Math.floor(1 / (result.t / 1000)) + ' Hz');
		update(result.x, result.y, part);
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
	port = null;
	btConnecting();
	var found = false;
	browserserialport.list(function(err, ports) {
		var counter = 0;
		$('#ports').empty();
		ports.forEach(function(port) {
			counter++;
			$('#ports').append('<div class="ui divider"></div>');
			$('#ports').append('<p>comName: ' + port.comName + ' </p>');
			$('#ports').append('<p>manufacturer: ' + port.manufacturer + ' </p>');
			$('#ports').append('<p>serialNumber: ' + port.serialNumber + ' </p>');
			$('#ports').append('<p>pnpId: ' + port.pnpId + ' </p>');
			$('#ports').append('<p>locationId: ' + port.locationId + ' </p>');
			$('#ports').append('<p>vendorId: ' + port.vendorId + ' </p>');
			$('#ports').append('<p>productId: ' + port.productId + ' </p>');


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

$('#bt').click(findPlat);
$(window).unload(function() {
	port.close();
});
