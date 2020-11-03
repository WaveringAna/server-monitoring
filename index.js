const http = require('http');
const present = require('present');
const app = require('express')();
const cors = require('cors');
const async = require('async');

const config = require('./config.json');
const os = require('./lib/monitoring-utils.js');
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
    getInfo((info) => {
      io.emit('getInfo', info);
    });
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
      return console.error(error);
    if (config.debug != "none")
      logging("ApiServer", "special", "Api Server listening on " + config.apiPort);
  });
}

function getInfo(callback) {
  if (verbose) logging("getInfo", "debug", "getInfo has been called");

  let t0 = present();
  let info = {
    platform: os.platform(),
    freemem: os.freemem(),
    totalmem: os.totalmem(),
    uptime: os.uptime(),
    cpuUsage: null,
    disks: null,
    gpuInfo: null
  }

  async.parallel([
    (cback) => {
      os.cpuUsage((usage) => {
        cback(null, usage)
      })
    },
    (cback) => {
      os.gpuInfo((info) => {
        if (info.includes("error")) cback(info, null);
        else if (info.includes("stderr")) cback(info, null);
        else cback(null, info);
      })
    },
    (cback) => {
      os.diskInfo((info) => {
        if (info.includes("error")) cback(info, null);
        else cback(null, info)
      })
    }
  ], (err, results) => {
    if (err) {
      logging("getInfo", "error", "Error getting info: " + err)
      if (typeof callback == "function")
        callback(info);
      else
        return info;
    }

    info.cpuUsage = results[0];
    //info.gpuInfo = results[1];
    info.disks = results[2];
    if (typeof callback == "function")
      callback(info);
    else
      return info;

    let t1 = present();

    if ((t1 - t0) > 2000) logging("getInfo", "warning", "getInfo call is taking unusually long; it took " + (t1 - t0) + " milliseconds to execute");

    if (verbose) {
      logging("getInfo", "debug", "getInfo function took " + (t1 - t0) + " milliseconds to execute.") //Should be close to 1 second
      logging("getInfo", "debug", JSON.stringify(info));
    }
  })
}
