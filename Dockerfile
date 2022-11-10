FROM node:16

# Create app dir
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Package app source
COPY . .

# Run

# Defaults
ENV LOGGING=false
ENV APIENABLED=false
ENV PORT=8080
ENV APIPORT=8081
ENV DEBUG=yes

CMD [ "node", "index.js" ]
