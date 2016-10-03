global.$ = $;
var browserserialport = require("browser-serialport");
var SerialPort = browserserialport.SerialPort;
var Plataforma = require("./Data.js");

var calc = new Plataforma(369, 334);
var port;
var acc = "";

var ctx = $("#canvas")[0].getContext("2d");

function findPlat() {
  port = null;
    btConnecting();
    var found = false;
    browserserialport.list(function(err, ports) {
        var counter = 0;
        ports.forEach(function(port) {
            counter++;
            if (port.manufacturer.indexOf("Arduino") !== -1 && !found) {
                connect(port.comName);
                console.log(port.comName);
                found = true;
            }
            if (counter === ports.length && !found) {
                btERR("Porta não encontrada");
            }
        });
    });
}

function connect(name) {
    btConnected();
    port = new SerialPort(name, {
        baudrate: 9600
    }, false);
    port.open(function(error) {
        if (error) {
            btERR(error);
        } else {
            port.on('data', function(data) {
                coleta(data);
                console.log('data received: ' + data);
            });
            port.on("close", function(data) {
              port = null;
                btDisconnect();
            });
            port.on("err", function(data) {
                btERR(data);
            });
        }
    });
}

function coleta(dados) {
    acc += dados.toString('utf8');
    var linhas = acc.split('#');
    acc = linhas.pop();
    linhas.forEach(function(part) {
        var result = calc.RTCOP(part);
        $("#statustxt").text(Math.floor(1 / (result.t / 1000)) + " Hz");
        update(result.x + 369, result.y + 334);
    });
}

function update(tgx, tgy) {
    // fade effect
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, 738, 668);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(tgx, tgy, 2, 0, Math.PI * 2);
    ctx.fill();
}

findPlat();


////////////////////////////////
/// UI
///////////////////////////////

function btConnecting() {
    console.log("Conectando!");

    $("#label").addClass("blue");
    $("#status").addClass("blue");

    $("#label").removeClass("yellow");
    $("#status").removeClass("yellow");
    $("#label").removeClass("green");
    $("#status").removeClass("green");
    $("#label").removeClass("red");
    $("#status").removeClass("red");

    $("#labeltxt").text("Conectando");
    $("#statustxt").text("...");
    $("#bt").unbind(findPlat);
}

function btDisconnected() {
    console.log("desconectado!");

    $("#label").addClass("yellow");
    $("#status").addClass("yellow");

    $("#label").removeClass("blue");
    $("#status").removeClass("blue");
    $("#label").removeClass("green");
    $("#status").removeClass("green");
    $("#label").removeClass("red");
    $("#status").removeClass("red");

    $("#labeltxt").text("Conectar");
    $("#statustxt").text("desconectado");
    $("#bt").unbind(findPlat);
    $("#bt").click(findPlat);
}

function btConnected() {
    console.log("Conectado!");

    $("#label").addClass("green");
    $("#status").addClass("green");

    $("#label").removeClass("blue");
    $("#status").removeClass("blue");
    $("#label").removeClass("yellow");
    $("#status").removeClass("yellow");
    $("#label").removeClass("red");
    $("#status").removeClass("red");

    $("#labeltxt").text("Conectado");
    $("#statustxt").text("Hz");
    $("#bt").unbind(findPlat);
}

function btERR(err) {
    console.log("Conectado!");

    $("#label").addClass("red");
    $("#status").addClass("red");

    $("#label").removeClass("blue");
    $("#status").removeClass("blue");
    $("#label").removeClass("yellow");
    $("#status").removeClass("yellow");
    $("#label").removeClass("green");
    $("#status").removeClass("green");

    $("#labeltxt").text("Reset");
    $("#statustxt").text(err);
    $("#bt").unbind(findPlat);
    $("#bt").click(findPlat);
}
