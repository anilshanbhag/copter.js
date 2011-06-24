window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame    ||
              window.oRequestAnimationFrame      ||
              window.msRequestAnimationFrame     ||
              function(/* function */ callback, /* DOMElement */ element){
                window.setTimeout(callback, 1000 / 60);
              };
})();

function AssetManager() {
    this.successCount = 0;
    this.errorCount = 0;
    this.cache = {};
    this.downloadQueue = [];
}

AssetManager.prototype.queueDownload = function(path) {
    this.downloadQueue.push(path);
}

AssetManager.prototype.downloadAll = function(callback) {
    if (this.downloadQueue.length === 0) {
        callback();
    }
    
    for (var i = 0; i < this.downloadQueue.length; i++) {
        var path = this.downloadQueue[i];
        var img = new Image();
        var that = this;
        img.addEventListener("load", function() {
            console.log(this.src + ' is loaded');
            that.successCount += 1;
            if (that.isDone()) {
                callback();
            }
        }, false);
        img.addEventListener("error", function() {
            that.errorCount += 1;
            if (that.isDone()) {
                callback();
            }
        }, false);
        img.src = path;
        this.cache[path] = img;
    }
}

AssetManager.prototype.getAsset = function(path) {
    return this.cache[path];
}

AssetManager.prototype.isDone = function() {
    return (this.downloadQueue.length == this.successCount + this.errorCount);
}

function Animation(spriteSheet, frameWidth, frameDuration, loop) {
    this.spriteSheet = spriteSheet;
    this.frameWidth = frameWidth;
    this.frameDuration = frameDuration;
    this.frameHeight= this.spriteSheet.height;
    this.totalTime = (this.spriteSheet.width / this.frameWidth) * this.frameDuration;
    this.elapsedTime = 0;
    this.loop = loop;
}

Animation.prototype.drawFrame = function(tick, ctx, x, y, scaleBy) {
    var scaleBy = scaleBy || 1;
    this.elapsedTime += tick;
    if (this.loop) {
        if (this.isDone()) {
            this.elapsedTime = 0;
        }
    } else if (this.isDone()) {
        return;
    }
    var index = this.currentFrame();
    var locX = x ; 
    var locY = y ;
    ctx.drawImage(this.spriteSheet,
                  index*this.frameWidth, 0,  // source from sheet
                  this.frameWidth, this.frameHeight,
                  locX, locY,
                  this.frameWidth*scaleBy,
                  this.frameHeight*scaleBy);
}	

Animation.prototype.currentFrame = function() {
    return Math.floor(this.elapsedTime / this.frameDuration);
}

Animation.prototype.isDone = function() {
    return (this.elapsedTime >= this.totalTime);
}

function Timer() {
    this.gameTime = 0;
    this.maxStep = 0.05;
    this.wallLastTimestamp = 0;
}

Timer.prototype.tick = function() {
    var wallCurrent = Date.now();
    var wallDelta = (wallCurrent - this.wallLastTimestamp) / 1000;
    this.wallLastTimestamp = wallCurrent;
    
    var gameDelta = Math.min(wallDelta, this.maxStep);
    this.gameTime += gameDelta;
    return gameDelta;
}

function GameEngine() {
    this.entities = [];
    this.ctx = null;
    this.click = null;
    this.keyPressed = false;
    this.paused = false;
    this.timer = new Timer();
    this.stats = new Stats();
    this.surfaceWidth = null;
    this.surfaceHeight = null;
    this.halfSurfaceWidth = null;
    this.halfSurfaceHeight = null;
}

GameEngine.prototype.init = function(ctx) {
    console.log('game initialized');
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.halfSurfaceWidth = this.surfaceWidth/2;
    this.halfSurfaceHeight = this.surfaceHeight/2;
    this.startInput();
    document.body.appendChild(this.stats.domElement);
}

GameEngine.prototype.start = function() {
    console.log("starting game");
    var that = this;
    (function gameLoop() {
        that.loop();
        requestAnimFrame(gameLoop, that.ctx.canvas);
    })();
}

GameEngine.prototype.startInput = function() {

}

GameEngine.prototype.addEntity = function(entity) {
    this.entities.push(entity);
}

GameEngine.prototype.draw = function(callback) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.save();
    //this.ctx.translate(0.0, this.ctx.canvas.height);
    //this.ctx.scale(1,-1);
    for (var i = 0; i < this.entities.length; i++) {
        this.entities[i].draw(this.ctx);
    }
    if (callback) {
        callback(this);
    }
    this.ctx.restore();
}

GameEngine.prototype.update = function() {
    var entitiesCount = this.entities.length;
    
    for (var i = 0; i < entitiesCount; i++) {
        var entity = this.entities[i];
        
        if (!entity.removeFromWorld) {
            entity.update();
        }
    }
    
    for (var i = this.entities.length-1; i >= 0; --i) {
        if (this.entities[i].removeFromWorld) {
            this.entities.splice(i, 1);
        }
    }
}

GameEngine.prototype.loop = function() {
    if(!this.paused){
		this.clockTick = this.timer.tick();
		this.update();
		this.draw();
		this.click = null;
	}    
    this.stats.update();
}

function Bg(game){
	this.game = game;
	this.x = 0;
	this.sprite = ASSET_MANAGER.getAsset('img/bg.png');
}

Bg.prototype = {
	update : function(){
		this.x -= 0.01;
		if(this.x < -400){
			this.x = 0;
		}
	},
	draw : function(ctx){
		ctx.drawImage(this.sprite,this.x,0);	
	}
}

function Helicopter(game){
	this.game = game;
	this.x = 75;
	this.y = 300;
	this.sprite = ASSET_MANAGER.getAsset('img/helicopter.png');
	this.width = this.sprite.width/2;
	this.height = this.sprite.height;
	this.pressed = [];
	this.animation = new Animation(this.sprite,156, 0.1, true);
}

Helicopter.prototype = {
	update : function(){
		//Movement check
		if(this.game.keyPressed) this.y -=1;
		else this.y += 1;
		
		//Collision check
		for(i in this.game.walls){
			var wall = this.game.walls[i];
			if (this.x > wall.x && this.x - wall.x < wall.width){
				if ((this.y > wall.y && this.y - wall.y < wall.height) ||
					(this.y < wall.y && wall.y - this.y < this.height)){
						console.log('1');
						this.game.paused = true;
				}
			}
			else if(this.x < wall.x && wall.x - this.x < this.width){
				console.log(this.x,wall.x,this.width);
				if ((this.y > wall.y && this.y - wall.y < wall.height) ||
					(this.y < wall.y && wall.y - this.y < this.height)){
						console.log('2');
						this.game.paused = true;
				}				
			}
		}	
	},  	
	draw : function(ctx){
		this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
	}
}

function Wall(game,x){
	this.game = game;
	this.sprite = ASSET_MANAGER.getAsset('img/wall.png');
	this.x = x;
	this.y = Math.random()*300;
	this.width = this.sprite.width;
	this.height = this.sprite.height;
}

Wall.prototype = {
	update : function(){
		this.x -= 0.5;
		if(this.x < -this.sprite.width){
			this.x += (this.sprite.width + GAP)*4;
			this.y = Math.random()*300; 
		}
	},
	draw : function(ctx){
		ctx.drawImage(this.sprite,this.x,this.y);
	}
}

function CrazyCopter(){
	GameEngine.call(this);
	this.score = 0;
	this.lives = 5;
	this.bg = ASSET_MANAGER.getAsset('img/bg.png');
}

CrazyCopter.prototype = new GameEngine();
CrazyCopter.prototype.constructor = CrazyCopter;

CrazyCopter.prototype.start = function() {
	/*
		Remember order is important : So that bg drawn first
	*/
    this.bg = new Bg(this);
    this.addEntity(this.bg);

    this.heli = new Helicopter(this);
    this.addEntity(this.heli);
    
    this.walls = [];
    for(var i=0;i<4;i++){
    	var wall = new Wall(this,i*GAP + 300);
    	this.addEntity(wall);
    	this.walls.push(wall);
    }
    
    GameEngine.prototype.start.call(this);
}

CrazyCopter.prototype.draw = function() {
	GameEngine.prototype.draw.call(this,function(){});
}

var canvas = document.querySelector('#surface');
var ctx = canvas.getContext('2d');
var ASSET_MANAGER = new AssetManager();
var game = new CrazyCopter();
var GAP = 250;

var keyDown = function(e) {
	if (e.keyCode == 38){
		game.keyPressed = true;
	}
	else if (e.keyCode == 80){
		console.log('in p');
		game.paused = !game.paused;
	}
}

var keyUp = function(e){
	if (e.keyCode == 38){
		game.keyPressed = false;
	}
}

ASSET_MANAGER.queueDownload('img/wall.png');
ASSET_MANAGER.queueDownload('img/helicopter.png');
ASSET_MANAGER.queueDownload('img/bg.png');

document.onkeydown = function(e){
	keyDown(e);   
};

document.onkeyup = function(e){
	keyUp(e);
};

ASSET_MANAGER.downloadAll(function() {
    game.init(ctx);
    game.start();
});



