let Servers = [];
let AddedServers = 0;

let Options = {
  pollingRate: 1000, //milliseconds
  dataPoints: 50
};

$(function () { //On page load
  let socket = io();

  let CPUUsageData = []; //TODO: a way to not need these variables
  let CPUGraph;

  if (localStorage.getItem('PollingRate') !== null) {
    Options.pollingRate = localStorage.getItem('PollingRate');
    $("#pollingRateVal").text(Options.pollingRate);
  }

  if (localStorage.getItem('DataPoints') !== null) {
    Options.dataPoints = localStorage.getItem('DataPoints');
    $("#dataPointsVal").text(Options.dataPoints);
  }

  $("#pollingRate").slider({
    ticks: [100, 500, 1000, 1500, 2000],
    ticks_snap_bounds: 30
  }).slider('setValue', Options.pollingRate);
  $("#dataPoints").slider({
    ticks: [50, 100, 150, 200, 250],
    ticks_snap_bounds: 30
  }).slider('setValue', Options.dataPoints);
  $("#pollingRateVal").text(Options.pollingRate);
  $("#dataPointsVal").text(Options.dataPoints);

  if (localStorage.getItem('Servers') !== null) {
    Servers = JSON.parse(localStorage.getItem('Servers'));
    for (let i = 0; i < Servers.length; i++) {
      createServer(Servers[i]);
    }
  }

  $("#pollingRate").on("slide", (slideEvt) => {
    $("#pollingRateVal").text(slideEvt.value);
    Options.pollingRate = slideEvt.value;
    localStorage.setItem('PollingRate', slideEvt.value);
  });

  $("#dataPoints").on("slide", (slideEvt) => {
    $("#dataPointsVal").text(slideEvt.value);
    Options.dataPoints = slideEvt.value;
    localStorage.setItem('DataPoints', slideEvt.value);
  });

  //console.log(JSON.parse(localStorage.getItem('Servers')));

  createGraph('#cpuChart', 100, 500, 500, 100, (path)=> {
    console.log("Created CPU graph");
    CPUGraph = path;
  });

  setInterval(() => socket.emit('getInfo'), Options.pollingRate); //Ping socket to get info every second

  socket.on('getInfo', (info) => {
    // Example output: {"platform":"win32","freemem":15500861440,"totalmem":25718337536,"uptime":138367,"cpuUsage":0.032344114704901616}
    $('#uptime').text(secondsToHMS(info.uptime));
    $('#totalmem').text(formatBytes(info.totalmem));
    $('#usedmem').text(formatBytes( (info.totalmem - info.freemem) ));
    $('#freemem').text(formatBytes(info.freemem));
    $('#cpuUsage').text(Math.floor(info.cpuUsage * 100) + "%");

    CPUUsageData.push(Math.floor(info.cpuUsage * 100));
    if (CPUUsageData.length > Options.dataPoints) CPUUsageData.shift();
    updateGraph(500, 100, CPUUsageData, CPUGraph, ()=>{ /**console.log("Updated CPU graph");**/  });

    let formattedDrives = _(info.disks)
      .groupBy('_mounted')
      .map((value, key) => ({
        drive: key,
        capacity: _.sumBy(value, '_capacity')
      })).value();

    /**for (const disk of formattedDrives) {
      $('#disks').append("<li>" + disk.drive + " " + disk.capacity);
      console.log(disk)
    }**/
  });

  $("#serverAdd").submit((e) => {
    e.preventDefault(); //Prevent page refresh

    let Server = $('#m').val();
    if (isURL(Server)) {
      Servers.push(Server);
      localStorage.setItem('Servers', JSON.stringify(Servers));
      createServer(Server);
    } else {
      alert(Server + " is not a valid URL");
    }
  });

  $("#serverDelete").submit((e) => {
    e.preventDefault();
    localStorage.clear()
    Servers = [];
    for (let i = 1; i < AddedServers + 1; i++) {
      clearInterval(i - 1); //Clear the intervals that are updating graphs
      $("#" + i).remove();
    }
  });
});

function createServer(Server) {
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

  let socket = io('http://' + Server);
  setInterval(() => socket.emit('getInfo'), Options.pollingRate);

  socket.on('getInfo', (data) => {
    $("#uptime" + CurrentServer).text(secondsToHMS(data.uptime));
    $("#totalmem" + CurrentServer).text(formatBytes(data.totalmem));
    $("#usedmem" + CurrentServer).text(formatBytes((data.totalmem - data.freemem)));
    $("#freemem" + CurrentServer).text(formatBytes(data.freemem));
    $("#cpuUsage" + CurrentServer).text(Math.floor(data.cpuUsage * 100) +"%");

    CPUUsageData.push(Math.floor(data.cpuUsage * 100));
    if (CPUUsageData.length > Options.dataPoints) CPUUsageData.shift();
    updateGraph(500, 100, CPUUsageData, Graph, ()=>{ /**console.log("Updated CPU graph for " + Server);**/ });
  });
}

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

function updateGraph(xmax, ymax, data, path, callback) {
  let x = d3.scaleLinear().domain([0, data.length]).range([0, xmax]);
  let y = d3.scaleLinear().domain([0, ymax]).range([ymax, 0]);

  let smoothLine = d3.line().curve(d3.curveCardinal)
  .x((d, i) => { return x(i); })
  .y((d) => { return y(d); });

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

function isURL(str) {
  var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))|'+ // OR ip (v4) address
    '(localhost)' + // OR localhost
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return !!pattern.test(str);
}
