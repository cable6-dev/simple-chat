package main

import (
	"bytes"
	"fmt"
	"html"
	"encoding/json"
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"
	"github.com/gorilla/websocket"
)

const filesPerMessage int = 2; // remember to update the corresponding variable in chat.js

//############ JSONMESSAGE TYPE
type JSONMessage struct {
	Txt  string   `json:"txt"`
	Pics []string `json:"pics"`
}

//############ CHATROOM TYPE AND METHODS

type ChatRoom struct {
	clients map[int]Client
	clientsMtx sync.Mutex
	queue   chan string
	curId   int
}

//initializing the chatroom
func (cr *ChatRoom) Init() {
	// fmt.Println("Chatroom init")
	cr.queue = make(chan string, 5)
	cr.clients = make(map[int]Client)

	//the "heartbeat" for broadcasting messages
	go func() {
		for {
			cr.BroadCast()
			time.Sleep(100 * time.Millisecond)
		}
	}()
}

//registering a new client
//returns pointer to a Client, or Nil, if the name is already taken
func (cr *ChatRoom) Join(conn *websocket.Conn) *Client {
	defer cr.clientsMtx.Unlock();

	cr.clientsMtx.Lock(); //preventing simultaneous access to the `clients` map
	cr.curId = cr.curId + 1
	id := cr.curId
	client := Client{
	        id:        id,
		conn:      conn,
		belongsTo: cr,
	}
	cr.clients[id] = client
	
	cr.AddMsg(" has joined the chat. (" + 
		strconv.Itoa(len(cr.clients)) + " anons in the chat)", nil, true)
	return &client
}

//leaving the chatroom
func (cr *ChatRoom) Leave(cl *Client) {
	cr.clientsMtx.Lock(); //preventing simultaneous access to the `clients` map
	delete(cr.clients, cl.id)
	cr.clientsMtx.Unlock(); 
	cr.AddMsg(" has left the chat.", nil, true)
}

//formating a message
func FormatMsg(msg string, pictures []string, sys bool) string {
	var str bytes.Buffer;
	// Open a div with the date
	str.WriteString("<div data-time=\""+ strconv.FormatInt(time.Now().Unix(), 10) +"\">");

	// Add the pseudonym
	str.WriteString("<strong>anon");
	if (!sys) {
		str.WriteString(":");
	}
	str.WriteString("</strong>")

	str.WriteString("<span>");

	// Add pictures, if needed (using str.WriteString because it's O(n))
	if (pictures != nil) {
		for i := 0; i < len(pictures) && i < filesPerMessage; i++ {
			str.WriteString("<img src='");
			str.WriteString(pictures[i]);
			str.WriteString("'>");
		}
	}

	// Add the rest of the message
	str.WriteString(msg);
	str.WriteString("</span>");

	// Close the div
	str.WriteString("</div>");

	return str.String();
}

//formating and adding message to queue
func (cr *ChatRoom) AddMsg(msg string, pictures []string, sys bool) {
	cr.queue <- FormatMsg(msg, pictures, sys)
}

//broadcasting all the messages in the queue in one block
func (cr *ChatRoom) BroadCast() {
	msgBlock := ""
infLoop:
	for {
		select {
		case m := <-cr.queue:
			msgBlock += m
		default:
			break infLoop
		}
	}
	if len(msgBlock) > 0 {
		for _, client := range cr.clients {
			client.Send(msgBlock)
		}
	}
}

//################CLIENT TYPE AND METHODS

type Client struct {
	id        int
	conn      *websocket.Conn
	belongsTo *ChatRoom
}

//Client has a new message to broadcast
func (cl *Client) NewMsg(msg []byte) {
	JSONMsg := JSONMessage{}
	json.Unmarshal(msg, &JSONMsg);
	if len(JSONMsg.Txt) > 0 || len(JSONMsg.Pics) > 0 {
		cl.belongsTo.AddMsg(html.EscapeString(JSONMsg.Txt), JSONMsg.Pics, false)
	}
}

//Exiting out
func (cl *Client) Exit() {
	cl.belongsTo.Leave(cl)
}

//Sending message block to the client
func (cl *Client) Send(msgs string) {
	cl.conn.WriteMessage(websocket.TextMessage, []byte(msgs))
}

//global variable for handling all chat traffic
var chat ChatRoom

//##############SERVING STATIC FILES
func staticFiles(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./static/"+r.URL.Path)
}

//##############HANDLING THE WEBSOCKET
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true }, //not checking origin
}

//this is also the handler for joining to the chat
func wsHandler(w http.ResponseWriter, r *http.Request) {
	oldMsg := ""

	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		fmt.Println("Error upgrading to websocket:", err)
		return
	}
	go func() {
		client := chat.Join(  conn)
		if client == nil || err != nil {
			conn.Close() //closing connection to indicate failed Join
			return
		}

		//then watch for incoming messages
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil { //if error then assuming that the connection is closed
				client.Exit()
				return
			}
			if (string(msg) != oldMsg){
				client.NewMsg(msg)
			}
			oldMsg = string(msg)
		}

	}()
}


//Printing out the various ways the server can be reached by the clients
func printClientConnInfo() {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		fmt.Println("Oops: " + err.Error())
		return
	}

	fmt.Println("Chat clients can connect at the following addresses:\n")

	for _, a := range addrs {
		if a.String() != "0.0.0.0" {
			fmt.Println("http://" + a.String() + ":8000/chat.html\n")
		}
	}
}

//#############MAIN FUNCTION and INITIALIZATIONS

func main() {
	printClientConnInfo()
	http.HandleFunc("/ws", wsHandler)
	http.HandleFunc("/", staticFiles)
	chat.Init()
	// err := http.ListenAndServe(":8000", nil) //uncomment if you don't have a tls certificate
	err := http.ListenAndServeTLS(":8000", "cert.pem", "key.pem", nil)
	fmt.Println(err)
}
