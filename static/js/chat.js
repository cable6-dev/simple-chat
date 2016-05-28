
function timeConverter(UNIX_timestamp){
    var a = new Date(UNIX_timestamp * 1000);

    var hour = a.getHours();
    var min = a.getMinutes() < 10 ? '0' + a.getMinutes() : a.getMinutes();
    var sec = a.getSeconds() < 10 ? '0' + a.getSeconds() : a.getSeconds();
    var time = '[' +  hour + ':' + min + ':' + sec + ']' ;
    return time;
}

function setupChat(evt) {
    console.log("hello");
    $("INPUT").val("");
    $("#name").keypress(function(evt){
        if (evt.originalEvent.keyCode==13) {
            $("#join").trigger("click");
        }
    });

    //handling the start of the chat
    $("#join").click(function(){
        $("#error").html("");
        console.log("join started");

        // Find the protocol to be used
        var url = "ws" + (window.location.protocol == "https:" ? "s" : "") +
            "://" + window.location.hostname;
        // Add port and path. If the port is unknow, default to 8000
        url += ":" + (window.location.port || 8000) + "/ws";
        chat = new WebSocket(url);

        chat.onopen = function(evt) {
            $("#phase1").animate({opacity:0},500,"linear",function(){
                $("#phase1").css({display:"none"});
                $("#phase2").css({opacity:1});
                $("#msg").focus();
            });
        };
        chat.onerror = function(evt) {
            console.log("Websocket Error:",evt);
        };
        chat.onclose = function(evt) {
            console.log("chat closing")
                $("#phase1").stop().css({display:"block"}).animate({opacity:1},500);
                $("#phase2").stop().animate({opacity:0});
                $("#error").html("That name was already used!");
        };
        chat.onmessage = function(evt) {
            $("#messages").append(evt.data).scrollTop(9e6);
            var time = $("#messages").children().last().attr("data-time");
            $("#messages").children().last().prepend("<span>" + timeConverter( time ) + "</span>");
        };
    });

    $("#msg").keypress(function(evt){
        if(evt.originalEvent.keyCode == 13 && !evt.originalEvent.shiftKey){
            $("#send").trigger("click");
            evt.preventDefault();
        }
    });

    $("#send").click(function(){
        chat.send($("#msg").val());
        $("#msg").val("");
    });
};

addEventListener("load", function (evt) {
    setupChat(evt);
});
