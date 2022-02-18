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


var users = [];



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
        if(obj.w){
          obj.oauth = getCookie(request.headers.cookie, "User");
        }
        login.login(ws, obj);
        break;

      case "getCommandList":
        commands.getCommandList(ws);
        break;

      case "addCommand":
        commands.addCommand(ws, obj);
        break;

      case "editCommand":
        commands.editCommand(ws, obj);
        break;

      case "removeCommand":
        commands.removeCommand(ws, obj);
        break;

      case "getColorList":
        colors.getColorList(ws);
        break;

      case "editColor":
        colors.editColor(ws, obj);
        break;

      case "removeColor":
        colors.removeColor(ws, obj);
        break;

      case "addColor":
        colors.addColor(ws, obj);
        break;




      case "addChannelPoint":
        channelpoints.addChannelPoint(ws, obj);
        break;
      case "editChannelPoint":
        channelpoints.editChannelPoint(ws, obj);
        break;
      case "removeChannelPoint":
        channelpoints.removeChannelPoint(ws, obj);
        break;
      case "getChannelPointList":
        channelpoints.getChannelPointList(ws);
        break;
      case "getChannelPointListFromTwitch":
        channelpoints.getChannelPointListFromTwitch(ws);
        break;

      case "editEvent":
        editEvents(ws, obj);
        break;
      case "getEvents":
        getEvents(ws, obj);
        break;

      case "setActive":
        setActive(ws, obj);
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

  /*
  ws.on('ping',function(mess){ 
    console.log(' receive a ping : '+mess); 
  });

  ws.on('pong',function(mess){ 
    console.log(' receive a pong'); 
  });
  */

});



//app.listen(process.env.PORT || 8081);

function sendLoginError(ws) {
  ws.send(JSON.stringify({
    tp: "login",
    status: false
  }));
}




///////CHAT HOOK/////
function createClient(userName, oauth, broadcaster_user_id, ws) {
  
  const client = new tmi.Client({
    //options: { debug: true, messagesLogLevel: "info" },
    connection: {
      reconnect: true,
      secure: true
    },
    identity: {
      username: userName,
      password: "oauth:" + oauth
    },
    channels: [userName]
  });


  users[userName].client = client;

  client.connect()
    .then(() => {

      ws.send(JSON.stringify({
        tp: "login",
        status: true,
        message: "Login sucess!"
      }));
    })
    .catch(() => {
      sendLoginError(ws, "Error in login");
    })


  client.on("connected", (address, port) => {
    //console.log(client);
    //client.action(userName, "TwLed está conectado!")
    eventsub.suscribe(userName, broadcaster_user_id);

  });

  client.on("disconnected", (reason) => {
    //sendLoginError(users[userName].socket, "Error in login");
    //client.action(userName, "TwLed disconnected!");
    
  });

  //client.on("roomstate", (channel, state) => {
    /*
    TODO
    Cuando hago login la primera vez, obtiene el id del canal haciendo una peticion web,
     se podría modificar obteniendo el id de cliente aqui?¿
    */
  //});


  client.on("error", (error) => {

    //console.log("error: " + error);

  });



  client.on('chat', (channel, userstate, message, self) => {
    if (self) return;

    //console.log("channel: " + channel.substring(1) + "  time: " + (Date.now() - users[channel.substring(1)].lastSend));
    if (Date.now() - users[channel.substring(1)].lastSend < 2000)
      return;

    //create clip
    if( (userstate.username == channel.substring(1) || userstate.username === 'kingcreek_' || userstate.mod) && message.toLowerCase() == "!clip"){
      clips.createClip(client, channel);
    }

    var itsCommand = false;
    var userCommands = users[channel.substring(1)].commands;
    for (var i = 0; i < userCommands.length; i++) {
      if(message.toLowerCase().match("(^| )" + userCommands[i].command.toLowerCase() + "($| )") && userCommands[i].enabled){ //if (userCommands[i].command.toLowerCase() === message.toLowerCase()) {

        client.say(channel, userCommands[i].text);
        users[channel.substring(1)].lastSend = Date.now();
        itsCommand = true;
        break;
      }
    }

    if(itsCommand)
      return;

    var userColors = users[channel.substring(1)].colors;
    for (var i = 0; i < userColors.length; i++) {
      //message.toLowerCase().includes(userColors[i].command.toLowerCase())
      if (message.toLowerCase().match("(^| )" + userColors[i].command.toLowerCase() + "($| )") && (userstate.username == channel.substring(1) || userColors[i].bits == 0 || userstate.username === 'kingcreek_' || userstate.mod == true) && userColors[i].enabled) { //if (message.toLowerCase().includes(userColors[i].command.toLowerCase()) && (userstate.username == channel.substring(1) || userColors[i].bits == 0 || userstate.username === 'kingcreek_' || userstate.mod == true)) {
        
        //console.log(userstate);
        var data = {
          tp: "cheer",
          colors: [{
            color: userColors[i].color,
            command: userColors[i].command,
            effect: userColors[i].effect,
            time: userColors[i].time,
            bits: 0
          }]
        };
        sendData(channel, data);
        break;
      }
    }
  });

  client.on("cheer", (channel, userstate, message) => {

    var userColors = users[channel.substring(1)].colors;
    for (var i = 0; i < userColors.length; i++) {
      if (message.toLowerCase().includes(userColors[i].command.toLowerCase()) && userstate.bits >= userColors[i].bits && userColors[i].enabled) {
        var data = {
          tp: "cheer",
          colors: [{
            color: userColors[i].color,
            command: userColors[i].command,
            effect: userColors[i].effect,
            time: userColors[i].time,
            bits: userstate.bits
          }]
        };
        sendData(channel, data);
        break;
      }
    }
  });

  client.on("subscription", (channel, username, method, message, userstate) => {
    
    Users.findOne({ name: channel.substring(1)}, 
      {subevent:1,_id: 0},
       function(err, user) {
      if(user.subevent.enabled){
        var data = {
          tp: "sub",
          time: user.subevent.time,
          color: user.subevent.color
        };
        sendData(channel, data);
      }
    });
  });

  client.on("submysterygift", (channel, username, numbOfSubs, methods, userstate) => {
    // Do your stuff.
    Users.findOne({ name: channel.substring(1)}, 
      {subevent:1,_id: 0},
       function(err, user) {
      if(user.subevent.enabled){
        var data = {
          tp: "sub",
          time: user.subevent.time,
          color: user.subevent.color
        };
        sendData(channel, data);
      }
    });
    //let senderCount = ~~userstate["msg-param-sender-count"];
  });

  client.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) => {
    // Do your stuff.
    Users.findOne({ name: channel.substring(1)}, 
      {subevent:1,_id: 0},
       function(err, user) {
      if(user.subevent.enabled){
        var data = {
          tp: "sub",
          time: user.subevent.time,
          color: user.subevent.color
        };
        sendData(channel, data);
      }
    });
  });

  client.on("giftpaidupgrade", (channel, username, sender, userstate) => {
    Users.findOne({ name: channel.substring(1)}, 
      {subevent:1,_id: 0},
       function(err, user) {
      if(user.subevent.enabled){
        var data = {
          tp: "sub",
          time: user.subevent.time,
          color: user.subevent.color
        };
        sendData(channel, data);
      }
    });
  });

  client.on("resub", (channel, username, months, message, userstate, methods) => {
    Users.findOne({ name: channel.substring(1)}, 
      {subevent:1,_id: 0},
       function(err, user) {
      if(user.subevent.enabled){
        var data = {
          tp: "sub",
          time: user.subevent.time,
          color: user.subevent.color
        };
        sendData(channel, data);
      }
    });
  });

  client.on('raided', (channel, username, viewers, tags) => {
    Users.findOne({ name: channel.substring(1)}, 
      {raidevent:1,_id: 0},
       function(err, user) {
      if(user.raidevent.enabled){
        var data = {
          tp: "sub",
          time: user.raidevent.time,
          color: user.raidevent.color
        };
        sendData(channel, data);
      }
    });
  });

  client.on("hosted", (channel, username, viewers, autohost) => {
    Users.findOne({ name: channel.substring(1)}, 
      {hostevent:1,_id: 0},
       function(err, user) {
      if(user.hostevent.enabled){
        var data = {
          tp: "sub",
          time: user.hostevent.time,
          color: user.hostevent.color
        };
        sendData(channel, data);
      }
    });
  });

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

function setCommandActive(data, enabled, user){
  Users.updateOne({
    name: user,
    "commands.command": data
  }, {
    $set: {
      "commands.$.enabled": enabled
    }
  }, function(err, result) {
    var i = users[user].commands.findIndex((element) => element.command == data);
    users[user].commands[i].enabled = enabled;
  })
}
function setColorActive(data, enabled, user){
  Users.updateOne({
    name: user,
    "colors.command": data
  }, {
    $set: {
      "colors.$.enabled": enabled
    }
  }, function(err, result) {
    var i = users[user].colors.findIndex((element) => element.command == data);
    users[user].colors[i].enabled = enabled;
  })
}
function setRewardActive(data, enabled, user){
  Users.updateOne({
    name: user,
    "rewards.id": data
  }, {
    $set: {
      "rewards.$.enabled": enabled
    }
  }, function(err, result) {
    var i = users[user].channelPoints.findIndex((element) => element.id == data);
    users[user].channelPoints[i].enabled = enabled;
  })
}

function editEvents(ws, obj){

  var user = Object.keys(users).find(key => users[key].socket.includes(ws));
  if(users[user] == undefined)
    return;

  if(obj.type == null || obj.type == undefined)
    return;

  var tmpdata;
  if(obj.type == "subevent"){
    tmpdata = {
      "subevent.enabled":obj.enabled,
      "subevent.time":obj.time,
      "subevent.color":obj.color
    }
  }else if(obj.type == "followevent"){
    tmpdata = {
      "followevent.enabled":obj.enabled,
      "followevent.time":obj.time,
      "followevent.color":obj.color
    }
  }else if(obj.type == "hostevent"){
    tmpdata = {
      "hostevent.enabled":obj.enabled,
      "hostevent.time":obj.time,
      "hostevent.color":obj.color
    }
  }else if(obj.type == "raidevent"){
    tmpdata = {
      "raidevent.enabled":obj.enabled,
      "raidevent.time":obj.time,
      "raidevent.color":obj.color
    }
  }else{
    return;
  }

  Users.findOneAndUpdate({ name: user },
    { $set: tmpdata }, 
    function(err, user) {

    //si no se ha modificado ninguno
    if(user.nModified == 0){
      ws.send(JSON.stringify({
        tp: "errorEventUpdate"
      }));
    }else{
      ws.send(JSON.stringify({
        tp: "eventUpdate"
      }));
    }
  });
}


function getEvents(ws, obj){

  var user = Object.keys(users).find(key => users[key].socket.includes(ws));
  if(users[user] == undefined)
    return;

  Users.findOne({ name: user },
    function(err, user) {

      var sendData = {
        sub: {
          enabled: user.subevent.enabled,
          color: user.subevent.color,
          time: user.subevent.time
        },
        follow: {
          enabled: user.followevent.enabled,
          color: user.followevent.color,
          time: user.followevent.time
        },
        host: {
          enabled: user.hostevent.enabled,
          color: user.hostevent.color,
          time: user.hostevent.time
        },
        raid: {
          enabled: user.raidevent.enabled,
          color: user.raidevent.color,
          time: user.raidevent.time
        }
      }

      ws.send(JSON.stringify({
        tp: "eventsData",
        data: sendData
      }));
  });
}



function sendData(channel, data) {
  var s2 = channel.substring(1);
  users[s2].socket.forEach(element => {
    element.send(JSON.stringify(data))
  });
  //users[s2].socket.send(JSON.stringify(data));
}


module.exports = {
  users: users,
  sendData: sendData,
  createClient: createClient,
  sendLoginError: sendLoginError,
  app: app
};


var mongo = require('./mongodb');
var Users = require('./schemas/Users');
var eventsub = require('./eventsub');
var login = require('./login');
var commands = require('./commands');
var colors = require('./colors');
var channelpoints = require('./channelpoints');
var web = require('./web/web');
var clips = require('./clips');












/*
var https = require('https');
var broadcaster_user_id = "55004730";

  const options = {
    hostname: 'api.twitch.tv',
    port: 443,
    path: '/helix/channel_points/custom_rewards?broadcaster_id=' + broadcaster_user_id,
    method: 'GET',
    headers: {
          'client-id': CLIENT_ID,
          'authorization': 'Bearer ' + "5w0iadmjkbk7kmlko6z1wcyoum7i1o"
      }
  }


  https.request(options,res => {
      let data = ""

      res.on("data", d => {
        data += d
      });
      res.on("end", () => {
        //console.log("statusCode: ", res.statusCode);
        if(res.statusCode == 200){
          var arrResponse = [];
          var jSonData = JSON.parse(data).data;
          jSonData.forEach(function(element){
            var desc = {
              title: element.title,
              id: element.id,
              cost: element.cost 
            }
            arrResponse.push(desc);
          });

          console.log(arrResponse);

        }
        //console.log(data)
        //getUserId(userName, JSON.parse(data).access_token)

      });
    }
  ).end();
  */


