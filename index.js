const http = require('http');
const os = require('os');
const present = require('present');
const app = require('express')();
const cors = require('cors');
const si = require('systeminformation');
const nodeDiskInfo = require('node-disk-info');

const config = require('./config.json');
const logging = require('./lib/logging.js');

let verbose = false;
if (config.logging == "verbose") verbose = true;

const WebServer = http.createServer(app).listen(config.webPort, (error) => {
  if (error)
    return console.error(error);

  if (config.debug != "none")
    logging("WebServer", "special", "WebServer is now running at port " + config.webPort);
});
const io = require('socket.io')(WebServer);

app.use(cors());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/public.js', (req, res) => {
  res.sendFile(__dirname + '/public/public.js');
});

app.get('/style.css', (req, res) => {
  res.sendFile(__dirname + '/public/style.css');
});

io.on('connection', (socket) => {
  socket.on('getInfo', () => {
    getInfo().then((info) => {
      io.emit('getInfo', info);
    })
  });
});

if (config.apiEnabled == true) {
  const APIServer = http.createServer((req, res) => {
    getInfo((info) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Credentials', true);
      res.write(JSON.stringify(info));
      res.end();
    });
  }).listen(config.apiPort, (error) => {
    if (error)
      return logging("ApiServer", "error", error);
    if (config.debug != "none")
      logging("ApiServer", "special", "Api Server listening on " + config.apiPort);
  });
}

async function getInfo(callback) {
  if (verbose) logging("getInfo", "debug", "getInfo has been called");

  let t0 = present();
  let info = {
    platform: os.platform(),
    freemem:  os.freemem(),
    totalmem: os.totalmem(),
    uptime:   os.uptime(),
    cpuUsage: await si.currentLoad(),
    disks:    await nodeDiskInfo.getDiskInfo()
  };

  let t1 = present();
  if ((t1 - t0) > 2000) logging("getInfo", "warning", "getInfo call is taking unusually long; it took " + (t1 - t0) + " milliseconds to execute");

  if (verbose) {
    logging("getInfo", "debug", "getInfo function took " + (t1 - t0) + " milliseconds to execute.") //Should be close to 100-1000 ms
    logging("getInfo", "debug", JSON.stringify(info));
  }

  if (typeof callback == "function")
    callback(info);
  else
    return info;
}
