function run(wss) {
    wss.on('connection', (ws) => {
        console.log('Client connected');
        ws.on('close', () => console.log('Client disconnected'));
    });
  
    setInterval(() => {
        wss.clients.forEach((client) => {
            client.send(new Date().toTimeString());
        });
    }, 1000);
  
}

exports.run_game = run;