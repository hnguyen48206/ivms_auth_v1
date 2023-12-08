const net = require("net");

var server = net.createServer(function (c) {
    var oldWrite = c.write;
    c.write = function(d) {
        if (!Buffer.isBuffer(d)) {
            d = new Buffer(d);
        }
        oldWrite.call(this, d);
        server.bytesSent += d.length;
    };

    c.on('data', function(d){
        server.bytesReceived += d.length;
    });

    c.write('Hello world!\r\n');
    c.pipe(c);
    c.end();
});

server.bytesReceived = 0;
server.bytesSent = 0;

server.listen(5000);

var units = ["B", "kB", "MB", "TB"];
function simplifiedUnits(input) {
    var unit = units[0];
    var i = 0;
    while (input > 1024 && ++i) {
        unit = units[i];
        input /= 1024;
    }
    return Math.round(input) + " " + unit;
}

var time = process.hrtime();
setInterval(function (){
    process.stdout.write('\u001B[2J\u001B[0;0f');
    var diff = process.hrtime(time)[0] + process.hrtime(time)[1]/1000000000;
    var bpsSent = Math.round(server.bytesSent/diff) || 0;
    var bpsReceived = Math.round(server.bytesReceived/diff) || 0;
    console.log("Running node.js %s on %s-%s", process.version, process.platform, process.arch);
    console.log("Memory usage: %s", simplifiedUnits(process.memoryUsage().rss));
    console.log("Uptime: %ds", Math.round(process.uptime()));
    console.log("Open connections: %d", server.connections);
    console.log("In: %s (%s/s)", simplifiedUnits(server.bytesReceived), simplifiedUnits(bpsReceived));
    console.log("Out: %s (%s/s)", simplifiedUnits(server.bytesSent), simplifiedUnits(bpsSent));
}, 100);