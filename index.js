'use strict';


var app = require('express')();
var http = require('http');



const tmi = require('tmi.js');


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


var ledsSocket;



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
      case "Login":
        //si es desde el navegador, se recibe "w:'b'"
        if(obj.iAmTheServerinKingcreekHouse){
          ledsSocket = ws;
        }
        //login.login(ws, obj);
        break;

      case "getCommandList":
        //commands.getCommandList(ws);
        break;

      
    }

  });

  //ws.send('something');

  ws.on('close', () => {
    console.log('Client disconnected')

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

  });

});



//app.listen(process.env.PORT || 8081);

function sendLoginError(ws) {
  ws.send(JSON.stringify({
    tp: "login",
    status: false
  }));
}



function setActive(ws, obj){
  var user = Object.keys(users).find(key => users[key].socket.includes(ws));
  if(users[user] == undefined)
    return;

  if(obj.type == null || obj.type == undefined)
    return;

  var dataType;
  var dataTypeSet;
  var dataSearch;
  if(obj.type == "command"){
    setCommandActive(obj.data.command, obj.enabled, user);
  }else if(obj.type == "color"){
    setColorActive(obj.data.command, obj.enabled, user);
  } else if(obj.type == "reward"){
    setRewardActive(obj.data.id, obj.enabled, user);
  }
}




function sendData(channel, data) {
  var s2 = channel.substring(1);
  users[s2].socket.forEach(element => {
    element.send(JSON.stringify(data))
  });
  //users[s2].socket.send(JSON.stringify(data));
}


