$(function () {
  let socket = io();

  setInterval(() => socket.emit('getInfo'), 1000);
  socket.on('getInfo', function(info) {
    $('#uptime').text(secondsToHMS(info.uptime));
    $('#totalmem').text(formatBytes(info.totalmem));
    $('#freemem').text(formatBytes(info.freemem));
    $('#cpuUsage').text(Math.floor(info.cpuUsage * 100) + "%");
  });
});

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
