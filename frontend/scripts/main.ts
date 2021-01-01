//localStorage.debug = '*'; // socket.io debug
localStorage.clear()

import Character from "./character.js";
import User from "./user.js";
import { loadImage, calculateRealCoordinates, scale, postJson } from "./utils.js";
import VideoChunkPlayer from "./video-chunk-player.js";

const io = require("socket.io")

import Vue from "vue"
import { Room, StreamInfo, StreamRequest } from "../../backend/types.js";
import { Player } from "../../backend/users.js";

// @ts-ignore for some reason RecordRTCPromisesHandler isn't include in @types/recordrtc
import RecordRTC, { RecordRTCPromisesHandler } from 'recordrtc';
import { sleep } from "../../utils.js";

const gikopoi = function ()
{
    let socket: any = null;

    let users: { [key: number]: User } = {};
    let currentRoom: Room;
    let currentRoomBackgroundImage: HTMLImageElement

    const gikoCharacter = new Character("giko")
    let myUserID: number;
    let isWaitingForServerResponseOnMovement = false
    let justSpawnedToThisRoom = true
    let isLoadingRoom = false
    let requestedRoomChange = false
    let forceUserInstantMove = false

    async function connectToServer(username: string)
    {
        const loginResponse = await postJson("/login", { userName: username })

        myUserID = await loginResponse.json()

        socket = io()

        socket.on("connect", function ()
        {
            vueApp.connectionLost = false;
            socket.emit("user-connect", myUserID);
            // TODO, give the server a way to reply "sorry, can't reconnect you"
            // so we can show a decent error message
        });

        socket.on("disconnect", () =>
        {
            const sound = document.getElementById("connection-lost-sound") as HTMLMediaElement
            sound.play()
            vueApp.connectionLost = true;
        })
        socket.on("server-cant-log-you-in", () =>
        {
            vueApp.connectionLost = true;
        })

        socket.on("server-update-current-room-state", async function (roomDto: Room, usersDto: Player[])
        {
            isLoadingRoom = true

            currentRoom = roomDto
            users = {}

            // TODO We need actual room names
            vueApp.roomname = currentRoom.id;

            for (const u of usersDto)
                addUser(u);

            currentRoomBackgroundImage = await loadImage(currentRoom.backgroundImageUrl)
            for (const o of currentRoom.objects)
            {
                o.image = await loadImage("rooms/" + currentRoom.id + "/" + o.url)
                const { x, y } = calculateRealCoordinates(currentRoom, o.x, o.y);
                o.physicalPositionX = x
                o.physicalPositionY = y
            }

            // Force update of user coordinates using the current room's logics (origin coordinates, etc)
            forcePhysicalPositionRefresh()

            document.getElementById("room-canvas")!.focus()
            justSpawnedToThisRoom = true
            isLoadingRoom = false
            requestedRoomChange = false

            // stream stuff
            vueApp.roomAllowsStreaming = currentRoom.streams.length > 0

            console.log(currentRoom)

            // TODO THIS WON'T WORK FOR MULTIPLE STREAMS IN THE SAME ROOM!
            const activeStream = currentRoom.streams.find(s => s.isActive)

            if (activeStream)
            {
                vueApp.someoneIsStreaming = true
                vueApp.currentStreamerName = users[activeStream.userId].name
            }
        });

        socket.on("server-msg", function (userName: string, msg: string)
        {
            if (userName != "SYSTEM")
            {
                const msgSound = document.getElementById("message-sound") as HTMLMediaElement
                msgSound.play()
            }

            const chatLog = document.getElementById("chatLog")!;
            chatLog.innerHTML += userName + ": " + msg + "<br/>";
            chatLog.scrollTop = chatLog.scrollHeight;
        });

        socket.on("server-stats", function (serverStats)
        {
            vueApp.serverStats = serverStats;
        });

        socket.on("server-move", function (userId: number, x: number, y: number, direction: 'up' | 'down' | 'left' | 'right', isInstant: boolean)
        {
            const user = users[userId];

            const oldX = user.logicalPositionX
            const oldY = user.logicalPositionY

            if (isInstant)
                user.moveImmediatelyToPosition(currentRoom, x, y, direction)
            else
                user.moveToPosition(x, y, direction)

            if (userId == myUserID)
            {
                isWaitingForServerResponseOnMovement = false
                if (oldX != x || oldY != y)
                    justSpawnedToThisRoom = false
            }
        });

        socket.on("server-reject-movement", () => isWaitingForServerResponseOnMovement = false)

        socket.on("server-user-joined-room", async function (user: Player)
        {
            const loginSound = document.getElementById("login-sound") as HTMLMediaElement
            loginSound.play()
            addUser(user);
        });

        socket.on("server-user-left-room", function (userId: number)
        {
            if (userId != myUserID)
                delete users[userId];
        });

        const receivedVideoPlayer = new VideoChunkPlayer(document.getElementById("received-video-1")!)

        socket.on("server-stream-data", function (data: ArrayBuffer)
        {
            receivedVideoPlayer.playChunk(data)
        })
        socket.on("server-not-ok-to-stream", (reason: string) =>
        {
            vueApp.wantToStream = false
            showWarningToast(reason)
        })
        socket.on("server-ok-to-stream", () =>
        {
            vueApp.wantToStream = false
            vueApp.iAmStreaming = true
            vueApp.someoneIsStreaming = true
            startStreaming()
        })
        socket.on("server-stream-started", (streamInfo: StreamInfo) =>
        {
            vueApp.someoneIsStreaming = true
            vueApp.currentStreamerName = users[streamInfo.userId].name
        })
        socket.on("server-stream-stopped", (streamInfo: { streamSlotId: number }) =>
        {
            vueApp.someoneIsStreaming = false
            receivedVideoPlayer.stop() // kinda useless, now that i'm using the someoneIsStreaming variable to drive the visibility of the video player
        })

        let version = Infinity

        async function ping()
        {
            if (vueApp.connectionLost)
                return
            const response = await postJson("/ping/" + myUserID, { userId: myUserID })
            const { version: newVersion } = await response.json()
            // if (newVersion > version)
            // {
            //     // TODO refresh page while keeping username ,selected character and room
            //     showWarningToast("Sorry, a new version of gikopoi2 is ready, please refresh this page!")
            // }
            // else
            // {
            //     version = newVersion
            // }
        }

        setInterval(ping, 1000 * 60)
    }

    function addUser(userDTO: Player)
    {
        const newUser = new User(gikoCharacter, userDTO.name);
        newUser.moveImmediatelyToPosition(currentRoom, userDTO.position.x, userDTO.position.y, userDTO.direction);
        users[userDTO.id] = newUser;
    }

    function getContext(): CanvasRenderingContext2D 
    {
        const element = document.getElementById("room-canvas") as HTMLCanvasElement

        return element.getContext("2d")!
    }

    function drawImage(image: HTMLImageElement, x: number, y: number, roomScale?: number)
    {
        if (!image) return // image might be null when rendering a room that hasn't been fully loaded

        if (!roomScale)
            roomScale = 1

        const context = getContext();
        context.drawImage(image,
            x,
            y - image.height * scale * roomScale,
            image.width * scale * roomScale,
            image.height * scale * roomScale)
    }

    function drawHorizontallyFlippedImage(image: HTMLImageElement, x: number, y: number)
    {
        const context = getContext();
        context.scale(-1, 1)
        drawImage(image, - x - image.width / 2, y)
        context.setTransform(1, 0, 0, 1, 0, 0); // clear transformation
    }

    function drawCenteredText(text: string, x: number, y: number)
    {
        const context = getContext();
        // const width = context.measureText(text).width
        context.font = "bold 13px Arial, Helvetica, sans-serif"
        context.textBaseline = "bottom"
        context.textAlign = "center"
        context.fillStyle = "blue"
        context.fillText(text, x, y)
    }

    // TODO: Refactor this entire function
    async function paint()
    {
        if (forceUserInstantMove)
        {
            forcePhysicalPositionRefresh()
            forceUserInstantMove = false
        }

        const context = getContext();
        context.fillStyle = "#c0c0c0"
        context.fillRect(0, 0, 721, 511)

        if (currentRoom)
        {
            // draw background
            drawImage(currentRoomBackgroundImage, 0, 511, currentRoom.scale)

            let allObjects: {
                o: any,
                type: string,
                priority: number
            }[] = currentRoom.objects.map(o => ({
                o,
                type: "room-object",
                priority: o.x + 1 + (currentRoom.grid[1] - o.y)
            }))

            allObjects = allObjects.concat(Object.values(users).map(o => ({
                o,
                type: "user",
                priority: o.logicalPositionX + 1 + (currentRoom.grid[1] - o.logicalPositionY)
            })))

            allObjects = allObjects.sort((a, b) =>
            {
                if (a.priority < b.priority) return -1
                if (a.priority > b.priority) return 1
                return 0
            })

            for (const o of allObjects)
            {
                if (o.type == "room-object")
                {
                    drawImage(o.o.image, o.o.physicalPositionX, o.o.physicalPositionY, currentRoom.scale)
                }
                else // o.type == "user"
                {
                    if (!isLoadingRoom)
                    {
                        // draw users only when the room is fully loaded, so that the "physical position" calculations
                        // are done with the correct room's data.
                        drawCenteredText(o.o.name.replace(/&gt;/g, ">").replace(/&lt;/g, "<"), o.o.currentPhysicalPositionX + 40, o.o.currentPhysicalPositionY - 95)

                        switch (o.o.direction)
                        {
                            case "up":
                            case "right":
                                drawHorizontallyFlippedImage(o.o.getCurrentImage(currentRoom), o.o.currentPhysicalPositionX, o.o.currentPhysicalPositionY)
                                break;
                            case "down":
                            case "left":
                                drawImage(o.o.getCurrentImage(currentRoom), o.o.currentPhysicalPositionX, o.o.currentPhysicalPositionY)
                                break;
                        }
                    }

                    o.o.spendTime(currentRoom)
                }
            }
        }
        changeRoomIfSteppingOnDoor()

        requestAnimationFrame(paint)
    }

    function changeRoomIfSteppingOnDoor()
    {
        if (justSpawnedToThisRoom) return
        if (isWaitingForServerResponseOnMovement) return
        if (requestedRoomChange) return

        const currentUser = users[myUserID]

        if (currentUser.isWalking) return

        vueApp.steppingOnPortalToNonAvailableRoom = false

        const door = currentRoom.doors.find(d =>
            d.x == currentUser.logicalPositionX &&
            d.y == currentUser.logicalPositionY)

        if (!door) return

        const { targetRoomId, targetX, targetY } = door

        if (targetRoomId == "NOT_READY_YET")
        {
            vueApp.steppingOnPortalToNonAvailableRoom = true
            return
        }

        if (webcamStream)
            stopStreaming()

        requestedRoomChange = true
        socket.emit("user-change-room", { targetRoomId, targetX, targetY });
    }

    function forcePhysicalPositionRefresh()
    {
        for (const u of Object.values(users))
            u.moveImmediatelyToPosition(currentRoom, u.logicalPositionX, u.logicalPositionY, u.direction)
    }

    function sendNewPositionToServer(direction: 'up' | 'down' | 'left' | 'right')
    {
        if (isLoadingRoom || isWaitingForServerResponseOnMovement || users[myUserID].isWalking)
            return

        isWaitingForServerResponseOnMovement = true
        socket.emit("user-move", direction);
    }

    function sendMessageToServer()
    {
        const inputTextbox = document.getElementById("input-textbox") as HTMLInputElement

        if (inputTextbox.value == "") return;
        socket.emit("user-msg", inputTextbox.value);
        inputTextbox.value = "";
    }

    function registerKeybindings()
    {
        function onKeyDown(event: KeyboardEvent)
        {
            switch (event.key)
            {
                case "ArrowLeft": sendNewPositionToServer("left"); break;
                case "ArrowRight": sendNewPositionToServer("right"); break;
                case "ArrowUp": sendNewPositionToServer("up"); break;
                case "ArrowDown": sendNewPositionToServer("down"); break;
            }
        }

        document.getElementById("room-canvas")!.addEventListener("keydown", onKeyDown);

<<<<<<< HEAD:frontend/scripts/main.ts
        document.getElementById("textBox")!.addEventListener("keydown", (event) =>
{
            if (event.key != "Enter") return
            sendMessageToServer()
        })

        document.getElementById("send-button")!.addEventListener("click", () => sendMessageToServer())
        document.getElementById("start-streaming-button")!.addEventListener("click", () => wantToStartStreaming())
        document.getElementById("stop-streaming-button")!.addEventListener("click", () => stopStreaming())

        document.getElementById("btn-move-left").addEventListener("click", () => sendNewPositionToServer("left"))
        document.getElementById("btn-move-up").addEventListener("click", () => sendNewPositionToServer("up"))
        document.getElementById("btn-move-down").addEventListener("click", () => sendNewPositionToServer("down"))
        document.getElementById("btn-move-right").addEventListener("click", () => sendNewPositionToServer("right"))

        document.getElementById("infobox-button").addEventListener("click", function ()
        {
            document.getElementById("infobox").classList.toggle("hidden");
        });

        window.addEventListener("focus", () =>
        {
            forceUserInstantMove = true
        });
    }

    // WebRTC

    let webcamStream: MediaStream | null;

    async function wantToStartStreaming()
    {
        try
        {
            vueApp.wantToStream = true
            webcamStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: { aspectRatio: { ideal: 1.333333 } }
            })

            socket.emit("user-want-to-stream", <StreamRequest>{
                streamSlotId: 0,
                withVideo: true,
                withSound: true,
            })
        }
        catch (err)
        {
            showWarningToast("sorry, can't find a webcam")
            vueApp.wantToStream = false
            webcamStream = false
        }
    }

    async function startStreaming()
    {
        const element = document.getElementById("local-video") as HTMLMediaElement
        element.srcObject = webcamStream;
        element.style.display = "block";

        const recorder = new RecordRTC(webcamStream!, { type: "video" })
        while (webcamStream)
        {
            recorder.startRecording()
            await sleep(1000);
            await recorder.stopRecording();
            let blob = await recorder.getBlob();
            if (webcamStream)
            {
                socket.emit("user-stream-data", blob);
            }
        }
    }

    function stopStreaming()
    {
        vueApp.iAmStreaming = false
        vueApp.someoneIsStreaming = false
        for (const track of webcamStream!.getTracks())
            track.stop()

        const element = document.getElementById("local-video") as HTMLMediaElement
        element.srcObject = webcamStream = null;
        element.style.display = "none"
        socket.emit("user-want-to-stop-stream")
    }

    // async function logout()
    // {
    //     await postJson("/logout", { userID: myUserID })
    // }

    return {
        login: async function (username: string)
        {
            await gikoCharacter.loadImages()
            // await loadRoom("admin_st")
            registerKeybindings()
            await connectToServer(username)
            paint()


        }
    }
}();

function showWarningToast(text)
{
    // TODO make this a nice, non-blocking message
    alert(text)
}

const vueApp = new Vue({
    el: '#vue-app',
    data: {
        username: "",
        roomname: "",
        serverStats: {
            userCount: 0
        },
        loggedIn: false,
        wantToStream: false,
        iAmStreaming: false,
        someoneIsStreaming: false, // this won't be enough when we allow more than one stream slot in the same room
        roomAllowsStreaming: false,
        currentStreamerName: "",
        connectionLost: false,
        steppingOnPortalToNonAvailableRoom: false,
    },
    methods: {
        login: function (ev: Event)
        {
            ev.preventDefault()
            if (this.username === "")
                this.username = "名無しさん"
            this.loggedIn = true
            gikopoi.login(this.username).catch(console.error)
        }
    }
})
