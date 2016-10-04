/**
 * @module SerialHandler
 * @deprecated desde v0.1.2
 */

// biblioteca de acesso serial
var serialLib = require("browser-serialport");
var SerialPort = serialLib.SerialPort;
var port;
var acc = '';

function reset() {
	// Lista as portas conectadas
	var find = false;
	serialLib.list(function(err, ports) {
		ports.forEach(function(port) {
			if (port.manufacturer.indexOf("Arduino") !== -1) {
				if (!find) {
					document.getElementById("status").innerHTML = port.comName;
					connect(port.comName);
				}
				find = true;
			}
		});
	});
}

function connect(name) {
	port = new SerialPort(name, {
		baudrate: 9600
	}, true, function() {
		console.log("Conectado");
		console.log(port);
		register();
	});
}



function coleta(dados) {
	acc += dados.toString('utf8');
	var linhas = acc.split('#');
	acc = linhas.pop();
	linhas.forEach(function(part) {
		processa(data);
	});

}

function processa(dados) {
	Console.log(dados);
}


function register() {
	console.log("registrando");
	port.on("data", function(data) {
		coleta(data);
	});
	port.on("close", function(data) {
		port = null;
	});
	port.on("err", function(data) {
		console.log("erro " + data);
	});
}
