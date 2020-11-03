const os = require('os');
const osutils = require('os-utils');
const nodeDiskInfo = require('node-disk-info');
const {
  exec,
  spawn
} = require("child_process");

exports.platform = function() {
  return os.platform();
}
exports.freemem = function() {
  return os.freemem();
}
exports.totalmem = function() {
  return os.totalmem();
}
exports.uptime = function() {
  return os.uptime();
}
exports.cpuUsage = function(callback) {
  osutils.cpuUsage((usage) => {
    if (typeof callback == "function")
      callback(usage)
    else return usage;
  });
}
exports.diskInfo = function(callback) {
  nodeDiskInfo.getDiskInfo()
    .then(disks => {
      if (typeof callback == "function")
        callback(disks);
      else return disks;
    })
    .catch(reason => {
      callback("error: " + reason);
      console.error(reason);
    });
}
exports.diskInfoSync = function() {
  try {
    return nodeDiskInfo.getDiskInfoSync();
  } catch (e) {
    console.error(e);
  }
}
exports.loadavg = function(t) {
  return os.loadavg(t);
}

exports.gpuInfo = function(callback) {
  if (process.platform == "win32") {
    exec("wmic path win32_VideoController get name", (error, stdout, stderr) => {
      if (error) {
        console.log('error: ' + error);
        callback('error: ' + error);
      }
      if (stderr) {
        console.log('stderr: ' + stderr);
        callback('stderr: ' + stderr);
      }
      if (stdout) {
        callback(stdout);
      }
    });
  } else if (process.platform == "darwin") {
    exec("system_profiler SPDisplaysDataType", (error, stdout, stderr) => {
      if (error) {
        console.log('error: ' + error);
        callback('error: ' + error);
      }
      if (stderr) {
        console.log('stderr: ' + stderr);
        callback('stderr: ' + stderr);
      }
      if (stdout) {
        callback(stdout);
      }
    });
  } else if (process.platform == "linux") {
    exec("sudo lshw -C display", (error, stdout, stderr) => {
      if (error) {
        console.log('error: ' + error);
        callback('error: ' + error);
      }
      if (stderr) {
        console.log('stderr: ' + stderr);
        callback('stderr: ' + stderr);
      }
      callback(stdout);
    });
  } else {
    console.log('Unsupported Platform: ' + os.platform());
    callback('unsupported');
  }
}
