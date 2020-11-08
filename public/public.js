let Version = "0.1"; //Update if getInfo returns new info
let Servers = [];
let AddedServers = 0;

let Options = {
  pollingRate: 1000, //milliseconds
  dataPoints: 50
};

$(function() { //On page load
  createServer("Current PC")
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

  $("#serverAdd").submit((e) => {
    e.preventDefault(); //Prevent page refresh

    let Server = $('#m').val();
    if (isURL(Server)) {
      if (!Server.match(/\:\d+$/)) //Add the default port of 9000 if no port is specified
        Server = Server + ":9000";
      if (Servers.includes(Server))
        alert("That server is already included");
      else {
        Servers.push(Server);
        localStorage.setItem('Servers', JSON.stringify(Servers));
        createServer(Server);
      }
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
      $("#" + (i + 1)).remove(); //Delete the divs holding the server info except for the main server
    }
  });
});

function createServer(Server) {
  let socket;

  if (Server == "Current PC") {
    socket = io();
  } else {
    socket = io(Server);
  }

  let Graph;
  let GraphWidth = 500;
  let GraphHeight = 100;
  AddedServers++;
  const CurrentServer = AddedServers;

  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
    GraphWidth = 300;
    GraphHeight = 60;
  }

  $("#row").append("<div id='" + AddedServers + "' class='col-md-6 mt-2'></div>");
  $("#" + AddedServers).append("<h3 id='serverid" + AddedServers + "'>" + Server + "</h3>");
  $("#" + AddedServers).append("<p class='outdatedWarning'>This server is running an outdated tracker and could give unexpected results</p>")
  $("#" + AddedServers).append("<p>Uptime: <span id='uptime" + AddedServers + "'></span></p>");
  $("#" + AddedServers).append("<p>Total Memory: <span id='totalmem" + AddedServers + "'></span></p>");
  $("#" + AddedServers).append("<p>Used Memory: <span id='usedmem" + AddedServers + "'></span></p>");
  $("#" + AddedServers).append("<p>Free Memory: <span id='freemem" + AddedServers + "'></span></p>");
  $("#" + AddedServers).append("<p class='dropdown-toggle' id='disksdropdown" + AddedServers + "' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>Disks: <ul class='dropdown-menu' aria-labelledby='disksdropdown" + AddedServers + "' id='disks" + AddedServers + "'></ul></p>")
  $("#" + AddedServers).append("<p>CPU Usage: <span id='cpuUsage" + AddedServers + "'></span></p>");
  $("#" + AddedServers).append("<svg id='cpuChart" + AddedServers + "'></svg>");
  $("#" + AddedServers).append("<p>Core Performance: ")
  $("#" + AddedServers).append("<div id='coreCharts" + AddedServers + "'>")

  createAvgUsageGraph("#cpuChart" + AddedServers, GraphWidth, GraphHeight, GraphWidth, GraphHeight, (path) => { //create a graph with a height of 100, a width of 500, a xmax of 500, and a ymax of 100
    console.log("Created CPU graph for " + Server);
    Graph = path;
  });

  setInterval(() => socket.emit('getInfo'), Options.pollingRate);

  let cpuAvgUsageData = [];
  let coreGraphs = [];
  let coreAvgUsageData = [];

  socket.on('getInfo', (data) => {
    //console.log(Server + ": " + JSON.stringify(data));
    if (Version != data.serverVer) {
      $("#serverid" + CurrentServer).addClass("outdated")
    }
    $("#uptime" + CurrentServer).text(secondsToHMS(data.uptime));
    $("#totalmem" + CurrentServer).text(formatBytes(data.totalmem));
    $("#usedmem" + CurrentServer).text(formatBytes((data.totalmem - data.freemem)));
    $("#freemem" + CurrentServer).text(formatBytes(data.freemem));
    $("#cpuUsage" + CurrentServer).text(Math.floor(data.cpuUsage.currentload) + "%");

    cpuAvgUsageData.push(Math.floor(data.cpuUsage.currentload));
    if (cpuAvgUsageData.length > Options.dataPoints) cpuAvgUsageData.shift();
    updateAvgUsageGraph(GraphWidth, GraphHeight, cpuAvgUsageData, Graph, () => {
      /**console.log("Updated CPU graph for " + Server);**/
    });

    //Theres definitely a much better way to write the following code lol
    if (isEmpty($('#coreCharts' + CurrentServer))) {
      for (let [i, cpu] of data.cpuUsage.cpus.entries()) {
        $("#coreCharts" + CurrentServer).append("<p><span id='coreUsage" + CurrentServer + "-" + i + "'></span></p>");
        $("#coreCharts" + CurrentServer).append("<svg id='coreChart" + CurrentServer + "-" + i + "'></svg></p>");
        createAvgUsageGraph("#coreChart" + CurrentServer + "-" + i, GraphWidth, GraphHeight, GraphWidth, GraphHeight, (path) => {
          console.log("Created Core graph for " + Server + " and core " + i);
          coreGraphs.push(path);
        });
      }
    }

    if (jQuery.isEmptyObject(coreAvgUsageData)) {
      for (const cpu of data.cpuUsage.cpus) {
        coreAvgUsageData.push([])
      }
    }

    for (let [i, cpu] of data.cpuUsage.cpus.entries()) {
      coreAvgUsageData[i].push(Math.floor(cpu.load));
      $("coreUsage" + CurrentServer + "-" + i).text(Math.floor(cpu.load));
      if (coreAvgUsageData[i].length > Options.dataPoints) coreAvgUsageData[i].shift();

      updateAvgUsageGraph(GraphWidth, GraphHeight, coreAvgUsageData[i], coreGraphs[i], () => {
        //console.log("Updated CPU graph for " + Server + " and core " + i);
      });
    }

    let formattedDrives = _(data.disks)
      .groupBy('_mounted')
      .map((value, key) => ({
        drive: key,
        capacity: _.sumBy(value, '_capacity')
      })).value();

    $('#disks' + CurrentServer).empty()
    for (const disk of formattedDrives) {
      $('#disks' + CurrentServer).append("<li>" + disk.drive + " " + disk.capacity);
    }
  });
}

function deleteServer(server, ID) {
  $("#" + ID).remove(); //Delete the div holding the server info. Note the getinfo call will keep running till page reload, TODO fix this
  Servers = Servers.filter(item => item !== server); //Remove the server from the array
  localStorage.setItem('Servers', JSON.stringify(Servers)); //Update local storage
  console.log("Deleted Server " + server + " with ID " + ID);
}

function createAvgUsageGraph(graph, width, height, xmax, ymax, callback) {
  let chart = d3.select(graph)
    .attr('width', width + 50)
    .attr('height', height + 10);

  let x = d3.scaleLinear().domain([0, xmax]).range([0, xmax]);
  let y = d3.scaleLinear().domain([0, ymax]).range([ymax, 0]);

  let line = d3.line()
    .x(function(d) {
      return x(d.x);
    })
    .y(function(d) {
      return y(d.y);
    });

  // Draw the grid
  chart.append('path').datum([{
      x: 0,
      y: 150
    }, {
      x: 500,
      y: 150
    }])
    .attr('class', 'grid')
    .attr('d', line);
  chart.append('path').datum([{
      x: 0,
      y: 300
    }, {
      x: 500,
      y: 300
    }])
    .attr('class', 'grid')
    .attr('d', line);
  chart.append('path').datum([{
      x: 0,
      y: 450
    }, {
      x: 500,
      y: 450
    }])
    .attr('class', 'grid')
    .attr('d', line);
  chart.append('path').datum([{
      x: 50,
      y: 0
    }, {
      x: 50,
      y: 500
    }])
    .attr('class', 'grid')
    .attr('d', line);
  chart.append('path').datum([{
      x: 250,
      y: 0
    }, {
      x: 250,
      y: 500
    }])
    .attr('class', 'grid')
    .attr('d', line);
  chart.append('path').datum([{
      x: 450,
      y: 0
    }, {
      x: 450,
      y: 500
    }])
    .attr('class', 'grid')
    .attr('d', line);

  if (typeof callback == "function")
    callback(chart.append('path')); //the line on the graph
}

function updateAvgUsageGraph(xmax, ymax, data, path, callback) {
  let x = d3.scaleLinear().domain([0, data.length]).range([0, xmax]);
  let y = d3.scaleLinear().domain([0, ymax]).range([ymax, 0]);

  let smoothLine = d3.line().curve(d3.curveCardinal)
    .x((d, i) => {
      return x(i);
    })
    .y((d) => {
      return y(d);
    });

  path.datum(data)
    .attr('class', 'smoothline')
    .attr('d', smoothLine);

  if (typeof callback == "function")
    callback();
}

function secondsToHMS(t) {
  t = Number(t);
  let h = Math.floor(t / 3600);
  let m = Math.floor(t % 3600 / 60);
  let s = Math.floor(t % 3600 % 60);

  let hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
  let mDisplay;
  if (s == 0)
    mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes ") : "";
  else
    mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
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
  let pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))|' + // OR ip (v4) address
    '([a-f0-9:]+:+)+[a-f0-9]+|' + // OR ip (v6) address
    '(localhost)' + // OR localhost
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
    '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
  return !!pattern.test(str);
}

function isEmpty(el) {
  return !$.trim(el.html())
}
