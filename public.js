$(function () {
  let socket = io();

  let CPUUsageData = []; //TODO: a way to not need these variables
  let CPUGraph;
  let AddedServers = 0;

  createGraph("#cpuChart", 100, 500, 500, 100, (path)=> {
    console.log("Created CPU graph");
    CPUGraph = path;
  });

  setInterval(() => socket.emit('getInfo'), 1000); //Ping socket to get info every second

  socket.on('getInfo', (info) => {
    // Example output: {"platform":"win32","freemem":15500861440,"totalmem":25718337536,"uptime":138367,"cpuUsage":0.032344114704901616}
    $('#uptime').text(secondsToHMS(info.uptime));
    $('#totalmem').text(formatBytes(info.totalmem));
    $('#usedmem').text(formatBytes( (info.totalmem - info.freemem) ));
    $('#freemem').text(formatBytes(info.freemem));
    $('#cpuUsage').text(Math.floor(info.cpuUsage * 100) + "%");

    CPUUsageData.push(Math.floor(info.cpuUsage * 100));
    updateGraph("#cpuChart", 500, 100, CPUUsageData, CPUGraph, ()=>{ console.log("Updated CPU graph");  });;
  });

  $("#serverAdd").submit((e) => {
    e.preventDefault();

    let Server = $('#m').val();
    let Graph; //TODO: a way to not need these variables
    let CPUUsageData = [];
    AddedServers++;
    const CurrentServer = AddedServers;

    $("#row").append("<div id='" + AddedServers + "' class='col-md-6 mt-2'></div>");
    $("#" + AddedServers).append("<h3>"+ Server +"</h3>");
    $("#" + AddedServers).append("<p>Uptime: <span id='uptime" + AddedServers + "'></span></p>");
    $("#" + AddedServers).append("<p>Total Memory: <span id='totalmem" + AddedServers + "'></span></p>");
    $("#" + AddedServers).append("<p>Used Memory: <span id='usedmem"  +AddedServers + "'></span></p>");
    $("#" + AddedServers).append("<p>Free Memory: <span id='freemem" + AddedServers + "'></span></p>");
    $("#" + AddedServers).append("<p>CPU Usage: <span id='cpuUsage" + AddedServers + "'></span></p>");

    $("#" + AddedServers).append("<svg id='cpuChart" + AddedServers + "'></svg>");

    createGraph("#cpuChart" + AddedServers, 100, 500, 500, 100, (path) => {
      console.log("Created CPU graph for " + Server);
      Graph = path;
    });

    setInterval(() => {
        console.log(CurrentServer)
        $.get("http://" + Server, (data, status, jqXHR) => {
          data = JSON.parse(data);
          console.log(data)
          $("#uptime" + CurrentServer).text(secondsToHMS(data.uptime));
          $("#totalmem" + CurrentServer).text(formatBytes(data.totalmem));
          $("#usedmem" + CurrentServer).text(formatBytes((data.totalmem - data.freemem)));
          $("#freemem" + CurrentServer).text(formatBytes(data.freemem));
          $("#cpuUsage" + CurrentServer).text(Math.floor(data.cpuUsage * 100) +"%");

          CPUUsageData.push(Math.floor(data.cpuUsage * 100));
          updateGraph("#cpuChart" + CurrentServer, 500, 100, CPUUsageData, Graph, ()=>{ console.log("Updated CPU graph for " + Server); });
        });
    }, 1000);
  });
});

function createGraph(graph, height, width, xmax, ymax, callback) {
  let chart = d3.select(graph)
    .attr('width', width + 50)
    .attr('height', height + 10);

  let x = d3.scaleLinear().domain([0, xmax]).range([0, xmax]);
  let y = d3.scaleLinear().domain([0, ymax]).range([ymax, 0]);

  let line = d3.line()
	 .x(function(d){ return x(d.x); })
	 .y(function(d){ return y(d.y); });

  // Draw the grid
  chart.append('path').datum([{x: 0, y: 150}, {x: 500, y: 150}])
    .attr('class', 'grid')
    .attr('d', line);
  chart.append('path').datum([{x: 0, y: 300}, {x: 500, y: 300}])
    .attr('class', 'grid')
    .attr('d', line);
  chart.append('path').datum([{x: 0, y: 450}, {x: 500, y: 450}])
    .attr('class', 'grid')
    .attr('d', line);
  chart.append('path').datum([{x: 50, y: 0}, {x: 50, y: 500}])
    .attr('class', 'grid')
    .attr('d', line);
  chart.append('path').datum([{x: 250, y: 0}, {x: 250, y: 500}])
    .attr('class', 'grid')
    .attr('d', line);
  chart.append('path').datum([{x: 450, y: 0}, {x: 450, y: 500}])
    .attr('class', 'grid')
    .attr('d', line);

  let path = chart.append('path');

  if (typeof callback == "function")
    callback(path);
}

function updateGraph(graph, xmax, ymax, data, path, callback) {
  let x = d3.scaleLinear().domain([0, data.length]).range([0, xmax]);
  let y = d3.scaleLinear().domain([0, ymax]).range([ymax, 0]);

  let smoothLine = d3.line().curve(d3.curveCardinal)
	 .x((d, i) => { return x(i); })
	 .y((d) => { return y(d); });

  let chart = d3.select(graph);

  path.datum(data)
    .attr('class', 'smoothline')
    .attr('d', smoothLine);

  if (typeof callback == "function")
    callback();
}

function secondsToHMS (t) {
  t = Number(t);
  let h = Math.floor(t / 3600);
  let m = Math.floor(t % 3600 / 60);
  let s = Math.floor(t % 3600 % 60);

  let hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
  let mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
  let sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
  return hDisplay + mDisplay + sDisplay;
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
