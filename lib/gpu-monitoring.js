//Framework to monitor GPU, def gonna scrap lol
//Gonna have to write seperate code for intel, amd, nvidia on each platform :(((((
//Maybe in the next decade both nvidia and amd gets their heads out of their asses

const logging = require('logging');
const os = require('os');

const platform = os.platform();
const supported = (platform == "linux" || "win32" || "darwin") ? true : false;
