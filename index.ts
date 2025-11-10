import express from 'express';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import type { ConnectedUsers, RegisterUserType } from './types/index.js';
import { connect } from 'http2';
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

    socket.on('register-user', ({userId, friendsId}:RegisterUserType) => {
        connectedUsers[userId] = {
            socketId: socket.id,
            friendsId
        }
        
        // Notify each friend of the user that this user has just connected
        const friendsOnline = friendsId.filter(friendId => connectedUsers[friendId])
        friendsOnline.forEach(friendId => {
            const userConnected = connectedUsers[friendId]
            if(userConnected) {
                io.to(userConnected.socketId).emit('friend-connected', userId)
            }
        })

        // Notify the user his friends connected
        socket.emit('friends-online', friendsOnline)
    })
    
    socket.on('friend-request-sent', ({idReceiver}) => {
        const userIsOnline = connectedUsers[idReceiver]
        if(userIsOnline) {
            socket.to(userIsOnline.socketId).emit('update-notifications')
        }
    })

    socket.on('disconnect', () => {
        const userDisconnected = Object.keys(connectedUsers).find(userId => connectedUsers[userId]?.socketId === socket.id)
        if(userDisconnected) {
            const userInfo = connectedUsers[userDisconnected]
            const friendsId = userInfo?.friendsId || []

            delete connectedUsers[userDisconnected]

            friendsId.forEach(friendId => {
                const friend = connectedUsers[friendId]
                if(friend) {
                    io.to(friend.socketId).emit('friend-disconnected', Number(userDisconnected))
                }
            })
            
            
            socket.emit('friends-online', connectedUsers)
        }
    })

})