// Apparently UK Postal Code???
// [A-Za-z]{1,2}[0-9Rr][0-9A-Za-z]?\s?[0-9][ABD-HJLNP-UW-Zabd-hjlnp-uw-z]{2}

// On SPAs
// http://tutorialzine.com/2015/02/single-page-app-without-a-framework/

(function(){
	function get(obj, target = '') {
	    const parts = target.split('.');
	    const targetHead = parts[0];
	    const targetTail = parts.splice(1).join('.');

	    if(!targetHead) {
	        return obj;
	    } else {
	        return get(obj[targetHead], targetTail);
	    }
	}

	function template(string, data) {
		return string.replace(/{{\s*?[\w\.]+\s*?}}/g, function(all) {
			return get(data, all.replace(/[{}]/g, '').trim()) || all;
		});
	}

	function setTrainTime(time) {
		document.querySelector('.js-train-time').innerText = time;
	}

	function setLeaveTime(time) {
		document.querySelector('.js-leave-time').innerText = time;
	}

	function renderDirectionView(data) {
		const elem = document.querySelector('.js-direction');
		const tpl = elem.innerHTML;

		elem.innerHTML = template(tpl, data);
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

		// @TODO: Change this to return something if mapping exists
		return (prefix + mapping[leg.mode.name]) || '';
	}

	// @TODO: missing DLR
	function getLegText(leg) {
		/**
		 * Format time
		 *
		 * @param {string} time
		 *
		 * @return {string}
		 */
		function ft(time) {
			return time.split(':').splice(1).join(':')
		}

		// @NOTE: Doesn't seem very nice, and not very scalable.
		// refactor it to retrieve a template from a store perhaps, then compile it
		switch (leg.mode.name) {
			case 'walking':
				return `${ft(leg.departureTime)}<br/>${leg.duration} minute walk for ${leg.distance} meters, from ${leg.departurePoint.commonName} to ${leg.arrivalPoint.commonName}`;
				break;
			case 'tube':
				return `${ft(leg.departureTime)}<br/>${leg.duration} minute tube ride, from ${leg.departurePoint.commonName} to ${leg.arrivalPoint.commonName}`;
				break;
			case 'bus':
				return `${ft(leg.departureTime)}<br/>${leg.duration} minute bus ride, from ${leg.departurePoint.commonName} to ${leg.arrivalPoint.commonName}`;
				break;
			case 'national-rail':
				return `${ft(leg.departureTime)}<br/>${leg.duration} minute train ride, from ${leg.departurePoint.commonName} to ${leg.arrivalPoint.commonName}`;
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

		let earliestTrainTime;
		let earliestJourney;
		let earliestLeg;

		journeys.forEach(journey => {
			let startTime = getReadableTime(new Date(journey.startDateTime));
			let arrivalTime = getReadableTime(new Date(journey.arrivalDateTime));

			let journeyHeader = document.createElement('div');
			journeyHeader.innerHTML = `${startTime} <span class="icon-angle-right"></span> ${arrivalTime} (${journey.duration}m)`;

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
					if(!earliestTrainTime || legArrivalTime.getTime() < earliestTrainTime.getTime()) {
						earliestTrainTime = legArrivalTime;

						earliestJourney = journey;
						earliestLeg = leg;
					}
				}
			}

			output.appendChild(journeyHeader);
			output.appendChild(list);
		});

		if(earliestJourney) {
			setTrainTime(getReadableTime(new Date(earliestLeg.departureTime)));
			setLeaveTime(getReadableTime(new Date(earliestJourney.startDateTime)));
		}

		return data;
	}

	function setLinks(data) {
		const date = getReadableTime(new Date(data.searchCriteria.dateTime));
		document.querySelector('.js-current-journey-time').innerText = date;
		document.querySelector('.js-journey-earlier').dataset.uri = data.searchCriteria.timeAdjustments.earlier.uri;
		document.querySelector('.js-journey-later').dataset.uri = data.searchCriteria.timeAdjustments.later.uri;
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

	function loadData() {
		return JSON.parse(localStorage.getItem('locations'));
	}

	function saveData(data) {
		localStorage.setItem('locations', JSON.stringify(data));
	}

	function getJourneyFromUrl(url) {
		const client = new TFLClient();
		const fromHome = localStorage.getItem('fromHome') === 'false' ? false : true; // @TODO: This is repeated

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

	function getJourney(fromLocation, toLocation) {
		const client = new TFLClient();
		// const fromLocation = ss(localStorage.getItem('fromLocation'));
		// const toLocation = ss(localStorage.getItem('toLocation'));
		let journeyRequest = undefined;

		if(fromLocation && toLocation) {
			const fromHome = localStorage.getItem('fromHome') === 'false' ? false : true;

			if(!!fromHome) {
				renderDirectionView({
					fName: 'Home', fLoc: fromLocation,
					tName: 'Work', tLoc: toLocation
				});
				journeyRequest = client.getJourneyData(fromLocation, toLocation);
			} else {
				renderDirectionView({
					fName: 'Work', fLoc: toLocation,
					tName: 'Home', tLoc: fromLocation
				});
				journeyRequest = client.getJourneyData(toLocation, fromLocation);
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

		// @TODO: This is not fault resilient, i.e. uri missing
		getJourneyFromUrl(this.dataset.uri);
	});

	document.querySelector('.js-journey-later').addEventListener('click', function() {
		event.preventDefault();

		// @TODO: This is not fault resilient, i.e. uri missing
		getJourneyFromUrl(this.dataset.uri);
	});

	class LocationManager {
		// constructor() {}

		get fromLocation() {
			return this.fromLocation;
		}

		set fromLocation(location) {
			this.fromLocation = location;
		}

		get toLocation() {
			return this.toLocation;
		}

		set toLocation(location) {
			this.toLocation = location;
		}

		init() {
			this.selects = Array.from(document.querySelectorAll('.js-location-select'));
			this.fromSelect = this.selects.find(select => select.name === 'js-location-from');
			this.toSelect = this.selects.find(select => select.name === 'js-location-to');
			this.swapDirection = document.querySelector('.js-location-swap');

			this.selects.forEach(select => {
				select.addEventListener('change', event => {

					getJourney(this.fromSelect.value, this.toSelect.value);
				});
			});

			this.swapDirection.addEventListener('click', event => {
				const from = this.fromSelect.value;
				const to = this.toSelect.value;

				this.fromSelect.value = to;
				this.toSelect.value = from;

				getJourney(to, from);
			});
		}

		loadLocations() {
			this.locations = locationsView.loadData();

			const options = this.locations.map(location => {
				return `<option value="${location.postCode}">${location.name}</option>`;
			}).join('');

			this.selects.forEach(select => {
				select.innerHTML = options;
			});
		}
	}

	const keys = {
		ESC: 27
	};

	class LocationsView {
		constructor() {
			this.open = document.querySelector('.js-locations-open');
			this.close = document.querySelector('.js-locations-close');
			this.view = document.querySelector('.js-locations-template');
			this.locationsList = this.view.querySelector('.js-locations-list');
		}

		loadData() {
			return JSON.parse(localStorage.getItem('locations')) || [];
		}

		saveData(data) {
			localStorage.setItem('locations', JSON.stringify(data));
		}

		/**
		 * This would require some sort of validation somewhere
		 */
		createLocation(formData) {
			const locations = this.loadData();

			locations.push({
				name: formData.get('name'),
				postCode: formData.get('postCode')
			});

			this.saveData(locations);
			this.renderLocationsList(locations);
		}

		/**
		 * Delete location from localStore at specified index
		 *
		 * @param {int} index
		 */
		deleteLocation(index) {
			const locations = this.loadData();
			
			locations.splice(index, 1);
			this.saveData(locations);

			this.renderLocationsList(locations);
		}

		renderLocationsList(locations) {
			let html = '';

			if(locations.length === 0) {
				html = '<li>No locations available</li>';
			} else {
				html += locations.map(location => {
					return `<li><span class="remove">&times;</span> ${location.name} - ${location.postCode}</li>`;
				}).join('');
			}

			this.locationsList.innerHTML = html;

			this.locationsList.querySelectorAll('li').forEach((el, index) => {
				el.addEventListener('click', event => {
					if(event.target.classList.contains('remove')) {
						this.deleteLocation(index);
					}
				});
			});
		}

		handleKeydown(event) {
			if(event.keyCode === keys.ESC) {
				event.preventDefault();
				this.view.classList.add('hidden');
			}
		}

		init() {
			this.renderLocationsList(this.loadData());

			this.open.addEventListener('click', event => {
				this.view.classList.remove('hidden');
			}, false);

			this.close.addEventListener('click', event => {
				this.view.classList.add('hidden');
			}, false);

			const boundKeydownHandler = this.handleKeydown.bind(this);

			document.addEventListener('keydown', boundKeydownHandler);
		}
	}

	const locationsView = new LocationsView();
	locationsView.init();

	const locationManager = new LocationManager();
	locationManager.init();
	locationManager.loadLocations();

	const forms = document.querySelectorAll('.js-form');
	forms.forEach(form => {
		form.addEventListener('submit', event => {
			const form = event.target;
			const action = form.getAttribute('action');
			const api = {
				'/api/location/create': locationsView.createLocation.bind(locationsView)
			};

			event.preventDefault();

			if(api[action]) {
				api[action](new FormData(form));
			} else {
				console.warn('API end not defined');
			}
		});
	});

	// const client = new TFLClient();
	// client.getTestJourneyData().then(outputJourney);
})();