///////////make connection////////////
var socket = io.connect('http://localhost:3000'); //local
//var socket = io.connect('https://mystocks.glitch.me/'); //glitch

////////////query DOM////////////
var symbolInput = document.getElementById('symbolInput'),
	getStockBtn = document.getElementById('getStockBtn'),
	intervalBtns = document.getElementsByClassName('intervalBtn'),
	stockCanvas = document.getElementById('stockCanvas'),
	allElements = document.getElementsByTagName('*');
		
var selectedInterval = "TIME_SERIES_INTRADAY";
var loading = true;
startLoading();

//add listener for all .intervalBtn
for(var i=0; i<intervalBtns.length; i++) {
	intervalBtns[i].addEventListener('click', updateInterval, false); 
}

////////////functions////////////
function startLoading() {
	loading = true;
	
	for(var i=0; i<allElements.length; i++) {
		allElements[i].classList.add('wait');	
	}
} //end loading()

function doneLoading() {
	for(var i=0; i<allElements.length; i++) {
		allElements[i].classList.remove('wait');	
	}
	loading = false;
} //end doneLoading()

function updateInterval() {
	if (!loading) {
		startLoading();
		var id = this.getAttribute('id');
	
		//remove .selectedInterval from intervalBtn that has it and add it to clicked button
		for (var i=0; i<intervalBtns.length; i++) {
			if(intervalBtns[i].classList.contains('selectedInterval')) {
				intervalBtns[i].classList.remove('selectedInterval'); } }
		
		this.classList.add('selectedInterval');
		selectedInterval = id;
		
		changeInterval();
	}
} //end updateInterval()

function emitStockSymbol() {
	if(!loading) {
		startLoading();
		
		socket.emit('stockSymbol', {
			stockRequested: symbolInput.value.toUpperCase(),
			selectedInterval: selectedInterval
		});
	}
} //end emitInfo

function changeInterval() {
	socket.emit('changeInterval', {
		selectedInterval: selectedInterval
	});
} //end changeInterval

function deleteStock(symbol) {
	if(!loading) {
		startLoading();
		socket.emit('deleteStock', {
			deleteSymbol: symbol
		});
	}
}

//these call emitInfo() to get new stock
getStockBtn.addEventListener('click', emitStockSymbol);
symbolInput.addEventListener('keyup', function(e) {
	if(e.keyCode === 13) {
		emitStockSymbol(); }
});

////////////create chart////////////
var myChart = new Chart(document.getElementById("stockCanvas"), {
	type: 'line',
	data: {},
  	options: {
		scales:{
		  xAxes:[{
		    	gridLines:{
		      	color:'#999' },
				ticks:{
					fontColor: 'black' }
		  	}],
			yAxes:[{
				gridLines:{
					color: '#999' },
				ticks:{
					fontColor:'black' }
		  	}],
		},  		
  		responsive: false,
     	legend: {
        	display: true,
	   	'onClick': function (evt, item) {
				deleteStock(item.text); },
         'onHover': function() {
         	stockCanvas.style.cursor = 'pointer'; },
         labels: {
             fontColor: 'black' },
      },
		hover: {
      	onHover: function() {
      		stockCanvas.style.cursor = 'default'; }
     	},
      title: {
      	display: true,
      	text: 'Stocks other people add will show up here in real time - three stocks maximum - to remove a stock click the label',
			fontColor: 'black',
			fontFamily: 'Arial Narrow'
      }   	
	}
}); //end new Chart

////////////from server////////////
socket.on('update', function() {
	if(!loading) {
		startLoading();
		changeInterval();
	}
});

//see this link for example response data
//https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=MSFT&interval=1min&apikey=demo
//currentStocks will be an array of these objects
socket.on('updateStocks', function(currentStocks) {
	
	var stockData = JSON.parse(currentStocks); //full JSON
	if (stockData.length === 0) {
		myChart.data.datasets = {};
		myChart.update();
	} else {
	
		var keysForIndex = Object.keys(stockData[0]); //keys for first in array(index 0)
		var timeLabels = Object.keys(stockData[0][keysForIndex[1]]);	//*Time Labels* e.g. "2017-08-28 16:00:00" -starting with most recent and working backwards  
		var datasets = []; 
		var colors = ['white','black','#666'];
		var i = 0;
			
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
			var tempDataset = {};
			tempDataset.data = stockValues.reverse();
			tempDataset.label = stockSymbol;
			tempDataset.borderColor = colors[i];
			tempDataset.fill = false;
			datasets.push(tempDataset);
			
			i++;
		}); //end stockData.forEach	
		
		doneLoading();		
		
		//send data to chart
		myChart.data.labels = timeLabels.reverse();
		myChart.data.datasets = datasets;
		myChart.update();
	} //end else
}); //end socket.on('updateStocks')
