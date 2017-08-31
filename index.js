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

function emitStockData() {
	var requestsCompleted = 0;
	var requestsToMake = currentStockSymbols.length;
	var updatedStockInfo = [];
	
	currentStockSymbols.forEach(symbol => {
		var stockData = '';
		https.get('https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=' + symbol + '&interval=1min&apikey=' + process.env.APIKEY, res => {
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
					io.sockets.emit('updateStocks', JSON.stringify(updatedStockInfo));
				}
			}); //end res.on('end')
		}); //end https.get
	}); //end .forEach
} //end emitStockData()

io.on('connection', function(socket) {
	console.log('someone connected');
	emitStockData();
	
	//from client on stock symbol request
	socket.on('stockSymbol', function(symbol) {
		if(currentStockSymbols.indexOf(symbol.stockRequested) < 0 && currentStockSymbols.length < 3) { //if not in currentStockSymbols[] && < 4
			currentStockSymbols.push(symbol.stockRequested);		//push symbol to array, remove later if not found in get request
			emitStockData();
		}
	}); //end socket.on('stockSymbol')
}); //end io.on('connection')
