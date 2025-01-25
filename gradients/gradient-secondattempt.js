/* Work in progress */
var a = new Path.Rectangle([50, 50], [100, 100])
a.style = {
    fillColor: {
        stops: [new GradientStop('red', 0),
                new GradientStop('green', 0.5),
                new GradientStop('blue', 1)],
        origin: a.bounds.topLeft,
        destination: a.bounds.bottomRight
    }
}

class GradientGUI {
    constructor() {
        this.STOP_VERTICAL_OFFSET = 16;
        
        this.position = {
            stops: []
        };
    }
    
    create(specs) {
        
    }
    
    updatePositions(specs) {
        this.position.start = specs.start;
        this.position.end = specs.end;
        
        var delta = specs.end.subtract(specs.start)
        this.position.delta = delta;
        var normal = new paper.Point({
            length: this.STOP_VERTICAL_OFFSET,
            angle: delta.angle + 90
        })
        this.position.startShifted = specs.start.add(normal);
    }
}
