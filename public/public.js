const Version = "0.3"; //Update if getInfo returns new info
let Servers = [];
let Intervals = [];

let Options = {
  pollingRate: 1000, //milliseconds
  dataPoints: 50
};

$(function() { //On page load
  d3.select('body').append('div')
    .attr('id', 'tooltip')
    .attr('style', 'position: absolute; opacity: 0;')
    .attr('class', 'tooltip');

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

  createServer("Current PC");

  if (localStorage.getItem('Servers') !== null) {
    Servers = JSON.parse(localStorage.getItem('Servers'));
    for (let i = 0; i < Servers.length; i++) {
      createServer(Servers[i]);
    }
  }

  $("#pollingRate").on("slideStop", (slideEvt) => {
    $("#pollingRateVal").text(slideEvt.value);
    Options.pollingRate = slideEvt.value;
    localStorage.setItem('PollingRate', slideEvt.value);

    refreshServers();
  });

  $("#dataPoints").on("slide", (slideEvt) => {
    $("#dataPointsVal").text(slideEvt.value);
    Options.dataPoints = slideEvt.value;
    localStorage.setItem('DataPoints', slideEvt.value);

    refreshServers();
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
    localStorage.clear();
    Servers = [];
    for (let runningInterval in Intervals) {
      const server = Intervals[runningInterval].server;
      const id = Intervals[runningInterval].id;

      if (server != "Current PC") {
        clearInterval(id);
        deleteServer(server, id);
        Intervals.splice(runningInterval, 1);
      }
    }
  });
});

async function createServer(Server) {
  let socket;

  if (Server == "Current PC") {
    socket = io();
  } else {
    socket = io(Server);
  }

  let interval = setInterval(() => {
    socket.emit('getInfo');
    socket.emit('getNetworkInfo');
  }, Options.pollingRate);

  Intervals.push({
    id: interval,
    server: Server
  });

  $("#row").append("<div id='" + interval + "' class='col-md-6 mt-2 server'></div>");
  if (Server == "Current PC")
    $("#" + interval).append("<h3 id='serverid" + interval + "'>" + Server + "</h3>");
  else
    $("#" + interval).append("<h3 id='serverid" + interval + "'>" + Server + "<img id='#del" + interval + "' src='delete.png' /></h3>");
  $("#" + interval).append("<p class='outdatedWarning'>This server is running an outdated tracker and could give unexpected results</p>");
  $("#" + interval).append("<p>Uptime: <span id='uptime" + interval + "'></span></p>");
  $("#" + interval).append("<p>Total Memory: <span id='totalmem" + interval + "'></span></p>");
  $("#" + interval).append("<p>Used Memory: <span id='usedmem" + interval + "'></span></p>");
  $("#" + interval).append("<p>Free Memory: <span id='freemem" + interval + "'></span></p>");
  $("#" + interval).append("<p class='dropdown-toggle' id='disksdropdown" + interval + "' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>Disks: <ul class='dropdown-menu' aria-labelledby='disksdropdown" + interval + "' id='disks" + interval + "'></ul></p>")
  $("#" + interval).append("<p>Average CPU Usage over " + Math.floor((Options.dataPoints * Options.pollingRate) / 1000) + " seconds: <span id='cpuUsage" + interval + "'></span></p>");
  $("#" + interval).append("<svg id='cpuChart" + interval + "'></svg>");
  $("#" + interval).append("<p>Core Performance over " + Math.floor((50 * Options.pollingRate) / 1000) + " seconds: ");
  $("#" + interval).append("<div class='row coreCharts pl-3' id='coreCharts" + interval + "'>");
  $("#" + interval).append("<p style='padding-top: 5px;'>Network: ")
  $("#" + interval).append("<table><tbody id='networkList" + interval + "'></tbody>");

  if (Server != "Current PC")
    $("#serverid" + interval).click(() => { deleteServer(Server, interval); });

  let Graph;
  let GraphWidth = 500;
  let GraphHeight = 100;

  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) { //If mobile make the size of the graph 40% smaller
    GraphWidth = 300;
    GraphHeight = 60;
  }

  await createAvgUsageGraph("#cpuChart" + interval, interval, GraphWidth, GraphHeight, GraphWidth, GraphHeight).then((path) => { //create a graph with a height of 100, a width of 500, a xmax of 500, and a ymax of 100
    console.log("Created CPU graph for " + Server);
    Graph = path;
  })

  let cpuAvgUsageData = [];
  let coreGraphs = [];
  let coreAvgUsageData = [];

  socket.on('getInfo', async (data) => {
    if (isEmpty($("#" + interval))) //If the server div was deleted, clear the getinfo interval
      clearInterval(interval);
    if (Version != data.serverVer) {
      $("#serverid" + interval).addClass("outdated");
    }

    cpuAvgUsageData.push(Math.floor(data.cpuUsage.currentLoad));
    if (cpuAvgUsageData.length > Options.dataPoints) cpuAvgUsageData.shift();
    updateAvgUsageGraph(GraphWidth, GraphHeight, cpuAvgUsageData, Graph.path, Graph.chart);

    $("#uptime" + interval).text(secondsToHMS(data.uptime));
    $("#totalmem" + interval).text(formatBytes(data.totalmem));
    $("#usedmem" + interval).text(formatBytes((data.totalmem - data.freemem)));
    $("#freemem" + interval).text(formatBytes(data.freemem));
    $("#cpuUsage" + interval).text(Math.floor(d3.mean(cpuAvgUsageData)) + "%");

    //Theres definitely a much better way to write the following code lol
    if (isEmpty($('#coreCharts' + interval))) {
      for (let [i, cpu] of data.cpuUsage.cpus.entries()) {
        $("#coreCharts" + interval).append("<p><span id='coreUsage" + interval + "-" + i + "'></span></p>");
        $("#coreCharts" + interval).append("<svg id='coreChart" + interval + "-" + i + "'></svg></p>");
        await createAvgUsageGraph("#coreChart" + interval + "-" + i, interval, 100, 50, 100, 50, true).then((path) => {
          //console.log("Created Core graph for " + Server + " and core " + i);
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
      $("coreUsage" + interval + "-" + i).text(Math.floor(cpu.load));
      if (coreAvgUsageData[i].length > 50) coreAvgUsageData[i].shift();

      updateAvgUsageGraph(100, 50, coreAvgUsageData[i], coreGraphs[i].path, coreGraphs[i].chart);
    }

    let formattedDrives = _(data.disks)
      .groupBy('_mounted')
      .map((value, key) => ({
        drive: key,
        capacity: _.sumBy(value, '_capacity'),
        available: _.sumBy(value, '_available'),
        used: _.sumBy(value, '_used')
      })).value();

    $('#disks' + interval).empty();
    for (const disk of formattedDrives) {
      $('#disks' + interval).append("<li>" + disk.drive + " " + disk.capacity);
      $('#disks' + interval).append("<li class='capacity'>Used: " + formatBytes(disk.used) + "<br />Available: " + formatBytes(disk.available));
    }
  });

  socket.on('getNetworkInfo', (data) => {
    let formattedInfo = _(data)
      .groupBy('iface')
      .map((value, key) => ({
        iface: key,
        state: _.sumBy(value, 'operstate')
      })).value();

    $('#networkList' + interval).empty();
    $('#networkList' + interval).append("<tr><th>Interface</th><th>State</th>");
    for (const network of formattedInfo) {
      $('#networkList' + interval).append("<tr><th>" + network.iface + "</th><th>" + network.state + "</th>");
    }
    //console.log(formattedInfo);
  })
}

function deleteServer(server, ID) {
  $("#" + ID).remove(); //Delete the div holding the server info.
  Servers = Servers.filter(item => item !== server); //Remove the server from the array
  localStorage.setItem('Servers', JSON.stringify(Servers)); //Update local storage
  console.log("Deleted Server " + server + " with ID " + ID);
}

function refreshServers() {
  for (runningInterval in Intervals) {
    const server = Intervals[runningInterval].server;
    const id = Intervals[runningInterval].id;
    clearInterval(id);
    deleteServer(server, id);
    Intervals.splice(runningInterval, 1);
    createServer(server);
  }
}

async function createAvgUsageGraph(graph, interval, width, height, xmax, ymax, border = false) {
  //chart is a svg element
  let chart = d3.select(graph)
    .attr('width', width)
    .attr('height', height + 10);

  if (border) {
    chart.attr('style', 'outline: thin solid black; padding: 2px;');
  }

  const x = d3.scaleLinear().domain([0, xmax]).range([0, xmax]);
  const y = d3.scaleLinear().domain([0, ymax]).range([ymax, 0]);

  const line = d3.line()
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

  return { chart: chart, path: chart.append('path') };
}

async function updateAvgUsageGraph(xmax, ymax, data, path, chart) {
  const x = d3.scaleLinear().domain([0, data.length]).range([0, xmax]);
  const y = d3.scaleLinear().domain([0, ymax]).range([ymax, 0]);

  const smoothLine = d3.line().curve(d3.curveCardinal)
    .x((d, i) => {
      return x(i);
    })
    .y((d) => {
      return y(d);
    });

  path.datum(data)
    .attr('class', 'smoothline')
    .attr('d', smoothLine);

  chart.on('mouseover', (d) => {
    d3.select('#tooltip').transition().duration(200).style('opacity', 1);

    d3.select('#tooltip').html((d) => {
      return "Current: " + Math.floor(data[data.length - 1]) +"% <br /> Average: " + Math.floor(d3.mean(data)) + "% <br /> Max: " + Math.floor(d3.max(data)) + "%";
    });
  });

  chart.on('mouseout', () => {
    d3.select('#tooltip').style('opacity', 0);
  });

  chart.on('mousemove', function() {
    d3.select('#tooltip').style('left', (d3.event.pageX+10) + 'px').style('top', (d3.event.pageY+10) + 'px')
  });

  return true;
}

function secondsToHMS(t) {
  t = Number(t);
  const h = Math.floor(t / 3600);
  const m = Math.floor(t % 3600 / 60);
  const s = Math.floor(t % 3600 % 60);

  const hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
  let mDisplay;
  if (s == 0)
    mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes ") : "";
  else
    mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
  const sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";

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
  const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
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
  return !$.trim(el.html());
}
