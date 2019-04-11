/* The general structure is to put the AI code in xyz.js and the visualization
   code in c_xyz.js. Create a diagram object that contains all the information
   needed to draw the diagram, including references to the environment&agents.
   Then use a draw function to update the visualization to match the data in
   the environment & agent objects. Use a separate function if possible for 
   controlling the visualization (whether through interaction or animation). 
   Chapter 2 has minimal AI and is mostly animations.
   
   A estrutura geral é colocar o código AI em xyz.js e a visualização
   código em c_xyz.js. Crie um objeto de diagrama que contenha todas as informações
   necessário desenhar o diagrama, incluindo referências ao ambiente e aos agentes.
   Em seguida, use uma função de desenho para atualizar a visualização para coincidir com os dados em
   os objetos ambiente e agente. Use uma função separada, se possível para
   controlar a visualização (seja por interação ou animação).
   O Capítulo 2 tem um mínimo de IA e é principalmente animações. */

const SIZE = 100;
const colors = {
    perceptBackground: 'hsl(240,10%,85%)',
    perceptHighlight: 'hsl(60,100%,90%)',
    actionBackground: 'hsl(0,0%,100%)',
    actionHighlight: 'hsl(150,50%,80%)'
};


/* Create a diagram object that includes the world (model) and the svg
   elements (view) */
function makeDiagram(selector) {
    let diagram = {}, world = new World(4);
    diagram.world = world;

    diagram.xPosition = function (floorNumber) {
        if (floorNumber == 0 || floorNumber == 2) {
            return 150;
        } return 450;
    };
    diagram.yPosition = function (floorNumber) {
        if (floorNumber == 0 || floorNumber == 1) {
            return 225;
        } return 525;
    };

    diagram.root = d3.select(selector);
    diagram.robot = diagram.root.append('g')
        .attr('class', 'robot')
        .style('transform', `translate(${diagram.xPosition(world.location)}px,${diagram.yPosition(world.location) - 125}px)`);
    diagram.robot.append('rect')
        .attr('width', SIZE)
        .attr('height', SIZE)
        .attr('fill', 'hsl(120,25%,50%)');
    diagram.perceptText = diagram.robot.append('text')
        .attr('x', SIZE / 2)
        .attr('y', -25)
        .attr('text-anchor', 'middle');
    diagram.actionText = diagram.robot.append('text')
        .attr('x', SIZE / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle');

    diagram.floors = [];
    for (let floorNumber = 0; floorNumber < world.floors.length; floorNumber++) {
        if (floorNumber == 0 || floorNumber == 1) {
            diagram.floors[floorNumber] =
                diagram.root.append('rect')
                    .attr('class', 'clean floor') // for css
                    .attr('x', diagram.xPosition(floorNumber))
                    .attr('y', diagram.yPosition(floorNumber))
                    .attr('width', SIZE)
                    .attr('height', SIZE / 4)
                    .attr('stroke', 'black')
                    .on('click', function () {
                        world.markFloorDirty(floorNumber);
                        diagram.floors[floorNumber].attr('class', 'dirty floor');
                    });
        } else {
            diagram.floors[floorNumber] =
                diagram.root.append('rect')
                    .attr('class', 'clean floor') // for css
                    .attr('x', diagram.xPosition(floorNumber))
                    .attr('y', diagram.yPosition(floorNumber))
                    .attr('width', SIZE)
                    .attr('height', SIZE / 4)
                    .attr('stroke', 'black')
                    .on('click', function () {
                        world.markFloorDirty(floorNumber);
                        diagram.floors[floorNumber].attr('class', 'dirty floor');
                    });
        }
    }
    return diagram;
}


/* Rendering functions read from the state of the world (diagram.world) 
   and write to the state of the diagram (diagram.*). For most diagrams
   we only need one render function. For the vacuum cleaner example, to
   support the different styles (reader driven, agent driven) and the
   animation (agent perceives world, then pauses, then agent acts) I've
   broken up the render function into several.
   
   Funções de renderização lidas do estado do mundo (diagram.world)
   e escreva para o estado do diagrama (diagrama. *). Para a maioria dos diagramas
   nós só precisamos de uma função de renderização. Para o exemplo do aspirador de pó,
   apoiar os diferentes estilos (leitor dirigido, agente orientado) e os
   animação (o agente percebe o mundo, depois faz uma pausa, depois o agente age)
   quebrou a função de renderização em vários.
    */

function renderWorld(diagram) {
    for (let floorNumber = 0; floorNumber < diagram.world.floors.length; floorNumber++) {
        diagram.floors[floorNumber].attr('class', diagram.world.floors[floorNumber].dirty ? 'dirty floor' : 'clean floor');
    }

    diagram.robot.style('transform', `translate(${diagram.xPosition(diagram.world.location)}px,${diagram.yPosition(diagram.world.location) - 125}px)`);
}

function renderAgentPercept(diagram, dirty) {
    let perceptLabel = { false: "It's clean", true: "It's dirty" }[dirty];
    diagram.perceptText.text(perceptLabel);
}

function renderAgentAction(diagram, action) {
    let actionLabel = { null: 'Waiting', 'SUCK': 'Vacuuming', 'LEFT': 'Going Left', 'RIGHT': 'Going Right', 'DOWN': 'Going Down', 'UP': 'Going Up' }[action];
    diagram.actionText.text(actionLabel);
}


/* Control the diagram by letting the AI agent choose the action. This
   controller is simple. Every STEP_TIME_MS milliseconds choose an
   action, simulate the action in the world, and draw the action on
   the page.
   
   Controle o diagrama, permitindo que o agente do AI escolha a ação. este
   controlador é simples. A cada milissegundos de STEP_TIME_MS, escolha um
   ação, simular a ação no mundo, e desenhar a ação em
   a página. */

const STEP_TIME_MS = 2500;
function makeAgentControlledDiagram() {
    let diagram = makeDiagram('#agent-controlled-diagram svg');

    function update() {
        let location = diagram.world.location;
        let percept = diagram.world.floors[location].dirty;
        let action = reflexVacuumAgent(diagram.world);
        diagram.world.simulate(action, location);
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
      
      Controle o diagrama, permitindo que o leitor escolha a ação. este
   diagrama é complicado.
 
   1. Se há uma animação já tocando e o leitor escolhe
      uma ação então * aguarde * a animação terminar de tocar. Enquanto
      esperando o leitor pode escolher uma ação diferente. Substitua o
      ação previamente escolhida com a nova. (Uma alternativa
      design seria colocar em fila todas as ações.)
   2. Se não houver uma animação já tocando, quando o leitor
      escolhe uma ação e depois a executa imediatamente, sem esperar.
   3. Mostre a conexão entre o percepto e a ação resultante
      destacando as percepções na tabela de acompanhamento, pausando,
      e, em seguida, destacando a ação.
*/
function makeReaderControlledDiagram() {
    let diagram = makeDiagram('#reader-controlled-diagram svg');
    let nextAction = null;
    let animating = false; // either false or a setTimeout intervalID

    function makeButton(action, label, x) {
        let button = d3.select('#reader-controlled-diagram .buttons')
            .append('button')
            .attr('class', 'btn btn-default')
            .style('position', 'absolute')
            .style('left', x + 'px')
            .style('width', '100px')
            .text(label)
            .on('click', () => {
                setAction(action);
                updateButtons();
            });
        button.action = action;
        return button;
    }

    let buttons = [
        makeButton('SUCK', 'Vacuum', 100),
        makeButton('LEFT', 'Move Left', 200),
        makeButton('RIGHT', 'Move Right', 300),
        makeButton('DOWN', 'Move Down', 400),
        makeButton('UP', 'Move Up', 500),
    ];

    function updateButtons() {
        for (let button of buttons) {
            button.classed('btn-warning', button.action == nextAction);
        }
    }

    function setAction(action) {
        nextAction = action;
        if (!animating) { update(); }
    }

    function update() {
        let percept = diagram.world.floors[diagram.world.location].dirty;
        let location = diagram.world.location;
        if (nextAction !== null) {
            diagram.world.simulate(nextAction, location);
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
   as well as change the rules followed by the agent.
   
   Controle o diagrama, permitindo que o leitor escolha as regras que
   o agente AI deve seguir. O fluxo de animação é semelhante ao
   primeiro diagrama controlado por agente, mas há uma tabela adicional
   UI que permite ao leitor visualizar as percepções e ações que estão sendo seguidas
   bem como alterar as regras seguidas pelo agente. */
function makeTableControlledDiagram() {
    let diagram = makeDiagram('#table-controlled-diagram svg');

    function update() {
        let table = getRulesFromPage();
        let location = diagram.world.location;
        let percept = diagram.world.floors[location].dirty;
        let action = tableVacuumAgent(diagram.world, table);
        diagram.world.simulate(action, location);
        renderWorld(diagram);
        renderAgentPercept(diagram, percept);
        renderAgentAction(diagram, action);
        showPerceptAndAction(location, percept, action);
    }
    update();
    setInterval(update, STEP_TIME_MS);

    function getRulesFromPage() {
        let table = d3.select("#table-controlled-diagram table");
        let up_left_clean = table.select("[data-action=up_left_clean] select").node().value;
        let up_left_dirty = table.select("[data-action=up_left_dirty] select").node().value;
        let up_right_clean = table.select("[data-action=up_right_clean] select").node().value;
        let up_right_dirty = table.select("[data-action=up_right_dirty] select").node().value;
        let down_left_clean = table.select("[data-action=down_left_clean] select").node().value;
        let down_left_dirty = table.select("[data-action=down_left_dirty] select").node().value;
        let down_right_clean = table.select("[data-action=down_right_clean] select").node().value;
        let down_right_dirty = table.select("[data-action=down_right_dirty] select").node().value;
        return [[up_left_clean, up_left_dirty], [up_right_clean, up_right_dirty], [down_left_clean, down_left_dirty], [down_right_clean, down_right_dirty]];
    }

    function getLocation(location) {
        switch (location) {
            case 0:
                return 'up_left';
            case 1:
                return 'up_right';
            case 2:
                return 'down_left';
            case 3:
                return 'down_right';
        }
    }

    function showPerceptAndAction(location, percept, action) {
        let locationMarker = getLocation(location);
        let perceptMarker = percept ? 'dirty' : 'clean';

        d3.selectAll('#table-controlled-diagram th')
            .filter(function () {
                let marker = d3.select(this).attr('data-input');
                return marker == perceptMarker || marker == locationMarker;
            })
            .style('background-color', (d) => colors.perceptHighlight);

        d3.selectAll('#table-controlled-diagram td')
            .style('padding', '5px')
            .filter(function () {
                let marker = d3.select(this).attr('data-action');
                return marker == locationMarker + '_' + perceptMarker;
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
