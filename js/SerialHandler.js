// biblioteca de acesso serial
var serialLib = require("browser-serialport");
var SerialPort = serialLib.SerialPort;
var port;

// Praser delimitador de linhas
// Serve de buffer para dados do Arduino
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
    return function (emitter, buffer) {
        // Coleta dados
        data += buffer.toString(encoding);
        // Split com delimitador le linha (delimiter)
        var parts = data.split(delimiter);
        // Recupera linha coletada
        data = parts.pop();
        // Emite evento para cada linha coletada
        parts.forEach(function (part) {
            emitter.emit("data", part);
        });
    };
}





function reset() {
    document.getElementById("data").innerHTML = "";
    // Lista as portas conectadas
    var find = false;
    serialLib.list(function (err, ports) {

        ports.forEach(function (port) {
            if (port.manufacturer.indexOf("Arduino") !== -1) {
                if (!find) {
                    document.getElementById("status").innerHTML = port.comName;
                    connect(port.comName);
                }
                find = true;
            }
            //            console.log(port.comName);
            //            console.log(port.pnpId);
            //            console.log(port.manufacturer);
        });
    });
}

function connect(name) {
    port = new SerialPort(name, {
        baudrate: 9600,
        praser: readline("\n")
    }, true, function () {
        console.log("Conectado");
        console.log(port);
        register();
    });
}

function register() {
    console.log("registrando")
    port.on("data", function (data) {
        document.getElementById("data").innerHTML += data + "<br>";
    });
    port.on("close", function (data) {
        document.getElementById("status").innerHTML = "Desconectada";
        port = null;
    });
    port.on("err", function (data) {
        document.getElementById("status").innerHTML = "ERR";
    });
}
