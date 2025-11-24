import express from 'express';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import type { ConnectedUsers, FriendRequestAcceptedType, RegisterUserType } from './types/index.js';
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

    socket.on('friend-request-accepted', ({userData, idSender, action}:FriendRequestAcceptedType, callback) => {
        if(action == 'accept') {
            // Revisamso si esta conectado para poderle enviar la notificacion
            const isSenderConnected = connectedUsers[idSender]
            if(isSenderConnected) {
                // Agregamos el nuevo amigo al usuario emisor
                isSenderConnected.friendsId.push(userData.id)
                // Enviarle al idSender la notificacion de aceptado
                io.to(isSenderConnected.socketId).emit('request-accepted-notification', userData)
                callback(true) // Retornamos true para decirle que esta conectado
                
                const isUserConnected = connectedUsers[userData.id]
                // Agregamos nuevo amigo al usuario receptor
                if(isUserConnected)
                    isUserConnected.friendsId.push(idSender)
            }
        }
    })

    socket.on('friend-removed', ({userId, userRemovedId}) => {
        // Eliminar del state de amigos conectados
        const isUserConnected = connectedUsers[userId]
        if(isUserConnected) {
            isUserConnected.friendsId = isUserConnected.friendsId.filter(id => id !== userRemovedId)
        }

        // Eliminar amigos del usuario removido tambien
        const isUserRemovedConnected = connectedUsers[userRemovedId]
        if(isUserRemovedConnected) {
            isUserRemovedConnected.friendsId = isUserRemovedConnected.friendsId.filter(id => id !== userId)
            io.to(isUserRemovedConnected.socketId).emit('friend-removed-notification', userId)
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