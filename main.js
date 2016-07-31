(function(){
	function template(string, data) {
		return string.replace(/%\w+%/g, function(all) {
			return data[all.replace(/%/gi, '')] || all;
		});
	}

	function TFLClient() {
		this.endpoints = {
			'status_tube' : 'https://api.tfl.gov.uk/line/mode/tube/status',
			'status_rail' : 'https://api.tfl.gov.uk/line/mode/national-rail/status',
			'journey_planning' : 'https://api.tfl.gov.uk/journey/journeyresults/%0%/to/%1%'
		};
	}

	TFLClient.prototype.getStatus = function() {
		return fetch(this.endpoints.status_tube).then(response => response.json()).then(data => {
			console.log(data);
			return data;
		}).catch(error => {
			console.error('STATUS FAILED: ', error);
		});
	}

	TFLClient.prototype.getJourneyData = function(from, to) {
		let requestUrl = template(this.endpoints.journey_planning, [from, to]);

		return fetch(requestUrl).then(response => response.json()).then(data => {
			console.log('journey data: ', data);
			return data;
		}).catch(error => {
			console.error('JOURNEY FAILED: ', error);
		});
	}

	const homeLocation = localStorage.getItem('homeLocation');
	const workLocation = localStorage.getItem('workLocation');
	let userLocation = null;
	
	if(!homeLocation || !workLocation) {
		console.error('Remember to set locations in localStorage');
		return false;
	}

	function outputStatus(data) {
		data = data.map(item => {
			return {
				name: item.name,
				status: item.lineStatuses[0].statusSeverityDescription,
				statusSeverity: item.lineStatuses[0].statusSeverity
			};
		});

		let output = document.querySelector('.status');
		output.innerHTML = '';

		data.forEach(item => {
			let lineItem = document.createElement('div');
			lineItem.innerHTML = `${item.name}: ${item.status} (${item.statusSeverity})`;
			output.appendChild(lineItem);
		});
	}

	function outputJourney(data) {
		

		let output = document.querySelector('.journey');
		output.innerHTML = '';

		data.forEach(item => {
			let lineItem = document.createElement('div');
			lineItem.innerHTML = `${item.name}: ${item.status} (${item.statusSeverity})`;
			output.appendChild(lineItem);
		});
	}

	function success(location) {
		userLocation = location;
		var latitude  = location.coords.latitude;
		var longitude = location.coords.longitude;

		let output = document.querySelector('.location');

		output.innerHTML = '<p>You\'re at ' + latitude.toFixed(3) + '&deg; / ' + longitude.toFixed(3) + '&deg;</p>';

		const client = new TFLClient();
		client.getStatus().then(outputStatus);

		client.getJourneyData(homeLocation, workLocation).then(outputJourney);
	}

	function error() {
		console.error('Could not retrieve your location.');
	}

	if ("geolocation" in navigator) {
	  navigator.geolocation.getCurrentPosition(success, error);
	} else {
	  console.warn('GEOLOCATION NOT SUPPORTED');
	}
})();