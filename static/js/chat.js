
function timeConverter(UNIX_timestamp){
    var a = new Date(UNIX_timestamp * 1000);

    var hour = a.getHours();
    var min = a.getMinutes() < 10 ? '0' + a.getMinutes() : a.getMinutes();
    var sec = a.getSeconds() < 10 ? '0' + a.getSeconds() : a.getSeconds();
    var time = '[' +  hour + ':' + min + ':' + sec + ']' ;
    return time;
}

function sendMessage() {
    chat.send(document.getElementById("msg").value);
    document.getElementById("msg").value = "";
}

function setupChat(evt) {
    document.getElementById("join").addEventListener("click", function(){
        document.getElementById("error").innerHTML = "";
        console.log("join started");

        // Find the protocol to be used
        var url = "ws" + (window.location.protocol == "https:" ? "s" : "") +
            "://" + window.location.hostname;
        // Add port and path. If the port is unknow, default to 8000
        url += ":" + (window.location.port || 8000) + "/ws";
        chat = new WebSocket(url);

        chat.onopen = function(evt) {
            document.getElementById("phase1").style.display = "none";
            document.getElementById("phase2").style.opacity = 1;
            document.getElementById("msg").focus();
        };
        chat.onerror = function(evt) {
            console.log("Websocket Error:",evt);
        };
        chat.onclose = function(evt) {
            console.log("chat closing");
        };
        chat.onmessage = function(evt) {
            // Create a node to create a dom containing the messages
            var tmpdiv = document.createElement("div");
            tmpdiv.innerHTML = evt.data;
            while (tmpdiv.children.length > 0) {
                var message = tmpdiv.children[0];
                var timeSpan = document.createElement("span");
                timeSpan.innerHTML = timeConverter(message.dataset.time);
                message.insertBefore(timeSpan, message.firstChild);
                document.getElementById("messages").appendChild(message);
            }
            document.getElementById("messages").scrollTo(0, 9e6);
        };
    });

    document.getElementById("msg").addEventListener("keydown", function(evt){
        if (evt.keyCode == 13 && !evt.shiftKey) {
            sendMessage();
            evt.preventDefault();
        }
    });

    document.getElementById("send").addEventListener("click", sendMessage);
}

addEventListener("load", function (evt) {
    setupChat(evt);
});
