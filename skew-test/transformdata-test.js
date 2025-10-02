var a = new Path.Rectangle({
    center: [0, 0],
    size: [80, 60],
    fillColor: 'brown',
    applyMatrix: false,
    data: {
        transformData: {
            position: new Point(400, 360),
            skew: new Point(0, 0),
            scale: new Point(1, 1),
            rotation: 0
        }
    }
});

function update(object) {
    object.matrix.reset();
    var transform = object.data.transformData;
    object.translate(transform.position);
    object.scale(transform.scale);
    object.shear(transform.skew);
    object.rotate(transform.rotation);
}
function t(o,m,p) {
    o.translate(p*-1).transform(m).translate(p);
}
function tp(o,m,p) {
    return o.add(p*-1).transform(m).add(p);
}

a.data.transformData.scale.x = 5;
a.data.transformData.scale.y = 2;
a.data.transformData.skew.x = 0;
a.data.transformData.skew.y = 0;
a.data.transformData.rotation = 0;
update(a);
z = a.clone();
z.data.transformData = Object.assign({}, z.data.transformData);
z.fillColor = null;
z.strokeColor = 'grey'; z.strokeWidth = 2; z.strokeScaling = false;
z.data.transformData.skew = new Point(1, 0.5);
update(z);
b = new Path.Circle({
    center: a.bounds.topCenter - new Point(2*a.bounds.height, 0),
    radius: 3,
    fillColor: 'green'
});
c = new Path.Circle({
    center: a.bounds.topCenter,
    radius: 3,
    fillColor: 'green'
});
//console.clear()
//window.console.clear()
//console.log(a.bounds)

var down, pivot, height, scale, skew, matrix;
var originalSkew, originalRotation;
function onMouseDown(e) {
    down = e.point;
    scale = new Point(1, 1);
    skew = new Point(0, 0);
    
    var transform = a.data.transformData;
    matrix = new Matrix().rotate(transform.rotation).shear(transform.skew); // ????
    originalSkew = transform.skew;
    originalRotation = transform.rotation;
    
    t(a, matrix.inverted(), transform.position);
    width = a.bounds.width; height = a.bounds.height;
    pivot = tp(a.bounds.bottomCenter, matrix, transform.position);
    t(a, matrix, transform.position);
    
    console.log(height, matrix, originalSkew)
}
function onMouseDrag(e) {
    var delta = e.point - down;
    //scale = new Point(1, 1 + -2 * delta.y / (height));
    skew = new Point(-2 * delta.x / height, -2 * delta.y / width);
    
    t(a, matrix.inverted(), a.data.transformData.position);
    matrix.reset();
    matrix.rotate(originalRotation).shear((skew.x+originalSkew.x) / (scale.y/scale.x), (skew.y+originalSkew.y) / (scale.x/scale.y)).scale(scale);
    t(a, matrix, a.data.transformData.position);
}
function onMouseUp(e) {
    a.data.transformData.position = a.position.clone();
    a.data.transformData.scale = a.data.transformData.scale * scale;
    a.data.transformData.skew.x = (skew.x+originalSkew.x) / (scale.y/scale.x);
    a.data.transformData.skew.y = (skew.y+originalSkew.y) / (scale.x/scale.y);
    update(a)
    //console.log(scale, skew)
    //console.log(a.data.transformData.scale.y, a.data.transformData.skew.x);
}
