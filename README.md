## Simple open source server monitoring software made with Node.js

![](https://i.nekomimi.pet/$/mDKyA)

Requirements
------------
* node v7+

```bash
sudo apt-get install npm
sudo npm install n -g
sudo n stable
npm update
npm install
```

Configure
-------------
config.json is the configuration file.

Run
-------------
```bash
npm start
```

API
-------------
Default port is 9001, posts a JSON string, example
```
{"platform":"linux","freemem":1154822144,"totalmem":3862515712,"uptime":607068,"cpuUsage":0}
```
 
TODO
-------------
* Networking Statistics
* Drive Statistics
