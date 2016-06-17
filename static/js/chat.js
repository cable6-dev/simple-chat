var acceptedFiletypes = [ "image/png", "image/jpeg", "image/gif" ];
var filesPerMessage = 2;

function timeConverter (UNIX_timestamp) {
    var a = new Date(UNIX_timestamp * 1000);

    var hour = a.getHours();
    var min = a.getMinutes() < 10 ? '0' + a.getMinutes() : a.getMinutes();
    var sec = a.getSeconds() < 10 ? '0' + a.getSeconds() : a.getSeconds();
    var time = '[' +  hour + ':' + min + ':' + sec + ']' ;
    return time;
}

function sendMessage () {
    var pictures = Array.prototype.slice.call(document.querySelectorAll("#form img"), 0, filesPerMessage)
        .map(function (pic) {
            pic.parentNode.parentNode.removeChild(pic.parentNode);
            return pic.src;
        });
    chat.send(JSON.stringify({
        "txt": document.getElementById("msg").value,
        "pics": pictures
    }));
    document.getElementById("msg").value = "";
}

function onFileRead (evt) {
    var div = document.createElement("div");
    div.className = "img-container";
    var img = document.createElement("img");
    img.src = evt.target.result;
    img.addEventListener("click", evt => evt.target.parentNode.parentNode.removeChild(evt.target.parentNode));
    div.appendChild(img);
    document.getElementById("form").appendChild(div);
}

function addFilePreview (file) {
    if (acceptedFiletypes.indexOf(file.type) < 0)
        return alert("Ce type de fichier n'est pas accepté par le chat.");
    var reader = new FileReader();
    reader.addEventListener("load", onFileRead);
    reader.readAsDataURL(file);
}

function onImageClick (evt) {
    // On left click, expand image
    if (evt.which == 1) {
        clazz = "display_full";
        img = evt.target;
        if (img.className == clazz) {
            img.className = "";
        } else {
            img.className = clazz;
        }
        evt.preventDefault();
    }
    // On middle click, open image in new tab/window
    if (evt.which == 2) {
        window.open(evt.target.src);
        evt.preventDefault();
    }
}

function setupChat (evt) {
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

            var images = tmpdiv.getElementsByTagName("img");
            Array.prototype.forEach.call(images, function (img) {
                img.addEventListener("mouseup", onImageClick);
            });

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

    document.getElementById("msg").addEventListener("keydown", function(evt) {
        if (evt.keyCode == 13 && !evt.shiftKey) {
            sendMessage();
            evt.preventDefault();
        }
    });

    document.getElementById("send").addEventListener("click", sendMessage);

    // Prevents the default behavior when drag-and-dropping files in the form from happening
    ['drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop'].forEach(function (event)	{
        document.getElementById("form").addEventListener(event, function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
        });
    });

    document.getElementById("form").addEventListener("drop", function (evt) {
        var files = evt.dataTransfer.files;
        if (files.length <= 0)
            return alert("Le drag-and-drop ne fonctionne pas dans votre navigateur.");
        Array.prototype.forEach.call(files, addFilePreview);
    });

    document.getElementById("pics").addEventListener("change", function (evt) {
        var input = evt.target;
        Array.prototype.forEach.call(input.files, addFilePreview);
        input.value = "";
    });
}

window.addEventListener("load", function (evt) {
    setupChat(evt);
});

window.addEventListener("beforeunload", function (evt) {
    if (chat)
        chat.close();
});
