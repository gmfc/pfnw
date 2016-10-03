global.$ = $;
// biblioteca de acesso serial
var serialLib = require("browser-serialport");
var data = require("./Data.js");
var SerialPort = serialLib.SerialPort;
var port;
var calc = new data(325, 250, 0);
var acc = '';
var connectFlag = false;
var dataActive = 0;

function reset() {
    // Lista as portas conectadas
    dataActive = Date.now();
    connectFlag = false;
    dataActive = false;
    port = null;
    update();
    var find = false;
    serialLib.list(function (err, ports) {
        ports.forEach(function (port) {
            if (port.manufacturer.indexOf("Arduino") !== -1) {
                if (!find) {
                    //document.getElementById("status").innerHTML = port.comName;
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
        register();
        connectFlag = true;
        btConect();
    });
}


function update(tgx, tgy) {
    // fade effect
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, 650, 500);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(tgx, tgy, 2, 0, Math.PI * 2);
    ctx.fill();
}

function coleta(dados) {
    dataActive = Date.now();
    acc += dados.toString('utf8');
    var linhas = acc.split('#');
    acc = linhas.pop();
    linhas.forEach(function (part) {
        var result = calc.RTCOP(part);
        $("#statustxt").text(Math.floor(1/(result.t/1000)) + " Hz");
        update(result.x + 325, result.y + 250);
    });
}


function register() {
    port.on("data", function (data) {
        coleta(data);
    });
    port.on("close", function (data) {
        btDisconnect(data);
        port = null;
    });
    port.on("err", function (data) {
        btERR(data);
    });
}
var canvas = document.getElementById("canvas"),
    ctx = canvas.getContext("2d");


///////////////////////////////////

function btConect() {
    console.log("conectado!");

    $("#label").removeClass("yellow");
    $("#status").removeClass("yellow");

    $("#label").removeClass("red");
    $("#status").removeClass("red");


    $("#label").addClass("green");
    $("#status").addClass("green");
    $("#labeltxt").text("Conectado");
}

function btDisconnect(data) {
    console.log("desconectado!" + data);

    $("#label").removeClass("green");
    $("#status").removeClass("green");

    $("#label").removeClass("red");
    $("#status").removeClass("red");

    $("#label").addClass("yellow");
    $("#status").addClass("yellow");
    $("#labeltxt").text("Conectar");
    $("#statustxt").text("off");
    //port = null;
}

function btERR(data) {
    console.log("ERR!" + data);

    $("#label").removeClass("green");
    $("#status").removeClass("green");

    $("#label").removeClass("yellow");
    $("#status").removeClass("yellow");

    $("#label").addClass("red");
    $("#status").addClass("red");
    $("#labeltxt").text("Reset");
    $("#statustxt").text(data);
}
var errFlag = false;

function statusCheck() {
    if (connectFlag && (Date.now() - dataActive) > 5000) {
        btERR("Reconectar Plataforma");
        errFlag = true;
    } else if (errFlag && connectFlag) {
        errFlag = false;
        btConect();
    }
    setTimeout(statusCheck, 200);
}
statusCheck();
$("#bt").click(reset);
$(window).bind('beforeunload', function () {
    if (port) {
        port.close();
    }
});
btDisconnect();


//////////////////////////

var serialPort = require("browser-serialport");
var Port = serialPort.SerialPort;
serialPort.list(function(err, ports) {
    ports.forEach(function(port) {
        console.log(port.comName);
        console.log(port.pnpId);
        console.log(port.manufacturer);
    });
});
var sport = new Port("COM3", {
    baudrate: 9600
}, false);


sport.open(function(error) {
    if (error) {
        console.log('failed to open: ' + error);
    } else {
        console.log('open');
        sport.on('data', function(data) {
            console.log('data received: ' + data);
        });
    }
});
