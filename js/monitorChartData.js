const WebSocket = require('ws');
const mysql = require('mysql');
const https = require('https');
const fs = require('fs');

// Load SSL certificate and key
const server = https.createServer({
  key: fs.readFileSync('../ssl.key/server.key'),
  cert: fs.readFileSync('../ssl.crt/server.crt')
});   

const wss = new WebSocket.Server({ server });

server.listen(7050, '0.0.0.0',  () => {
    console.log('Secure WebSocket server running on wss://0.0.0.0:7050'); // justine
});

const db = mysql.createConnection({
  host: '172.16.6.212',
  user: 'IMC Testing',
  password: '<3iot2020',
  database: 'sensor_db'
});

let previousData = [];

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', function connection(ws) {
  console.log('Client connected');

  const fetchData = () => {
    const sql = "SELECT No, EquipmentNo, parameter, value, ucl, lcl, unit, DATE_FORMAT(datetime, '%m/%d/%Y %H:%i:%s') AS datetime FROM dht11 ORDER BY No DESC LIMIT 10";

    db.query(sql, (err, results) => {
      if (err) {
        console.error('Error fetching data:', err);
        return;
      }
      const currentData = results.map(row => ({
        label: row.EquipmentNo,
        parameter: row.parameter,
        value: row.value,
        ucl: row.ucl,
        lcl: row.lcl,
        unit: row.unit,
        datetime: row.datetime
      }));

      if (!isEqual(currentData, previousData)) {
        broadcast(currentData); // Broadcast to all clients
        previousData = currentData;
      }
    });
  };

  fetchData();
  const fetchDataInterval = setInterval(fetchData, 1000);

  ws.on('close', function () {
    console.log('Client disconnected');
    clearInterval(fetchDataInterval);
  });
});

function isEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (JSON.stringify(arr1[i]) !== JSON.stringify(arr2[i])) return false;
  }
  return true;
}

