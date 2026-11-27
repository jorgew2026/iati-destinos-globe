(function () {
  "use strict";
  var markets = [
    ["ALL", "Todos los mercados", "#ff74be", 22, 7],
    ["ES", "España", "#ffbf37", 34, 3],
    ["PT", "Portugal", "#50d797", 28, -23],
    ["IT", "Italia", "#ff8176", 33, 22],
    ["LATAM", "LATAM", "#c5a5ff", 14, -76],
    ["ROW", "Resto del mundo", "#64c4ff", 27, 105]
  ];
  var index = 0, visibleSince = null, lastFrame = 0, flights = [];
  var tau = 2 * Math.PI, rad = Math.PI / 180;
  var map = document.getElementById("map");
  var stage = map.parentNode;
  var background = document.createElement("canvas");
  var texture = document.createElement("canvas");
  var ctx, surface, ink, radius, cx, cy, centerLat, centerLng;
  var snapshot, features, current;

  function id(name) { return document.getElementById(name); }
  function status(message) { id("status").textContent = message; }
  function number(value) { return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function name(code) { return snapshot.names[code] || code; }
  function color(key) {
    for (var i = 0; i < markets.length; i++) if (markets[i][0] === key) return markets[i][2];
    return markets[0][2];
  }

  function aggregate(key) {
    var counts = Object.create(null), total = 0, regional = 0, routes = [];
    markets.slice(1).forEach(function (market) {
      if (key !== "ALL" && key !== market[0]) return;
      var data = snapshot.markets[market[0]];
      if (!data) return;
      total += data.policies;
      regional += data.regional;
      data.dest.forEach(function (item) { counts[item[0]] = (counts[item[0]] || 0) + item[1]; });
      data.flows.forEach(function (item) {
        routes.push({ from: item[0], to: item[1], count: item[2], color: market[2] });
      });
    });
    var countries = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    routes.sort(function (a, b) { return b.count - a.count; });
    return { counts: counts, total: total, regional: regional, countries: countries, routes: routes };
  }

  function span(className, value) {
    var element = document.createElement("span");
    element.className = className;
    element.textContent = value;
    return element;
  }

  function showMarket() {
    var market = markets[index];
    current = aggregate(market[0]);
    id("market").textContent = market[1];
    id("total").textContent = number(current.total);
    id("total").style.color = market[2];
    id("summary").textContent = number(current.countries.length) + " destinos · " +
      number(current.regional) + " con cobertura Europa/Mundo";
    var rank = id("rank");
    rank.textContent = "";
    current.countries.slice(0, 10).forEach(function (code, position) {
      var row = document.createElement("li"), line = document.createElement("div");
      line.className = "rank-row";
      line.appendChild(span("position", position + 1));
      line.appendChild(span("name", name(code)));
      line.appendChild(span("amount", number(current.counts[code])));
      var track = document.createElement("div"), bar = document.createElement("i");
      track.className = "track";
      bar.style.backgroundColor = market[2];
      bar.style.width = (100 * current.counts[code] / current.counts[current.countries[0]]) + "%";
      track.appendChild(bar);
      row.appendChild(line);
      row.appendChild(track);
      rank.appendChild(row);
    });
    centerLat = market[3] * rad;
    centerLng = market[4] * rad;
    if (ctx) {
      buildTexture(market[2]);
      prepareFlights();
      resize();
    }
  }

  function buildTexture(accent) {
    var width = texture.width, height = texture.height;
    var limit = current.counts[current.countries[0]] || 1;
    ink.fillStyle = "#b9d7e1";
    ink.fillRect(0, 0, width, height);
    ink.strokeStyle = "#697f9d";
    ink.lineWidth = 0.8;
    features.forEach(function (feature) {
      var geom = feature.geometry;
      if (!geom) return;
      var polygons = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
      var count = current.counts[feature.properties.iso];
      var intensity = count ? 0.20 + 0.75 * Math.sqrt(count / limit) : 0;
      polygons.forEach(function (polygon) {
        ink.beginPath();
        polygon.forEach(function (ring) {
          ring.forEach(function (point, i) {
            var x = (point[0] + 180) * width / 360;
            var y = (90 - point[1]) * height / 180;
            if (i === 0) ink.moveTo(x, y); else ink.lineTo(x, y);
          });
          ink.closePath();
        });
        ink.fillStyle = "#f4ecdc";
        ink.fill("evenodd");
        if (intensity) {
          ink.fillStyle = accent;
          ink.globalAlpha = intensity;
          ink.fill("evenodd");
          ink.globalAlpha = 1;
        }
        ink.stroke();
      });
    });
  }

  function resize() {
    var width = map.clientWidth, height = map.clientHeight;
    if (!ctx || !width || !height) return;
    var scale = Math.min(1, 1500 / width, 1050 / height);
    map.width = background.width = Math.round(width * scale);
    map.height = background.height = Math.round(height * scale);
    cx = map.width / 2;
    cy = map.height / 2;
    radius = Math.min(cx, cy) * 0.91;
    drawEarth();
    drawFrame(performance.now());
  }

  function drawEarth() {
    var size = Math.max(2, Math.min(540, Math.ceil(radius * 2)));
    var width = texture.width, height = texture.height;
    var source = ink.getImageData(0, 0, width, height).data;
    var tile = document.createElement("canvas");
    tile.width = tile.height = size;
    var tileCtx = tile.getContext("2d"), image = tileCtx.createImageData(size, size);
    var sinCenter = Math.sin(centerLat), cosCenter = Math.cos(centerLat);
    for (var y = 0; y < size; y++) {
      var north = 1 - 2 * (y + 0.5) / size;
      for (var x = 0; x < size; x++) {
        var east = 2 * (x + 0.5) / size - 1;
        var depth2 = 1 - east * east - north * north;
        if (depth2 <= 0) continue;
        var depth = Math.sqrt(depth2);
        var lat = Math.asin(north * cosCenter + depth * sinCenter);
        var lng = centerLng + Math.atan2(east, depth * cosCenter - north * sinCenter);
        var sx = Math.floor(((lng + 3 * Math.PI) % tau) * width / tau);
        var sy = Math.min(height - 1, Math.floor((Math.PI / 2 - lat) * height / Math.PI));
        var input = 4 * (sy * width + sx), output = 4 * (y * size + x);
        var shade = 0.85 + 0.15 * depth;
        if (x % 5 === 0 && y % 5 === 0) shade *= 0.89;
        for (var channel = 0; channel < 3; channel++) image.data[output + channel] = source[input + channel] * shade;
        image.data[output + 3] = 255;
      }
    }
    tileCtx.putImageData(image, 0, 0);
    surface.clearRect(0, 0, background.width, background.height);
    surface.beginPath();
    surface.arc(cx + radius * 0.017, cy + radius * 0.01, radius, 0, tau);
    surface.fillStyle = "#975779";
    surface.fill();
    surface.drawImage(tile, cx - radius, cy - radius, radius * 2, radius * 2);
    drawLabels();
  }

  function point(lat, lng) {
    var phi = lat * rad, delta = lng * rad - centerLng;
    var c = Math.cos(phi), s = Math.sin(phi);
    return {
      x: cx + radius * c * Math.sin(delta),
      y: cy - radius * (Math.cos(centerLat) * s - Math.sin(centerLat) * c * Math.cos(delta)),
      depth: Math.sin(centerLat) * s + Math.cos(centerLat) * c * Math.cos(delta)
    };
  }

  function drawLabels() {
    var labels = [], fontSize = Math.max(9, radius * 0.048);
    surface.font = "600 " + fontSize + "px Onest, Arial";
    surface.textBaseline = "middle";
    current.countries.slice(0, 10).forEach(function (code) {
      var coords = snapshot.cen[code];
      if (!coords) return;
      var p = point(coords[0], coords[1]);
      if (p.depth < 0.14) return;
      var label = name(code), width = surface.measureText(label).width;
      var x = p.x + 7, y = p.y;
      if (x + width > map.width - 6) x = p.x - width - 7;
      surface.fillStyle = color(markets[index][0]);
      surface.beginPath();
      surface.arc(p.x, p.y, Math.max(2, radius * 0.014), 0, tau);
      surface.fill();
      if (labels.some(function (box) {
        return x < box.x + box.w + 5 && x + width + 5 > box.x && Math.abs(y - box.y) < fontSize + 4;
      })) return;
      labels.push({ x: x, y: y, w: width });
      surface.fillStyle = "#f4ecdc";
      surface.fillRect(x - 3, y - fontSize * 0.65, width + 6, fontSize * 1.3);
      surface.fillStyle = "#1b2350";
      surface.fillText(label, x, y);
    });
  }

  function vector(coords) {
    var lat = coords[0] * rad, lng = coords[1] * rad;
    return [Math.cos(lat) * Math.cos(lng), Math.cos(lat) * Math.sin(lng), Math.sin(lat)];
  }

  function prepareFlights() {
    flights = [];
    current.routes.forEach(function (route) {
      if (flights.length >= 24) return;
      var from = snapshot.cen[route.from], to = snapshot.cen[route.to];
      if (!from || !to || route.from === route.to) return;
      var a = vector(from), b = vector(to);
      var dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      var angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      if (angle < 0.02 || angle > Math.PI - 0.001) return;
      flights.push({ a: a, b: b, angle: angle, color: route.color, phase: flights.length * 0.618 });
    });
  }

  function flightPoint(flight, t) {
    var a = Math.sin((1 - t) * flight.angle), b = Math.sin(t * flight.angle);
    var x = a * flight.a[0] + b * flight.b[0];
    var y = a * flight.a[1] + b * flight.b[1];
    var z = a * flight.a[2] + b * flight.b[2];
    return point(Math.atan2(z, Math.sqrt(x * x + y * y)) / rad, Math.atan2(y, x) / rad);
  }

  function planeShape(fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    [[0,-10],[2,-7],[2,-2],[9,3],[9,5],[2,2],[2,6],[4,8],[4,10],[0,9],
      [-4,10],[-4,8],[-2,6],[-2,2],[-9,5],[-9,3],[-2,-2],[-2,-7]].forEach(function (p, i) {
      if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    });
    ctx.closePath();
    ctx.fill();
  }

  function drawFrame(now) {
    if (!ctx || !radius) return;
    ctx.clearRect(0, 0, map.width, map.height);
    ctx.drawImage(background, 0, 0);
    flights.forEach(function (flight) {
      var t = (flight.phase + now / (4500 + 2200 * flight.angle)) % 1;
      var p = flightPoint(flight, t);
      if (p.depth <= 0.035) return;
      var next = flightPoint(flight, Math.min(1, t + 0.012));
      ctx.fillStyle = flight.color;
      for (var i = 1; i <= 4 && t > i * 0.017; i++) {
        var tail = flightPoint(flight, t - i * 0.017);
        if (tail.depth <= 0.035) continue;
        ctx.globalAlpha = 0.6 - i * 0.105;
        ctx.beginPath();
        ctx.arc(tail.x, tail.y, Math.max(1, radius * 0.007), 0, tau);
        ctx.fill();
      }
      var scale = Math.max(0.55, radius / 285);
      ctx.save();
      ctx.globalAlpha = Math.min(1, t * 12, (1 - t) * 12);
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(next.y - p.y, next.x - p.x) + Math.PI / 2);
      ctx.scale(scale, scale);
      ctx.translate(1.7, 1.2);
      planeShape("#915483");
      ctx.translate(-1.7, -1.2);
      planeShape(flight.color);
      ctx.restore();
      ctx.globalAlpha = 1;
    });
  }

  function stamp() {
    var date = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T(\d{2}:\d{2})/.exec(snapshot.updatedAt);
    return date ? "Actualizado " + date[3] + "/" + date[2] + " · " + date[4] + " Madrid" : "Datos de GA4";
  }

  function refresh() {
    var request = new XMLHttpRequest();
    try {
      request.open("GET", "https://jorgew2026.github.io/iati-destinos-globe/data.json?t=" + Date.now(), true);
      request.timeout = 12000;
      request.onload = function () {
        try {
          if (request.status !== 200) return;
          var next = JSON.parse(request.responseText);
          if (!next.markets || !next.cen || !next.names || next.updatedAt <= snapshot.updatedAt) return;
          snapshot = next;
          showMarket();
          status(stamp());
        } catch (error) {
          console.warn("No se pudieron aplicar los datos de destinos", error);
        }
      };
      request.send();
    } catch (error) {
      console.warn("No se pudieron solicitar los datos de destinos", error);
    }
  }

  try {
    snapshot = JSON.parse(id("snapshot").textContent);
    showMarket();
    status(stamp());
    markets.slice(1).forEach(function (market) {
      var item = document.createElement("span"), dot = document.createElement("i");
      dot.style.backgroundColor = market[2];
      item.appendChild(dot);
      item.appendChild(document.createTextNode(market[1]));
      id("legend").appendChild(item);
    });
  } catch (error) {
    status("Datos de destinos no disponibles");
    return;
  }

  try {
    features = JSON.parse(id("geography").textContent).features;
    ctx = map.getContext("2d");
    surface = background.getContext("2d");
    texture.width = 1080;
    texture.height = 540;
    ink = texture.getContext("2d");
    if (!surface || !ink) ctx = null;
    if (ctx) showMarket();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (ctx && radius) drawEarth(); }).catch(function () {});
    }
  } catch (error) {
    ctx = null;
    console.warn("Globo no disponible en este reproductor", error);
  }

  var lastWidth = 0, lastHeight = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    if (document.hidden || !stage.clientWidth || !stage.clientHeight) {
      visibleSince = null;
      return;
    }
    if (now - lastFrame < 40) return;
    lastFrame = now;
    if (visibleSince === null) visibleSince = now;
    try {
      if (lastWidth !== map.clientWidth || lastHeight !== map.clientHeight) {
        lastWidth = map.clientWidth;
        lastHeight = map.clientHeight;
        resize();
      }
      if (now - visibleSince >= 10000) {
        visibleSince = now;
        index = (index + 1) % markets.length;
        showMarket();
      }
      drawFrame(now);
    } catch (error) {
      ctx = null;
      console.warn("Globo no disponible en este reproductor", error);
    }
  }
  requestAnimationFrame(tick);
  refresh();
  setInterval(refresh, 10 * 60 * 1000);
}());
