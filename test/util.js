'use strict'

var fs = require('fs');




function pop() {
  var numbers = require('./data.json');
  var myArray = [];
  for (var i = 0; i < numbers.length; i++) {
    let TI = i*500;//numbers[i][0];
    let  TR = numbers[i][1];
    let  TL = numbers[i][2];
    let  BR = numbers[i][3];
    let  BL = numbers[i][4];
    //myArray.push([TI, TR, TL, BR, BL]);
    myArray.push(TI + ";" + TR + ";" + TL + ";" + BR + ";" + BL);
  }
  return myArray;
}

fs.writeFile('./dataStringNEW.json',JSON.stringify(pop()),function(err) {
    if (err) {
      console.error('Crap happens');
    }
  }
);



//console.log(JSON.stringify(require('./my.json')[0]));