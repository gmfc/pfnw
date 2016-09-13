// biblioteca de acesso serial
var serialLib = require("browser-serialport");
var SerialPort = serialLib.SerialPort;

/*
 * Praser delimitador de linhas
 * Serve de buffer para dados do Arduino
 */
function readline(delimiter, encoding) {
  // checa delimitador usado, padrao '\n'
  if (typeof delimiter === 'undefined' || delimiter === null) {
    delimiter = '\n'
  }
  // checa codificacao usada, padrao utf8
  if (typeof encoding === 'undefined' || encoding === null) {
    encoding = 'utf8'
  }
  // Buffer delimitador salvo em escopo externo
  var data = '';
  return function(emitter, buffer) {
    // Coleta dados
    data += buffer.toString(encoding);
    // Split com delimitador le linha (delimiter)
    var parts = data.split(delimiter);
    // Recupera linha coletada
    data = parts.pop();
    // Emite evento para cada linha coletada
    parts.forEach(function(part) {
      emitter.emit('data', part);
    });
  };
}

/*
 * Lista as portas conectadas
 */
serialLib.list(function(err, ports) {
  ports.forEach(function(port) {
    console.log(port.comName);
    console.log(port.pnpId);
    console.log(port.manufacturer);
  });
});

/*
 * Porta conectada com a placa
 * TODO: Enderecamento dinamico
 */
var port = new SerialPort("COM6", {
  baudrate: 9600,
  praser: readline('\n')
}, true);

/*
 * Exemplo de listener de eventos
 */
port.on("data", function(data) {
  document.getElementById("data").innerHTML = data;
});