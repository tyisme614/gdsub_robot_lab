var io = require('socket.io');


const EventEmitter = require('events');

class MsgEmitter extends EventEmitter{}

var mEmitter = new MsgEmitter();


mEmitter.on('state', function(data){

    });

var clients = [];

var sendMsg = function(event, arg){
    console.log('sendMsg');
    mEmitter.emit(event, arg);
}

var msgrpc = function(server, app){

    

    //listen to event to get video download state
    app.on('state', function(data){
        //console.log(data.msg + '  token=' + data.token);
        var c = clients[data.token];
        c.send(data.msg);
    });

    //listen to error message
    app.on('error', function(err){
      console.error('encountered error: ' + err);
      
    });



    // Create a Socket.IO instance, passing it our server
    var socket = io(server);
    
    // Add a connect listener
    socket.on('connection', function(client){ 
       console.log('new client connected, token=' + client.handshake.query.token);

       clients[client.handshake.query.token] = client;
      // Success!  Now listen to messages to be received
      client.on('message',function(msg){ 
        console.log('Received message from client!' , msg);
        var type = msg.split(';')[0];
        console.log('type=' + type);
        switch(type){
          case '1001'://get client state
            console.log('socket.io 1001');
            client.send('received 1001');
          break;
          case '1002'://get user list
          console.log('socket.io  1002');
          break;

        }

      });
      client.on('disconnect',function(){
        //clearInterval(interval);
        console.log('Server has disconnected');
      });

    });
}

module.exports.startSocket = msgrpc;

module.exports.sendMsg = sendMsg;

console.log('\n\n\n****end of msgrpc.js***\n\n\n');