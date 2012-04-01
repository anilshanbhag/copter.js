window.requestAnimFrame=function(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(a){window.setTimeout(a,1E3/60)}}();CLOCK_FACTOR=62.5;function AssetManager(){this.errorCount=this.successCount=0;this.cache={};this.downloadQueue=[]}AssetManager.prototype.queueDownload=function(a){this.downloadQueue.push(a)};
AssetManager.prototype.downloadAll=function(a){this.downloadQueue.length===0&&a();for(var b=0;b<this.downloadQueue.length;b++){var c=this.downloadQueue[b],e=new Image,d=this;e.addEventListener("load",function(){console.log(this.src+" is loaded");d.successCount+=1;d.isDone()&&a()},!1);e.addEventListener("error",function(){d.errorCount+=1;d.isDone()&&a()},!1);e.src=c;this.cache[c]=e}};AssetManager.prototype.getAsset=function(a){return this.cache[a]};
AssetManager.prototype.isDone=function(){return this.downloadQueue.length==this.successCount+this.errorCount};function Animation(a,b,c,e){this.spriteSheet=a;this.frameWidth=b;this.frameDuration=c;this.frameHeight=this.spriteSheet.height;this.totalTime=this.spriteSheet.width/this.frameWidth*this.frameDuration;this.elapsedTime=0;this.loop=e}
Animation.prototype.drawFrame=function(a,b,c,e,d){d=d||1;this.elapsedTime+=a;if(this.loop){if(this.isDone())this.elapsedTime=0}else if(this.isDone())return;a=this.currentFrame();b.drawImage(this.spriteSheet,a*this.frameWidth,0,this.frameWidth,this.frameHeight,c,e,this.frameWidth*d,this.frameHeight*d)};Animation.prototype.currentFrame=function(){return Math.floor(this.elapsedTime/this.frameDuration)};Animation.prototype.isDone=function(){return this.elapsedTime>=this.totalTime};
function Timer(){this.gameTime=0;this.maxStep=0.05;this.wallLastTimestamp=0}Timer.prototype={tick:function(){var a=Date.now(),b=(a-this.wallLastTimestamp)/1E3;this.wallLastTimestamp=a;a=Math.min(b,this.maxStep);this.gameTime+=a;return a},reinit:function(){this.wallLastTimestamp=this.gameTime=0}};
function GameEngine(){this.entities=[];this.click=this.ctx=null;this.paused=this.keyPressed=!1;this.timer=new Timer;this.stats=new Stats;this.halfSurfaceHeight=this.halfSurfaceWidth=this.surfaceHeight=this.surfaceWidth=null}
GameEngine.prototype.init=function(a){console.log("game initialized");this.ctx=a;this.surfaceWidth=this.ctx.canvas.width;this.surfaceHeight=this.ctx.canvas.height;this.halfSurfaceWidth=this.surfaceWidth/2;this.halfSurfaceHeight=this.surfaceHeight/2;this.ctx.drawImage(ASSET_MANAGER.getAsset("img/start-screen.png"),0,0);var b=this,c=function(){console.log("detected click");this.removeEventListener("click",c,!1);b.start()};this.ctx.canvas.addEventListener("click",c,!1);this.stats.domElement.style.position=
"absolute";this.stats.domElement.style.top="0px";document.body.appendChild(this.stats.domElement)};GameEngine.prototype.start=function(){console.log("starting game");var a=this;(function c(){a.loop();requestAnimFrame(c,a.ctx.canvas)})()};GameEngine.prototype.addEntity=function(a){this.entities.push(a)};
GameEngine.prototype.draw=function(a){this.ctx.clearRect(0,0,this.ctx.canvas.width,this.ctx.canvas.height);this.ctx.save();for(var b=0;b<this.entities.length;b++)this.entities[b].draw(this.ctx);a&&a(this);this.ctx.restore()};GameEngine.prototype.update=function(){for(var a=this.entities.length,b=0;b<a;b++)this.entities[b].update();for(b=this.entities.length-1;b>=0;--b)this.entities[b].removeFromWorld&&this.entities.splice(b,1)};
GameEngine.prototype.loop=function(){if(!this.paused)this.clockTick=this.timer.tick(),this.update(),this.draw(),this.click=null;this.stats.update()};function Bg(a){this.game=a;this.initX=this.x=0;this.sprite=ASSET_MANAGER.getAsset("img/bg.png")}Bg.prototype={update:function(){this.x-=0.2;if(this.x<-400){this.game.level+=1;for(i in this.game.walls)this.game.walls[i].reinit();this.x=0}},draw:function(a){a.drawImage(this.sprite,this.x,0)},reinit:function(){this.x=this.initX}};
function Helicopter(a,b){this.game=a;this.x=100;this.y=300;this.initX=this.x;this.initY=this.y;this.sprite=ASSET_MANAGER.getAsset("img/helicopter.png");this.width=this.sprite.width/3;this.height=this.sprite.height;this.pressed=[];this.animation=new Animation(this.sprite,150,0.05,!0);this.fireAudio=b}
Helicopter.prototype={update:function(){this.game.keyPressed?this.y-=(4+this.game.level)*this.game.clockTick*CLOCK_FACTOR:this.y+=(4+this.game.level)*this.game.clockTick*CLOCK_FACTOR;for(i in this.game.walls){var a=this.game.walls[i];if(this.x>a.x&&this.x-a.x<a.width){if(this.y>a.y&&this.y-a.y<a.height||this.y<a.y&&a.y-this.y<this.height)this.game.gameOver=!0}else if(this.x<a.x&&a.x-this.x<this.width&&(this.y>a.y&&this.y-a.y<a.height||this.y<a.y&&a.y-this.y<this.height))this.game.gameOver=!0}if(this.y<
0||this.y>this.game.surfaceHeight-this.height-2*this.game.offset)this.game.gameOver=!0},draw:function(a){this.animation.drawFrame(this.game.clockTick,a,this.x,this.y)},reinit:function(){this.x=this.initX;this.y=this.initY},fire:function(){if(this.game.rockets)this.game.rockets-=1,this.fireAudio.currentTime=0,this.fireAudio.play(),this.game.entities.push(new Rocket(this.game,this.x+75,this.y+30))}};
function Wall(a,b){this.game=a;this.sprite=ASSET_MANAGER.getAsset("img/wall.png");this.x=b;this.y=Math.random()*300;this.initX=b;this.width=this.sprite.width;this.height=this.sprite.height}
Wall.prototype={update:function(){this.x-=(2+this.game.level)*this.game.clockTick*CLOCK_FACTOR;this.x<-this.sprite.width&&this.addBack()},addBack:function(){this.x+=GAP*5;this.y=50+Math.random()*250},draw:function(a){a.drawImage(this.sprite,this.x,this.y)},reinit:function(){this.x=this.initX;this.y=50+Math.random()*250}};
function Rocket(a,b,c){this.game=a;this.x=b;this.y=c;this.speed=9+this.game.level;this.removeFromWorld=!1;this.sprite=ASSET_MANAGER.getAsset("img/rocket.png");this.width=this.sprite.width/3;this.height=this.sprite.height;this.animation=new Animation(this.sprite,33,0.1,!0)}
Rocket.prototype={outOfWorld:function(){if(this.x>this.game.surfaceWidth)this.removeFromWorld=!0,console.log("removed"),ASSET_MANAGER.queueDownload("img/wall.png")},update:function(){this.outOfWorld();if(!this.removeFromWorld)for(i in this.game.walls){var a=this.game.walls[i];if(this.x>a.x&&this.x-a.x<a.width){if(this.y>a.y&&this.y-a.y<a.height||this.y<a.y&&a.y-this.y<this.height){a.addBack();this.removeFromWorld=!0;break}}else if(this.x<a.x&&a.x-this.x<this.width&&(this.y>a.y&&this.y-a.y<a.height||
this.y<a.y&&a.y-this.y<this.height)){a.addBack();this.removeFromWorld=!0;break}}this.x+=10*this.game.clockTick*CLOCK_FACTOR},draw:function(a){this.animation.drawFrame(this.game.clockTick,a,this.x,this.y)},reinit:function(){this.removeFromWorld=!0}};function CrazyCopter(a){GameEngine.call(this);this.level=1;this.gameOver=!1;this.score=0;this.bgAudio=a;this.rockets=2;this.offset=50}CrazyCopter.prototype=new GameEngine;CrazyCopter.prototype.constructor=CrazyCopter;
CrazyCopter.prototype.start=function(){this.bg=new Bg(this);this.addEntity(this.bg);this.walls=[];for(var a=0;a<5;a++){var b=new Wall(this,a*GAP+700);this.addEntity(b);this.walls.push(b)}this.heli=new Helicopter(this,shoot);this.addEntity(this.heli);this.bgAudio.play();GameEngine.prototype.start.call(this);this.ctx.translate(0,this.offset)};
CrazyCopter.prototype.reinit=function(){console.log("game reinitialized");this.level=1;this.rockets=2;this.keyPressed=!1;this.gameOver=this.paused=this.bgAudio.muted=!1;this.score=0;for(i in this.entities)this.entities[i].reinit();this.timer.reinit()};
CrazyCopter.prototype.draw=function(){this.ctx.drawImage(ASSET_MANAGER.getAsset("img/boundryTop.png"),0,-50);this.gameOver?(this.drawGameOver(),this.paused=!0):(GameEngine.prototype.draw.call(this,function(){game.drawTop()}),ASSET_MANAGER.queueDownload("img/start-screen.png"));this.ctx.drawImage(ASSET_MANAGER.getAsset("img/boundryBottom.png"),0,600)};CrazyCopter.prototype.update=function(){GameEngine.prototype.update.call(this);this.score+=1};
CrazyCopter.prototype.drawTop=function(){this.ctx.fillStyle="#000";this.ctx.font="32px Sans";this.ctx.fillText(this.level,148,-12);this.ctx.fillText(this.score,422,-13);this.ctx.fillText(this.rockets,674,-13)};
CrazyCopter.prototype.drawGameOver=function(){GameEngine.prototype.draw.call(this,function(){game.drawTop()});this.bgAudio.muted=!0;this.ctx.fillStyle="rgba(0,0,0,0.5)";this.ctx.fillRect(0,0,this.surfaceWidth,this.surfaceHeight);this.gameOverSprite=ASSET_MANAGER.getAsset("img/gameover.png");this.ctx.drawImage(this.gameOverSprite,this.halfSurfaceWidth-this.gameOverSprite.width/2,this.halfSurfaceHeight-this.gameOverSprite.height/2-this.offset)};
var keyDown=function(a){a.keyCode==38?game.keyPressed=!0:a.keyCode==80&&!game.gameOver?game.paused=!game.paused:a.keyCode==13&&game.gameOver?game.reinit():a.keyCode==32&&!game.gameOver&&game.heli.fire()},keyUp=function(a){if(a.keyCode==38)game.keyPressed=!1},bg=document.querySelector("#bg"),shoot=document.querySelector("#shoot"),canvas=document.querySelector("#surface"),ctx=canvas.getContext("2d"),ASSET_MANAGER=new AssetManager,game=new CrazyCopter(bg),GAP=500;ASSET_MANAGER.queueDownload("img/start-screen.png");
ASSET_MANAGER.queueDownload("img/boundryTop.png");ASSET_MANAGER.queueDownload("img/boundryBottom.png");ASSET_MANAGER.queueDownload("img/wall.png");ASSET_MANAGER.queueDownload("img/helicopter.png");ASSET_MANAGER.queueDownload("img/bg.png");ASSET_MANAGER.queueDownload("img/gameover.png");ASSET_MANAGER.queueDownload("img/rocket.png");document.onkeydown=function(a){keyDown(a)};document.onkeyup=function(a){keyUp(a)};ASSET_MANAGER.downloadAll(function(){game.init(ctx)});
