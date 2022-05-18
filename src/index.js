import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function extractNumber (text) {
	if (!text || typeof text !== 'string') { return 0; };
	
	///(-\d+|\d+)(,\d+)*(\.\d+)*/g
	let numbers = text.match(/(-\d+|\d*\.?\d+)/g);
	numbers = numbers.map(n => Number(n.replace(/,/g, '')));

	if (!numbers) {
		return -1;
	}

	return numbers[0];
};

function trajectoryHeight (velocity, angle, unit, startHeight, actual) {
	if (angle < 0) { 
		if (actual) { return startHeight; } else { return 0; };
	};
	const gravity = unit === "m" ? 9.80665 : 32.17405;

	const height = (( Math.pow( velocity, 2 ) * Math.pow( Math.sin( angle ), 2 ) ) / ( 2 * gravity ));
	const realHeight = parseFloat(height) + parseFloat(startHeight);

	if (actual) { return realHeight.toFixed(3); } else { return height.toFixed(3); };
};

function trajectoryRange (velocity, angle, unit, startHeight, actual, upDown) {
	if (!actual) { 
		startHeight = 0;
	};
	const gravity = unit === "m" ? 9.80665 : 32.17405;

	//const range = ( Math.pow( velocity, 2 ) * Math.sin( 2 * angle ) ) / gravity;
	const range = ( ( ( velocity * Math.cos(angle) ) / gravity ) * ( velocity * Math.sin(angle) + Math.sqrt( Math.pow( ( velocity * Math.sin(angle) ), 2 ) + 2 * gravity * startHeight ) ) )
	const result = range.toFixed(3) + " " + unit;
	if (upDown === "Down" ) { if (!actual) { return "No solution"; } else { return result; }; }
	else { return result; };
};

function trajectoryTime (velocity, angle, unit, startHeight, actual, upDown, saySeconds) {
	if (!actual) { startHeight = 0; };
	const gravity = unit === "m" ? 9.80665 : 32.17405;

	const time = ( ( velocity * Math.sin(angle) ) + Math.sqrt( Math.pow( ( velocity * Math.sin(angle) ), 2 ) + 2 * gravity * startHeight ) ) / gravity;

	let result = 0;
	if (saySeconds) { result = time.toFixed(3) + " sec"; }
	else { result = time.toFixed(3); };
	if (upDown === "Down" ) { if (!actual) { return "No solution"; } else { return result; }; }
	else { return result; };
};

function findElevation (giveResult, velocity, distance, unit, upDown, height) {
	const gravity = unit === "m" ? 9.80665 : 32.17405;

	const angle = Math.atan( ( Math.pow( velocity, 2 ) - Math.sqrt( Math.pow( velocity, 4 ) - ( gravity * ( ( gravity * Math.pow( distance, 2 ) ) + ( 2 * height * Math.pow( velocity, 2 ) ) ) ) ) ) / ( gravity * distance ) );
	const degAng = degAngle(angle, upDown);

	if (giveResult) {
		if (isNaN(degAng) || degAng < 0) { return "No solution"; };
		return degAng.toFixed(4) + " deg";
	} else {
		return degAng;
	};
};

function finalVelocity ( velocity, unit, angle, upDown, toSeaLevel, altitude ) {
	const gravity = unit === "m" ? 9.80665 : 32.17405;

	const timing = trajectoryTime( velocity, angle, unit, altitude, toSeaLevel, upDown, false );
	const velocityX = velocity * Math.cos( angle );
	const velocityY = velocity * Math.sin( angle );
	const finalY = velocityY - ( gravity * timing );

	const finalVelocity = Math.sqrt( Math.pow( velocityX, 2 ) + Math.pow( finalY, 2 ) );

	if (isNaN(finalVelocity)) { return "No solution"; }
	else { return finalVelocity.toFixed(3) + " " + unit + " / sec"; };
};

function calcClick (velocity, distance, unit, upDown, height, altitude) {
	let angle = degAngle( Math.atan( Math.abs( altitude - ( parseFloat(altitude) + Math.abs(height) ) ) / distance ), upDown );
	if (height < 0) { angle = angle * -1; };

	const elev = findElevation(false, velocity, distance, unit, upDown, height);
	const compare = Math.abs(angle - elev);

	const clicker = unit === "m" ? "(0.1 milrad)" : "(1/4 MOA)";
	const clicks = unit === "m" ? compare / 0.005729577727869 : compare / 0.004166663515261;
	const str = compare.toFixed(3) + " deg, " + Math.round(clicks) + " clicks " + clicker;

	if (isNaN(compare) || compare < 0) { return "No solution"; };

	return str;
};

function radAngle (angle, upDown, onlyEx) {
	const extracted = extractNumber(angle);
	const real = upDown === "Up" ? extracted : extracted * -1;
	if (onlyEx) { return real; };
	const radReal = real * (Math.PI/180);
	return radReal;
};

function degAngle (angle, upDown) {
	const real = upDown === "Up" ? angle : angle * -1;
	const degReal = real * (180/Math.PI);
	return degReal;
};

function trajectory (x, angle, velocity, gravity) {
	let math = ( x * Math.tan(angle) ) - ( ( gravity * Math.pow(x, 2) ) / ( 2 * Math.pow(velocity, 2) * Math.pow( Math.cos(angle), 2 ) ) );
	return math;
};

function draw( angle, velocity, gravity, altitude, targetX, targetY, scopeHeight, unit ) {
	var canvas = document.getElementById("canvas");
	if ( null == canvas || !canvas.getContext ) return;

	const scopeBigger = unit === "mm" ? scopeHeight / 1000 : scopeHeight / 12;

	var axes = {}
	var ctx = canvas.getContext("2d");
	ctx.clearRect( 0, 0, canvas.width, canvas.height )

	axes.x0 = 0; // x0 pixels from left to x=0
	axes.y0 = canvas.height; // y0 pixels from top to y=0

	ctx.fillStyle = 'black';
	let targetXresolve = targetX - 15;
	let targetYresolve = canvas.height - altitude - targetY - 15;
	
	ctx.fillRect(targetXresolve, targetYresolve, 30, 30);

	ctx.beginPath();
	ctx.lineWidth = 7;
	ctx.strokeStyle = 'blue';
	ctx.moveTo(0, canvas.height - altitude - scopeBigger);
	ctx.lineTo(targetX, canvas.height - altitude - targetY);
	ctx.stroke();
	
	funGraph(ctx, axes, trajectory, "rgb(11,153,11)", 7, angle, velocity, gravity, altitude);
}

function funGraph (ctx, axes, func, color, thick, angle, velocity, gravity, altitude) {
	var xx;
	var yy;
	var dx = 1;
	var x0 = axes.x0;
	var y0 = axes.y0 - altitude;
	var iMax = Math.round(( ctx.canvas.width - x0 ) / dx);
	var iMin = 0;

	ctx.beginPath();
	ctx.lineWidth = thick;
	ctx.strokeStyle = color;

	for ( var i = iMin; i <= iMax; i++ ) {
		xx = dx * i; 
		yy = func( xx, angle, velocity, gravity );
		
		if (i === iMin) { ctx.moveTo( x0 + xx, y0 - yy ); }
		else { ctx.lineTo( x0 + xx, y0 - yy ); };
	}

	ctx.stroke();
}

let canvas = document.createElement("canvas");
canvas.id = "canvas";
canvas.width = 5000;
canvas.height = 3000;
document.body.appendChild(canvas);

class App extends React.Component {
	render() {
		return (
			<div id="App">
				<InfoCard render={sendIt => (
					<TrajectoryCalc sendIt={sendIt} key={sendIt.leftsideKey} />
				)}/>
			</div>
		);
	};
};

class TrajectoryCalc extends React.Component {
	sendIt = this.props.sendIt;
	render() {
		return (
			<div id="maths">
				<p>Max horizontal distance to sea level: <span className="b">{trajectoryRange(this.sendIt.muzzlevelocity, radAngle(this.sendIt.shotangle, this.sendIt.shotangleToggle, false), this.sendIt.horizontaldistanceToggle, this.sendIt.altitudeasl, true, this.sendIt.shotangleToggle)}</span></p>
				<p>Max horizontal distance to same elevation: <span className="b">{trajectoryRange(this.sendIt.muzzlevelocity, radAngle(this.sendIt.shotangle, this.sendIt.shotangleToggle, false), this.sendIt.horizontaldistanceToggle, this.sendIt.altitudeasl, false, this.sendIt.shotangleToggle)}</span></p>
				<hr />
				<p>Peak altitude: <span className="b">{trajectoryHeight(this.sendIt.muzzlevelocity, radAngle(this.sendIt.shotangle, this.sendIt.shotangleToggle, false), this.sendIt.horizontaldistanceToggle, this.sendIt.altitudeasl, true)} {this.sendIt.horizontaldistanceToggle}</span></p>
				<p>Max altitude gain: <span className="b">{trajectoryHeight(this.sendIt.muzzlevelocity, radAngle(this.sendIt.shotangle, this.sendIt.shotangleToggle, false), this.sendIt.horizontaldistanceToggle, this.sendIt.altitudeasl, false)} {this.sendIt.horizontaldistanceToggle}</span></p>
				<hr />
				<p>Time of flight to sea level: <span className="b">{trajectoryTime(this.sendIt.muzzlevelocity, radAngle(this.sendIt.shotangle, this.sendIt.shotangleToggle, false), this.sendIt.horizontaldistanceToggle, this.sendIt.altitudeasl, true, this.sendIt.shotangleToggle, true)}</span></p> 
				<p>Time of flight to same elevation: <span className="b">{trajectoryTime(this.sendIt.muzzlevelocity, radAngle(this.sendIt.shotangle, this.sendIt.shotangleToggle, false), this.sendIt.horizontaldistanceToggle, this.sendIt.altitudeasl, false, this.sendIt.shotangleToggle, true)}</span></p>
				<hr />
				<p>Shot angle solution: <span className="b">{findElevation(true, this.sendIt.muzzlevelocity, this.sendIt.horizontaldistance, this.sendIt.horizontaldistanceToggle, this.sendIt.shotangleToggle, this.sendIt.verticaldistance)}</span></p>
				<p>Bore Line vs Sight Line: <span className="b">{calcClick(this.sendIt.muzzlevelocity, this.sendIt.horizontaldistance, this.sendIt.horizontaldistanceToggle, this.sendIt.shotangleToggle, this.sendIt.verticaldistance, this.sendIt.altitudeasl)}</span></p>
				<hr />
				<p>Velocity at sea level: <span className="b">{finalVelocity( this.sendIt.muzzlevelocity, this.sendIt.horizontaldistanceToggle, radAngle(this.sendIt.shotangle, this.sendIt.shotangleToggle, false), this.sendIt.shotangleToggle, true, this.sendIt.altitudeasl )}</span></p>
			</div>
		);
	};
};

class ButtonPick extends React.Component {
	inputHere = this.props.inputHere;
	passThru = this.props.passThru;
	statePick = this.props.stateIn;
	nameOf = this.props.nameOf;

	render() {
		return (
			<button 
				onClick={ () => { this.passThru(this.nameOf, this.inputHere[1], this.statePick, true); } } 
				className={this.inputHere[0] + " " + (this.statePick === this.inputHere[1] ? "selected" : "unselected") }
			>{this.inputHere[1]}</button>
		);
	};
};

class ButtonChoice extends React.Component {
	thisThat = this.props.thisThat;
	passIn = this.props.passIn;
	stateOf = this.props.stateOf;
	nameOf = this.props.nameOf;

	render() {
		return (
			<div className="options">
				<ButtonPick inputHere={[ "option1", this.thisThat[1], this.thisThat[2], this.thisThat[0] ]} passThru={this.passIn} stateIn={this.stateOf} nameOf={this.nameOf} />
				<ButtonPick inputHere={[ "option2", this.thisThat[3], this.thisThat[4], this.thisThat[0] ]} passThru={this.passIn} stateIn={this.stateOf} nameOf={this.nameOf} />
			</div>
		);
	};
};

class ScoreCell extends React.Component {
	insiderInfo = this.props.insiderInfo;
	optToggle = this.props.optToggle;
	stateTog = this.props.stateTog;
	handleChange = this.props.handleChange;
	stateText = this.props.stateText;
	fillTextbox = this.props.fillTextbox; 

	render() {
		return (
			<td className={ "scoreinside " + this.insiderInfo[2] } colSpan={this.insiderInfo[7]}>
				<div className="cellTitle">{this.insiderInfo[0]}</div>
				<textarea id={this.insiderInfo[1]} className={this.insiderInfo[3]} value={this.stateText} onChange={() => this.doNothing } onClick={() => this.fillTextbox(this.stateText, this.insiderInfo[1]) } />
				{ this.insiderInfo[5] &&
				<ButtonChoice thisThat={this.insiderInfo[6]} 
					passIn={this.optToggle} 
					stateOf={this.stateTog} 
					nameOf={this.insiderInfo[1]} 
				/> }
			</td>
		);
	};
};

class InfoCard extends React.Component {
	constructor(props) {
		super(props);
		
		this.state = {
			"textTarget": "barrellength",
			"textTargetFill": "20",
			"leftsideKey": 1,

			"barrellengthToggle": "in",
			"barreltwistrateToggle": "RH",
			"muzzlevelocityToggle": "fps",
			"projectileweightToggle": "grain",
			"horizontaldistanceToggle": "ft",
			"verticaldistanceToggle": "ft",
			"altitudeaslToggle": "ft",
			"shotangleToggle": "Up",
			"scopeheightToggle": "in",
			"windspeedToggle": "Head",
			"gustminimumToggle": "mph",
			"crosswindToggle": "L to R",
			"verticalwindToggle": "Rise",
			"temperatureToggle": "F",
			"airpressureToggle": "in",

			"weapon": "Bill's AR-15 \"The Punisher\"",
			"caliber": "5.56 x 45 mm",
			"barrellength": "20",
			"barreltwistrate": "1:9",
			"projectile": "Winchester M855 FMJ Green Tip",
			"muzzlevelocity": "600",
			"projectileweight": "62",
			"horizontaldistance": "3333",
			"verticaldistance": "-198",
			"azimuth": "90 deg",
			"altitudeasl": "551",
			"shotangle": "5.186 deg",
			"scope": "Iron Sight",
			"scopeheight": "3",
			"windspeed": "3 mph",
			"gustminimum": "5 mph",
			"crosswind": "2 mph",
			"gustaverage": "7 mph",
			"verticalwind": "0.5 mph",
			"gustmaximum": "9 mph",
			"temperature": "76 deg",
			"humidity": "50 percent",
			"airpressure": "30.12"
		};

		let grav = this.state.horizontaldistanceToggle === "m" ? 9.80665 : 32.17405;
		draw(radAngle( this.state.shotangle, this.state.shotangleToggle, false), this.state.muzzlevelocity, grav, this.state.altitudeasl, this.state.horizontaldistance, this.state.verticaldistance, this.state.scopeheight, this.state.scopeheightToggle );

		this.convertSet = (which, multiplier, key, crazy) => {
			let buildIt = {};
			buildIt[which] = Math.round( crazy * multiplier );
			buildIt[key] = Math.random();

			this.setState(buildIt);
		};

		this.windConvert = (unit, multiply) => {
			const windy = [ [this.state.windspeed, "windspeed"], [this.state.gustminimum, "gustminimum"], [this.state.crosswind, "crosswind"], [this.state.gustaverage, "gustaverage"], [this.state.verticalwind, "verticalwind"], [this.state.gustmaximum, "gustmaximum"] ];

			windy.forEach( wind => {
				const pullNumber = extractNumber(wind[0]);
				const newWind = Math.round(pullNumber * multiply);
				const newStr = newWind + " " + unit;

				let buildIt = {};
				const keyKey = wind[1] + "Key";
				buildIt[wind[1]] = newStr;
				buildIt[keyKey] = Math.random();

				this.setState(buildIt);
			});
		};

		this.convertMetric = () => {
			this.optionToggle("barrellength","mm","in",false);
			this.optionToggle("muzzlevelocity","mps","fps",false);
			this.optionToggle("projectileweight","gram","grain",false);
			this.optionToggle("horizontaldistance","m","ft",false);
			this.optionToggle("verticaldistance","m","ft",false);
			this.optionToggle("altitudeasl","m","ft",false);
			this.optionToggle("scopeheight","mm","in",false);
			this.optionToggle("gustminimum","kph","mph",false);
			this.optionToggle("temperature","C","F",false);
			this.optionToggle("airpressure","hPa","in",false);

			return true;
		};

		this.convertImperial = () => {
			this.optionToggle("barrellength","in","mm",false);
			this.optionToggle("muzzlevelocity","fps","mps",false);
			this.optionToggle("projectileweight","grain","gram",false);
			this.optionToggle("horizontaldistance","ft","m",false);
			this.optionToggle("verticaldistance","ft","m",false);
			this.optionToggle("altitudeasl","ft","m",false);
			this.optionToggle("scopeheight","in","mm",false);
			this.optionToggle("gustminimum","mph","kph",false);
			this.optionToggle("temperature","F","C",false);
			this.optionToggle("airpressure","in","hPa",false);

			return true;
		};

		this.optionToggle = (togger, woah, statePick, userClicked) => {
			if (woah !== statePick) {
				let buildIt = {};
				const togtog = togger + "Toggle";
				const keyKey = togger + "Key";
				buildIt[togtog] = woah;
				buildIt[keyKey] = Math.random();

				this.setState(buildIt);

				switch (togger) {
					case "barrellength": 
						switch(statePick) {
							case "in": 
								this.convertSet("barrellength", 25.4, "barrellengthKey", this.state.barrellength);
								if (userClicked) { this.convertMetric() };
							break;
							case "mm": 
								this.convertSet("barrellength", 0.03937, "barrellengthKey", this.state.barrellength);
								if (userClicked) { this.convertImperial() };
							break;
							default: console.assert(false);
							break;
						};
					break;
					case "muzzlevelocity": 
						switch(statePick) {
							case "fps":
								this.convertSet("muzzlevelocity", 0.3048, "muzzlevelocityKey", this.state.muzzlevelocity);
								if (userClicked) { this.convertMetric() };
							break;
							case "mps":
								this.convertSet("muzzlevelocity", 3.28084, "muzzlevelocityKey", this.state.muzzlevelocity);
								if (userClicked) { this.convertImperial() };
							break;
							default: console.assert(false);
							break;
						};
					break;
					case "projectileweight":
						switch(statePick) {
							case "grain":
								this.convertSet("projectileweight", 15.43236, "projectileweightKey", this.state.projectileweight); 
								if (userClicked) { this.convertMetric() };
							break;
							case "gram":
								this.convertSet("projectileweight", 0.0648, "projectileweightKey", this.state.projectileweight); 
								if (userClicked) { this.convertImperial() };
							break;
							default: console.assert(false);
							break;
						};

					break;
					case "horizontaldistance":
						switch(statePick) {
							case "ft":
								this.convertSet("horizontaldistance", 0.3048, "horizontaldistanceKey", this.state.horizontaldistance); 
								if (userClicked) { this.convertMetric() };
							break;
							case "m":
								this.convertSet("horizontaldistance", 3.28084, "horizontaldistanceKey", this.state.horizontaldistance); 
								if (userClicked) { this.convertImperial() };
							break;
							default: console.assert(false);
							break;
						};
					break;
					case "verticaldistance":
						switch(statePick) {
							case "ft":
								this.convertSet("verticaldistance", 0.3048, "verticaldistanceKey", this.state.verticaldistance); 
								if (userClicked) { this.convertMetric() };
							break;
							case "m":
								this.convertSet("verticaldistance", 3.28084, "verticaldistanceKey", this.state.verticaldistance); 
								if (userClicked) { this.convertImperial() };
							break;
							default: console.assert(false);
							break;
						};
					break;
					case "altitudeasl":
						switch(statePick) {
							case "ft":
								this.convertSet("altitudeasl", 0.3048, "altitudeaslKey", this.state.altitudeasl); 
								if (userClicked) { this.convertMetric() };
							break;
							case "m":
								this.convertSet("altitudeasl", 3.28084, "altitudeaslKey", this.state.altitudeasl); 
								if (userClicked) { this.convertImperial() };
							break;
							default: console.assert(false);
							break;
						};
					break;
					case "scopeheight":
						switch(statePick) {
							case "in":
								this.convertSet("scopeheight", 25.4, "scopeheightKey", this.state.scopeheight); 
								if (userClicked) { this.convertMetric() };
							break;
							case "mm":
								this.convertSet("scopeheight", 0.03937, "scopeheightKey", this.state.scopeheight); 
								if (userClicked) { this.convertImperial() };
							break;
							default: console.assert(false);
							break;
						};
					break;
					case "gustminimum":
						switch(statePick) {
							case "mph":
								this.windConvert("kph", 1.609344); 
								if (userClicked) { this.convertMetric() };
							break;
							case "kph":
								this.windConvert("mph", 0.6213712); 
								if (userClicked) { this.convertImperial() };
							break;
							default: console.assert(false);
							break;
						};
					break;
					case "temperature":
						switch(statePick) {
							case "F":
								const existing = this.state.temperature;
								const pullNumber = extractNumber(existing);
								let newTemp = Math.round((pullNumber - 32) / 1.8);
								newTemp = newTemp.toString() + " deg";
								this.setState({ temperature: newTemp });
								this.setState({ temperatureKey: Math.random() });

								if (userClicked) { this.convertMetric() };
							break;
							case "C":
								const existingC = this.state.temperature;
								const pullNumberC = extractNumber(existingC);
								let newTempC = Math.round((pullNumberC * 1.8) + 32);
								newTempC = newTempC.toString() + " deg";
								this.setState({ temperature: newTempC });
								this.setState({ temperatureKey: Math.random() });

								if (userClicked) { this.convertImperial() };
							break;
							default: console.assert(false);
							break;
						};
					break;
					case "airpressure":
						switch(statePick) {
							case "in":
								this.convertSet("airpressure", 33.8639, "airpressureKey", this.state.airpressure); 
								if (userClicked) { this.convertMetric() };
							break;
							case "hPa":
								this.convertSet("airpressure", 0.0295, "airpressureKey", this.state.airpressure); 
								if (userClicked) { this.convertImperial() };
							break;
							default: console.assert(false);
							break;
						};
					break;
					default: //console.assert(false);
					break;
				};

				this.setState({ "leftsideKey": Math.random() });

				setTimeout(function(){ 
					let grav = this.state.horizontaldistanceToggle === "m" ? 9.80665 : 32.17405;
					draw(radAngle( this.state.shotangle, this.state.shotangleToggle, false), this.state.muzzlevelocity, grav, this.state.altitudeasl, this.state.horizontaldistance, this.state.verticaldistance, this.state.scopeheight, this.state.scopeheightToggle );
				}.bind(this), 100);
			};
		};

		this.handleChange = (e) => {
 			let thisTarget = this.state.textTarget;
			document.getElementById(thisTarget).value = e.target.value;
		};

		this.fillText = (whatFill, id) => {
			this.setState({textTarget: id, textTargetFill: whatFill});

			const masterEdit = document.getElementById("masterEdit");
			let fixInput = whatFill;

			switch (id) {
				case "azimuth": case "shotangle": case "temperature": case "humidity": case "windspeed": case "gustminimum": case "crosswind": case "gustaverage": case "verticalwind": case "gustmaximum": {
					const pullNumber = extractNumber(fixInput);
					fixInput = pullNumber.toString();
				}; break;
				default: //console.assert(false);
				break;
			};

			masterEdit.value = fixInput;
			masterEdit.focus();
			masterEdit.select();
			masterEdit.idd = id;
		}; 

		this.onBlurEvent = (ev) => {
			let fixInput = ev.target.value.trim();
			if (fixInput === "") {fixInput = this.state.textTargetFill; };
			
			switch (this.state.textTarget) {
				case "barrellength": case "projectileweight": case "muzzlevelocity": case "horizontaldistance": case "verticaldistance": case "altitudeasl": case "scopeheight": case "airpressure": case "temperature": case "shotangle": case "humidity": case "azimuth": case "windspeed": case "gustminimum": case "crosswind": case "gustaverage": case "verticalwind": case "gustmaximum":
					if (isNaN(fixInput)) { 
						fixInput = this.state.textTargetFill;
					};
				break;
				default: //console.assert(false);
				break;
			};

			switch (this.state.textTarget) {
				case "shotangle": {
					let extNumber = extractNumber(fixInput);
					if (extNumber < 0) { extNumber = 0; }
					else if (extNumber > 90) { extNumber = 90; } 
					fixInput = extNumber.toString() + " deg";
				}; break;
				case "azimuth": {
					let extNumber = extractNumber(fixInput);
					if (extNumber < 0) { extNumber = 0; }
					else if (extNumber >= 360) { extNumber = 0; } 
					fixInput = extNumber.toString() + " deg";
				}; break;
				case "temperature": {
					let pullNumber = extractNumber(fixInput);
					fixInput = pullNumber.toString() + " deg";
				}; break;
				case "humidity": {
					let pullNumber = extractNumber(fixInput);
					if (pullNumber < 0) { pullNumber = 0; }
					else if (pullNumber > 100) { pullNumber = 100; };
					fixInput = pullNumber.toString() + " percent";
				}; break;
				case "windspeed": case "gustminimum": case "crosswind": case "gustaverage": case "verticalwind": case "gustmaximum": {
					let pullNumber = extractNumber(fixInput);
					if (pullNumber < 0) { pullNumber = 0; }
					fixInput = pullNumber.toString() + " " + this.state.gustminimumToggle;
				}; break;
				case "barrellength": case "muzzlevelocity": case "projectileweight": case "horizontaldistance": case "altitudeasl": case "scopeheight": case "airpressure": {
					let extNumber = extractNumber(fixInput);
					if (extNumber < 0) { fixInput = "0"; }
				}; break;
				default: console.assert(false);
				break;
			};

			let buildIt = {};
			const keyKey = ev.target.idd + "Key";
			buildIt[ev.target.idd] = fixInput;
			buildIt[keyKey] = Math.random();
			buildIt["leftsideKey"] = Math.random();

			this.setState(buildIt);

			document.getElementById("masterEdit").value = "";

			setTimeout(function(){ 
				let grav = this.state.horizontaldistanceToggle === "m" ? 9.80665 : 32.17405;
				draw(radAngle( this.state.shotangle, this.state.shotangleToggle, false), this.state.muzzlevelocity, grav, this.state.altitudeasl, this.state.horizontaldistance, this.state.verticaldistance, this.state.scopeheight, this.state.scopeheightToggle );
			}.bind(this), 100);
		};

		window.addEventListener("blur", function(event) {
			document.activeElement.blur();
		}, false);

		this.keyUp = (w) => {
			if (w.keyCode === 13) {
				document.activeElement.blur();
			};
		};
	};

	render() {
		return (
			<>
			<div id="leftside">{this.props.render(this.state)}</div>
			<div id="rightside">
				<div id="scorecard">
					<table className="scorebox" style={{height:"10%"}}>
						<tbody>
							<tr className="scorerow">
								<ScoreCell 
									insiderInfo={[ 
										"Weapon", "weapon", "scoretwothird cellbottom", "longText", "Bill's AR-15 \"The Punisher\"", false, [], 1
									]} 
									stateText={this.state["weapon"]} 
									handleChange={this.handleChange} 
									key={this.state.weaponKey} 
									fillTextbox={this.fillText}
								/>
								<ScoreCell 
									insiderInfo={[ 
										"Caliber", "caliber", "scoreonethird cellbottom", "longText", "5.56 x 45 mm", 
										false, [], 1
									]} stateText={this.state["caliber"]} 
									handleChange={this.handleChange} 
									key={this.state.caliberKey} 
									fillTextbox={this.fillText}
								/>
							</tr>
						</tbody>
					</table>
					<table className="scorebox" style={{height:"30%"}}>
						<tbody>
							<tr className="scorerow">
								<ScoreCell insiderInfo={[ 
									"Barrel Length", "barrellength", "scorehalf", "shortestText", "20", 
									true, [ "barrellengthToggle", "in", true, "mm", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["barrellength"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["barrellengthToggle"]} key={this.state.barrellengthKey} />
								<ScoreCell insiderInfo={[ 
									"Barrel Twist Rate", "barreltwistrate", "scorehalf", "shortestText", "1:9", 
									true, [ "barreltwistrateToggle", "RH", true, "LH", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["barreltwistrate"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["barreltwistrateToggle"]} key={this.state.barreltwistrateKey} />
							</tr>
							<tr className="scorerow">
								<ScoreCell insiderInfo={[ 
									"Projectile", "projectile", "scorehalf", "longText", "Winchester M855 FMJ Green Tip", 
									false, [], 1
								]} fillTextbox={this.fillText} stateText={this.state["projectile"]} handleChange={this.handleChange} key={this.state.projectileKey} />
								<ScoreCell insiderInfo={[ 
									"Projectile Weight", "projectileweight", "scorehalf", "shortText", "62", 
									true, [ "projectileweightToggle", "grain", true, "gram", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["projectileweight"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["projectileweightToggle"]} key={this.state.projectileweightKey} />
							</tr>
							<tr className="scorerow">
								<ScoreCell insiderInfo={[ 
									"Muzzle Velocity", "muzzlevelocity", "scorehalf cellbottom", "shortText", "3060", 
									true, [ "muzzlevelocityToggle", "fps", true, "mps", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["muzzlevelocity"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["muzzlevelocityToggle"]} key={this.state.muzzlevelocityKey} />
								<ScoreCell insiderInfo={[ 
									"Scope", "scope", "scorehalf cellbottom", "longText", "Iron Sight", 
									false, [], 1
								]} fillTextbox={this.fillText} stateText={this.state["scope"]} handleChange={this.handleChange} key={this.state.scopeKey} />

							</tr>
						</tbody>
					</table>
					<table className="scorebox" style={{height:"20%"}}>
						<tbody>
							<tr className="scorerow">
								<ScoreCell insiderInfo={[ 
									"Horizontal Distance", "horizontaldistance", "scoreonethird", "shortestText", "5", 
									true, [ "horizontaldistanceToggle", "ft", true, "m", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["horizontaldistance"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["horizontaldistanceToggle"]} key={this.state.horizontaldistanceKey} />
								<ScoreCell insiderInfo={[ 
									"Altitude ASL", "altitudeasl", "scoreonethird", "shortestText", "965", 
									true, [ "altitudeaslToggle", "ft", true, "m", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["altitudeasl"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["altitudeaslToggle"]} key={this.state.altitudeaslKey} />
								<ScoreCell insiderInfo={[ 
									"Scope Height", "scopeheight", "scoreonethird", "shortestText", "2.6", 
									true, [ "scopeheightToggle", "in", true, "mm", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["scopeheight"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["scopeheightToggle"]} key={this.state.scopeheightKey} />
							</tr>
							<tr className="scorerow">
								<ScoreCell insiderInfo={[ 
									"Vertical Distance", "verticaldistance", "scoreonethird cellbottom", "shortestText", "50", 
									true, [ "verticaldistanceToggle", "ft", true, "m", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["verticaldistance"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["verticaldistanceToggle"]} key={this.state.verticaldistanceKey} />
								<ScoreCell insiderInfo={[ 
									"Shot Angle", "shotangle", "scoreonethird cellbottom", "shortestText", "1.5 deg", 
									true, [ "shotangleToggle", "Up", true, "Down", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["shotangle"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["shotangleToggle"]} key={this.state.shotangleKey} />
								<ScoreCell insiderInfo={[ 
									"Azimuth", "azimuth", "scoreonethird cellbottom", "longText", "90 deg", 
									false, [], 1
								]} fillTextbox={this.fillText} stateText={this.state["azimuth"]} handleChange={this.handleChange} key={this.state.azimuthKey} />

							</tr>
						</tbody>
					</table>
					<table className="scorebox" style={{height:"30%"}}>
						<tbody>
							<tr className="scorerow">
								<ScoreCell insiderInfo={[ 
									"Wind Speed", "windspeed", "scorehalf", "shortText", "3 mph", 
									true, [ "windspeedToggle", "Head", true, "Tail", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["windspeed"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["windspeedToggle"]} key={this.state.windspeedKey} />
								<ScoreCell insiderInfo={[ 
									"Gust Minimum", "gustminimum", "scorehalf", "shortText", "5 mph", 
									true, [ "gustminimumToggle", "mph", true, "kph", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["gustminimum"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["gustminimumToggle"]} key={this.state.gustminimumKey} />
							</tr>
							<tr className="scorerow">
								<ScoreCell insiderInfo={[ 
									"Crosswind", "crosswind", "scorehalf", "shortText", "2 mph", 
									true, [ "crosswindToggle", "L to R", true, "R to L", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["crosswind"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["crosswindToggle"]} key={this.state.crosswindKey} />
								<ScoreCell insiderInfo={[ 
									"Gust Average", "gustaverage", "scorehalf", "shortText", "7 mph", 
									false, [], 1
								]} fillTextbox={this.fillText} stateText={this.state["gustaverage"]} handleChange={this.handleChange} key={this.state.gustaverageKey} />
							</tr>
							<tr className="scorerow">
								<ScoreCell insiderInfo={[ 
									"Vertical Wind", "verticalwind", "scorehalf cellbottom", "shortText", "0.5 mph", 
									true, [ "verticalwindToggle", "Rise", true, "Fall", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["verticalwind"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["verticalwindToggle"]} key={this.state.verticalwindKey} />
								<ScoreCell insiderInfo={[ 
									"Gust Maximum", "gustmaximum", "scorehalf cellbottom", "shortText", "9 mph", 
									false, [], 1
								]} fillTextbox={this.fillText} stateText={this.state["gustmaximum"]} handleChange={this.handleChange} key={this.state.gustmaximumKey} />
							</tr>
						</tbody>
					</table>
					<table className="scorebox" style={{height:"10%"}}>
						<tbody>
							<tr className="scorerow">
								<ScoreCell insiderInfo={[ 
									"Temperature", "temperature", "scoreonethird cellbottom", "shortestText", "76 deg", 
									true, [ "temperatureToggle", "F", true, "C", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["temperature"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["temperatureToggle"]} key={this.state.temperatureKey} />
								<ScoreCell insiderInfo={[ 
									"Humidity", "humidity", "scoreonethird cellbottom", "longText", "50 percent", 
									false, [], 1
								]} fillTextbox={this.fillText} stateText={this.state["humidity"]} handleChange={this.handleChange} key={this.state.humidityKey} />
								<ScoreCell insiderInfo={[ 
									"Air Pressure", "airpressure", "scoreonethird cellbottom", "shortestText", "30.12", 
									true, [ "airpressureToggle", "in", true, "hPa", false ], 1
								]} fillTextbox={this.fillText} stateText={this.state["airpressure"]} handleChange={this.handleChange} optToggle={this.optionToggle} stateTog={this.state["airpressureToggle"]} key={this.state.airpressureKey} />
							</tr>
						</tbody>
					</table>
					<table className="scorebox" style={{height:"20%"}}>
						<tbody>
							<tr className="scorerow">
								<td className="scoreinside scorewhole white">
									<textarea id="masterEdit" onBlur={this.onBlurEvent} onKeyDown={this.keyUp} onChange={this.handleChange}></textarea>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
			</>
		);
	};
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);