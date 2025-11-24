export type ConnectedUsers = {
    [userId:string]: {
        socketId: string,
        friendsId: number[]
    }
}

export type RegisterUserType = {
    userId: number,
    friendsId: [
        id: number
    ]
}

export type FriendRequestAcceptedType = {
    userData: {
        id: number,
        name: string,
        email: string,
    },
    idSender: number,
    action: string
}