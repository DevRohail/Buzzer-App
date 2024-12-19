// Import required modules
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Initialize the app and server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 3000;

let players = [];  // Store player names
let gameStarted = false;  // Track if the game has started

// Serve the main page
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Buzzer App</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    background: linear-gradient(135deg, #1e3c72, #2a5298);
                    color: white;
                }
                #container {
                    text-align: center;
                    width: 90%;
                    max-width: 400px;
                    background: #222;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.3);
                }
                h1, h2 {
                    margin: 0 0 20px;
                }
                button {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    font-size: 16px;
                    cursor: pointer;
                    color: white;
                    margin: 5px;
                    width: 100%;
                    box-sizing: border-box;
                }
                button#buzz, button#join {
                    background: #f44336; /* Red color */
                }
                button#buzz:disabled, button#join:disabled {
                    background: #d32f2f; /* Disabled color */
                    cursor: not-allowed; 
                }
                input {
                    padding: 10px;
                    font-size: 16px;
                    border-radius: 5px;
                    border: none;
                    margin-bottom: 10px;
                    width: 100%;
                    box-sizing: border-box;
                }
                .hidden {
                    display: none;
                }

                /* Mobile-Friendly Design */
                @media (max-width: 600px) {
                    h1 {
                        font-size: 24px;
                    }
                    h2 {
                        font-size: 18px;
                    }
                    button {
                        font-size: 14px;
                        padding: 8px 16px;
                    }
                }
            </style>
        </head>
        <body>
            <div id="container">
                <h1 id="title">Buzzer App</h1>
                <h2 id="status">Set your name to join!</h2>
                <div id="name-setup">
                    <input type="text" id="player-name" placeholder="Enter your name">
                    <button id="join">Join</button>
                </div>
                <div id="player-interface" class="hidden">
                    <h2 id="player-status">Waiting for reset...</h2>
                    <button id="buzz" disabled>Buzz</button>
                </div>
            </div>

            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                const title = document.getElementById("title");
                const status = document.getElementById("status");
                const playerStatus = document.getElementById("player-status");
                const nameInput = document.getElementById("player-name");
                const joinButton = document.getElementById("join");
                const buzzButton = document.getElementById("buzz");
                const nameSetup = document.getElementById("name-setup");
                const playerInterface = document.getElementById("player-interface");

                let playerName = "";

                // Handle join button click
                joinButton.addEventListener("click", () => {
                    playerName = nameInput.value.trim();
                    if (!playerName) {
                        alert("Please enter your name.");
                        return;
                    }

                    // Emit a join event with the player's name
                    socket.emit("join", playerName);
                });

                // Handle buzz button click
                buzzButton.addEventListener("click", () => {
                    socket.emit("buzz", playerName);
                });

                // Listen for server events
                socket.on("buzzed", (player) => {
                    status.textContent = \`\${player} buzzed in!\`;
                    playerStatus.textContent = \`\${player} buzzed in!\`;
                    buzzButton.disabled = true;
                });

                socket.on("reset", () => {
                    status.textContent = "Waiting for players to buzz...";
                    playerStatus.textContent = "Waiting for players to buzz...";
                    buzzButton.disabled = false;
                });

                socket.on("name-taken", () => {
                    alert("This name is already taken. Please choose another one.");
                    nameInput.value = "";  // Clear input field
                });

                socket.on("join-success", (playerName) => {
                    // Hide name input and display player interface once name is accepted
                    nameSetup.classList.add("hidden");
                    playerInterface.classList.remove("hidden");
                    status.textContent = "Waiting for reset...";
                    title.textContent = \`Player: \${playerName}\`;
                });
            </script>
        </body>
        </html>
    `);
});

// Admin page for host controls
app.get("/admin", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Admin - Buzzer App</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #222;
                    color: white;
                    text-align: center;
                    padding: 50px;
                }
                button {
                    padding: 10px 20px;
                    font-size: 16px;
                    border-radius: 5px;
                    background-color: #f44336;
                    color: white;
                    border: none;
                    cursor: pointer;
                    width: 100%;
                    box-sizing: border-box;
                }
                button:hover {
                    background-color: #d32f2f;
                }
                h2 {
                    margin-top: 20px;
                }
                #player-status {
                    margin-top: 20px;
                }

                /* Mobile-Friendly Design */
                @media (max-width: 600px) {
                    button {
                        font-size: 14px;
                        padding: 8px 16px;
                    }
                    h1 {
                        font-size: 24px;
                    }
                    h2 {
                        font-size: 18px;
                    }
                    #player-status {
                        font-size: 14px;
                    }
                }
            </style>
        </head>
        <body>
            <h1>Admin Controls</h1>
            <button id="reset">Reset Buzzer</button>
            <h2>Waiting for players to buzz...</h2>
            <h3 id="player-status">No player has buzzed yet.</h3>
        
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();

                // Handle reset button click
                document.getElementById("reset").addEventListener("click", () => {
                    socket.emit("reset");
                });

                // Update player buzzed information
                socket.on("buzzed", (player) => {
                    document.getElementById("player-status").textContent = \`\${player} has buzzed!\`;
                });

                socket.on("reset", () => {
                    document.querySelector("h2").textContent = "Waiting for players to buzz...";
                    document.getElementById("player-status").textContent = "No player has buzzed yet.";
                });
            </script>
        </body>
        </html>
    `);
});

// Handle player joining
io.on("connection", (socket) => {
    console.log("A user connected");

    // Listen for join requests
    socket.on("join", (playerName) => {
        // Ensure case-insensitive name conflict check
        if (players.some(existingPlayer => existingPlayer.toLowerCase() === playerName.toLowerCase())) {
            socket.emit("name-taken"); // Emit event if name is taken
        } else {
            players.push(playerName); // Add new player
            console.log(`${playerName} has joined.`);
            socket.emit("join-success", playerName); // Notify player of success
        }
    });

    // Handle buzz requests
    socket.on("buzz", (playerName) => {
        if (gameStarted) {
            console.log(`${playerName} buzzed!`);
            io.emit("buzzed", playerName); // Notify both admin and players
            gameStarted = false; // Disable further buzzes until reset
        }
    });

    // Handle reset requests
    socket.on("reset", () => {
        console.log("Resetting buzzer");
        players = []; // Clear the player list
        gameStarted = true; // Allow players to buzz again
        io.emit("reset"); // Notify everyone that the game has been reset
    });

    // Disconnect handler
    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

// Start the server
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
