'use strict';


var app = require('express')();
var http = require('http');


var server = http.Server(app);
const {Server} = require('ws');
const wss = new Server({
  server/*,
  verifyClient: function(info, done) {

    console.log(info.origin);

    if(info.origin == 'https://twled.herokuapp.com')
      done(true);
    else
      done(false, 403, 'Not valid token');
  }*/
});


var ledsSocket = [];



const port = process.env.PORT || 8080;
server.listen(port, function() {
  console.log("Server is now running...");
});








function noop() {}
setInterval(() => {
  wss.clients.forEach((client) => {
    client.ping(noop);
  });
}, 10000);



wss.on('connection', (ws, request) => {
  console.log('Client connected');

  ws.on('message', function incoming(data) {

    var obj = "";
    try {
      obj = JSON.parse(data);
      if (obj.tp == undefined) {
        ws.send(JSON.stringify({
          tp: "invalid"
        }));
        return;
      }
    } catch (e) {
      ws.send(JSON.stringify({
        tp: "invalid"
      }));
      return;
    }

    switch (obj.tp) {
      case "REGISTERESP32":
        ledsSocket.push(ws);
      break;
      default:
        console.log(obj);
        sendData(obj);
        break;

      
    }

  });

  //ws.send('something');

  ws.on('close', () => {
    console.log('Client disconnected')

    //ledsSocket.push(ws);
    if(ledsSocket.includes(ws)){
      ledsSocket.splice(ledsSocket.indexOf(ws), 1);
    }

    /*
    for (var key in users) {
      if (users[key].socket.includes(ws)) {
        if(users[key].socket.length == 1){
          eventsub.unsuscribe(key, users[key].broadcaster_user_id);
          users[key].client.disconnect();
          delete users[key];
        }else{
          for(var i = 0; i < users[key].socket.length; i++){
            if(users[key].socket[i] == ws){
              users[key].socket.splice(i, 1);
              break;
            }
          }
          
        }
        break;
      }
    }
    */

  });

});



//app.listen(process.env.PORT || 8081);

function sendLoginError(ws) {
  ws.send(JSON.stringify({
    tp: "login",
    status: false
  }));
}




function sendData(data) {
  ledsSocket.forEach(element => {
    element.send(JSON.stringify(data))
  });
  //users[s2].socket.send(JSON.stringify(data));
}


