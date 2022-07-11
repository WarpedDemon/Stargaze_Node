 //App.js

var express = require('express');
var app = express();
var serv = require('http').Server(app);
var colors = require('colors/safe');

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(2000);
console.log(colors.magenta("[Server]") + colors.white(": SERVER STARTED"));


var SOCKET_LIST = {};
var PLAYER_LIST = {};
var WIDTH = 64000;
var HEIGHT = 64000;

//GAME LISTS
var GATES = [];
var ASTEROID_BELTS = [];
var STARS = [];
var SUNS = [];
var STAR_LIMIT = 2000;
var STATIONS = [];
//GAME LOCATION LEGEND
/*
	SpawnLocations:
		b - Borysthenis
		i - Ichnaea Cloud
		n - Navara
		z - ZD-28
		h - Handean
		f - Falling Nebula
		s - Segmanta
		x - XDH 51B
		smbh - Super Massive Black Hole
*/

var now;
var gameTime;
var startTime = Date.now();
var dt = 0;

/* OBJECTS */

var EDGE_SIZE = 1000;
var SECTOR_SIZE = 20000;

function SpawnRandomlyInSector(sector) {
	if(sector == "b") {
		var xSpawn = Map(Math.random(), 0, 1, (-WIDTH/2) + EDGE_SIZE, (-WIDTH/2) + EDGE_SIZE + SECTOR_SIZE);
		var ySpawn = Map(Math.random(), 0, 1, (-HEIGHT/2) + EDGE_SIZE, (-HEIGHT/2) + EDGE_SIZE + SECTOR_SIZE);
	}
	if(sector == "h") {
		var xSpawn = Map(Math.random(), 0, 1, (WIDTH/2) - EDGE_SIZE - SECTOR_SIZE, (WIDTH/2) - EDGE_SIZE);
		var ySpawn = Map(Math.random(), 0, 1, (HEIGHT/2) - EDGE_SIZE - SECTOR_SIZE, (HEIGHT/2) - EDGE_SIZE);
	}
	if(sector == "n") {
		var xSpawn = Map(Math.random(), 0, 1, (WIDTH/2) - EDGE_SIZE - SECTOR_SIZE, (WIDTH/2) - EDGE_SIZE);
		var ySpawn = Map(Math.random(), 0, 1, (-HEIGHT/2) + EDGE_SIZE, (-HEIGHT/2) + EDGE_SIZE + SECTOR_SIZE);
	}
	if(sector == "s") {
		console.log((-WIDTH/2) + EDGE_SIZE,  (-WIDTH/2) + EDGE_SIZE + SECTOR_SIZE);
		var xSpawn = Map(Math.random(), 0, 1, (-WIDTH/2) + EDGE_SIZE, (-WIDTH/2) + EDGE_SIZE + SECTOR_SIZE);
		var ySpawn = Map(Math.random(), 0, 1, (HEIGHT/2) - EDGE_SIZE - SECTOR_SIZE, (HEIGHT/2) - EDGE_SIZE);
		console.log(xSpawn, ySpawn);
	}

	return {x: xSpawn, y: ySpawn};
}

function SpawnInMiddleOfSector(sector) {
	if(sector == "b") {
		var xSpawn = -(WIDTH/2) + EDGE_SIZE + SECTOR_SIZE/2;
		var ySpawn = -(HEIGHT/2) + EDGE_SIZE + SECTOR_SIZE/2;
	}
	if(sector == "h") {
		var xSpawn = (WIDTH/2) - EDGE_SIZE - SECTOR_SIZE/2;
		var ySpawn = (HEIGHT/2) - EDGE_SIZE - SECTOR_SIZE/2;
	}
	if(sector == "s") {
		var xSpawn = (WIDTH/2) + EDGE_SIZE + SECTOR_SIZE/2;
		var ySpawn = (HEIGHT/2) - EDGE_SIZE - SECTOR_SIZE/2;
	}
	if(sector == "n") {
		var xSpawn = (WIDTH/2) - EDGE_SIZE - SECTOR_SIZE/2;
		var ySpawn = -(HEIGHT/2) + EDGE_SIZE + SECTOR_SIZE/2;
	}

	return {x: xSpawn, y: ySpawn};
}

var JumpGate = function(sector) {
	var location = SpawnInMiddleOfSector(sector);
	var ow = 1024;
	var oh = 457;
	if(sector == 'b') {
		var name = 'Borysthenis Jump Gate';
		var id = "jg_b";
	}
	if(sector == 's') {
		var name = "Segmanta Jump Gate";
		var id = "jg_s";
	}
	if(sector == "n") {
		var name = "Navara Jump Gate";
		var id = "jg_n";
	}
	if(sector == "h") {
		var name = "Handean Jump Gate";
		var id = "jg_h";
	}
	var self = {
		id: id,
		sector: sector,
		x: location.x + 300 + ow,
		y: location.y,
		status: "Idle",
		user: "None",
		width: ow,
		height: oh,
		name: name
	}

	return self;
}

//Stations

var Station = function(sector, id){
	for (var i in SUNS){
		var sun = SUNS[i];
		var x;
		var y;

		if(sector == sun.sector){
			x = sun.x;
			y = sun.y;
		}
	}

	var self = {
		id: id,
		sector: sector,
		x: x + 500,
		y: y,
		status: "Idle",
		user: "None",
		width: 512,
		height: 512,
		orbitDegree: 0,
		orbitDistance: 500
	}

	self.tick = function() {
		this.orbitDegree += Radians(1);
		this.x = this.x + this.orbitDistance * Math.sin(this.orbitDegree);
		this.y = this.y + this.orbitDistance * Math.cos(this.orbitDegree);
	};

	return self;
}

var newStation = new Station('b', 'b');

//--> newStation.tick();

//CELESTIAL BODIES

var Sun = function(sector) {

	var location = SpawnInMiddleOfSector(sector);

	var self = {
		id: Math.random() + Math.random(),
		x: location.x,
		y:location.y,
		diameter: 500,
		color: "yellow",
		sector: sector
	}

	return self;
};

var Star = function(sector) {
	var location = SpawnRandomlyInSector(sector);
	var self = {
		id: Math.random() + Math.random(),
		x: -location.x,
		y: -location.y,
		diameter: Range(0.5, 1,5),
		color: "#ffffff"
	};
	return self;
}

var AsteroidBelt = function(x, y) {
	var self = {
		id: Math.random() + Math.random(),
		Asteroids: [],
		x: x,
		y: y,
		width: Map(Math.random(), 0, 1, 500, 2000),
		height: Map(Math.random(), 0, 1, 500, 1000)
	};

	self.Initialize = function() {
		var Asteroids = this.width/200;
		for(var i = 0; i < Asteroids; i++) {
			var newAsteroid = new Asteroid(this);
			this.Asteroids.push(newAsteroid);
		}
	}
	self.Initialize();
	return self;
}

var Asteroid = function(parentBelt) {
	var self = {
		id: Math.random() + Math.random(),
		type: Math.floor(Math.random()*2),
		x: Map(Math.random(), 0, 1, parentBelt.x - parentBelt.width/2, parentBelt.x + parentBelt.width/2),
		y: Map(Math.random(), 0, 1, parentBelt.y - parentBelt.height/2, parentBelt.y + parentBelt.height/2),
		rotation: Map(Math.random(), 0, 1, 0, 6.2),
		rotationSpeed: Map(Math.random(), 0, 1, 0.1, 0.7),
		width: 320,
		height: 240
	};

	self.update = function() {
		this.rotation += Radians(this.rotationSpeed);
	}

	return self;
}

var Player = function(socketId) {
	var location = SpawnRandomlyInSector('h');
	var self = {
		//Animation Vars
		rotation: 0,
		//Normal Vars
		id: socketId,
		sector: 'b',
		//x: -21000,
		//y: -21000,
		velocity: 0,
		maxVelocity: 10,
		x: Map(Math.random(), 0, 1, -WIDTH/2, WIDTH/2),
		y: Map(Math.random(), 0, 1, -HEIGHT/2, HEIGHT/2),
		width: 64,
		height: 64,
		health: 500,
		shield: 1000,
		resource: 1000,
		Miners: [],
		Fighters: [],
		status: "Idle",
		targetLocationX: "none",
		targetLocationY: "none",
		targetLocationId: "NA",
		pressingUp: false,
		pressingDown: false,
		pressingLeft: false,
		pressingRight: false,
		orbit: {
			status: "None",
			orbiting: false,
			lerpStartTime: 0,
			changeRotation: 0,
			changeX: 0,
			changeY: 0,
			startRotation: 0,
			startX: 0,
			startY: 0,
			orbitSpeed: 0,
			orbitDegree: 0,
			orbitDistance: 200,
			lerpDistance: 500
		},
		lerping: {
			rotation: {
				status: false,
				startTime: 0,
				changeVal: 0,
				startVal: 0
			},
			location: {
				status: false,
				startTime: 0,
				changeValX: 0,
				changeValY: 0,
				startValX: 0,
				startValY: 0
			}
		}
	};

	self.update = function() {

		if(!this.lerping.rotation.status && !this.lerping.location.status && !this.orbit.orbiting) {
			this.moveNormal();
		} else {

			//ORBIT CODE
			if(this.orbit.orbiting) {
				if(this.pressingLeft || this.pressingRight) {
					this.orbit.orbiting = false;
					this.orbit.status = "None";
				}
				var dx = (this.x - this.targetLocationX);
				var dy = (this.y - this.targetLocationY);
				var mag = Math.sqrt((dx*dx) + (dy*dy));

				if(mag > this.orbit.lerpDistance) {
					this.orbit.status = "Pathing";
					var vx = (dx/mag);
					var vy = (dy/mag);
					this.vx = vx;
					this.vy = vy;
					this.moveNormal();


				} else {
					//Begin Lerping...
					if(this.orbit.status == "Pathing") {
						this.orbit.lerpStartTime = dt;
						this.orbit.startX = this.x;
						this.orbit.startY = this.y;
						var rotAngle = Angle(this, {x: this.targetLocationX, y: this.targetLocationY});

						this.orbit.orbitDegree = Radians(rotAngle);
						var toX = this.targetLocationX + this.orbit.orbitDistance*Math.sin(Radians(rotAngle));
						var toY = this.targetLocationY + this.orbit.orbitDistance*Math.cos(Radians(rotAngle));
						this.orbit.changeX = toX - this.x;
						this.orbit.changeY = toY - this.y;
						console.log("OriginX: " + this.targetLocationX + ", Target: " + toX);
						var toRot = Degrees(this.rotation) + 90;
						if(toRot > 360) {
							toRot -= 360;
						}

						this.orbit.changeRotation = Radians(toRot);
						this.orbit.startRotation = this.rotation;
						this.orbit.status = "Lerping";
					} else if(this.orbit.status == "Lerping") {
						this.rotation = Math.easeOutExpo(dt - this.orbit.lerpStartTime, this.orbit.startRotation, this.orbit.changeRotation, 2);
						this.x = Math.easeOutExpo(dt- this.orbit.lerpStartTime, this.orbit.startX, this.orbit.changeX, 2);
						this.y = Math.easeOutExpo(dt- this.orbit.lerpStartTime, this.orbit.startY, this.orbit.changeY, 2);

						var RotationReady, XReady, YReady = false;
						//Check rotation
						if(this.orbit.changeRotation < 0) {
							if(this.rotation <= this.orbit.startRotation + this.orbit.changeRotation + Radians(1)) {
								RotationReady = true;
							}
						} else {
							if(this.rotation >= this.orbit.startRotation + this.orbit.changeRotation - Radians(1)) {
								RotationReady = true;
							}
						}

						if(RotationReady) {
							this.orbit.status = "Orbiting";
						}

					} else if(this.orbit.status == "Orbiting") {

						this.orbit.orbitDegree += Radians(1 * this.velocity / 3);
						var rotAngle = Angle(this, {x: this.targetLocationX, y: this.targetLocationY});
						if(rotAngle < 0) {
							rotAngle += 360;
						}
						rotAngle -= 90;
						if(rotAngle < 0) {
							rotAngle += 360;
						}
						if(this.pressingUp) {
							this.velocity += 0.1;
							if(this.velocity > this.maxVelocity) {
								this.velocity = this.maxVelocity;
							}
						} else if(this.pressingDown) {
							this.velocity -= 0.1;
							if(this.velocity < 0) {
								this.velocity = 0;
							}
						}
						this.rotation = Radians(rotAngle);
						this.x = this.targetLocationX + this.orbit.orbitDistance * Math.sin(this.orbit.orbitDegree);
						this.y = this.targetLocationY + this.orbit.orbitDistance * Math.cos(this.orbit.orbitDegree);
					}
				}

			}







			if(this.lerping.rotation.status) {
				this.rotation = Math.easeOutExpo(dt-this.lerping.rotation.startTime, this.lerping.rotation.startVal, this.lerping.rotation.changeVal, 1.5);
				this.moveNormal();
				//console.log(this.rotation, ((this.lerping.rotation.startVal + this.lerping.rotation.changeVal)));
				if(this.lerping.rotation.startVal < this.lerping.rotation.startVal + this.lerping.rotation.changeVal) {
					if(this.rotation >= (this.lerping.rotation.startVal + this.lerping.rotation.changeVal) - (Math.PI/180)) {
						this.lerping.rotation.status = false;
						this.rotation = (this.lerping.rotation.startVal + this.lerping.rotation.changeVal);
					}
				} else {
					if(this.rotation <= (this.lerping.rotation.startVal + this.lerping.rotation.changeVal) + (Math.PI/180)) {
						this.lerping.rotation.status = false;
						this.rotation = (this.lerping.rotation.startVal + this.lerping.rotation.changeVal);
					}
				}
			}

			//WARPING
			if(this.lerping.location.status) {
				this.x = Math.easeInOutExpo(dt-this.lerping.location.startTime, this.lerping.location.startValX, this.lerping.location.changeValX, 8);
				this.y = Math.easeInOutExpo(dt-this.lerping.location.startTime, this.lerping.location.startValY, this.lerping.location.changeValY, 8);
				//console.log(this.rotation, ((this.lerping.rotation.startVal + this.lerping.rotation.changeVal)));
				if(this.lerping.location.startValX < this.lerping.location.startValX + this.lerping.location.changeValX) {
					if(this.x >= (this.lerping.location.startValX + this.lerping.location.changeValX) - 1) {
						this.lerping.location.status = false;
						this.x = (this.lerping.location.startValX + this.lerping.location.changeValX);
					}
				} else {
					if(this.x <= (this.lerping.location.startValX + this.lerping.location.changeValX) + 1) {
						this.lerping.location.status = false;
						this.x = (this.lerping.location.startValX + this.lerping.location.changeValX);
					}
				}
			}
		}

	};

	self.moveNormal = function() {
		if(this.pressingRight) {
			this.rotation += (0.03/Math.max((this.velocity/2),1));
		} else if(this.pressingLeft) {
			this.rotation -=(0.03/Math.max((this.velocity/2),1));
		}
		var degrees = (this.rotation/Math.PI)*180;
		//console.log("Degrees: " + degrees);
		var revs = degrees/360;
		if(revs > 1) {
			//Remove unneccessary rotations.
			var overRevs = Math.floor(revs);
			revs -= overRevs;
		}
		revs = revs * 360;

		revs -= 90;
		revs = (Math.PI/180) * revs;
		//console.log("Less than 90");
		var dx = 32 * Math.cos(revs);
		var dy = 32 * Math.sin(revs);
		var vx = (dx/32);
		var vy = (dy/32);
		this.vx = vx;
		this.vy = vy;
		//console.log(revs);
		if(this.pressingUp) {
			this.velocity += 0.1;
			if(this.velocity > this.maxVelocity) {
				this.velocity = this.maxVelocity;
			}
		} else if(this.pressingDown) {
			this.velocity -= 0.1;
			if(this.velocity < 0) {
				this.velocity = 0;
			}
		}

		this.x += this.vx * this.velocity;
		this.y += this.vy * this.velocity;
	}
	return self;

}

Math.easeOutExpo = function (t, b, c, d) {
	return c * Math.sin(t/d * (Math.PI/2)) + b;
};

/* END OBJECTS */


/* Connection Stuff */
var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket){
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;



	console.log(colors.magenta('[Server]:') + ' Player with Id ' + colors.yellow('"'+ socket.id + '"') + ' has ' + colors.green('connected'));

	socket.on('disconnect', function() {
		delete SOCKET_LIST[socket.id];
		console.log(colors.magenta('[Server]:') + ' Player with Id ' + colors.yellow('"'+ socket.id + '"') + '" has ' + colors.red('disconnected.'));

	});

	//SEND INITIAL PLAYER SPECIFIC DATA
	var NewPlayer = new Player(socket.id);
	PLAYER_LIST[socket.id] = NewPlayer;

	socket.emit('receivedConnect',{id: socket.id});
	socket.emit('localData', NewPlayer);
	//socket.emit('stars', STARS);
	socket.emit('jump_gates', GATES);
	socket.emit('suns', SUNS);
	socket.emit('beginGame');

	socket.on('keyPress', function(data) {
		var player = PLAYER_LIST[socket.id];
		if(data.inputId == "up") {
			player.pressingUp = data.state;
		} else if(data.inputId == "down") {
			player.pressingDown = data.state;
		}

		if(data.inputId == "right") {
			player.pressingRight = data.state;
		} else if(data.inputId == "left") {
			player.pressingLeft = data.state;
		}
	});

	socket.on('lerpLocation', function(data) {
		var player = PLAYER_LIST[socket.id];
		if(player.targetLocationX != "none" && player.targetLocationY != "none") {

			var tempObj = {x: player.targetLocationX, y: player.targetLocationY };
			RotatePlayerToObject(player, tempObj);

			WarpPlayerToTarget(player, tempObj);
			//player.orbit.orbiting = true;
		}
	});

	socket.on('targetChangeLocation', function(data) {
		var player = PLAYER_LIST[socket.id];
		player.targetLocationId = data;
		if(data.substring(0,2) == "jg") {
			//Is jump gate
			for(var i in GATES) {
				var gate = GATES[i];
				if(gate.id == data) {
					player.targetLocationX = gate.x;
					player.targetLocationY = gate.y;
					console.log("Gate Destination: x - " + gate.x + ", y - " + gate.y);
					var tempObj = {x: player.targetLocationX, y: player.targetLocationY };
					RotatePlayerToObject(player, tempObj);
				}
			}
		}
		//player.targetLocationX =
	});

});
//END CONNECTION STUFF

function RotatePlayerToObject(player, object) {
	var angle = Angle(player, object);
	console.log(angle);


	player.lerping.rotation.status = true;
	player.lerping.rotation.startTime = dt;
	player.lerping.rotation.startVal = player.rotation;
	var valDeg = angle- 180;

	if(valDeg < 0) {
		valDeg += 360;
	}

	//Fix player rotation
	var revs = Degrees((player.rotation)/360);
	var overRevs = revs - Math.floor(revs);
	var degree = 360 * overRevs;

	console.log("PLAYER ANGLE: " + degree);
	player.rotation = Radians(degree);

	console.log(Degrees(changeVal) + ", " + valDeg);
	var changeVal = player.rotation - Radians(valDeg);
	console.log(Degrees(changeVal));
	player.lerping.rotation.changeVal = -changeVal;
}

function WarpPlayerToTarget(player, target) {
	var changeX = player.x - target.x;
	var changeY = player.y - target.y;

	player.lerping.location.status = true;
	player.lerping.location.startValX = player.x;
	player.lerping.location.startValY = player.y;
	player.lerping.location.startTime = dt;
	player.lerping.location.changeValX = -changeX;
	player.lerping.location.changeValY = -changeY;
}
/* Server-side Functions */
function InitializeGame() {
	//Starts the game world...


	//Stars
	for (var i = 0; i < STAR_LIMIT/4; i++) {
		var newStar = new Star('b');
		STARS.push(newStar);
	}
	for (var i = 0; i < STAR_LIMIT/4; i++) {
		var newStar = new Star('n');
		STARS.push(newStar);
	}
	for (var i = 0; i < STAR_LIMIT/4; i++) {
		var newStar = new Star('s');
		STARS.push(newStar);
	}
	for (var i = 0; i < STAR_LIMIT/4; i++) {
		var newStar = new Star('h');
		STARS.push(newStar);
	}
	//GATES

	var BorysthenisGate = new JumpGate('b');
	var NavaraGate = new JumpGate('n');
	var SegmantaGate = new JumpGate('s');
	var HandeanGate = new JumpGate('h');
	GATES.push(BorysthenisGate);
	GATES.push(NavaraGate);
	GATES.push(SegmantaGate);
	GATES.push(HandeanGate);

	var newBelt = new AsteroidBelt(-21000, -21000);
	ASTEROID_BELTS.push(newBelt);

	var newSunb = new Sun('b');
	var newSuns = new Sun('s');
	var newSunn = new Sun('n');
	var newSunh = new Sun('h');
	SUNS.push(newSunb);
	SUNS.push(newSuns);
	SUNS.push(newSunn);
	SUNS.push(newSunh);
}


/* General Functions */

function Distance(player, target) {
	var dx = player.x - target.x;
	var dy = player.y - target.y;
	var mag = Math.sqrt((dx*dx)+(dy*dy));
	return mag;
}

function Angle(entity, target) {
	var dx = (entity.x - target.x);
	var dy = (entity.y - target.y);

	if(dx < 0 && dy >= 0) {
		var angle = Math.atan(dy/dx);
		angle = Degrees(angle) + 270;
	} else if(dx < 0 && dy < 0) {
		var angle = Math.atan(dy/dx);
		angle = Degrees(angle) + 270;
	} else if(dx >=0 && dy < 0) {
		var angle = Math.atan((dy)/dx);
		angle = 90 + Degrees(angle);
	} else if(dx >=0 && dy >=0) {
		var angle =Math.atan(dy/dx);
		angle = Degrees(angle) + 90;
	}
	//console.log(dx, dy);
	console.log("ANGLE: " + angle);
	//console.log(target.width/2, target.height/2);
	return angle;
}

function Degrees(rad) {
	return (180/Math.PI) * rad;
}

function Radians(deg) {
	return (Math.PI/180) * deg;
}

function Random(int) {
	return Math.floor(Math.random() * int);
}
function Range(min, max) {
	return (Math.random() * (max-Math.abs(min)+1) + min);
}
function Map(X, A, B, C, D) {
	return (X-A)/(B-A) * (D-C) + C;
}

Math.easeInOutExpo = function (t, b, c, d) {
	t /= d/2;
	if (t < 1) return c/2 * Math.pow( 2, 10 * (t - 1) ) + b;
	t--;
	return c/2 * ( -Math.pow( 2, -10 * t) + 2 ) + b;
};



//Start game
InitializeGame();

/* SEND INFORMATION LOOP */

setInterval(function() {

	now = Date.now();
	gameTime = now - startTime;
	dt = gameTime / 1000;
	var pack = [];

	for(var i in ASTEROID_BELTS) {
		var belt = ASTEROID_BELTS[i];
		for(var j in belt.Asteroids) {
			belt.Asteroids[j].update();
		}
	}


	for(var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		var player = PLAYER_LIST[socket.id];
		player.update();
		socket.emit('newPlayerInfo', PLAYER_LIST[i]);
		socket.emit('newPlayerPositions', PLAYER_LIST);
		socket.emit('asteroids', ASTEROID_BELTS);
	}



}, 15);
