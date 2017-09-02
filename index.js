var express = require('express');
var socket = require('socket.io');
var https = require('https');
require('dotenv').config()

//app setup
var app = express();
var server = app.listen(3000, function () {
	console.log('Listening on port 3000');
});

//static files
app.use(express.static('public'));

//socket setup
var io = socket(server);
var currentStockSymbols = ['AAPL'];

function emitStockData(timeFilter, id, socket) {
	console.log(id);
	var requestsCompleted = 0;
	var requestsToMake = currentStockSymbols.length;
	var updatedStockInfo = [];
	
	currentStockSymbols.forEach(symbol => {
		var stockData = '';
		var url = 'https://www.alphavantage.co/query?function=' + timeFilter + '&symbol=' + symbol;
		
		if(timeFilter === "TIME_SERIES_INTRADAY") {
			url += '&interval=1min&apikey=' + process.env.APIKEY;
		} else {
			url += '&apikey=' + process.env.APIKEY; 
		}
		
		https.get(url, res => {
			res.setEncoding('utf8');
			
			res.on('data', result => {
				stockData += result;
			});
			
			res.on('end', () => {
				stockData = JSON.parse(stockData);
				console.log(stockData["Meta Data"]);
				
				if (stockData["Error Message"]) { //stock symbol requested doesn't exist					
					console.log('error finding stock symbol');
					currentStockSymbols = currentStockSymbols.filter(item => item !== symbol);
				} else { //stock symbol requested found
					console.log('stock found');
					if(stockData["Meta Data"]) {
						updatedStockInfo.push(stockData);
					} else {
						currentStockSymbols = currentStockSymbols.filter(item => item !== symbol);
					}
				}
				
				requestsCompleted ++;
				console.log('requests completed = '+requestsCompleted);
				if (requestsCompleted === requestsToMake) {
					console.log(currentStockSymbols);
					io.to(id).emit('updateStocks', JSON.stringify(updatedStockInfo), currentStockSymbols);
				}
			}); //end res.on('end')
		}); //end https.get
	}); //end .forEach
} //end emitStockData()

io.on('connection', function(socket) {
	console.log('someone connected');
	socket.timeInterval = "TIME_SERIES_INTRADAY";
	emitStockData(socket.timeInterval, socket.id, socket);
	
	//from client on stock symbol request
	socket.on('stockSymbol', function(symbol) {
		if(currentStockSymbols.indexOf(symbol.stockRequested) < 0 && currentStockSymbols.length < 3) { //if not in currentStockSymbols[] && < 3
			currentStockSymbols.push(symbol.stockRequested);		//push symbol to array, remove later if not found in get request
			emitStockData(socket.timeInterval, socket.id, socket);
			socket.broadcast.emit('update');
		}
	}); //end socket.on('stockSymbol')

	socket.on('changeInterval', function(selectedInterval) {
		socket.timeInterval = selectedInterval.selectedInterval;
		emitStockData(socket.timeInterval, socket.id, socket);
	});
}); //end io.on('connection')
