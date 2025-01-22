bounds = [1,15]

theLayer = project.activeTimeline.layers[0]

startFrame = theLayer.getFrameAtPlayheadPosition(bounds[0])
endFrame = theLayer.getFrameAtPlayheadPosition(bounds[1])

start = startFrame._children[0]._view._item;
end = endFrame._children[0]._view._item;

between = new paper.Path();
between.style = {
    strokeWidth: 5,
    strokeColor: 'red'
}
function createInterpolation(startPath, endPath, usedPath) {
    // Path coercion.
    // Paper.js won't interpolate if the two paths have a different amount of segments.
    while (startPath.segments.length < endPath.segments.length) {
        startPath.add(startPath.segments.at(-1));
    }
    while (startPath.segments.length > endPath.segments.length) {
        endPath.add(endPath.segments.at(-1));
    }
    
    return (factor) => usedPath.interpolate(startPath, endPath, factor);
}
s = start.clone()
e = end.clone()
a = createInterpolation(s, e, between);
s.remove()
e.remove()

for (let i = bounds[0]+1; i<bounds[1]; i++) {
    a(i/(bounds[1]-bounds[0]+1))
    newframe = new Wick.Frame({start: i})
    newframe.addPath(new Wick.Path({path: between.clone()}))
    theLayer.addFrame(newframe)
}
