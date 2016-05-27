# simple-chat
A very simple web chat for cable6.net


## General

This is a very simple chat server written in Go.

The server is basically a webserver which serves the files necessary to run the chat clients in a browser, plus it handles the chat traffic via websockets.

## Usage

### Dev
- Download the dependencies `go get github.com/gorilla/websocket`
- Download the project `go get github.com/cable6-dev/simple-chat`
- Add TLS certificates or uncomment the "http.ListenAndServe" line in server.go
- run the server: `go run server.go`
- connect to the server from any computer in your local network: `http://_server_ip_or_name_:8000/chat.html`

### Production
- Upload server.go and statics files to the production server
- Include chat.html somewhere in your website (index.html is an exemple for a webserver that support PHP)
- Make sure that jquery is avaiable at yourwebsite.com/js/jquery.min.js

That's it! 
