// In this simple problem the world includes both the environment and the robot
// but in most problems the environment and world would be separate
class World {
    constructor(numFloors) {
        this.location = 0;
        this.floors = [];
        for (let i = 0; i < numFloors; i++) {
            this.floors.push({dirty: false});
        }
    }

    markFloorDirty(floorNumber) {
        this.floors[floorNumber].dirty = true;
    }

    simulate(action) {
        switch(action) {
        case 'SUCK':
            this.floors[this.location].dirty = false;
            break;
        case 'LEFT_UP':
            this.location = 0;
            break;
        case 'RIGHT_UP':
            this.location = 1;
            break;
        case 'RIGHT_DOWN':
            this.location = 2;
            break;
        case 'LEFT_DOWN':
            this.location = 3;
            break;
        }

        return action;
    }
}


// Rules are defined in code
function reflexVacuumAgent(world) {
    if (world.floors[world.location].dirty) { return 'SUCK'; }
    else if (world.location == 0)           { return 'RIGHT_UP'; }
    else if (world.location == 1)           { return 'LEFT_UP'; }
    else if (world.location == 2)           { return 'RIGHT_DOWN'; }
    else if (world.location == 3)           { return 'LEFT_DOWN'; }
}

// Rules are defined in data, in a table indexed by [location][dirty]
function tableVacuumAgent(world, table) {
    let location = world.location;
    let dirty = world.floors[location].dirty ? 1 : 0;
    
    return table[location][dirty];
}
