global.$ = $;
// biblioteca de acesso serial
var serialLib = require("browser-serialport");
var data = require("./Data.js");
var SerialPort = serialLib.SerialPort;
var port;
var calc = new data(150,150,0);
var acc = '';

var targetX = 150,
    targetY = 150,
    x = 151,
    y = 151,
    velX = 0,
    velY = 0,
    speed = 5;

function reset() {
    document.getElementById("data").innerHTML = "";
    // Lista as portas conectadas
    update();
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
    port.open();
}



function coleta(dados) {
    acc += dados.toString('utf8');
    var linhas = acc.split('#');
    acc = linhas.pop();
    linhas.forEach(function (part) {
        document.getElementById("data").innerHTML ="Placa: " + part + "<br>X: " + calc.RTCOP(part).x + " <br>" + "Y: " + calc.RTCOP(part).y;
        
        //targetX = calc.RTCOP(part).x + 150;
        //targetY = ;
            //update(calc.RTCOP(part).x + 150,calc.RTCOP(part).y + 150);
        console.log(calc.RTCOP(part).x + " : " +calc.RTCOP(part).y);
    });

}


function register() {
    console.log("registrando");
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
var canvas=document.getElementById("canvas"),
    ctx = canvas.getContext("2d");


function update(tgx,tgy){
    var tx = tgx - x,
        ty = tgy - y,
        dist = Math.sqrt(tx*tx+ty*ty),
        rad = Math.atan2(ty,tx),
        angle = rad/Math.PI * 180;
    console.log(tgx + ":" + tgy);
        velX = (tx/dist)*speed,
        velY = (ty/dist)*speed;
    
        x += velX
        y += velY
            
        
        // fade effect
		ctx.globalAlpha=0.5;
		ctx.fillStyle='#f4f4f4';
		ctx.fillRect(0,0,500, 500);
		ctx.globalAlpha=1;
        ctx.fillStyle='#000000';
        //ctx.clearRect(0,0,500,500);
        ctx.beginPath();
        ctx.arc(x,y,5,0,Math.PI*2);
        ctx.fill();
    
    
    setTimeout(update,20);
}
$("#bt").click(reset);
$(window).bind('beforeunload', function(){
  if(port){
    port.close();
  }
});
