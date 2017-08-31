///////////make connection////////////
var socket = io.connect('http://localhost:3000'); //local
//var socket = io.connect('https://mystocks.glitch.me/'); //glitch

////////////query DOM////////////
var stockInput = document.getElementById('symbolInput'),
	getStockBtn = document.getElementById('getStockBtn');


////////////functions////////////
symbolInput.addEventListener('keyup', function(e) {
	if(e.keyCode === 13) {
		socket.emit('stockSymbol', {
		stockRequested: symbolInput.value.toUpperCase()
		});
	}
});

getStockBtn.addEventListener('click', function() {
	socket.emit('stockSymbol', {
		stockRequested: symbolInput.value.toUpperCase()
	});
});

////////////create chart////////////
var myChart = new Chart(document.getElementById("stockCanvas"), {
	type: 'line',
	data: {},
  	options: {
  		responsive: false,
	}
}); //end new Chart


////////////from server////////////
//see this link for example response data
//https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=MSFT&interval=1min&apikey=demo
//currentStocks will be an array of these objects

socket.on('updateStocks', function(currentStocks) {
	var stockData = JSON.parse(currentStocks); //full JSON
	console.log(stockData);
	var keysForIndex = Object.keys(stockData[0]); //keys for first in array(index 0)
	var timeLabels = Object.keys(stockData[0][keysForIndex[1]]);	//*Time Labels* e.g. "2017-08-28 16:00:00" -starting with most recent and working backwards  
	var datasets = []; 
	
	//create chart data from currentStocks
	stockData.forEach(stock => {
		var stockKeys = Object.keys(stock); //"Meta Data" & "Time Series (1min)" or "Time Series (other interval)"	
		var stockSymbol = stock[stockKeys[0]]["2. Symbol"]; //get stock symbol
		var stockTimes = Object.keys(stock[stockKeys[1]]);
		var stockValues = [];

		//create array of prices
		stockTimes.forEach(time => {
			stockValues.push(stock[stockKeys[1]][time]["4. close"]);
		});
		
		//create object to push to datasets - to use in the chart
		var tempDataset = {}
		tempDataset.data = stockValues.reverse();
		tempDataset.label = stockSymbol;
		tempDataset.borderColor = "black";
		tempDataset.fill = false;
		datasets.push(tempDataset);
	}); //end stockData.forEach	
	
	/*datasets: [{ 
        data: [86,114,106,106,107,111,133,221,783,2478],
        label: "Africa",
        borderColor: "#3e95cd",
        fill: false
    }, */
	
	//send data to chart
	myChart.data.labels = timeLabels.reverse();
	myChart.data.datasets = datasets;
	myChart.update();
}); //end socket.on('updateStocks')
