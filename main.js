// Apparently UK Postal Code???
// [A-Za-z]{1,2}[0-9Rr][0-9A-Za-z]?\s?[0-9][ABD-HJLNP-UW-Zabd-hjlnp-uw-z]{2}

(function(){
	function setTrainTime(time) {
		document.querySelector('.js-train-time').innerText = time;
	}

	function setLeaveTime(time) {
		document.querySelector('.js-leave-time').innerText = time;
	}

	function template(string, data) {
		return string.replace(/{{\s*?\w+\s*?}}/g, function(all) {
			return data[all.replace(/[{}]/g, '').trim()] || all;
		});
	}

	function isLoading() {
		document.querySelector('.js-loader').classList.add('is-visible');
	}

	function isLoaded() {
		document.querySelector('.js-loader').classList.remove('is-visible');
	}

	function TFLClient() {
		this.apiRoot = 'https://api.tfl.gov.uk';

		this.endpoints = {
			'status_tube' : this.apiRoot + '/line/mode/tube/status',
			'status_rail' : this.apiRoot + '/line/mode/national-rail/status',
			'journey_planning' : this.apiRoot + '/journey/journeyresults/{{ 0 }}/to/{{ 1 }}'
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

	function formatTime(date) {
		return padTime(date.getHours()) + padTime(date.getMinutes());
	}
	
	TFLClient.prototype.getJourneyData = function(from, to) {
		let requestUrl = template(this.endpoints.journey_planning, [from, to]);
		const d = new Date();
		d.setTime(d.getTime() + (d.getTimezoneOffset() * 60 * 1000));

		requestUrl += `?time=${formatTime(d)}`;

		return fetch(requestUrl)
		.then(response => response.json())
		.then(data => {
			console.log('journey data: ', data);
			return data;
		});
	}

	TFLClient.prototype.getJourneyDataFromUrl = function(url) {
		return fetch(this.apiRoot + url)
		.then(response => response.json())
		.then(data => {
			console.log('journey data: ', data);
			return data;
		});
	}

	TFLClient.prototype.getTestJourneyData = function() {
		let requestUrl = '/api/journey_response2.json';

		return fetch(requestUrl).then(response => response.json()).then(data => {
			console.log('test journey data: ', data);
			return data;
		});
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

		data.filter(item => {
			return item.statusSeverity < 10;
		}).forEach(item => {
			let lineItem = document.createElement('div');
			lineItem.innerHTML = `${item.name}: ${item.status} (${item.statusSeverity})`;
			output.appendChild(lineItem);
		});

		output.innerHTML += '<small>All other lines are good.</small>';
	}

	function padTime(time) {
		return ('0' + time).substr(-2);
	}

	function getReadableTime(date) {
		return `${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
	}

	// @TODO: missing DLR
	function getLegIcon(leg) {
		const prefix = 'icon-';
		const mapping = {
			'walking': 'male',
			'tube': 'subway',
			'bus': 'bus',
			'national-rail': 'train'
		};

		return (prefix + mapping[leg.mode.name]) || '';
	}

	// @TODO: missing DLR
	function getLegText(leg) {
		// @NOTE: Doesn't seem very nice, and not very scalable.
		// refactor it to retrieve a template from a store perhaps, then compile it
		switch (leg.mode.name) {
			case 'walking':
				return `${leg.duration} minute walk for ${leg.distance} meters, from ${leg.departurePoint.commonName} to ${leg.arrivalPoint.commonName}`;
				break;
			case 'tube':
				return `${leg.duration} minute tube ride, from ${leg.departurePoint.commonName} to ${leg.arrivalPoint.commonName}`;
				break;
			case 'bus':
				return `${leg.duration} minute bus ride, from ${leg.departurePoint.commonName} to ${leg.arrivalPoint.commonName}`;
				break;
			case 'national-rail':
				return `${leg.duration} minute train ride, from ${leg.departurePoint.commonName} to ${leg.arrivalPoint.commonName}`;
				break;
			default:
				return `no template for mode ${leg.mode.name}`;
				break;
		}
	}

	function getLegTemplate(leg) {
		const legTemplate = '<div class="leg"><span class="leg-icon {{icon}}"></span><span class="tooltip">{{yield}}</span></div>';

		const body = getLegText(leg);

		return template(legTemplate, {
			'yield': body,
			'icon': getLegIcon(leg)
		});
	}

	function outputJourney(data) {
		const journeys = data.journeys;

		if(!journeys) {
			// @NOTE: This happens in case of disambiguation needed
			// Seems will need to support this
			console.error('No Journeys?');
			return;
		}

		let output = document.querySelector('.journey');
		output.innerHTML = '';

		let earliestTrainTime = null;
		let earliestJourney = null;
		let earliestLeg = null;

		journeys.forEach(journey => {
			let startTime = getReadableTime(new Date(journey.startDateTime));
			let arrivalTime = getReadableTime(new Date(journey.arrivalDateTime));

			let journeyHeader = document.createElement('div');
			journeyHeader.innerHTML = `[${journey.duration}] ${startTime} -> ${arrivalTime}`;

			let list = document.createElement('ul');
			for(let leg of journey.legs) {
				let item = document.createElement('li');
				item.classList.add('leg-item');
				item.innerHTML = getLegTemplate(leg);
				list.appendChild(item);

				if(leg.mode.id === 'national-rail') {
					let legArrivalTime = new Date(leg.arrivalTime);

					// This journey is earliest
					// TODO: do this better
					if(earliestTrainTime === null || legArrivalTime.getTime() < earliestTrainTime.getTime()) {
						earliestTrainTime = legArrivalTime;

						earliestJourney = journey;
						earliestLeg = leg;
					}
				}
			}

			output.appendChild(journeyHeader);
			output.appendChild(list);
		});

		if(earliestJourney !== null) {
			setTrainTime(getReadableTime(new Date(earliestLeg.arrivalTime)));
			setLeaveTime(getReadableTime(new Date(earliestJourney.startDateTime)));
		}

		return data;
	}

	function setLinks(data) {
		const date = getReadableTime(new Date(data.searchCriteria.dateTime));
		document.querySelector('.js-current-journey-time').innerText = date;
		document.querySelector('.js-journey-earlier').setAttribute('href', data.searchCriteria.timeAdjustments.earlier.uri);
		document.querySelector('.js-journey-later').setAttribute('href', data.searchCriteria.timeAdjustments.later.uri);
	}

	function geoSuccess(location) {
		const userLocation = location;
		const latitude  = location.coords.latitude;
		const longitude = location.coords.longitude;

		const output = document.querySelector('.location');

		output.innerHTML = `<p>You're at ${latitude.toFixed(3)}&deg; / ${longitude.toFixed(3)}&deg;</p>`;
	}

	function getStatus() {
		client.getStatus().then(outputStatus);
	}

	// Strip Spaces
	function ss(text) {
		return (text || '').replace(/\s/, '');
	}

	function getJourneyFromUrl(url) {
		const client = new TFLClient();
		const fromHome = localStorage.getItem('fromHome') === 'false' ? false : true; // @TODO: This is repeated
		const tpl = 'From {{fName}} ({{tLoc}}) to {{tName}} ({{fLoc}})';

		isLoading();
		client.getJourneyDataFromUrl(url)
			.catch(error => {
				// Fallback to offline cached request for testing
				return client.getTestJourneyData();
			})
			.then(outputJourney)
			.then(setLinks)			
			.then(isLoaded);
	}

	function getJourney() {
		const client = new TFLClient();
		const homeLocation = ss(localStorage.getItem('homeLocation'));
		const workLocation = ss(localStorage.getItem('workLocation'));
		let journeyRequest = undefined;

		if(homeLocation && workLocation) {
			const fromHome = localStorage.getItem('fromHome') === 'false' ? false : true;
			const tpl = 'From {{fName}} ({{fLoc}}) to {{tName}} ({{tLoc}})';

			if(!!fromHome) {
				document.querySelector('.js-direction').innerText = template(tpl, {
					fName: 'Home', fLoc: homeLocation,
					tName: 'Work', tLoc: workLocation
				});
				journeyRequest = client.getJourneyData(homeLocation, workLocation);
			} else {
				document.querySelector('.js-direction').innerText = template(tpl, {
					fName: 'Work', fLoc: workLocation,
					tName: 'Home', tLoc: homeLocation
				});
				journeyRequest = client.getJourneyData(workLocation, homeLocation);
			}
		} else {
			console.warn('Remember to set locations in localStorage, for now test');
			// @NOTE: Don't show test fallback, create UI fallback
			journeyRequest = client.getTestJourneyData();
		}

		isLoading();
		journeyRequest
			.catch(error => {
				// Fallback to offline cached request for testing
				// @NOTE: Don't show test fallback, create UI fallback
				return client.getTestJourneyData();
			})
			.then(outputJourney)
			.then(setLinks)
			.then(isLoaded);
	}

	/*
	if ("geolocation" in navigator) {
		navigator.geolocation.getCurrentPosition(geoSuccess, () => {
			console.error('Could not retrieve your location.');
		});
	} else {
		console.warn('GEOLOCATION NOT SUPPORTED');
	}
	//*/

	getJourney();

	document.querySelector('.js-journey-earlier').addEventListener('click', function() {
		event.preventDefault();

		getJourneyFromUrl(this.getAttribute('href'));
	});

	document.querySelector('.js-journey-later').addEventListener('click', function() {
		event.preventDefault();

		getJourneyFromUrl(this.getAttribute('href'));
	});

	// const client = new TFLClient();
	// client.getTestJourneyData().then(outputJourney);
})();