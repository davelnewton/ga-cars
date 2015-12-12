var Floor = {
  maxTiles:      250,
  tiles:         [],
  lastDrawnTile: 0,
  tileWidth:     1.5,
  tileHeight:    0.25,

  create: function () {
    var lastTile = null;
    var tilePos  = new b2Vec2(-5,0);

    Floor.tiles         = [];
    Floor.lastDrawnTile = 0;

    Math.seedrandom(Math.seedrandom());

    for(var k = 0; k < Floor.maxTiles; k++) {
        lastTile = cw_createFloorTile(tilePos, (Math.random()*3 - 1.5) * 1.1*k/Floor.maxTiles);
      Floor.tiles.push(lastTile);
      last_fixture      = lastTile.GetFixtureList();
      last_world_coords = lastTile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
      tilePos           = last_world_coords;
    }
  }
};

function cw_createFloorTile(position, angle) {
  body_def = new b2BodyDef();

  body_def.position.Set(position.x, position.y);
  var body         = world.CreateBody(body_def);
  fix_def          = new b2FixtureDef();
  fix_def.shape    = new b2PolygonShape();
  fix_def.friction = 0.5;

  var coords = new Array();
  coords.push(new b2Vec2(0,0));
  coords.push(new b2Vec2(0, -Floor.tileHeight));
  coords.push(new b2Vec2(Floor.tileWidth, -Floor.tileHeight));
  coords.push(new b2Vec2(Floor.tileWidth, 0));

  var center = new b2Vec2(0,0);

  var newcoords = cw_rotateFloorTile(coords, center, angle);

  fix_def.shape.SetAsArray(newcoords);

  body.CreateFixture(fix_def);
  return body;
}

function cw_rotateFloorTile(coords, center, angle) {
  var newcoords = new Array();
  for(var k = 0; k < coords.length; k++) {
    nc = new Object();
    nc.x = Math.cos(angle)*(coords[k].x - center.x) - Math.sin(angle)*(coords[k].y - center.y) + center.x;
    nc.y = Math.sin(angle)*(coords[k].x - center.x) + Math.cos(angle)*(coords[k].y - center.y) + center.y;
    newcoords.push(nc);
  }
  return newcoords;
}

/* ==== END Floor ========================================================== */
/* ========================================================================= */

function cw_drawFloor() {
  ctx.strokeStyle = "#000";
  ctx.fillStyle   = "#666";
  ctx.lineWidth   = 1/Draw.zoom;
  ctx.beginPath();

  outer_loop:
  for(var k = Math.max(0,Floor.lastDrawnTile-20); k < Floor.tiles.length; k++) {
    var b = Floor.tiles[k];
    for (f = b.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      var shapePosition = b.GetWorldPoint(s.m_vertices[0]).x;
      if((shapePosition > (Draw.camera_x - 5)) && (shapePosition < (Draw.camera_x + 10))) {
        Draw.virtualPoly(b, s.m_vertices, s.m_vertexCount);
      }
      if(shapePosition > Draw.camera_x + 10) {
        Floor.lastDrawnTile = k;
        break outer_loop;
      }
    }
  }
  ctx.fill();
  ctx.stroke();
}
