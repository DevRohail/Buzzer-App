// Import required modules
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Initialize app and server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 3000;

let players = new Set(); // Use a Set to store unique player names (case-sensitive)
let gameStarted = false; // Track game state

// Serve the player page
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Player - Buzzer App</title>
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
                    margin-top: 10px;
                    background: #f44336;
                    width: 100%;
                    box-sizing: border-box;
                }
                input {
                    padding: 10px;
                    font-size: 16px;
                    border-radius: 5px;
                    border: none;
                    margin-top: 10px;
                    width: 100%;
                    box-sizing: border-box;
                }
                #status {
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div id="container">
                <h1>Buzzer App</h1>
                <h2 id="join-text">Enter your name to join:</h2>
                <input type="text" id="player-name" placeholder="Enter your name">
                <button id="join">Join</button>
                <h2 id="status" style="display: none;">Waiting for buzzer to be reset...</h2>
                <button id="buzz" style="display: none;" disabled>Buzz</button>
            </div>

            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                const joinButton = document.getElementById("join");
                const buzzButton = document.getElementById("buzz");
                const nameInput = document.getElementById("player-name");
                const statusText = document.getElementById("status");
                const joinText = document.getElementById("join-text");

                let playerName = "";

                joinButton.addEventListener("click", () => {
                    playerName = nameInput.value.trim();
                    if (!playerName) {
                        alert("Please enter a name.");
                        return;
                    }
                    socket.emit("join", playerName);
                });

                buzzButton.addEventListener("click", () => {
                    socket.emit("buzz", playerName);
                });

                socket.on("join-success", () => {
                    joinText.style.display = "none";
                    joinButton.style.display = "none";
                    nameInput.style.display = "none";
                    statusText.style.display = "none"; // Hide the status text when player can buzz
                    buzzButton.style.display = "block";
                    statusText.textContent = "Waiting for buzzer to be reset..."; // Show the waiting text when player joins
                    statusText.style.display = "block";
                });

                socket.on("name-taken", () => {
                    alert("Name already taken. Please choose another name.");
                });

                socket.on("buzzed", (player) => {
                    statusText.style.display = "block";
                    statusText.textContent = \`\${player} buzzed in!\`;
                    buzzButton.disabled = true;
                    socket.emit('update-buzzed', player); // Notify admin panel who buzzed
                });

                socket.on("reset", () => {
                    statusText.textContent = "Waiting for buzzer to be reset...";
                    statusText.style.display = "block";
                    buzzButton.disabled = false;
                });

                socket.on("reset-complete", () => {
                    statusText.style.display = "none"; // Remove the "waiting for buzzer" text after reset
                });
            </script>
        </body>
        </html>
    `);
});

// Serve the admin panel
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
            <h2 id="game-status">Waiting for buzzer to reset...</h2>
        
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();

                // Handle reset button click
                document.getElementById("reset").addEventListener("click", () => {
                    socket.emit("reset");
                });

                // Update player buzzed information
                socket.on("buzzed", (player) => {
                    document.getElementById("game-status").textContent = \`\${player} has buzzed!\`; // Display player who buzzed
                });

                socket.on("reset", () => {
                    document.getElementById("game-status").textContent = "Waiting for player to buzz..."; // Reset message after reset
                    socket.emit("reset-complete"); // Notify player screens to remove waiting text
                });
            </script>
        </body>
        </html>
    `);
});

// Handle socket events
io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("join", (playerName) => {
        const lowerCaseName = playerName.toLowerCase(); // Convert to lowercase for consistent comparison
        if (Array.from(players).some(player => player.toLowerCase() === lowerCaseName)) {
            socket.emit("name-taken");
        } else {
            players.add(playerName); // Add original case-sensitive name
            io.emit("players-update", Array.from(players)); // Notify admin
            socket.emit("join-success");
        }
    });

    socket.on("buzz", (playerName) => {
        io.emit("buzzed", playerName); // Notify all players and admin when someone buzzes
    });

    socket.on("reset", () => {
        players.clear(); // Clear player list
        io.emit("reset"); // Notify players and admin to reset
    });

    socket.on("reset-complete", () => {
        io.emit("reset-complete"); // Notify player screens to remove waiting text
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected");
        // Remove player from the list on disconnect
        players.forEach((player) => {
            if (player === socket.id) {
                players.delete(player);
            }
        });
        io.emit("players-update", Array.from(players)); // Update the admin with the player list
    });
});

// Start the server
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
