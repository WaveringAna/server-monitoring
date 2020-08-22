const os = require('os');
const osutils = require('os-utils');
const nodeDiskInfo = require('node-disk-info');

exports.platform = function() { return os.platform(); }
exports.freemem = function() { return os.freemem(); }
exports.totalmem = function () { return os.totalmem(); }
exports.uptime = function () { return os.uptime(); }
exports.cpuUsage = function (callback) {
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
      console.error(reason)
    });
}
exports.diskInfoSync = function() {
  try {
    return nodeDiskInfo.getDiskInfoSync();
  } catch (e) {
    console.error(e);
  }
}
exports.loadavg = function(t) { return os.loadavg(t); }
