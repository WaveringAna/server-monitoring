const http = require('http');
const app = require('express')();
const cors = require('cors');
const config = require('./config.json');
const os = require('./lib/monitoring-utils.js');

const WebServer = http.createServer(app).listen(config.webPort, (error) => {
  if (error)
    return console.error(error);
  console.log("Web Server listening on " + config.webPort);
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
    console.log("Api Server listening on " + config.apiPort);
  });
}

function getInfo(callback) {
  let info = {
    platform: os.platform(),
    freemem: os.freemem(),
    totalmem: os.totalmem(),
    uptime: os.uptime(),
    cpuUsage: null,
    disks: os.diskInfoSync()
  }

  os.cpuUsage((v) => {
    info.cpuUsage = v;
    if (typeof callback == "function")
      callback(info)
  });
}
