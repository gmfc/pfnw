/*
 *  Classe responsavel por administrar e receber os dados da plataforma
 *
 */
function PlatData() {
    // arrays do cada sensor
    this.TR = []; // top right
    this.TL = []; // top left
    this.BR = []; // bottom right
    this.BL = []; // bottom left

}


// push leitura. Recebe String com leitura dos dados no ciclo
// e adiciona no final de cada array;
PlatData.prototype.pushData = function (data) {

    var arr = data.split(",").map(function (val) {
        return Number(val);
    });
    this.TR.push(arr[0]);
    this.TL.push(arr[1]);
    this.BR.push(arr[2]);
    this.BL.push(arr[3]);
};

PlatData.prototype.getTR = function () {
    return this.TR;
};


PlatData.prototype.getTL = function () {
    return this.TL;
};


PlatData.prototype.getBR = function () {
    return this.BR;
};


PlatData.prototype.getBL = function () {
    return this.BL;
};


// export the class
module.exports = PlatData;