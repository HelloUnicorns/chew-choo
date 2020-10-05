# Chew Choo!
#### Multiplayer game by HelloGravity, RainbowUnicorn & Meap (LD47 Jam Entry)

**'Chew Choo!'** is a multiplayer web-game where the player controls a train on a cyclic route (loop!).  
The routes of trains of different players have cross each other,  
and the goal of the game is to be the last one standing by running over other trains.  
The player's route will expand and merge with the routes of the trains it runs over.  

This game was created for the Ludum Dare #47 Jam competition.  
The theme of the competition: 'Stuck in a loop'.  

  
## Play Online

EU Server: https://chew-choo-eu.herokuapp.com/  
US Server: https://chew-choo-us.herokuapp.com/  
  
## Game Controls
Press **up** arrow key to speed up.  
Press **down** arrow key to slow down.  
Press **m** to toggle music.  
  
## Build and run locally
The server was tested on Windows & Linux.
1. Install git (see https://git-scm.com/downloads)
2. Install node.js (see https://nodejs.org/)
3. Run the following in a terminal or command prompt:

        git clone https://github.com/HelloUnicorns/LD47.git
        cd LD47
        npm install .
        npm run build
        npm run start

The server will start at port 3000 unless a PORT environment variable is specified.  
Connect with http://localhost:3000/  



