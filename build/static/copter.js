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

var CLOCK_FACTOR = 1/0.016;

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

Timer.prototype = {
	tick : function() {
		var wallCurrent = Date.now();
		var wallDelta = (wallCurrent - this.wallLastTimestamp) / 1000;
		this.wallLastTimestamp = wallCurrent;
		
		var gameDelta = Math.min(wallDelta, this.maxStep);
		this.gameTime += gameDelta;
		return gameDelta;
	},
	reinit : function() {
		this.gameTime = 0;
		this.wallLastTimestamp = 0;
	}
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
    
    this.ctx.drawImage(ASSET_MANAGER.getAsset('static/img/start-screen.png'),0,0);
    
    var that = this;
    
    var callback = function(e){
    	this.removeEventListener('click',callback,false);
    	that.start();
    }
    
    this.ctx.canvas.addEventListener('click',callback,false);
    
    this.stats.domElement.style.position = 'absolute';
	this.stats.domElement.style.top = '0px';
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
		entity.update();
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
	this.initX = 0;
	this.sprite = ASSET_MANAGER.getAsset('static/img/bg.png');
}

Bg.prototype = {
	update : function(){
		this.x -= 0.2;
		if(this.x < -400){
			this.game.level += 1;
			for(i in this.game.walls) this.game.walls[i].reinit();
			this.x = 0;
		}
	},
	draw : function(ctx){
		ctx.drawImage(this.sprite,this.x,0);	
	},
	reinit : function(){
		this.x = this.initX;
	}
}

function Helicopter(game,audio){
	this.game = game;
	this.x = 100;
	this.y = 300;
	this.initX = this.x;
	this.initY = this.y;
	this.sprite = ASSET_MANAGER.getAsset('static/img/helicopter.png');
	this.width = this.sprite.width/3;
	this.height = this.sprite.height;
	this.pressed = [];
	this.animation = new Animation(this.sprite,150, 0.05, true);
	this.fireAudio = audio;
}

Helicopter.prototype = {
	update : function(){
		//Movement check
		if(this.game.keyPressed) this.y -= (4 + this.game.level)*this.game.clockTick*CLOCK_FACTOR;
		else this.y += (4 + this.game.level)*this.game.clockTick*CLOCK_FACTOR;
		
		//Collision check with walls
		for(i in this.game.walls){
			var wall = this.game.walls[i];
			if (this.x > wall.x && this.x - wall.x < wall.width){
				if ((this.y > wall.y && this.y - wall.y < wall.height) ||
					(this.y < wall.y && wall.y - this.y < this.height)){
						this.game.gameOver = true;
				}
			}
			else if(this.x < wall.x && wall.x - this.x < this.width){
				if ((this.y > wall.y && this.y - wall.y < wall.height) ||
					(this.y < wall.y && wall.y - this.y < this.height)){
						this.game.gameOver = true;
				}				
			}
		}
		
		//Collision check with boundry
		if (this.y < 0 || this.y > this.game.surfaceHeight - this.height - 2*this.game.offset) {
			this.game.gameOver = true;
		}
	},  	
	draw : function(ctx){
		this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
	},
	reinit : function(){
		this.x = this.initX;
		this.y = this.initY;
	},
	fire : function(){
		if(this.game.rockets){
			this.game.rockets -= 1;
			this.fireAudio.currentTime = 0;
			this.fireAudio.play();
			this.game.entities.push(new Rocket(this.game,
				                               this.x + 75,
				                               this.y + 30));
		}
	}
}

function Wall(game,x){
	this.game = game;
	this.sprite = ASSET_MANAGER.getAsset('static/img/wall.png');
	this.x = x;
	this.y = Math.random()*300;
	this.initX = x;
	this.width = this.sprite.width;
	this.height = this.sprite.height;
}

Wall.prototype = {
	update : function(){
		this.x -= (2.0 + this.game.level)*this.game.clockTick*CLOCK_FACTOR;
		if(this.x < -this.sprite.width){
			this.addBack(); 
		}
	},
	addBack : function(){
		this.x += GAP*5;
		this.y = 50 + Math.random()*250;
	},
	draw : function(ctx){
		ctx.drawImage(this.sprite,this.x,this.y);
	},
	reinit : function(){
		this.x = this.initX;
		this.y = 50 + Math.random()*250;
	}
}

function Rocket(game,x,y){
	this.game = game;
	this.x = x;
	this.y = y;
	this.speed = 9 + this.game.level;
	this.removeFromWorld = false;
	this.sprite = ASSET_MANAGER.getAsset('static/img/rocket.png');
	this.width = this.sprite.width/3;
	this.height = this.sprite.height;
	this.animation = new Animation(this.sprite,33, 0.1, true);
}

Rocket.prototype = {
	outOfWorld : function(){
		if (this.x > this.game.surfaceWidth ) {
			this.removeFromWorld = true;
		}
	},
	update : function(){
		//Of of world
		this.outOfWorld();
		//Collision check with walls
		if (!this.removeFromWorld){
			for(i in this.game.walls){
				var wall = this.game.walls[i];
				if (this.x > wall.x && this.x - wall.x < wall.width){
					if ((this.y > wall.y && this.y - wall.y < wall.height) ||
						(this.y < wall.y && wall.y - this.y < this.height)){
							wall.addBack();
							this.removeFromWorld = true; break;
					}
				}
				else if(this.x < wall.x && wall.x - this.x < this.width){
					if ((this.y > wall.y && this.y - wall.y < wall.height) ||
						(this.y < wall.y && wall.y - this.y < this.height)){
							wall.addBack();
							this.removeFromWorld = true; break;
					}				
				}
			}
		}
		this.x += 10*this.game.clockTick*CLOCK_FACTOR;
	},
	draw : function(ctx){
		this.animation.drawFrame(this.game.clockTick, ctx, this.x, this.y);
	},
	reinit : function(){
		this.removeFromWorld = true;
	}
}

function CrazyCopter(bgAudio){
	GameEngine.call(this);
	this.level = 1;	
	this.gameOver = false;
	this.score = 0;
	this.bgAudio = bgAudio;
	this.rockets = 2;
	this.offset = 50;
}

CrazyCopter.prototype = new GameEngine();
CrazyCopter.prototype.constructor = CrazyCopter;

CrazyCopter.prototype.start = function() {
	/*
		Remember order is important : So that bg drawn first
	*/
    this.paused = false;
    this.gameOver = false;
    
    this.bg = new Bg(this);
    this.addEntity(this.bg);

    this.walls = [];
    for(var i=0;i<5;i++){
    	var wall = new Wall(this,i*GAP + 700);
    	this.addEntity(wall);
    	this.walls.push(wall);
    }
    
    this.heli = new Helicopter(this,shoot);
    this.addEntity(this.heli);
	this.bgAudio.play();
    GameEngine.prototype.start.call(this);
    this.ctx.translate(0,this.offset);
}

CrazyCopter.prototype.reinit = function() {
	console.log('game reinitialized');
	this.level = 1;
	this.rockets = 2;
    this.keyPressed = false;
    this.bgAudio.muted = false;
    this.paused = false;
    this.gameOver = false;
    this.score = 0;
    for(i in this.entities){
    	this.entities[i].reinit();
    }
    this.timer.reinit();    	
}

CrazyCopter.prototype.draw = function() {
	this.ctx.drawImage(ASSET_MANAGER.getAsset('static/img/boundryTop.png'),0,-50);
	if(!this.gameOver){
		GameEngine.prototype.draw.call(this,function(){
			game.drawTop();
		});ASSET_MANAGER.queueDownload('static/img/start-screen.png');
	}
	else{
		this.drawGameOver();
		this.paused = true;
	}
	this.ctx.drawImage(ASSET_MANAGER.getAsset('static/img/boundryBottom.png'),0,600);
}

CrazyCopter.prototype.update = function() {
	GameEngine.prototype.update.call(this);
	this.score += 1;
}

CrazyCopter.prototype.drawTop = function(){
    this.ctx.fillStyle = "#000";
    this.ctx.font = "32px Sans";
    this.ctx.fillText(this.level, 148, -12);
    this.ctx.fillText(this.score, 422, -13);
    this.ctx.fillText(this.rockets, 674, -13);	
}

CrazyCopter.prototype.drawGameOver = function(){
	GameEngine.prototype.draw.call(this,function(){
		game.drawTop();
	});
	this.bgAudio.muted = true;
	this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
	this.ctx.fillRect(0,0,this.surfaceWidth,this.surfaceHeight);
	this.gameOverSprite = ASSET_MANAGER.getAsset('static/img/gameover.png');
	this.ctx.drawImage(this.gameOverSprite,this.halfSurfaceWidth - this.gameOverSprite.width/2,
						this.halfSurfaceHeight - this.gameOverSprite.height/2 - this.offset);
	//Custom					
	if(parseInt(highscore.innerHTML) < this.score){
		highscore.innerHTML = this.score;
	} 					
}

/*
 * Application Classes ended 
 * Custom code start 
 */

var keyDown = function(e) {
	//Up arrow
	if (e.keyCode == 38){
		game.keyPressed = true;
	}
	//P
	else if (e.keyCode == 80 && !game.gameOver){
		game.paused = !game.paused;
		game.bgAudio.muted = !game.bgAudio.muted;
	}
	//Enter
	else if (e.keyCode == 13 && game.gameOver){
		game.reinit();
	}
	//Spacebar
	else if(e.keyCode == 32 && !game.gameOver){
		game.heli.fire();
	}
}

var keyUp = function(e){
	if (e.keyCode == 38){
		game.keyPressed = false;
	}
} 

 
var bg = document.querySelector('#bg'),
	shoot = document.querySelector('#shoot');

var canvas = document.querySelector('#surface');
var ctx = canvas.getContext('2d');
var ASSET_MANAGER = new AssetManager();
var game = new CrazyCopter(bg);
var GAP = 500;

ASSET_MANAGER.queueDownload('static/img/start-screen.png');
ASSET_MANAGER.queueDownload('static/img/boundryTop.png');
ASSET_MANAGER.queueDownload('static/img/boundryBottom.png');
ASSET_MANAGER.queueDownload('static/img/wall.png');
ASSET_MANAGER.queueDownload('static/img/helicopter.png');
ASSET_MANAGER.queueDownload('static/img/bg.png');
ASSET_MANAGER.queueDownload('static/img/gameover.png');
ASSET_MANAGER.queueDownload('static/img/rocket.png');

var highscore = document.querySelector('#highscore');

document.onkeydown = function(e){
	keyDown(e);   
};

document.onkeyup = function(e){
	keyUp(e);
};

ASSET_MANAGER.downloadAll(function() {
    game.init(ctx);
});
