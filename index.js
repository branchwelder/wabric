import * as d3 from "d3";
import { Pane } from "tweakpane";
import { buildGraph } from "./stitchMesh";

const PARAMS = {
  // size
  width: 30,
  height: 30,

  iterations: 3,
  edge_length: 20,

  // Charge
  enableCharge: true,
  chargeStrength: -100,
  maxChargeDistance: 100,

  // Vertex Collision
  enableCollision: true,

  // Shear
  enableShear: true,
  K_SHEAR: 0.5,
  shear_ratio: 0.5,

  // Stretch
  enableStretch: true,
  K_STRETCH: 2.5,

  // Strut
  enableStrut: true,
  K_STRUT: 2.5,

  // Viz
  showFaces: true,
  showVertices: false,
  faceColor: "#25696f",
  vertexColor: "#163638",
  faceOpacity: 0.32,
  showStretch: true,
  showStrut: false,
  showShear: false,
};

const pane = new Pane();
pane
  .addInput(PARAMS, "width", {
    format: (v) => parseInt(v),
  })
  .on("change", runSimulation);

pane
  .addInput(PARAMS, "height", {
    format: (v) => parseInt(v),
  })
  .on("change", runSimulation);

pane
  .addInput(PARAMS, "iterations", { min: 1, max: 15, step: 1 })
  .on("change", addForces);

// Edge Length
const edgeLen = pane.addInput(PARAMS, "edge_length", {
  min: 10,
  max: 200,
  step: 1,
});
edgeLen.on("change", addForces);

// STRETCH SETTINGS
const chargeSettings = pane.addFolder({
  title: "Charge Forces",
});
chargeSettings.addInput(PARAMS, "enableCharge").on("change", addForces);
chargeSettings
  .addInput(PARAMS, "chargeStrength", { min: -1000, max: 0, step: 5 })
  .on("change", addForces);
chargeSettings
  .addInput(PARAMS, "maxChargeDistance", { min: 0, max: 1000, step: 5 })
  .on("change", addForces);

// Collision SETTINGS
const collisionSettings = pane.addFolder({
  title: "Collision Forces",
});
collisionSettings.addInput(PARAMS, "enableCollision").on("change", addForces);

// STRETCH SETTINGS
const stretchSettings = pane.addFolder({
  title: "Stretch Forces",
});
stretchSettings.addInput(PARAMS, "enableStretch").on("change", addForces);
stretchSettings.addInput(PARAMS, "K_STRETCH").on("change", addForces);

// SHEAR SETTINGS
const shearSettings = pane.addFolder({
  title: "Shear Forces",
});
shearSettings.addInput(PARAMS, "enableShear").on("change", addForces);
shearSettings.addInput(PARAMS, "shear_ratio").on("change", addForces);
shearSettings.addInput(PARAMS, "K_SHEAR").on("change", addForces);

// STRUT SETTINGS
const strutSettings = pane.addFolder({
  title: "Strut Forces",
});
strutSettings.addInput(PARAMS, "enableStrut").on("change", addForces);
strutSettings.addInput(PARAMS, "K_STRUT").on("change", addForces);

// STRUT SETTINGS
const vizSettings = pane.addFolder({
  title: "Viz",
});
vizSettings.addInput(PARAMS, "faceColor").on("change", startViz);
vizSettings.addInput(PARAMS, "vertexColor").on("change", startViz);
vizSettings
  .addInput(PARAMS, "faceOpacity", { min: 0, max: 1, step: 0.01 })
  .on("change", startViz);
vizSettings.addInput(PARAMS, "showFaces").on("change", startViz);
vizSettings.addInput(PARAMS, "showVertices").on("change", startViz);
vizSettings.addInput(PARAMS, "showStrut").on("change", startViz);
vizSettings.addInput(PARAMS, "showStretch").on("change", startViz);
vizSettings.addInput(PARAMS, "showShear").on("change", startViz);

// SIMULATION
const svg = d3.select("svg");
let width = window.innerWidth;
let height = window.innerHeight;

let stitches, vertices, stretchLinks, shearLinks, strutLinks;
let simulation;

function strutForce(links) {
  return d3
    .forceLink(links)
    .distance(2 * PARAMS.edge_length)
    .strength(PARAMS.K_STRUT)
    .iterations(PARAMS.iterations);
}

function shearForce(links) {
  return d3
    .forceLink(links)
    .distance(
      PARAMS.shear_ratio * Math.sqrt(2 * Math.pow(PARAMS.edge_length, 2))
    )
    .strength(PARAMS.K_SHEAR)
    .iterations(PARAMS.iterations);
}

function stretchForce(links) {
  return d3
    .forceLink(links)
    .distance(PARAMS.edge_length)
    .strength(PARAMS.K_STRETCH)
    .iterations(PARAMS.iterations);
}

function centerForce() {
  return d3.forceCenter(width / 2, height / 2);
}

function chargeForce() {
  return d3
    .forceManyBody()
    .strength(PARAMS.chargeStrength)
    .distanceMax(PARAMS.maxChargeDistance);
}

function collideForce() {
  return d3.forceCollide().radius(3);
}

function addForces() {
  simulation.force("strut", PARAMS.enableStrut ? strutForce(strutLinks) : null);
  simulation.force("shear", PARAMS.enableShear ? shearForce(shearLinks) : null);
  simulation.force(
    "stretch",
    PARAMS.enableStretch ? stretchForce(stretchLinks) : null
  );

  simulation.force("charge", PARAMS.enableCharge ? chargeForce() : null);
  simulation.force("collision", PARAMS.enableCollision ? collideForce() : null);
  simulation.restart();
  simulation.alpha(0.4);
}

function runSimulation() {
  if (simulation) simulation.stop();
  simulation = null;
  ({ stitches, vertices, stretchLinks, shearLinks, strutLinks } = buildGraph(
    PARAMS.width,
    PARAMS.height
  ));
  simulation = d3
    .forceSimulation(vertices)
    .force("center", centerForce())
    .on("tick", ticked);
  addForces();
  startViz();
}

function getFacePoints(stitch) {
  return stitch.vertices.reduce(
    (str, vertexID) => `${str} ${vertices[vertexID].x},${vertices[vertexID].y}`,
    ""
  );
}

// Add a line for each link, and a circle for each vertex.
let stretch, shear, strut, stitchFace, vertex;

function startViz() {
  d3.selectAll(".stretch").remove();
  d3.selectAll(".shear").remove();
  d3.selectAll(".strut").remove();
  d3.selectAll(".stitchface").remove();
  d3.selectAll(".vertices").remove();

  if (PARAMS.showStretch) {
    stretch = svg
      .append("g")
      .attr("class", "stretch")
      .selectAll("line")
      .data(stretchLinks)
      .enter()
      .append("line");
  }
  if (PARAMS.showShear) {
    shear = svg
      .append("g")
      .attr("class", "shear")
      .selectAll("line")
      .data(shearLinks)
      .enter()
      .append("line")
      .attr("stroke-width", 2);
  }

  if (PARAMS.showStrut) {
    strut = svg
      .append("g")
      .attr("class", "strut")
      .selectAll("line")
      .data(strutLinks)
      .enter()
      .append("line")
      .attr("stroke-width", 2);
  }

  if (PARAMS.showFaces) {
    stitchFace = svg
      .append("g")
      .attr("class", "stitchface")
      .selectAll()
      .data(stitches)
      .join("polygon")
      .attr("fill", PARAMS.faceColor)
      .attr("opacity", PARAMS.faceOpacity);
  }

  if (PARAMS.showVertices) {
    vertex = svg
      .append("g")
      .attr("class", "vertices")
      .selectAll()
      .data(vertices)
      .join("circle")
      .attr("r", 3)
      .attr("fill", PARAMS.vertexColor);
  }

  if (vertex)
    vertex.call(
      d3
        .drag()
        .on("start", vertexDragStarted)
        .on("drag", vertexDragged)
        .on("end", vertexDragEnded)
    );

  if (stitchFace)
    stitchFace.call(
      d3
        .drag()
        .on("start", faceDragStart)
        .on("drag", faceDragged)
        .on("end", faceDragEnded)
    );
  ticked();
}

// Set the position attributes of links and vertices each time the simulation ticks.
function ticked() {
  if (PARAMS.showStretch) {
    stretch
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
  }

  if (PARAMS.showShear) {
    shear
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
  }

  if (PARAMS.showStrut) {
    strut
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
  }

  if (PARAMS.showVertices) {
    vertex.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  }

  if (PARAMS.showFaces) {
    stitchFace.attr("points", (d) => getFacePoints(d));
  }
}

// Reheat the simulation when drag starts, and fix the subject position.
function faceDragStart(event) {
  if (!event.active) simulation.alphaTarget(0.5).restart();

  event.subject.vertices.forEach((vertexID) => {
    const vert = vertices[vertexID];
    vert.fx = vert.x;
    vert.fy = vert.y;
  });
}

// Update the subject (dragged vertex) position during drag.
function faceDragged(event) {
  event.subject.vertices.forEach((vertexID) => {
    const vert = vertices[vertexID];
    vert.fx += event.dx;
    vert.fy += event.dy;
  });
}

// Restore the target alpha so the simulation cools after dragging ends.
// Unfix the subject position now that it’s no longer being dragged.
function faceDragEnded(event) {
  if (!event.active) simulation.alphaTarget(0);
  event.subject.vertices.forEach((vertexID) => {
    const vert = vertices[vertexID];
    vert.fx = null;
    vert.fy = null;
  });
}

// Reheat the simulation when drag starts, and fix the subject position.
function vertexDragStarted(event) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  event.subject.fx = event.subject.x;
  event.subject.fy = event.subject.y;
}

// Update the subject (dragged node) position during drag.
function vertexDragged(event) {
  event.subject.fx = event.x;
  event.subject.fy = event.y;
}

// Restore the target alpha so the simulation cools after dragging ends.
// Unfix the subject position now that it’s no longer being dragged.
function vertexDragEnded(event) {
  if (!event.active) simulation.alphaTarget(0);
  event.subject.fx = null;
  event.subject.fy = null;
}

runSimulation();
