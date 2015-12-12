// Atom autoFold:1
var world;
var timeStep  = 1.0 / 60.0;
var gravity   = new b2Vec2(0.0, -9.81);
var box2dfps  = 60;
var screenfps = 60;

var canvas = document.getElementById('car-view');
var ctx    = canvas.getContext('2d');

// var gen_parentality = 0.2;
// var gen_mutation    = 0.05;
// var mutation_range  = 1;
// var nAttributes     = 15;
//
// var swapPoint1 = 0;
// var swapPoint2 = 0;

var App = {
  rndInt: function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  rnd: function(min, max) {
    return Math.random() * (max - min) + min;
  },

  rndVertexMax: function() {
    return Math.random() * Chassis.maxAxis;
  }
};

var Car = function() {
  this.__constructor.apply(this, arguments);
}

Car.prototype.__constructor = function(carDef) {
  var i;

  this.car_def = carDef;
  this.alive   = true;

  this.velocityIndex = 0;
  this.health        = Sim.max_car_health;
  this.maxPosition   = 0;
  this.maxPositiony  = 0;
  this.minPositiony  = 0;
  this.frames        = 0;

  this.minimapmarker = document.getElementById('bar' + carDef.index);

  // this.is_elite                = car_def.is_elite;

  // if (this.is_elite) {
    // this.healthBar.backgroundColor      = "#44c";
    this.minimapmarker.style.borderLeft = "1px solid #44c";
    this.minimapmarker.innerHTML        = carDef.index;
  // } else {
    // this.healthBar.backgroundColor      = "#c44";
    // this.minimapmarker.style.borderLeft = "1px solid #c44";
    // this.minimapmarker.innerHTML        = car_def.index;
  // }

  this.chassis = Chassis.createBody(carDef.vertex_list, carDef.chassis_density);

  this.wheels = _.times(carDef.wheelCount, function (i) {
    return Wheels.create(carDef.wheel_radius[i], carDef.wheel_density[i]);
  });

  var carmass = this.chassis.GetMass();
  for (i = 0; i < carDef.wheelCount; i++) {
    carmass += this.wheels[i].GetMass();
  }

  var jointDef = new b2RevoluteJointDef();

  for (var i = 0; i < carDef.wheelCount; i++) {
    var wheelVertex = this.chassis.vertex_list[carDef.wheel_vertex[i]];

    jointDef.localAnchorA.Set(wheelVertex.x, wheelVertex.y);
    jointDef.localAnchorB.Set(0, 0);

    jointDef.maxMotorTorque = carmass * -gravity.y / carDef.wheel_radius[i];
    jointDef.motorSpeed     = -AutoMaker.motorSpeed;
    jointDef.enableMotor    = true;
    jointDef.bodyA          = this.chassis;
    jointDef.bodyB          = this.wheels[i];
    world.CreateJoint(jointDef);
  }
}

Car.prototype.getPosition = function () {
  return this.chassis.GetPosition();
}

Car.prototype.draw = function() {
  drawObject(this.chassis);
  _.each(this.wheels, drawObject);
}

Car.prototype.checkDeath = function () {
  var position = this.getPosition();

  if (position.y > this.maxPositiony) {
    this.maxPositiony = position.y;
  }

  if (position.y < this.minPositiony) {
    this.minPositiony = position.y;
  }

  if (position.x > this.maxPosition + 0.02) {
    this.health      = Sim.max_car_health;
    this.maxPosition = position.x;
  } else {
    if (position.x > this.maxPosition) {
      this.maxPosition = position.x;
    }

    if (Math.abs(this.chassis.GetLinearVelocity().x) < 0.001) {
      this.health -= 5;
    }

    this.health--;

    if (this.health <= 0) {
      return true;
    }
  }
}

Car.prototype.kill = function() {
  var avgspeed = (this.maxPosition / this.frames) * box2dfps
    , position = this.maxPosition
    , score    = position + avgspeed // TODO Refactor scoring
    ;

  console.log('!!! Killing car; adding to scores...');

  Sim.scores.push({
    car_def: this.car_def,

    v:  score,
    s:  avgspeed,
    x:  position,
    y:  this.maxPositiony,
    y2: this.minPositiony
  });

  console.log(Sim.scores);

  this.alive = false;

  world.DestroyBody(this.chassis);
  _.each(this.wheels, function(wheel) { world.DestroyBody(wheel) });
}

var AutoMaker = {
  minWheels:    2,
  maxWheels:    6,
  minVertices:  4,  // TODO >= maxWheels so each wheel has a vertex
  maxVertices: 12,
  motorSpeed:  20, // TODO Gene?

  createRandom: function () {
    var numWheels = App.rndInt(2, 4)
      , carDef = {
          wheelCount:      numWheels, // TODO Gene
          chassis_density: App.rnd(Chassis.minDensity, Chassis.maxDensity),
          vertex_list:     AutoMaker.getVertices()
        }
      ;

    return _.merge(carDef, Wheels.getRndWheels(numWheels, carDef.vertex_list.length));
  },

  getRequiredThetas: function () {
    var thetas = [], pi = Math.PI
      , minMaxThetas, minTheta, maxTheta
      , requiredVertexQuadrants = [ 0, pi/2, pi, (3*pi)/2, 2*pi]
      ;

    for (i = 0; i < 4; i++) {
      minMaxThetas = _.take(requiredVertexQuadrants, 2);
      minTheta     = minMaxThetas[0];
      maxTheta     = minMaxThetas[1];

      thetas.push(App.rnd(minTheta, maxTheta));

      requiredVertexQuadrants.shift();
    }

    return thetas;
  },

  getVertices: function () {
    var i, r, x, y, pi = Math.PI
      , numVertices = App.rndInt(AutoMaker.minVertices, AutoMaker.maxVertices)
      , thetas = AutoMaker.getRequiredThetas()
      ;

    _.times(numVertices - 4, function () { thetas.push(App.rnd(0, 2*pi)) });
    thetas = _.sortBy(thetas, function (theta) { return theta });

    return _.map(thetas, function (theta) {
      r = App.rndVertexMax() + Chassis.minAxis;
      x = r * Math.cos(theta);
      y = r * Math.sin(theta);
      return new b2Vec2(x, y);
    });
  },

  createChassis:     function () {},
  createChassisPart: function () {}
};

var Chassis = {
  maxAxis:    2.0,
  minAxis:    0.2,
  minDensity: 30,
  maxDensity: 300,

  createBody: function(vertices, density) {
    var i, body
      , bodyDef  = new b2BodyDef()
      ;

    bodyDef.type = b2Body.b2_dynamicBody;
    bodyDef.position.Set(0.0, 4.0);
    bodyDef.linearDamping  = 0.5;
    bodyDef.angularDamping = 0.5;

    body = world.CreateBody(bodyDef);

    for (i = 0; i < vertices.length-1; i++) {
      Chassis.createPart(body, vertices[i], vertices[i+1], density);
    }
    Chassis.createPart(body, vertices[i], vertices[0], density);

    body.vertex_list = vertices;

    return body;
  },

  createPart: function(body, vertex1, vertex2, density) {
    var vertices = []
      , fixDef   = new b2FixtureDef()
      ;

    vertices.push(vertex1);
    vertices.push(vertex2);
    vertices.push(b2Vec2.Make(0, 0));

    // TODO See (nearly) identical code in `cw_createWheel`
    fixDef                   = new b2FixtureDef();
    fixDef.shape             = new b2PolygonShape();
    fixDef.density           = density;
    fixDef.friction          = 10; // TODO Gene?
    fixDef.restitution       = 0.2;
    fixDef.filter.groupIndex = -1;

    fixDef.shape.SetAsArray(vertices, 3);
    body.CreateFixture(fixDef);
  }
}

var Wheels = {
  maxRadius:  0.8,
  minRadius:  0.2,
  maxDensity: 100,
  minDensity: 20,

  getRndWheelRadius: function() {
    return App.rnd(Wheels.minRadius, Wheels.maxRadius);
  },

  getRndWheelDensity: function() {
    return App.rnd(Wheels.minDensity, Wheels.maxDensity);
  },

  getRndWheels: function(numWheels, numVertices) {
    return {
      wheel_radius:  _.times(numWheels, Wheels.getRndWheelRadius),
      wheel_density: _.times(numWheels, Wheels.getRndWheelDensity),
      wheel_vertex:  _.shuffle(_.times(numVertices)).slice(0, numWheels)
    };
  },

  create: function(radius, density) {
    var body
      , fixDef  = new b2FixtureDef()
      , bodyDef = new b2BodyDef()
      ;

    bodyDef.type = b2Body.b2_dynamicBody;
    bodyDef.position.Set(0, 0);

    body = world.CreateBody(bodyDef);

    // TODO See (nearly) identical code in `cw_createChassisPart`
    fixDef.shape             = new b2CircleShape(radius);
    fixDef.density           = density;
    fixDef.friction          = 1.5; // TODO Friction gene
    fixDef.restitution       = 0.2;
    fixDef.filter.groupIndex = -1;

    body.CreateFixture(fixDef);
    return body;
  }
};

var Generation = {
  size:      10,
  numChamps:  5,
  count:      0,
  current:   [],

  parentality: 0.2,
  mutation:    0.05,
  range:       1,
  numAttrs:    15,
  swapPoint1:  0,
  swapPoint2:  0,

  create: function () {
    Generation.current = _.times(Generation.size, function (i) {
      var carDef = AutoMaker.createRandom();

      carDef.index = i;

      return carDef;
    });

    Sim.leaderPosition = { x: 0, y: 0 };

    Generation.materialize();
  },

  materialize: function () {
    Sim.cars = _.map(Generation.current, function(carDef) {
      return new Car(carDef);
    });
  }
}

var Draw = {
  cameraspeed: 0.05,
  camera_y:    0,
  camera_x:    0,
  zoom:        70,

  screen: function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    Draw.setCameraPosition();
    ctx.translate(200-(Draw.camera_x*Draw.zoom), 200+(Draw.camera_y*Draw.zoom));

    ctx.scale(Draw.zoom, -Draw.zoom);
    cw_drawFloor();
    Draw.cars();
    ctx.restore();
  },

  setCameraPosition: function () {
    var pos   = Sim.leaderPosition
      , xDiff = Draw.camera_x - pos.x
      , yDiff = Draw.camera_y - pos.y
      ;

    Draw.camera_x -= Draw.cameraspeed * xDiff;
    Draw.camera_y -= Draw.cameraspeed * yDiff;

    MiniMap.camera(Draw.camera_x, Draw.camera_y);
  },

  cars: function () {
    var i, k, car, s, color, rgbcolor, densitycolor, b, s, f;

    for (k = (Sim.cars.length-1); k >= 0; k--) {
      car = Sim.cars[k];

      ctx.strokeStyle = "#444";
      ctx.lineWidth   = 1/Draw.zoom;

      for (i = 0; i < car.wheels.length; i++){
        b = car.wheels[i];
        for (f = b.GetFixtureList(); f; f = f.m_next) {
          s = f.GetShape();
          color = Math.round(255 - (255 * (f.m_density - Wheels.minDensity)) / Wheels.maxDensity).toString();
          rgbcolor = "rgb("+color+","+color+","+color+")";
          Draw.circle(b, s.m_p, s.m_radius, b.m_sweep.a, rgbcolor);
        }
      }

      densitycolor    = Math.round(100 - (70 * ((car.car_def.chassis_density - Chassis.minDensity) / Chassis.maxDensity))).toString() + "%";
      ctx.strokeStyle = "#44c";
      ctx.fillStyle   = "hsl(240,50%,"+densitycolor+")";

      ctx.beginPath();
      b = car.chassis;
      for (f = b.GetFixtureList(); f; f = f.m_next) {
        s = f.GetShape();
        Draw.virtualPoly(b, s.m_vertices, s.m_vertexCount);
      }
      ctx.fill();
      ctx.stroke();
    }
  },

  virtualPoly: function (body, vtx, n_vtx) {
    var p0 = body.GetWorldPoint(vtx[0]);
    ctx.moveTo(p0.x, p0.y);
    for (var i = 1; i < n_vtx; i++) {
      p = body.GetWorldPoint(vtx[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(p0.x, p0.y);
  },

  circle: function(body, center, radius, angle, color) {
    var p = body.GetWorldPoint(center);
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, 2*Math.PI, true);

    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + radius*Math.cos(angle), p.y + radius*Math.sin(angle));

    ctx.fill();
    ctx.stroke();
  }
}

var MiniMap = {
  cameraStyle: null,
  canvas:      null,
  context:     null,
  scale:       3,

  init: function () {
    MiniMap.cameraStyle = document.getElementById('minimapcamera').style;
    MiniMap.canvas      = document.getElementById('minimap');
    MiniMap.context     = MiniMap.canvas.getContext('2d');

    MiniMap.cameraStyle.width  = 12 * MiniMap.scale + 'px';
    MiniMap.cameraStyle.height = 6 * MiniMap.scale + 'px';

    MiniMap.draw();
  },

  camera: function (x, y) {
    MiniMap.cameraStyle.left = Math.round((2  + Draw.camera_x) * MiniMap.scale) + "px";
    MiniMap.cameraStyle.top  = Math.round((31 - Draw.camera_y) * MiniMap.scale) + "px";
  },

  draw: function () {
    var lastTile = null
      , tilePos
      , lastFixture
      , lastWorldCoords
      , tilePos  = new b2Vec2(-5, 0)
      ;

    MiniMap.canvas.width = MiniMap.canvas.width;
    MiniMap.context.strokeStyle = "#000";
    MiniMap.context.beginPath();
    MiniMap.context.moveTo(0,35 * MiniMap.scale);
    for(var k = 0; k < Floor.tiles.length; k++) {
      lastTile        = Floor.tiles[k];
      lastFixture     = lastTile.GetFixtureList();
      lastWorldCoords = lastTile.GetWorldPoint(lastFixture.GetShape().m_vertices[3]);
      tilePos         = lastWorldCoords;
      MiniMap.context.lineTo((tilePos.x + 5) * MiniMap.scale, (-tilePos.y + 35) * MiniMap.scale);
    }

    MiniMap.context.stroke();
  }
};

var Ga = {
  breedingGroups: function (generation) {
    return {
      champs:     _.take(generation, Generation.numChamps),
      topHalf:    _.take(generation, Math.floor(Generation.size / 2)),
      generation: generation
    };
  },

  // Populations: Champs, Top Half, Entire Generation
  // Preferences:   40%      40%          20%
  selectBreedingGroupName: function () {
    var group = App.rndInt(0, 10);

    if (group <= 4) return 'champs';
    if (group <= 8) return 'topHalf';
    return 'generation';
  },

  // Champs, top 50%, entire group
  getParents: function (breedingGroups) {
    var dad
      , mom
      , dadIdx
      , momIdx = -1
      , dadGroup
      , momGroup
      , dadGroupName = Ga.selectBreedingGroupName()
      , momGroupName = Ga.selectBreedingGroupName()
      ;

    dadGroup = breedingGroups[dadGroupName];
    momGroup = breedingGroups[momGroupName];

    dadIdx = App.rndInt(0, dadGroup.length-1);
    while ((momIdx === -1) || ((dadIdx === momIdx) && (dadGroupName === momGroupName))) {
      momIdx = App.rndInt(0, momGroup.length-1);
    }

    // Return array to allow for tri-/pan-sexual reproduction
    return [dadGroup[dadIdx], momGroup[momIdx]];
  },

  // Currently "standard" sex.
  makeChild: function(parents) {
    var dad = parents[0]
      , mom = parents[1]
      ;

    console.log('dad', dad);
    console.log('mom', mom);
    console.log('dad', dad.car_def);
    console.log('mom', mom.car_def);
  },

  makeChildren: function (numToMake, breedingGroups) {
    return _.times(numToMake, function () {
      var parents = Ga.getParents(breedingGroups);
      Ga.makeChild(parents);
    });
  }
};

var Sim = {
  generationNum:   0,
  cars:           [],
  scores:         [],
  numDeadCars:     0,
  leaderPosition: { x: 0, y: 0 },
  max_car_health: box2dfps * 10,

  step: function () {
    world.Step(1 / box2dfps, 20, 20);

    var pos
      , liveCars = _.select(Sim.cars, function (car) { return car.alive })
      ;

    _.each(liveCars, function (car, idx) {
      car.frames++;

      pos = car.getPosition();
      car.minimapmarker.style.left = Math.round((pos.x + 5) * MiniMap.scale) + 'px';

      if (car.checkDeath()) {
        car.kill();
        Sim.numDeadCars++;
        car.minimapmarker.style.borderLeft = '1px solid #ccc';

        if (Sim.leaderPosition.leader == idx) {
          Sim.leaderPosition.x = 0;
          Sim.findLeader();
          Draw.setCameraPosition();
        }

        if (Sim.numDeadCars >= Generation.size) {
          console.log('!!! All cars dead; new round !!!');
          Sim.newRound();
        }
      }

      Sim.findLeader();
    });
  },

  findLeader: function() {
    var furthest
      , leaderPos = Sim.leaderPosition
      , liveCars  = _.select(Sim.cars, function (car) { return car.alive })
      ;

    _.each(liveCars, function (car, idx) {
      if (car.getPosition().x > leaderPos.x) {
        Sim.leaderPosition        = car.getPosition();
        Sim.leaderPosition.leader = idx;
      }
    });
  },

  newRound: function () {
    world = new b2World(gravity, true);

    Draw.camera_x = 0;
    Draw.camera_y = 0;

    Floor.create();
    MiniMap.draw();

    Sim.nextGeneration();
  },

  getChampions: function () {
    Sim.scores.sort(function (a, b) { return (a.v > b.v) ? -1 : 1 });
    console.log(Sim.scores);
  },

  nextGeneration: function () {
    var champions      = Sim.scores.sort(function (a, b) { return (a.v > b.v) ? -1 : 1 });
    var breedingGroups = Ga.breedingGroups(champions);
    var newGen         = _.map(_.take(champions, Generation.numChamps), function (champ) { return champ.car_def });
    var numToBuild     = Generation.size - Generation.numChamps;

    var breedingGroups = Ga.breedingGroups(champions);
    Ga.makeChildren(numToBuild, breedingGroups);

    _.times(numToBuild, function () {
      newGen.push(AutoMaker.createRandom());
    });

    _.each(newGen, function (carDef, idx) { carDef.index = idx });

    Sim.generationNum++;
    Sim.scores         = [];
    Sim.numDeadCars    = 0;
    Sim.leaderPosition = { x: 0, y: 0 };

    Generation.current = newGen;
    Generation.materialize();
  }
};

function init() {
  var i, bar
    , mmm = document.getElementsByName('minimapmarker')[0]
    , mmh = document.getElementById('minimapholder')
    ;

  for (var i = 0; i < Generation.size; i++) {
    bar                     = mmm.cloneNode(true);
    bar.id               = 'bar' + i;
    bar.style.paddingTop = i*9 + 'px';
    mmh.appendChild(bar);
  }

  floorseed = btoa(Math.seedrandom());
  world     = new b2World(gravity, true);

  Floor.create();
  MiniMap.init();

  Generation.create();

  cw_runningInterval = setInterval(Sim.step,    Math.round(1000/box2dfps));
  cw_drawInterval    = setInterval(Draw.screen, Math.round(1000/screenfps));
}

init();
