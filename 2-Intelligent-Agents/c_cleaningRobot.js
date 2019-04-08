/* The general structure is to put the AI code in xyz.js and the visualization
   code in c_xyz.js. Create a diagram object that contains all the information
   needed to draw the diagram, including references to the environment&agents.
   Then use a draw function to update the visualization to match the data in
   the environment & agent objects. Use a separate function if possible for 
   controlling the visualization (whether through interaction or animation). 
   Chapter 2 has minimal AI and is mostly animations. */

const SIZE = 100;
const colors = {
    perceptBackground: 'hsl(240,10%,85%)',
    perceptHighlight: 'hsl(60,100%,90%)',
    actionBackground: 'hsl(0,0%,100%)',
    actionHighlight: 'hsl(150,50%,80%)'
};


/* Create a diagram object that includes the world (model) and the svg
   elements (view) */
   
var wet = false;

function makeDiagram(selector) {
    let diagram = {}, world = new World(4);
    diagram.world = world;
    diagram.xPosition = (floorNumber) => 150 + floorNumber * 600 / diagram.world.floors.length;

    diagram.root = d3.select(selector);
    diagram.robot = diagram.root.append('g')
        .attr('class', 'robot')
        .style('transform', `translate(${diagram.xPosition(world.location)}px,180px)`);
    diagram.robot.append('rect')
        .attr('width', SIZE)
        .attr('height', SIZE)
        .attr('fill', 'hsl(120,25%,50%)');
    diagram.perceptText = diagram.robot.append('text')
        .attr('x', SIZE/2)
        .attr('y', -25)
        .attr('text-anchor', 'middle');
    diagram.actionText = diagram.robot.append('text')
        .attr('x', SIZE/2)
        .attr('y', -10)
        .attr('text-anchor', 'middle');

    diagram.floors = [];
    for (let floorNumber = 0; floorNumber < world.floors.length; floorNumber++) {
        diagram.floors[floorNumber] =
            diagram.root.append('rect')
            .attr('class', 'clean floor') // for css
            .attr('x', diagram.xPosition(returPositionX(floorNumber)))
            .attr('y', floorNumber < 2 ? 300 : 550)
            .attr('width', SIZE)
            .attr('height', SIZE/4)
            .attr('stroke', 'black')
            .on('click', function() {
                world.markFloorDirty(floorNumber);
                diagram.floors[floorNumber].attr('class', `${wet ? 'wet' : 'dirty'} floor`);
            });
    }
    return diagram;
}


/* Rendering functions read from the state of the world (diagram.world) 
   and write to the state of the diagram (diagram.*). For most diagrams
   we only need one render function. For the vacuum cleaner example, to
   support the different styles (reader driven, agent driven) and the
   animation (agent perceives world, then pauses, then agent acts) I've
   broken up the render function into several. */

function renderWorld(diagram) {
    for (let floorNumber = 0; floorNumber < diagram.world.floors.length; floorNumber++) {
        diagram.floors[floorNumber].attr('class', diagram.world.floors[floorNumber].dirty? 'dirty floor' : 'clean floor');
    }
    diagram.robot.style('transform', `translate(${diagram.xPosition(returPositionX(diagram.world.location))}px,${returnPositionY(diagram.world.location)})`);
}

function renderAgentPercept(diagram, dirty) {

    //let perceptLabel = dirty ?  "It's dirty" : "It's clean";
    let perceptLabel = {false: "It's clean", true: "It's dirty"}[dirty];
   // var user =  {id: 1};
   //user[id]
    diagram.perceptText.text(perceptLabel);
}

function renderAgentAction(diagram, action) {
    let actionLabel = {
        null: 'Waiting', 
        'SUCK': 'Vacuuming', 
        'LEFT_UP': 'Going left up', 
        'RIGHT_UP': 'Going right up',
        'RIGHT_DOWN': 'Going right down',
        'LEFT_DOWN': 'Going left down'
    }[action];
    diagram.actionText.text(actionLabel);
}

function returPositionX(position) {

    switch(position) {
        case 0:
        return 0;
        case 1:
        return 1;
        case 2:
        return 0;
        case 3:
        return 1; 
    }
}

function returnPositionY(location) {
    switch(location) {
        case 0:
        return '180px';
        case 1:
        return '180px';
        case 2:
        return '430px';
        case 3:
        return '430px'; 
    }
}

/* Control the diagram by letting the AI agent choose the action. This
   controller is simple. Every STEP_TIME_MS milliseconds choose an
   action, simulate the action in the world, and draw the action on
   the page. */

const STEP_TIME_MS = 100;
function makeAgentControlledDiagram() {
    let diagram = makeDiagram('#agent-controlled-diagram svg');

    function update() {
        let location = diagram.world.location;
        let percept = diagram.world.floors[location].dirty;
        let action = reflexVacuumAgent(diagram.world);
        diagram.world.simulate(action);
        renderWorld(diagram);
        renderAgentPercept(diagram, percept);
        renderAgentAction(diagram, action);
    }
    update();
    setInterval(update, STEP_TIME_MS);
}


/* Control the diagram by letting the reader choose the action. This
   diagram is tricky.
 
   1. If there's an animation already playing and the reader chooses
      an action then *wait* for the animation to finish playing. While
      waiting the reader may choose a different action. Replace the
      previously chosen action with the new one. (An alternative
      design would be to queue up all the actions.)
   2. If there's not an animation already playing then when the reader
      chooses an action then run it right away, without waiting.
   3. Show the connection between the percept and the resulting action
      by highlighting the percepts in the accompanying table, pausing,
      and then highlighting the action.
*/
function makeReaderControlledDiagram() {
    let diagram = makeDiagram('#reader-controlled-diagram svg');
    let nextAction = null;
    let animating = false; // either false or a setTimeout intervalID

    function makeButton(action, label, x, y) {
        let button = d3.select('#reader-controlled-diagram .buttons')
            .append('button')
            .attr('class', 'btn btn-default')
            .style('position', 'absolute')
            .style('left', x + 'px')
            .style('width', '120px')
            .style('top',  y + 'px')
            .text(label)
            .on('click', () => {
                setAction(action);
                updateButtons();
            });
        button.action = action;
        return button;
    }

    let buttons = [
        makeButton('SUCK', 'Vacuum', 200, 10),
        makeButton('DRY', 'Wet', 400, 10),
        makeButton('LEFT_UP', 'Move left up', 150, 80),
        makeButton('RIGHT_UP', 'Move right up', 300, 80),
        makeButton('RIGHT_DOWN', 'Move right down', 150, 350),
        makeButton('LEFT_DOWN', 'Move left down', 300, 350),
    ];

    function updateButtons() {
        for (let button of buttons) {
            button.classed('btn-warning', button.action == nextAction);
        }
    }

    function setAction(action) {
        nextAction = action;
        if (action === 'DRY') { wet = true; return; } //return
        else if (action === 'SUCK') { wet = false; return; } //return

        if (!animating) { update(); }
    }
    
    function update() {

        let percept = diagram.world.floors[diagram.world.location].dirty;
        if (nextAction !== null) {
            diagram.world.simulate(nextAction);
            renderWorld(diagram);
            renderAgentPercept(diagram, percept);
            renderAgentAction(diagram, nextAction);
            nextAction = null;
            updateButtons();
            animating = setTimeout(update, STEP_TIME_MS);
        } else {
            animating = false;
            renderWorld(diagram);
            renderAgentPercept(diagram, percept);
            renderAgentAction(diagram, null);
        }
    }
}


/* Control the diagram by letting the reader choose the rules that
   the AI agent should follow. The animation flow is similar to the
   first agent controlled diagram but there is an additional table
   UI that lets the reader view the percepts and actions being followed
   as well as change the rules followed by the agent. */
function makeTableControlledDiagram() {
    let diagram = makeDiagram('#table-controlled-diagram svg');

    function update() {
        let table = getRulesFromPage();
        let location = diagram.world.location;
        let percept = diagram.world.floors[location].dirty;
        let action = tableVacuumAgent(diagram.world, table);
        diagram.world.simulate(action);
        renderWorld(diagram);
        renderAgentPercept(diagram, percept);
        renderAgentAction(diagram, action);
        showPerceptAndAction(location, percept, action);
    }
    update();
    setInterval(update, STEP_TIME_MS);
    
    function getRulesFromPage() {
        let table = d3.select("#table-controlled-diagram table");
        let left_clean = table.select("[data-action=left-clean] select").node().value;
        let left_dirty = table.select("[data-action=left-dirty] select").node().value;
        let right_clean = table.select("[data-action=right-clean] select").node().value;
        let right_dirty = table.select("[data-action=right-dirty] select").node().value;
        return [[left_clean, left_dirty], [right_clean, right_dirty]];
    }

    function showPerceptAndAction(location, percept, action) {
        let locationMarker = location? 'right' : 'left';
        let perceptMarker = percept? 'dirty' : 'clean';
        
        d3.selectAll('#table-controlled-diagram th')
            .filter(function() {
                let marker = d3.select(this).attr('data-input');
                return marker == perceptMarker || marker == locationMarker;
            })
            .style('background-color', (d) => colors.perceptHighlight);
        
        d3.selectAll('#table-controlled-diagram td')
            .style('padding', '5px')
            .filter(function() {
                let marker = d3.select(this).attr('data-action');
                return marker == locationMarker + '-' + perceptMarker;
            })
            .transition().duration(0.05 * STEP_TIME_MS)
            .style('background-color', colors.actionHighlight)
            .transition().duration(0.9 * STEP_TIME_MS)
            .style('background-color', colors.actionBackground);
    }
}


makeAgentControlledDiagram();
makeReaderControlledDiagram();
makeTableControlledDiagram();
