const http = require('http');
const os = require('os');
const present = require('present');
const express = require('express');
const cors = require('cors');
const si = require('systeminformation');
const nodeDiskInfo = require('node-disk-info');

const logging = require('./lib/logging.js');

const Version = "0.3"; //Update if getInfo returns new info

const log = process.env.LOGGING || false;
const apiEnabled = process.env.APIENABLED || false;
const webPort = process.env.PORT || 8080;
const apiPort = process.env.APIPORT || 8081;
const debug = process.env.DEBUG || "none";

let Verbose = false;
if (log == "verbose") Verbose = true;

const app = express();
app.use(cors());
app.use(express.static('public'));

const WebServer = http.createServer(app).listen(webPort, (error) => {
  let t0 = present();
  if (error)
    return console.error(error);

  if (debug != "none")
    logging("WebServer", "special", "WebServer is now running at port " + webPort + " and took " + (present() - t0).toFixed(2) + " milliseconds to start");
});
const io = require('socket.io')(WebServer);

io.on('connection', (socket) => {
  socket.on('getInfo', () => {
    getInfo().then((info) => {
      io.emit('getInfo', info);
    });
  });

  socket.on('getProcessInfo', (service) => {
    getProcessInfo(service).then((info) => {
      io.emit('getProcessInfo', info);
    });
  });

  socket.on('getNetworkInfo', () => {
    getNetworkInfo().then((info) => {
      io.emit('getNetworkInfo', info);
    });
  });
});

if (apiEnabled == true) {
  const APIServer = http.createServer((req, res) => {
    getInfo((info) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Credentials', true);
      res.write(JSON.stringify(info));
      res.end();
    });
  }).listen(apiPort, (error) => {
    if (error)
      return logging("ApiServer", "error", error);
    if (debug != "none")
      logging("ApiServer", "special", "Api Server listening on " + apiPort);
  });
}

async function getInfo() {
  if (Verbose) logging("getInfo", "debug", "getInfo has been called");

  let t0 = present();
  let info = {
    serverVer: Version,
    platform:  os.platform(),
    freemem:   os.freemem(),
    totalmem:  os.totalmem(),
    uptime:    os.uptime(),
    cpuUsage:  await si.currentLoad(),
    disks:     await nodeDiskInfo.getDiskInfo()
  };

  let t1 = present();
  if ((t1 - t0) > 3000) logging("getInfo", "warning", "A getInfo call took unusually long to execute and took " + (t1 - t0) + " milliseconds to execute");

  if (Verbose) {
    logging("getInfo", "debug", "getInfo function took " + (t1 - t0) + " milliseconds to execute.") //Should be close to 100-1000 ms
    logging("getInfo", "debug", JSON.stringify(info));
  }

  return info;
}

async function getProcessInfo(service) {
  if (Verbose) logging("getProcessInfo", "debug", "getProcessInfo has been called");

  let t0 = present();
  let info = await si.services(service);

  let t1 = present();
  if ((t1 - t0) > 3000) logging("getProcessInfo", "warning", "A getProcessInfo call took unusually long to execute and took " + (t1 - t0) + " milliseconds to execute");

  if (Verbose) {
    logging("getProcessInfo", "debug", "getProcessInfo function took " + (t1 - t0) + " milliseconds to execute.") //Should be close to 100-1000 ms
    logging("getProcessInfo", "debug", JSON.stringify(info));
  }

  return info;
}

async function getNetworkInfo() {
  if (Verbose) logging("getNetworkInfo", "debug", "getNetworkInfo has been called");

  let t0 = present();
  let info = await si.networkInterfaces();

  let t1 = present();
  if ((t1 - t0) > 3000) logging("getNetworkInfo", "warning", "A getNetworkInfo call took unusually long to execute and took " + (t1 - t0) + " milliseconds to execute");

  if (Verbose) {
    logging("getNetworkInfo", "debug", "getNetworkInfo function took " + (t1 - t0) + " milliseconds to execute.") //Should be close to 100-1000 ms
    logging("getNetworkInfo", "debug", JSON.stringify(info));
  }

  return info;
}
