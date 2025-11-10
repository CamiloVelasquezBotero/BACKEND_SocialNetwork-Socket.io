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