// Module to store general UI functions
"use strict";

// ask before closing the window
window.onbeforeunload = () => "Are you sure you want to navigate away?";

// fit full-screen map if window is resized
$(window).resize(function(e) {
  // trick to prevent resize on download bar opening
  if (autoResize === false) return;
  mapWidthInput.value = window.innerWidth;
  mapHeightInput.value = window.innerHeight;
  changeMapSize();
});

// Tooltips
const tooltip = document.getElementById("tooltip");

// show tip for non-svg elemets with data-tip
document.getElementById("dialogs").addEventListener("mousemove", showDataTip);
document.getElementById("optionsContainer").addEventListener("mousemove", showDataTip);

function tip(tip = "Tip is undefined", main = false, error = false) {
  const reg = "linear-gradient(0.1turn, #ffffff00, #5e5c5c66, #ffffff00)";
  const red = "linear-gradient(0.1turn, #ffffff00, #e3141499, #ffffff00)";
  tooltip.innerHTML = tip;
  tooltip.style.background = error ? red : reg;
  if (main) tooltip.dataset.main = tip;
}

function showMainTip() {
  tooltip.style.background = "linear-gradient(0.1turn, #aaffff00, #3a26264d, #ffffff00)";
  tooltip.innerHTML = tooltip.dataset.main;
}

function clearMainTip() {
  tooltip.dataset.main = "";
  tooltip.innerHTML = "";
}

function showDataTip(e) {
  if (!e.target) return;
  if (e.target.dataset.tip) {tip(e.target.dataset.tip); return;};
  if (e.target.parentNode.dataset.tip) tip(e.target.parentNode.dataset.tip);
}

function moved() {
  const point = d3.mouse(this);
  const i = findCell(point[0], point[1]); // pack ell id
  if (i === undefined) return;
  showLegend(d3.event, i);
  const g = findGridCell(point[0], point[1]); // grid cell id
  if (tooltip.dataset.main) showMainTip(); else showMapTooltip(d3.event, i, g);
  if (toolsContent.style.display === "block" && cellInfo.style.display === "block") updateCellInfo(point, i, g);
}

// show legend on hover (if any)
function showLegend(e, i) {
  let id = e.target.id || e.target.parentNode.id;
  if (e.target.parentNode.parentNode.id === "burgLabels") id = "burg" + e.target.dataset.id; else
  if (e.target.parentNode.parentNode.id === "burgIcons") id = "burg" + e.target.dataset.id;

  const note = notes.find(note => note.id === id);
  if (note !== undefined && note.legend !== "") {
    document.getElementById("legend").style.display = "block";
    document.getElementById("legendHeader").innerHTML = note.name;
    document.getElementById("legendBody").innerHTML = note.legend;
  } else {
    document.getElementById("legend").style.display = "none";
    document.getElementById("legendHeader").innerHTML = "";
    document.getElementById("legendBody").innerHTML = "";
  }
}

// show viewbox tooltip if main tooltip is blank
function showMapTooltip(e, i, g) {
  tip(""); // clear tip
  const tag = e.target.tagName;
  const path = e.composedPath ? e.composedPath() : getComposedPath(e.target); // apply polyfill
  const group = path[path.length - 7].id;
  const subgroup = path[path.length - 8].id;
  const land = pack.cells.h[i] >= 20;
  
  // specific elements
  if (group === "rivers") {tip("Click to edit the River"); return;}
  if (group === "routes") {tip("Click to edit the Route"); return;}
  if (group === "terrain") {tip("Click to edit the Relief Icon"); return;}
  if (subgroup === "burgLabels" || subgroup === "burgIcons") {tip("Click to open Burg Editor"); return;}
  if (group === "labels") {tip("Click to edit the Label"); return;}
  if (group === "markers") {tip("Click to edit the Marker"); return;}
  if (group === "ruler") {
    if (tag === "rect") {tip("Drag to split the ruler into 2 parts"); return;}
    if (tag === "circle") {tip("Drag to adjust the measurer"); return;}
    if (tag === "path" || tag === "line") {tip("Drag to move the measurer"); return;}
    if (tag === "text") {tip("Click to remove the measurer"); return;}
  }
  if (subgroup === "burgIcons") {tip("Click to edit the Burg"); return;}
  if (subgroup === "burgLabels") {tip("Click to edit the Burg"); return;}
  if (subgroup === "freshwater" && !land) {tip("Freshwater lake"); return;}
  if (subgroup === "salt" && !land) {tip("Salt lake"); return;}

  // covering elements
  if (layerIsOn("togglePrec") && land) tip("Annual Precipitation: "+ getFriendlyPrecipitation(i)); else
  if (layerIsOn("togglePopulation")) tip("Population: "+ getFriendlyPopulation(i)); else
  if (layerIsOn("toggleTemp")) tip("Temperature: " + convertTemperature(grid.cells.temp[g])); else
  if (layerIsOn("toggleBiomes") && pack.cells.biome[i]) tip("Biome: " + biomesData.name[pack.cells.biome[i]]); else
  if (layerIsOn("toggleStates") && pack.cells.state[i]) tip("State: " + pack.states[pack.cells.state[i]].name); else
  if (layerIsOn("toggleCultures") && pack.cells.culture[i]) tip("Culture: " + pack.cultures[pack.cells.culture[i]].name); else
  if (layerIsOn("toggleHeight")) tip("Height: " + getFriendlyHeight(pack.cells.h[i]));
}

// get cell info on mouse move
function updateCellInfo(point, i, g) {
  const cells = pack.cells;
  infoX.innerHTML = rn(point[0]);
  infoY.innerHTML = rn(point[1]);
  infoCell.innerHTML = i;
  const unit = areaUnit.value === "square" ? " " + distanceUnit.value + "²" : " " + areaUnit.value;
  infoArea.innerHTML = cells.area[i] ? si(cells.area[i] * distanceScale.value ** 2) + unit : "n/a";
  infoHeight.innerHTML = getFriendlyHeight(cells.h[i]) + " (" + cells.h[i] + ")";
  infoTemp.innerHTML = convertTemperature(grid.cells.temp[g]);
  infoPrec.innerHTML = pack.cells.h[i] >= 20 ? getFriendlyPrecipitation(i) : "n/a";
  infoState.innerHTML = ifDefined(cells.state[i]) !== "no" ? pack.states[cells.state[i]].name + " (" + cells.state[i] + ")" : "n/a";
  infoCulture.innerHTML = ifDefined(cells.culture[i]) !== "no" ? pack.cultures[cells.culture[i]].name + " (" + cells.culture[i] + ")" : "n/a";
  infoPopulation.innerHTML = getFriendlyPopulation(i);
  infoBurg.innerHTML = cells.burg[i] ? pack.burgs[cells.burg[i]].name + " (" + cells.burg[i] + ")" : "no";
  const f = cells.f[i];
  infoFeature.innerHTML = f ? pack.features[f].group + " (" + f + ")" : "n/a";
  infoBiome.innerHTML = biomesData.name[cells.biome[i]];
}

// return value (v) if defined with number of decimals (d), else return "no" or attribute (r)
function ifDefined(v, r = "no", d) {
  if (v === null || v === undefined) return r;
  if (d) return v.toFixed(d);
  return v;
}

// get user-friendly (real-world) height value from map data
function getFriendlyHeight(h) {
  const unit = heightUnit.value;
  let unitRatio = 3.281; // default calculations are in feet
  if (unit === "m") unitRatio = 1; // if meter
  else if (unit === "f") unitRatio = 0.5468; // if fathom

  let height = -990;
  if (h >= 20) height = Math.pow(h - 18, +heightExponent.value);
  else if (h < 20 && h > 0) height = (h - 20) / h * 50;

  return rn(height * unitRatio) + " " + unit;
}

// get user-friendly (real-world) precipitation value from map data
function getFriendlyPrecipitation(i) {
  const prec = grid.cells.prec[pack.cells.g[i]];
  return prec * 100 + " mm";
}

// get user-friendly (real-world) population value from map data
function getFriendlyPopulation(i) {
  const rural = pack.cells.pop[i] * populationRate.value;
  const urban = pack.cells.burg[i] ? pack.burgs[pack.cells.burg[i]].population * populationRate.value * urbanization.value : 0;  
  return si(rural+urban);
}

// assign lock behavior  
document.querySelectorAll("[data-locked]").forEach(function(e) {
  e.addEventListener("mouseover", function(event) {
    if (this.className === "icon-lock") tip("Click to unlock the option and allow it to be randomized on new map generation");
    else tip("Click to lock the option and always use the current value on new map generation");
    event.stopPropagation();
  });
  
  e.addEventListener("click", function(event) {
    const id = (this.id).slice(5);
    if (this.className === "icon-lock") unlock(id);
    else lock(id);
  });
});

// lock option
function lock(id) {
  const input = document.querySelector("[data-stored='"+id+"']");
  if (input) localStorage.setItem(id, input.value);  
  const el = document.getElementById("lock_" + id);
  if(!el) return;
  el.dataset.locked = 1;
  el.className = "icon-lock";
}
 
// unlock option
function unlock(id) {
  localStorage.removeItem(id);
  const el = document.getElementById("lock_" + id);
  if(!el) return;
  el.dataset.locked = 0;
  el.className = "icon-lock-open";
}

// check if option is locked
function locked(id) {
  const lockEl = document.getElementById("lock_" + id);
  return lockEl.dataset.locked == 1;
}

// Hotkeys, see github.com/Azgaar/Fantasy-Map-Generator/wiki/Hotkeys
document.addEventListener("keydown", function(event) {
  const active = document.activeElement.tagName;
  if (active === "INPUT" || active === "SELECT" || active === "TEXTAREA") return; // don't trigger if user inputs a text 
  const key = event.keyCode, ctrl = event.ctrlKey, shift = event.shiftKey;
  if (key === 118) regenerateMap(); // "F7" for new map
  else if (key === 27) {closeDialogs(); hideOptions();} // Escape to close all dialogs
  else if (key === 9) {toggleOptions(event); event.preventDefault();} // Tab to toggle options
  else if (ctrl && key === 80) saveAsImage("png"); // Ctrl + "P" to save as PNG
  else if (ctrl && key === 83) saveAsImage("svg"); // Ctrl + "S" to save as SVG
  else if (shift && key === 79) saveGeo("osm"); // Shift + "O" to save as OSM
  else if (shift && key === 74) saveGeo("json"); // Shift + "J" to save as JSON
  else if (ctrl && key === 77) saveMap(); // Ctrl + "M" to save MAP file
  else if (ctrl && key === 76) mapToLoad.click(); // Ctrl + "L" to load MAP
  else if (key === 46) removeElementOnKey(); // "Delete" to remove the selected element

  else if (shift && key === 192) console.log(pack.cells); // Shift + "`" to log cells data
  else if (shift && key === 66) console.table(pack.burgs); // Shift + "B" to log burgs data
  else if (shift && key === 83) console.table(pack.states); // Shift + "S" to log states data
  else if (shift && key === 67) console.table(pack.cultures); // Shift + "C" to log cultures data
  else if (shift && key === 70) console.table(pack.features); // Shift + "F" to log features data

  else if (key === 88) toggleTexture(); // "X" to toggle Texture layer
  else if (key === 72) toggleHeight(); // "H" to toggle Heightmap layer
  else if (key === 66) toggleBiomes(); // "B" to toggle Biomes layer
  else if (key === 69) toggleCells(); // "E" to toggle Cells layer
  else if (key === 71) toggleGrid(); // "G" to toggle Grid layer
  else if (key === 79) toggleCoordinates(); // "O" to toggle Coordinates layer
  else if (key === 87) toggleCompass(); // "W" to toggle Compass Rose layer
  else if (key === 86) toggleRivers(); // "V" to toggle Rivers layer
  else if (key === 82) toggleRelief(); // "R" to toggle Relief icons layer
  else if (key === 67) toggleCultures(); // "C" to toggle Cultures layer
  else if (key === 83) toggleStates(); // "S" to toggle States layer
  else if (key === 68) toggleBorders(); // "D" to toggle Borders layer
  else if (key === 85) toggleRoutes(); // "U" to toggle Routes layer
  else if (key === 84) toggleTemp(); // "T" to toggle Temperature layer
  else if (key === 80) togglePopulation(); // "P" to toggle Population layer
  else if (key === 65) togglePrec(); // "A" to toggle Precipitation layer
  else if (key === 76) toggleLabels(); // "L" to toggle Labels layer
  else if (key === 73) toggleIcons(); // "I" to toggle Icons layer
  else if (key === 77) toggleMarkers(); // "M" to toggle Markers layer
  else if (key === 187) toggleRulers(); // Equal (=) to toggle Rulers
  else if (key === 189) toggleScaleBar(); // Minus (-) to toggle Scale bar

  else if (key === 37) zoom.translateBy(svg, 10, 0); // Left to scroll map left
  else if (key === 39) zoom.translateBy(svg, -10, 0); // Right to scroll map right
  else if (key === 38) zoom.translateBy(svg, 0, 10); // Up to scroll map up
  else if (key === 40) zoom.translateBy(svg, 0, -10); // Up to scroll map up
  else if (key === 107) zoom.scaleBy(svg, 1.2); // Numpad Plus to zoom map up
  else if (key === 109) zoom.scaleBy(svg, 0.8); // Numpad Minus to zoom map out
  else if (key === 48 || key === 96) resetZoom(1000); // 0 to reset zoom
  else if (key === 49 || key === 97) zoom.scaleTo(svg, 1); // 1 to zoom to 1
  else if (key === 50 || key === 98) zoom.scaleTo(svg, 2); // 2 to zoom to 2
  else if (key === 51 || key === 99) zoom.scaleTo(svg, 3); // 3 to zoom to 3
  else if (key === 52 || key === 100) zoom.scaleTo(svg, 4); // 4 to zoom to 4
  else if (key === 53 || key === 101) zoom.scaleTo(svg, 5); // 5 to zoom to 5
  else if (key === 54 || key === 102) zoom.scaleTo(svg, 6); // 6 to zoom to 6
  else if (key === 55 || key === 103) zoom.scaleTo(svg, 7); // 7 to zoom to 7
  else if (key === 56 || key === 104) zoom.scaleTo(svg, 8); // 8 to zoom to 8
  else if (key === 57 || key === 105) zoom.scaleTo(svg, 9); // 9 to zoom to 9

  else if (ctrl && key === 90) undo.click(); // Ctrl + "Z" to undo
  else if (ctrl && key === 89) redo.click(); // Ctrl + "Y" to redo
});
