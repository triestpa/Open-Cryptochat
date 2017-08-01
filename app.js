const express = require('express')

const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)

// Serve webapp directory
app.use(express.static('public'))

/** Manage behavior of each client socket connection */
io.on('connection', (socket) => {
  // If you need to scale the app horizontally using multiple node instances,
  // you'll need to store the socket state in a persisent store such as Redis.
  // For more info, see here: https://github.com/socketio/socket.io-redis

  // Store the room that the socket is connected to
  let currentRoom = null

  /** Process a room join request. */
  socket.on('join', (roomName) => {
    // Get chatroom info
    let room = io.sockets.adapter.rooms[roomName]

    // Reject join request if room already has more than 1 connection
    if (room && room.length > 1) {
      // Notify user that their join request was rejected
      io.to(socket.id).emit('room is full', null)

      // Notify room that someone tried to join
      socket.broadcast.to(roomName).emit('intrusion attempt', null)
    } else {
      // Leave current room
      socket.leave(currentRoom)

      // Notify room that user has left
      socket.broadcast.to(currentRoom).emit('user disconnected', null)

      // Join new room
      currentRoom = roomName
      socket.join(currentRoom)

      // Notify user of room join success
      io.to(socket.id).emit('room joined', null)

      // Notify room that user has joined
      socket.broadcast.to(currentRoom).emit('new connection', null)
    }
  })

  /** Broadcast a recieved message to the room */
  socket.on('message', (msg) => {
    console.log(msg.text)
    socket.broadcast.to(currentRoom).emit('message', msg)
  })

  /** Broadcast a new publickey to the room */
  socket.on('publickey', (key) => {
    socket.broadcast.to(currentRoom).emit('publickey', key)
  })

  /** Broadcast a disconnection notification to the room */
  socket.on('disconnect', () => {
    socket.broadcast.to(currentRoom).emit('user disconnected', null)
  })
})

const port = process.env.PORT || 3000
http.listen(port, () => {
  console.log(`Chat server listening on port ${port}.`)
})

