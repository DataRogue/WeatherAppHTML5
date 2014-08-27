//Declare variables

var watchID = null; //Location being watched
var geocoder = new google.maps.Geocoder(); //Get geocoder
var zip; //Current zipcode
var address; //Current address
var locationArray = new Array(); //Array used to create the lists
var historyLength = 5;
var time;
var maxAccuracy = 3; //How many spots it will go to find the zip code
var lattitudeArray = new Array();
var longitudeArray = new Array();

var viewportWidth  = $(window).width();
var viewportHeight = $(window).height();

//Checks to see if local storage is supported or exists
function StartLocalStorage()
{

	if(typeof(Storage)!="undefined")
	{
		if(localStorage["History"]!=undefined && localStorage["Lat"]!=undefined && localStorage["Lng"]!=undefined)
		{
			//If localstorage already exists, it loads it
			LoadLocalStorage();
		}
		else return;
	}
	else
	{
		alert("Your browser doesn't support Local Storage");
	}
}

//Adds additional data to local storage by trimming the array until it fits
function UpdateLocalStorage(address, LT, LG)
{
	if(locationArray.length >= historyLength) while(locationArray.length >= historyLength)locationArray.shift();
	locationArray.push(address);
	localStorage["History"] = JSON.stringify(locationArray);

	if(lattitudeArray.length >= historyLength) while(lattitudeArray.length >= historyLength)lattitudeArray.shift();
	lattitudeArray.push(""+LT);
	localStorage["Lat"] = JSON.stringify(lattitudeArray);

	if(longitudeArray.length >= historyLength) while(longitudeArray.length >= historyLength)longitudeArray.shift();
	longitudeArray.push(""+LG);
	localStorage["Lng"] = JSON.stringify(longitudeArray);
}

function LoadLocalStorage()
{
	locationArray = JSON.parse(localStorage["History"]);
	lattitudeArray = JSON.parse(localStorage["Lat"]);
	longitudeArray = JSON.parse(localStorage["Lng"]);
}
//Parses zipcode
function ZipParse(address)
{

	var temp;
	var tempArray = address.split(" ");
	for(var i = 0; i < tempArray.length; i++)
	{
		if(tempArray[i].length==6 && !isNaN(tempArray[i].slice(0,5)))return tempArray[i].slice(0,5); //Checks to see if it's a 5 digit number
	}
	return null;
}

//Geocodes and calls all the methods dependant on the geocoding
function GetGeo(data)
{

	var lat = data.coords.latitude;
	var lng = data.coords.longitude;
	var latlng = new google.maps.LatLng(lat, lng);
	geocoder.geocode( {'latLng': latlng}, function(results, status)
	{

		if(status == google.maps.GeocoderStatus.OK)
		{
			//This loop goes through the results until it can find a zipcode
			for (var i = 0; i<maxAccuracy;i++)
			{
			address = results[0].formatted_address;
			if(ZipParse(address)!=null)
			{
				break;
			}
			if(i==maxAccuracy-1)
			{
				Alert("Address is unsupported");
				break;
			}
			}
			UpdateLocalStorage(address, lat, lng);
			GenerateLocation(address);
			GenerateNews();
			PrintHistory();
			PrintWeather(lat, lng);
		}

	}
	);
}

//Gets YQL call and updates the already existing HTML data
function GenerateNews()
{
	$.getJSON("http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20rss%20where%20url%20%3D%20'http%3A%2F%2Fnews.google.com%2Fnews%3Fgeo%3D" + zip +"%26output%3Drss'&format=json&diagnostics=true",
        function(data)
        	{
            var info = data.query.results.item;
            for (var i = 1; i<=5;i++)
	            {
	            document.getElementById("new"+i).innerHTML = info[(i-1)].title;
	            document.getElementById("new"+i).href = info[(i-1)].link;
	            }
            }
        );
}

//Parses zip and displays address & the current time
function GenerateLocation(address)
{
	zip = ZipParse(address);
	time = new Date();
	document.getElementById("time").innerHTML = address + "</br>" + time.getMonth()+ "/" + time.getDate() + "/" + time.getFullYear();
}


function geo() {
    // set some geo options
    var opts = {
        enableHighAccuracy: true,
        timeout: 60000,
        maximumAge: 30000 //Needs to be smaller than timeout or it will always timeout due to latency
    };

    // watch the user's location 
    if(navigator.geolocation)
       {watchID = navigator.geolocation.watchPosition(GetGeo, handler, opts);}
    else
        {alert("Geolocation not supported by your browser!");}
}

// stop watching user movement.
function stop_geo() {
    if(watchID != null) {
        navigator.geolocation.clearWatch(watchID);
        watchID = null;
    } else
        alert("Not currently watching the user.");
}

function handler(err) {
    switch(err.code) {
        case err.PERMISSION_DENIED:
                alert("This page is not allowed to view your position. Message: " + err.message);
                break;
        case err.POSITION_UNAVAILABLE: 
                alert("Your position is not available. Message: " + err.message);
                break;
        case err.TIMEOUT:
                alert("Timeout when determining your location.");
                break; 
        default:
            alert("Unknown error occurred! Message: " + err.message);
    }

    // stop the watch, or iPhones will continuously show an error
    stop_geo();
}

//Initial function which resizes the text, loads up local data, and starts up the geocoding process
function displayInfo()
{
	TextResize();
	StartLocalStorage()
	geo();
}

//Procedurally generate lists with an onclick command which will update everything
function PrintHistory()
{
	document.getElementById("history").innerHTML ='<ul id = "historyhue"></ul>';
	for (var i = 0; i < locationArray.length;i++)
	{
		document.getElementById("historyhue").innerHTML = (document.getElementById("historyhue").innerHTML + '<li onclick=' + "'" + 'UpdateHistory("' + i + '","' + locationArray[i] + '")' + "'" + '>' +  locationArray[i] + "</li>");
    };
}

//Update the current location and print the history, and weather as it's dependant on this method being ran first
function UpdateHistory(i, add)
{
	  	GenerateLocation(add);
	  	GenerateNews();
		PrintWeather(lattitudeArray[i], longitudeArray[i]);
}

//Get JSON from YQL server, parse the data from Kelvin to celcious and display it
function PrintWeather(lat, lng)
{
 	$.getJSON("http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20json%20where%20url%3D'http%3A%2F%2Fapi.openweathermap.org%2Fdata%2F2.5%2Fweather%3Flat%3D"+lat+"%26lon%3D"+lng+"'&format=json&diagnostics=true",
    function(data)
    	{
        var info = data.query.results.json;
        document.getElementById("weather").innerHTML = info.weather.description + "</br>" + "Temp: " + (parseInt(info.main.temp) - 273) + " C";
    }

    );
}

//adjust to perspective change
function TextResize()
{
	viewportWidth  = $(window).width();
	viewportHeight = $(window).height();
   if(viewportHeight>viewportWidth)
   {
   	if(historyLength!=6) geo();
  	historyLength = 6;
   	$("#weather").fitText(0.675);
   	$("#time").fitText(0.65);
   	$("#history").fitText(1.225);
   	$("#news").fitText(1.9);
   }
   else
   {
   	if(historyLength!=5) geo();
   	$("#weather").fitText(0.9);
   	$("#time").fitText(1.1);
   	$("#history").fitText(1.8);
   	$("#news").fitText(3);
   }


}
//Minor delay to prevent repeated executing of code
   var resizeTimer;
	$(window).resize(function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(TextResize(), 10000);
});