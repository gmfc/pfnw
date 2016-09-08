var serialLib = require("browser-serialport");
var SerialPort = serialLib.SerialPort;

/*
 * Praser delimitador de linhas
 */
function readline(delimiter, encoding) {
  if (typeof delimiter === 'undefined' || delimiter === null) {
    delimiter = '\r'
  }
  if (typeof encoding === 'undefined' || encoding === null) {
    encoding = 'utf8'
  }
  // Delimiter buffer saved in closure
  var data = '';
  return function(emitter, buffer) {
    // Collect data
    data += buffer.toString(encoding);
    // Split collected data by delimiter
    var parts = data.split(delimiter);
    data = parts.pop();
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