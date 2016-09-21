// biblioteca de acesso serial
var serialLib = require("browser-serialport");
var data = require("./Data.js");
var SerialPort = serialLib.SerialPort;
var port;
var calc = new data(20,20,0);
var acc = '';



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
        });
    });
}

function connect(name) {
    port = new SerialPort(name, {
        baudrate: 9600
    }, true, function () {
        console.log("Conectado");
        console.log(port);
        register();
    });
}



function coleta(dados) {

    acc += dados.toString('utf8');

    var linhas = acc.split('#');

    acc = linhas.pop();
    
    linhas.forEach(function (part) {
        //document.getElementById("data").innerHTML = part + "<br>";
        // browserify ./js/SerialHandler.js -o bundle.js
        document.getElementById("data").innerHTML = "X: " + calc.RTCOP(part).x + " <br>" + "Y: " + calc.RTCOP(part).y;
    });

}


function register() {
    console.log("registrando")
    port.on("data", function (data) {
        coleta(data);
    });
    port.on("close", function (data) {
        document.getElementById("status").innerHTML = "Desconectada";
        port = null;
    });
    port.on("err", function (data) {
        document.getElementById("status").innerHTML = "ERR";
    });
}

var button = document.getElementById('bt');
button.addEventListener('click', reset);

