## Simple open source server monitoring software made with Node.js

![](https://i.nekomimi.pet/!NBrWUPmghk)

[A Live Demo](https://demoservermonitoring.fly.dev/ "Live Demo").

Requirements
------------
* node v16+

Configure
-------------

### Environment variables

Environment variables are used for configuration
They are set automatically as default through the Dockerfile and are assumed if none are provided

- `LOGGING`
  - Enables verbose logging, this is a boolean
  - The default value is false
- `APIENABLED`
  - Enables the API, this is a boolean
  - The default value is false
- `PORT`
  - The port for the webpage
  - The default value is 8080
- `APIPORT`
  - The port for the API
  - The default value is 8081

Run
-------------

### Running from source

```bash
node index.js
```

### Running from Docker
```bash
docker run -d waveringana/server-monitoring \
  -p 8080:8080 \
  -e LOGGING=false \
  =e APIENABLED=false \
  -e PORT=8080 \
  -e APIPORT=8081 \
  waveringana/server-monitoring
```

### Running from Docker-Compose
```yml
version: "3.0"
services:
  server-monitoring
    image: waveringana/server-monitoring
    container_name server-monitoring
    environment:
      - LOGGING=false
      - APIENABLED=false
      - PORT=8080
      - APIPORT=8081
    ports:
      - 8080:8080
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
```

API
-------------
Default port is 9001, posts a JSON string, example
```
{"platform":"linux","freemem":1154822144,"totalmem":3862515712,"uptime":607068,"cpuUsage":0}
```

TODO
-------------
* Networking Polling
* GPU Polling
* Maybe a rewrite to go-lang for better hardware polling
