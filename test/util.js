var fs = require('fs');




function pop() {
  var numbers = [];
  //var myArray = [];
  for (var i = 0; i < 10; i++) {
    var TI = Math.floor(Math.random() * 8) + 5,
      TR = Math.random() * 100,
      TL = Math.random() * 100,
      BR = Math.random() * 100,
      BL = Math.random() * 100;
    numbers[i] = [TI, TR, TL, BR, BL];
    //myArray[i] = TI + ";" + TR + ";" + TL + ";" + BR + ";" + BL;
  }
  return numbers;
}

fs.writeFile('./data.json',JSON.stringify(pop()),function(err) {
    if (err) {
      console.error('Crap happens');
    }
  }
);



//console.log(JSON.stringify(require('./my.json')[0]));