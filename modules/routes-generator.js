(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.Routes = factory());
}(this, (function () {'use strict';

  const getRoads = function() {
    console.time("generateMainRoads");
    const cells = pack.cells, burgs = pack.burgs.filter(b => b.i && !b.removed);
    const capitals = burgs.filter(b => b.capital);
    if (capitals.length < 2) return []; // not enought capitals to build main roads
    const paths = []; // array to store path segments

    for (const b of capitals) {
      const connect = capitals.filter(c => c.i > b.i && c.feature === b.feature);

      for (const c of connect) {
        const from = findLandPath(b.cell, c.cell);
        const segments = restorePath(b.cell, c.cell, "main", from);
        segments.forEach(s => paths.push(s));
      }
    }

    cells.i.forEach(i => cells.s[i] += cells.road[i] / 2); // add roads to suitability score
    console.timeEnd("generateMainRoads");
    return paths;
  }

  const getTrails = function() {
    console.time("generateTrails");
    const cells = pack.cells, burgs = pack.burgs.filter(b => b.i && !b.removed);
    if (burgs.length < 2) return []; // not enought capitals to build main roads

    let paths = []; // array to store path segments
    for (const f of pack.features.filter(f => f.land)) {
      const isle = burgs.filter(b => b.feature === f.i); // burgs on island
      if (isle.length < 2) continue;

      isle.forEach(function(b, i) {
        let path = [];
        if (!i) {
          const farthest = d3.scan(isle, (a, c) => ((c.y - b.y) ** 2 + (c.x - b.x) ** 2) - ((a.y - b.y) ** 2 + (a.x - b.x) ** 2));
          const from = findLandPath(b.cell, isle[farthest].cell);
          path = restorePath(b.cell, isle[i+1].cell, "small", from);
        } else {
          if (cells.road[b.cell]) return;
          const [from, exit] = findILandPathToRoad(b.cell);
          if (exit === null) return;
          path = restorePath(b.cell, exit, "small", from);
        }
        if (path) paths = paths.concat(path);
      });
    }

    console.timeEnd("generateTrails");
    return paths;
  }

  const getSearoutes = function() {
    console.time("generateSearoutes");
    const cells = pack.cells, allPorts = pack.burgs.filter(b => b.port != 0 && !b.removed);
    if (allPorts.length < 2) return [];
    const bodies = new Set(allPorts.map(b => b.port)); // features with ports
    let paths = []; // array to store path segments

    bodies.forEach(function(f) {
      const ports = allPorts.filter(b => b.port === f);
      if (ports.length < 2) return;
      const first = ports[0].cell;

      // directly connect first port with the farthest one
      const farthest = ports[d3.scan(ports, (a, b) => ((b.y - ports[0].y) ** 2 + (b.x - ports[0].x) ** 2) - ((a.y - ports[0].y) ** 2 + (a.x - ports[0].x) ** 2))].cell;
      let from = findDirectOceanPath(farthest, first);
      from[first] = cells.haven[first];
      let path = restorePath(farthest, first, "ocean", from);
      paths = paths.concat(path);

      // directly connect first port with the farthest one on the same island to remove gap
      const portsOnIsland = ports.filter(b => cells.f[b.cell] === cells.f[first]);
      if (portsOnIsland.length > 3) {
        const opposite = ports[d3.scan(portsOnIsland, (a, b) => ((b.y - ports[0].y) ** 2 + (b.x - ports[0].x) ** 2) - ((a.y - ports[0].y) ** 2 + (a.x - ports[0].x) ** 2))].cell;
        from = findDirectOceanPath(opposite, first);
        from[first] = cells.haven[first];
        path = restorePath(opposite, first, "ocean", from);
        paths = paths.concat(path);
      }

      // indirectly connect first port with all other ports
      if (ports.length < 3) return;
      from = findIndirectOceanPath(first);
      for (const p of ports) {
        if (p.cell === first || p.cell === farthest) continue;
        from[p.cell] = cells.haven[p.cell];
        const path = restorePath(first, p.cell, "ocean", from);
        paths = paths.concat(path);
      }

    });

    console.timeEnd("generateSearoutes");
    return paths;
  }

  const draw = function(main, small, ocean) {
    console.time("drawRoutes");
    const cells = pack.cells, burgs = pack.burgs;
    lineGen.curve(d3.curveCatmullRom.alpha(0.1));

    // main routes
    roads.selectAll("path").data(main).enter().append("path")
      .attr("id", (d, i) => "road" + i) 
      .attr("d", d => round(lineGen(d.map(c => {
        const b = cells.burg[c];
        const x = b ? burgs[b].x : cells.p[c][0];
        const y = b ? burgs[b].y : cells.p[c][1];
        return [x, y];
      })), 1));

    // small routes
    trails.selectAll("path").data(small).enter().append("path")
      .attr("id", (d, i) => "trail" + i) 
      .attr("d", d => round(lineGen(d.map(c => {
        const b = cells.burg[c];
        const x = b ? burgs[b].x : cells.p[c][0];
        const y = b ? burgs[b].y : cells.p[c][1];
        return [x, y];
      })), 1));

    // ocean routes
    lineGen.curve(d3.curveBundle.beta(1));
    searoutes.selectAll("path").data(ocean).enter().append("path")
      .attr("id", (d, i) => "searoute" + i) 
      .attr("d", d => round(lineGen(d.map(c => {
        const b = cells.burg[c];
        const x = b ? burgs[b].x : cells.p[c][0];
        const y = b ? burgs[b].y : cells.p[c][1];
        return [x, y];
      })), 1));

    console.timeEnd("drawRoutes");
  }

  const regenerate = function() {
    routes.selectAll("path").remove();
    pack.cells.road = new Uint16Array(pack.cells.i.length);
    const main = getRoads();
    const small = getTrails();
    const ocean = getSearoutes();
    draw(main, small, ocean);
  }

  return {getRoads, getTrails, getSearoutes, draw, regenerate};

  // Dijkstra's algorithm to find a land path
  function findLandPath(start, end = null) {
    const cells = pack.cells;
    const queue = new PriorityQueue({comparator: (a, b) => a.p - b.p});
    const cost = [], from = [];
    queue.queue({e: start, p: 0});

    while (queue.length) {
      const next = queue.dequeue(), n = next.e, p = next.p;

      for (const c of cells.c[n]) {
        if (cells.h[c] < 20) continue; // ignore water cells
        const typeCost = cells.t[c] === 1 ? 10 : cells.t[c] === 2 ? 50 : 40;
        //const biomeCost = biomesData.cost[cells.biome[c]];
        const heightCost = cells.h[c] + (cells.h[c] >= 70 ? 200 : cells.h[c] >= 50 ? 80 : 0);
        const cellCoast = typeCost + heightCost;
        const totalCost = p + (cells.road[c] || cells.burg[c] ? cellCoast / 2.5 : cellCoast);
        //console.log({distCost}, {biomeCost}, {heightCost}, {cellCoast});

        if (from[c] || totalCost >= cost[c]) continue;
        from[c] = n;
        if (c === end) return from;
        cost[c] = totalCost;
        queue.queue({e: c, p: totalCost});
      }

    }
    return from;
  }

  function restorePath(start, end, type, from) {
    const cells = pack.cells;
    const path = []; // to store all segments;
    let segment = [], current = end, prev = end;
    const score = type === "main" ? 5 : 1; // to incrade road score at cell

    if (type === "ocean" || !cells.road[prev]) segment.push(end);
    if (!cells.road[prev]) cells.road[prev] = score;

    for (let i = 0, limit = 1000; i < limit; i++) {
      if (!from[current]) break;
      current = from[current];

      if (cells.road[current]) {
        if (segment.length) {
          segment.push(current);
          path.push(segment);
          if (segment[0] !== end) cells.road[segment[0]] += score; // crossroad
          if (current !== start) cells.road[current] += score; // crossroad
        }
        segment = [];
        prev = current;
      } else {
        if (prev) segment.push(prev);
        prev = null;
        segment.push(current);
      }

      cells.road[current] += score;
      if (current === start) break;
    }

    if (segment.length > 1) path.push(segment);
    return path;
  }

  // Find a land path from cell to a closest road
  function findILandPathToRoad(start, exit = null) {
    const cells = pack.cells;
    const queue = new PriorityQueue({comparator: (a, b) => a.p - b.p});
    const cost = [], from = [];
    queue.queue({e: start, p: 0});

    while (queue.length) {
      const next = queue.dequeue(), n = next.e, p = next.p;
      if (cells.road[n]) {exit = n; break;}

      for (const c of cells.c[n]) {
        if (cells.h[c] < 20) continue; // ignore water cells

        const typeCost = cells.t[c] === 1 ? 10 : cells.t[c] === 2 ? 50 : 100;
        const biomeCost = biomesData.cost[cells.biome[c]];
        const heightCost = cells.h[c] + (cells.h[c] >= 70 ? 100 : cells.h[c] >= 50 ? 30 : 0);
        const cellCost = typeCost + biomeCost + heightCost;
        const totalCost = p + (cells.road[c] || cells.burg[c] ? -50 : cellCost);

        if (from[c] || totalCost >= cost[c]) continue;
        cost[c] = totalCost;
        from[c] = n;
        queue.queue({e: c, p: totalCost});
      }
      
    }
    return [from, exit];
  }

  // Dijkstra's algorithm to find a land path from one cell to another cell
  function findDirectOceanPath(start, end) {
    const cells = pack.cells;
    const queue = new PriorityQueue({comparator: (a, b) => a.p - b.p});
    const cost = [], from = [];
    queue.queue({e: start, p: 0});

    while (queue.length) {
      const next = queue.dequeue(), n = next.e, p = next.p;

      for (const c of cells.c[n]) {
        if (c === end) return from; // end is reached
        if (cells.h[c] >= 20) continue; // ignore land non-port cells
        const dist2 = (cells.p[c][1] - cells.p[n][1]) ** 2 + (cells.p[c][0] - cells.p[n][0]) ** 2;
        const totalCost = p + dist2 + cells.road[c] * 50 + (cells.t[c] ? 1 : 100);

        if (from[c] || totalCost >= cost[c]) continue;
        cost[c] = totalCost;
        from[c] = n;
        queue.queue({e: c, p: totalCost});
      }

    }
    return from;
  }

  // find water paths from one port to all cells of theat water body
  function findIndirectOceanPath(start) {
    const cells = pack.cells;
    const queue = new PriorityQueue({comparator: (a, b) => a.p - b.p});
    const cost = [], from = [];
    queue.queue({e: start, p: 0});

    while (queue.length) {
      const next = queue.dequeue(), n = next.e, p = next.p;

      for (const c of cells.c[n]) {
        if (cells.h[c] >= 20) continue; // ignore land non-port cells
        const dist2 = (cells.p[c][1] - cells.p[n][1]) ** 2 + (cells.p[c][0] - cells.p[n][0]) ** 2;
        const totalCost = p + (cells.road[c] ? 1 : dist2 + (cells.t[c] ? 1 : 100));

        if (from[c] || totalCost >= cost[c]) continue;
        cost[c] = totalCost;
        from[c] = n;
        queue.queue({e: c, p: totalCost});
      }

    }
    return from;
  }

})));