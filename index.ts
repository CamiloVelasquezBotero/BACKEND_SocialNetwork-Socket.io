import express from 'express';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import type { ConnectedUsers } from './types/index.js';
dotenv.config() // Habilitamos variables de entorno

// ------ App Express Initialization ----
const app = express() // inicializamos express
const PORT = process.env.PORT || 4000

const appExpress = app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto: ${PORT}`)
})

// -------------------------------WebSockets Socket.io ---------------------------
const io = new Server(appExpress, {cors: {origin: "http://localhost:3000"}})
const connectedUsers:ConnectedUsers = {}

io.on('connection', socket => {

    socket.on('register-user', (userId) => {
        connectedUsers[userId] = socket.id
    })
    
    socket.on('friend-request-sent', ({idReceiver}) => {
        const userIsOnline = connectedUsers[idReceiver]
        if(userIsOnline) {
            io.to(userIsOnline).emit('update-notifications')
        }
    })

})