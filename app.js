const express = require('express')

const app = express()
const http = require('http').Server(app)
const io = require('socket.io')(http)

app.use(express.static('public'))

function getRoomName (socket) {
  return socket.rooms[Object.keys(socket.rooms)[1]]
}

io.on('connection', (socket) => {
  socket.on('join', (roomName) => {
    const room = io.sockets.adapter.rooms[roomName]

    if (room && room.length > 1) {
      io.to(socket.id).emit('room is full', null)
    } else {
      socket.leave(getRoomName(socket))
      socket.join(roomName)
      socket.broadcast.to(roomName).emit('new connection', null)
    }
  })

  socket.on('message', (msg) => {
    console.log('message', msg)
    socket.broadcast.to(getRoomName(socket)).emit('message', msg)
  })

  socket.on('publickey', (key) => {
    socket.broadcast.to(getRoomName(socket)).emit('publickey', key)
  })

  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})

http.listen(3000, function () {
  console.log('App listening on port 3000!')
})

