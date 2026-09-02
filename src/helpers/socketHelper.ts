import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { jwtHelpers } from "../utils/jwtHelpers";
import config from "../config";


let io : Server

const initializeSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Authentication middleware
    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.token;

        if (!token) {
            return next(new Error("Authentication failed"));
        } else {
            try {

                const cleanToken = token.replace('Bearer ','')
                const verifiedUser = jwtHelpers.verifyToken(cleanToken, config.jwt.secret as string);

                socket.handshake.auth.user = verifiedUser as any

                return next();
            } catch (error) {
                return next(new Error("Authentication failed"));
            }
        }
    });

    // Connection event handler
    io.on("connection", (socket: Socket) => {
        console.log("Connected: " + socket.id);
        console.log("User: ", socket.handshake.auth.user);

        socket.on("disconnect", () => {
            console.log("Disconnected: " + socket.id);
        });
    });

    return io;
};


export const getIO = () => {
    if(!io){
        throw new Error("Socket not initialized")
    }
    return io
}


export const socketHelper = {
    initializeSocket,
    getIO
}


