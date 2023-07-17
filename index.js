import * as d3 from "d3";
import { Pane } from "tweakpane";
import { buildGraph } from "./wabricGraph";

const svg = d3.select("svg");
let simulation;

// Graph data
let faces, vertices, stretchLinks, shearLinks, strutLinks;

// SVG elements
let stretch, shear, strut, face, vertex;

let viewWidth = window.innerWidth;
let viewHeight = window.innerHeight;

const PARAMS = {
  // Base
  width: 20,
  height: 20,

  // Shear
  enableShear: true,
  K_SHEAR: 0.5,
  shear_ratio: 0.5,

  // Stretch
  enableStretch: true,
  K_STRETCH: 2.5,
  edge_length: 20,

  // Strut
  enableStrut: true,
  K_STRUT: 2.5,

  // Charge
  enableCharge: true,
  chargeStrength: -25,
  maxChargeDistance: 0.5,

  // Viz
  showFaces: true,
  showVertices: false,

  backgroundColor: "#192d3a",

  faceColor: "#327aa87c",
  vertexColor: "#16363867",
  vertexRadius: 3,

  showStretch: true,
  stretchColor: "#3078a67c",
  showStrut: false,
  strutColor: "#b062a57c",
  showShear: false,
  shearColor: "#3a7d227c",
  forceStrokeWidth: 1,

  // Advanced
  enableCollision: false,
  iterations: 3,
};

/////////////////////////////////////////////////////////////////
// PARAMETERS
/////////////////////////////////////////////////////////////////

const pane = new Pane({
  title: "Wabric",
});

const preset = pane.exportPreset();

pane
  .addInput(PARAMS, "width", {
    min: 5,
    step: 1,
  })
  .on("change", runSimulation);

pane
  .addInput(PARAMS, "height", {
    min: 5,
    step: 1,
  })
  .on("change", runSimulation);

// const presets = pane.addFolder({ title: "presets" });

/////////////////////////////////////////////////////////////////
// Forces
/////////////////////////////////////////////////////////////////

const forceSettings = pane.addFolder({
  title: "Forces",
});

// Stretch
forceSettings
  .addInput(PARAMS, "enableStretch", {
    label: "Stretch Forces",
  })
  .on("change", refreshForces);
forceSettings
  .addInput(PARAMS, "edge_length", {
    label: "Edge Length",
    min: 10,
    max: 200,
    step: 1,
  })
  .on("change", refreshForces);
forceSettings
  .addInput(PARAMS, "K_STRETCH", {
    label: "K_stretch",
  })
  .on("change", refreshForces);
forceSettings.addSeparator();

// Shear
forceSettings
  .addInput(PARAMS, "enableShear", {
    label: "Shear Forces",
  })
  .on("change", refreshForces);
forceSettings
  .addInput(PARAMS, "shear_ratio", {
    label: "Shear Ratio",
  })
  .on("change", refreshForces);
forceSettings
  .addInput(PARAMS, "K_SHEAR", {
    label: "K_shear",
  })
  .on("change", refreshForces);
forceSettings.addSeparator();

// Strut
forceSettings
  .addInput(PARAMS, "enableStrut", {
    label: "Strut Forces",
  })
  .on("change", refreshForces);
forceSettings
  .addInput(PARAMS, "K_STRUT", {
    label: "K_strut",
  })
  .on("change", refreshForces);
forceSettings.addSeparator();

// Charge
forceSettings
  .addInput(PARAMS, "enableCharge", {
    label: "Charge",
  })
  .on("change", refreshForces);
forceSettings
  .addInput(PARAMS, "chargeStrength", {
    label: "Charge Strength",
    min: -1000,
    max: 0,
    step: 5,
  })
  .on("change", refreshForces);
forceSettings
  .addInput(PARAMS, "maxChargeDistance", {
    label: "Max Charge Distance",
    min: 0,
    max: 10,
    step: 0.1,
  })
  .on("change", refreshForces);

/////////////////////////////////////////////////////////////////
// VIZ SETTINGS
/////////////////////////////////////////////////////////////////
const vizSettings = pane.addFolder({
  title: "Viz",
});

vizSettings
  .addInput(PARAMS, "backgroundColor", {
    label: "Background Color",
  })
  .on("change", setBackground);

vizSettings
  .addInput(PARAMS, "showFaces", {
    label: "Draw Faces",
  })
  .on("change", () => {
    drawFaces();
    ticked();
  });
vizSettings
  .addInput(PARAMS, "faceColor", {
    label: "Face Color",
  })
  .on("change", () => face.attr("fill", PARAMS.faceColor));

vizSettings.addSeparator();

vizSettings
  .addInput(PARAMS, "showVertices", {
    label: "Draw Vertices",
  })
  .on("change", () => {
    drawVertices();
    ticked();
  });
vizSettings
  .addInput(PARAMS, "vertexColor", {
    label: "Vertex Color",
  })
  .on("change", () => vertex.attr("fill", PARAMS.vertexColor));
vizSettings
  .addInput(PARAMS, "vertexRadius", {
    label: "Vertex Radius",
    min: 2,
    max: 30,
    step: 1,
  })
  .on("change", () => vertex.attr("r", PARAMS.vertexRadius));

vizSettings.addSeparator();

vizSettings
  .addInput(PARAMS, "showStretch", {
    label: "Draw Stretch",
  })
  .on("change", () => {
    drawStretch();
    ticked();
  });
vizSettings
  .addInput(PARAMS, "stretchColor", {
    label: "Stretch Color",
  })
  .on("change", () => stretch.attr("stroke", PARAMS.stretchColor));
vizSettings
  .addInput(PARAMS, "showShear", {
    label: "Draw Shear",
  })
  .on("change", () => {
    drawShear();
    ticked();
  });
vizSettings
  .addInput(PARAMS, "shearColor", {
    label: "Shear Color",
  })
  .on("change", () => shear.attr("stroke", PARAMS.shearColor));
vizSettings
  .addInput(PARAMS, "showStrut", {
    label: "Draw Strut",
  })
  .on("change", () => {
    drawStrut();
    ticked();
  });
vizSettings
  .addInput(PARAMS, "strutColor", {
    label: "Strut Color",
  })
  .on("change", () => strut.attr("stroke", PARAMS.strutColor));
vizSettings
  .addInput(PARAMS, "forceStrokeWidth", {
    label: "Link Stroke Width",
    min: 1,
    max: 30,
    step: 1,
  })
  .on("change", () => {
    if (stretch) stretch.attr("stroke-width", PARAMS.forceStrokeWidth);
    if (shear) shear.attr("stroke-width", PARAMS.forceStrokeWidth);
    if (strut) strut.attr("stroke-width", PARAMS.forceStrokeWidth);
  });

// check for common mobile user agents
if (
  navigator.userAgent.match(/Android/i) ||
  navigator.userAgent.match(/webOS/i) ||
  navigator.userAgent.match(/iPhone/i) ||
  navigator.userAgent.match(/iPad/i) ||
  navigator.userAgent.match(/iPod/i) ||
  navigator.userAgent.match(/BlackBerry/i) ||
  navigator.userAgent.match(/Windows Phone/i)
) {
  pane.expanded = false;
  forceSettings.expanded = false;
  vizSettings.expanded = false;
}

/////////////////////////////////////////////////////////////////
// ADVANCED
/////////////////////////////////////////////////////////////////

const advanced = pane.addFolder({
  title: "Advanced",
  expanded: false,
});

advanced
  .addInput(PARAMS, "enableCollision", { label: "Vertex Collision" })
  .on("change", refreshForces);
advanced
  .addInput(PARAMS, "iterations", {
    label: "Iterations",
    min: 1,
    max: 15,
    step: 1,
  })
  .on("change", refreshForces);

/////////////////////////////////////////////////////////////////
// INIT VARS
/////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////
// Forces
/////////////////////////////////////////////////////////////////

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
  return d3.forceCenter(viewWidth / 2, viewHeight / 2);
}

function chargeForce() {
  return d3
    .forceManyBody()
    .strength(PARAMS.chargeStrength)
    .distanceMax(PARAMS.maxChargeDistance * PARAMS.edge_length);
}

function collideForce() {
  return d3.forceCollide().radius(PARAMS.vertexRadius);
}

function refreshForces() {
  // Check whether each force is enabled and recreate it (or assign it to null)
  simulation.force("strut", PARAMS.enableStrut ? strutForce(strutLinks) : null);
  simulation.force("shear", PARAMS.enableShear ? shearForce(shearLinks) : null);
  simulation.force(
    "stretch",
    PARAMS.enableStretch ? stretchForce(stretchLinks) : null
  );
  simulation.force("charge", PARAMS.enableCharge ? chargeForce() : null);
  simulation.force("collision", PARAMS.enableCollision ? collideForce() : null);

  // Restart simulation and set alpha (otherwise, if the simulation is already
  // "cool" it won't update when settings change until there is user input)
  simulation.restart();
  simulation.alpha(0.4);
}

function drawVertices() {
  if (PARAMS.showVertices) {
    // Create circles for all vertices
    vertex = svg
      .append("g")
      .attr("class", "vertices")
      .selectAll()
      .data(vertices)
      .join("circle")
      .attr("r", PARAMS.vertexRadius)
      .attr("fill", PARAMS.vertexColor);

    // Attatch drag handlers
    vertex.call(
      d3
        .drag()
        .on("start", (e) => dragStart(e, "vertex"))
        .on("drag", (e) => dragged(e, "vertex"))
        .on("end", (e) => dragEnd(e, "vertex"))
    );
  } else {
    // Remove SVG elements
    d3.selectAll(".vertices").remove();
  }
}

function drawFaces() {
  if (PARAMS.showFaces) {
    // Create polygons for all faces
    face = svg
      .append("g")
      .attr("class", "faces")
      .selectAll()
      .data(faces)
      .join("polygon")
      .attr("fill", PARAMS.faceColor);

    face.call(
      d3
        .drag()
        .on("start", (e) => dragStart(e, "face"))
        .on("drag", (e) => dragged(e, "face"))
        .on("end", (e) => dragEnd(e, "face"))
    );
  } else {
    d3.selectAll(".faces").remove();
  }
}

function drawStretch() {
  if (PARAMS.showStretch) {
    stretch = svg
      .append("g")
      .attr("class", "stretch")
      .selectAll("line")
      .data(stretchLinks)
      .enter()
      .append("line")
      .attr("stroke-linecap", "round")
      .attr("stroke", PARAMS.stretchColor)
      .attr("stroke-width", PARAMS.forceStrokeWidth);

    stretch.call(
      d3
        .drag()
        .on("start", (e) => dragStart(e, "link"))
        .on("drag", (e) => dragged(e, "link"))
        .on("end", (e) => dragEnd(e, "link"))
    );
  } else {
    d3.selectAll(".stretch").remove();
  }
}

function drawShear() {
  if (PARAMS.showShear) {
    shear = svg
      .append("g")
      .attr("class", "shear")
      .selectAll("line")
      .data(shearLinks)
      .enter()
      .append("line")
      .attr("stroke-linecap", "round")
      .attr("stroke", PARAMS.shearColor)
      .attr("stroke-width", PARAMS.forceStrokeWidth);

    shear.call(
      d3
        .drag()
        .on("start", (e) => dragStart(e, "link"))
        .on("drag", (e) => dragged(e, "link"))
        .on("end", (e) => dragEnd(e, "link"))
    );
  } else {
    d3.selectAll(".shear").remove();
  }
}

function drawStrut() {
  if (PARAMS.showStrut) {
    strut = svg
      .append("g")
      .attr("class", "strut")
      .selectAll("line")
      .data(strutLinks)
      .enter()
      .append("line")
      .attr("stroke-linecap", "round")
      .attr("stroke", PARAMS.strutColor)
      .attr("stroke-width", PARAMS.forceStrokeWidth);

    strut.call(
      d3
        .drag()
        .on("start", (e) => dragStart(e, "link"))
        .on("drag", (e) => dragged(e, "link"))
        .on("end", (e) => dragEnd(e, "link"))
    );
  } else {
    d3.selectAll(".strut").remove();
  }
}

// Set the position attributes of links and vertices each time the simulation ticks
// Uses updated vertex positions to draw polygons for the faces.
function ticked() {
  // Only updates the position attributes for elements if they are shown
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
    // makes a string with the points for drawing the face polygon
    face.attr("points", (d) =>
      d.vertices.reduce(
        (str, vertexID) =>
          `${str} ${vertices[vertexID].x},${vertices[vertexID].y}`,
        ""
      )
    );
  }
}

/////////////////////////////////////////////////////////////////
// DRAG EVENTS
/////////////////////////////////////////////////////////////////

function dragStart(event, dragType) {
  // Reheat the simulation when drag starts
  if (!event.active) simulation.alphaTarget(0.3).restart();
  let subj = event.subject;

  if (dragType == "face") {
    // Fix all vertices
    subj.vertices.forEach((vertexID) => {
      const vert = vertices[vertexID];
      vert.fx = vert.x;
      vert.fy = vert.y;
    });
  } else if (dragType == "vertex") {
    subj.fx = subj.x;
    subj.fy = subj.y;
  } else if (dragType == "link") {
    subj.source.fx = subj.source.x;
    subj.source.fy = subj.source.y;
    subj.target.fx = subj.target.x;
    subj.target.fy = subj.target.y;
  }
}

function dragged(event, dragType) {
  let subj = event.subject;

  if (dragType == "face") {
    // Update all vertices
    subj.vertices.forEach((vertexID) => {
      const vert = vertices[vertexID];
      vert.fx += event.dx;
      vert.fy += event.dy;
    });
  } else if (dragType == "vertex") {
    subj.fx = event.x;
    subj.fy = event.y;
  } else if (dragType == "link") {
    subj.source.fx += event.dx;
    subj.source.fy += event.dy;
    subj.target.fx += event.dx;
    subj.target.fy += event.dy;
  }
}

function dragEnd(event, dragType) {
  // Restore the target alpha so the simulation cools after dragging ends.
  if (!event.active) simulation.alphaTarget(0);
  let subj = event.subject;

  if (dragType == "face") {
    // Unfix all vertices
    subj.vertices.forEach((vertexID) => {
      const vert = vertices[vertexID];
      vert.fx = null;
      vert.fy = null;
    });
  } else if (dragType == "vertex") {
    subj.fx = null;
    subj.fy = null;
  } else if (dragType == "link") {
    subj.source.fx = null;
    subj.source.fy = null;
    subj.target.fx = null;
    subj.target.fy = null;
  }
}

/////////////////////////////////////////////////////////////////
// RUN SIMULATION
/////////////////////////////////////////////////////////////////

function setBackground() {
  document.body.style.backgroundColor = PARAMS.backgroundColor;
}

function fitEdgeLength() {
  PARAMS.edge_length =
    (0.7 * Math.min(viewHeight, viewWidth)) /
    Math.min(PARAMS.width, PARAMS.height);
}

function runSimulation() {
  // If there is an existing simulation, stop it and set to null
  if (simulation) {
    simulation.stop();
    simulation = null;
    svg.selectChildren().remove();
  }

  fitEdgeLength();

  ({ faces, vertices, stretchLinks, shearLinks, strutLinks } = buildGraph(
    PARAMS.width,
    PARAMS.height
  ));

  simulation = d3
    .forceSimulation(vertices)
    .force("center", centerForce())
    .on("tick", ticked);

  setBackground();
  drawShear();
  drawStrut();
  drawStretch();
  drawFaces();
  drawVertices();

  refreshForces();
  pane.refresh();
}

window.onload = () => {
  runSimulation();
};
