function playbtn() {
  if ($('#tempo').val() >= 1) {
    $('#play').addClass('green').removeClass('disabled');
  } else {
    $('#play').removeClass('green').addClass('disabled');
  }

}

function medir() {
  $('#stepduracao').addClass('completed').removeClass('active');
  $('#stepexec').addClass('active').removeClass('disabled');
  $('#tempoSelect').hide();
  $('#execute').show();
  $('#progress')
    .progress({
      total: $('#tempo').val()
    });
  startReading($('#tempo').val());
}

function startReading(temp) {
  console.log(temp);
  var timer = null;
  var count = temp;
  //count = count + 2;
  var callback = function() {
    if (count <= 0) {
      $('#status').html("Gerando relatório");
    } else {
      $('#status').html("Medindo");
    }
    console.log(count + " of " + temp);
    $('#progress').progress('increment');
    clearInterval(timer);
    timer = null;
    count--;
    doStep();
  };

  var doStep = function() {
    if (count >= -2) {
      clearInterval(timer);
      timer = setTimeout(callback, 1000);
    } else {
      console.log("ACABOU!");
      genReport(temp);
    }
  };
  doStep();
}

function genReport(temp) {
  $('#stepduracao').addClass('completed').removeClass('active');
  $('#stepexec').addClass('completed').removeClass('active');
  $('#steprelatorio').addClass('active').removeClass('disabled');
  $('#tempoSelect').hide();
  $('#execute').hide();
  $('#relatorio').show();

  estatograph(temp);
  estabilograph(temp);

}

function reset() {
  $('#progress').progress('reset');
  $('#stepduracao').addClass('active').removeClass('completed');
  $('#stepexec').addClass('disabled').removeClass('completed').removeClass('active');
  $('#steprelatorio').addClass('disabled').removeClass('completed').removeClass('active');
  $('#tempoSelect').show();
  $('#execute').hide();
  $('#relatorio').hide();
  $('#graph1').html("");
  $('#graph2').html("");
}

function estatograph(temp) {

  //----------------------------

  /*
          var data = [
              [5, 3],
              [10, 17],
              [15, 4],
              [2, 8]
          ];
          */

  var data = [];

  for (var c = 0; c < temp * 50; c++) {
    var x = Math.random() * 100;
    var y = Math.random() * 100;
    data[c] = [x, y];
  }

  var margin = {
      top: 20,
      right: 15,
      bottom: 60,
      left: 60
    },
    width = 400 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  var x = d3.scale.linear()
    .domain([d3.min(data, function(d) {
      return d[0];
    }), d3.max(data, function(d) {
      return d[0];
    })])
    .range([0, width]);

  var y = d3.scale.linear()
    .domain([d3.min(data, function(d) {
      return d[1];
    }), d3.max(data, function(d) {
      return d[1];
    })])
    .range([height, 0]);

  var chart = d3.select('#graph1')
    .append('svg:svg')
    .attr('width', width + margin.right + margin.left)
    .attr('height', height + margin.top + margin.bottom)
    .attr('class', 'chart')

  var main = chart.append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    .attr('width', width)
    .attr('height', height)
    .attr('class', 'main')

  // draw the x axis
  var xAxis = d3.svg.axis()
    .scale(x)
    .orient('bottom');

  main.append('g')
    .attr('transform', 'translate(0,' + height + ')')
    .attr('class', 'main axis date')
    .call(xAxis);

  // draw the y axis
  var yAxis = d3.svg.axis()
    .scale(y)
    .orient('left');

  main.append('g')
    .attr('transform', 'translate(0,0)')
    .attr('class', 'main axis date')
    .call(yAxis);

  var g = main.append("svg:g");

  g.selectAll("scatter-dots")
    .data(data)
    .enter().append("svg:circle")
    .attr("cx", function(d, i) {
      return x(d[0]);
    })
    .attr("cy", function(d) {
      return y(d[1]);
    })
    .attr("r", 3);

}

function estabilograph(temp) {



  var data = [];

  for (var c = 0; c < temp * 10; c++) {
    data[c] = Math.random() * 10;
  }
  var w = 500,
    h = 200,
    margin = 20,
    y = d3.scale.linear().domain([0, d3.max(data)]).range([0 + margin, h - margin]),
    x = d3.scale.linear().domain([0, data.length]).range([0 + margin, w - margin])

  var vis = d3.select("#graph2")
    .append("svg:svg")
    .attr("width", w)
    .attr("height", h)

  var g = vis.append("svg:g")
    .attr("transform", "translate(0, 200)");

  var line = d3.svg.line()
    .x(function(d, i) {
      return x(i);
    })
    .y(function(d) {
      return -1 * y(d);
    })

  g.append("svg:path").attr("d", line(data));

  g.append("svg:line")
    .attr("x1", x(0))
    .attr("y1", -1 * y(0))
    .attr("x2", x(w))
    .attr("y2", -1 * y(0))

  g.append("svg:line")
    .attr("x1", x(0))
    .attr("y1", -1 * y(0))
    .attr("x2", x(0))
    .attr("y2", -1 * y(d3.max(data)))

  g.selectAll(".xLabel")
    .data(x.ticks(5))
    .enter().append("svg:text")
    .attr("class", "xLabel")
    .text(String)
    .attr("x", function(d) {
      return x(d)
    })
    .attr("y", 0)
    .attr("text-anchor", "middle")

  g.selectAll(".yLabel")
    .data(y.ticks(4))
    .enter().append("svg:text")
    .attr("class", "yLabel")
    .text(String)
    .attr("x", 0)
    .attr("y", function(d) {
      return -1 * y(d)
    })
    .attr("text-anchor", "right")
    .attr("dy", 4)

  g.selectAll(".xTicks")
    .data(x.ticks(5))
    .enter().append("svg:line")
    .attr("class", "xTicks")
    .attr("x1", function(d) {
      return x(d);
    })
    .attr("y1", -1 * y(0))
    .attr("x2", function(d) {
      return x(d);
    })
    .attr("y2", -1 * y(-0.3))

  g.selectAll(".yTicks")
    .data(y.ticks(4))
    .enter().append("svg:line")
    .attr("class", "yTicks")
    .attr("y1", function(d) {
      return -1 * y(d);
    })
    .attr("x1", x(-0.3))
    .attr("y2", function(d) {
      return -1 * y(d);
    })
    .attr("x2", x(0))


}