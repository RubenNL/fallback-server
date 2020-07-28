const config = JSON.parse(require('fs').readFileSync('config.json','utf8'))
const mc = require('minecraft-protocol');
const Chunk = require('prismarine-chunk')(config.version);
const Vec3 = require('vec3');
const Query=require('mcquery');
const query = new Query(config.normal_server,config.default_port);
const server = mc.createServer({
	'online-mode': false,
	port: config.server_port,
	version: config.version
});
var chunk = new Chunk();
for (var x = 0; x < 16;x++) {
	for (var z = 0; z < 16; z++) {
		chunk.setBlockType(new Vec3(x, 100, z), 2);
		for (var y = 0; y < 256; y++) {
			chunk.setSkyLight(new Vec3(x, y, z), 15);
		}
	}
}

console.log('started!')
server.on('login', function(client) {
	client.write('login', {levelType: 'default',hashedSeed: [0, 0]});
	client.write('position', {x: 0,y: 101,z: 0,yaw: 0,pitch: 0,flags: 0x00});
	sendToClients({
		translate: 'chat.type.announcement',
		"with": [
			'Server',
			'You have been connected to a fallback chat-only server, because the normal server is down.'
		]
	});
	client.on('chat',packet=>sendToClients({translate:"chat.type.text",with:[client.username,packet.message]}))
	client.write('map_chunk', {
		x: 0,
		z: 0,
		groundUp: true,
		bitMap: 0xffff,
		chunkData: chunk.dump(),
		blockEntities: []
	});
	client.on('packet',packet=>console.log(packet))
});
function sendToClients(message) {
	Object.values(server.clients).forEach(toClient=>{
		toClient.write("chat",{message:JSON.stringify(message),position:0,sender:'0'})
	})
}
setInterval(function () {
	query.connect().then(()=>sendToClients({translate:'chat.type.announcement',with:['Server','normal server seems to be online, no need to stay here :)']}))
		.catch(err=>sendToClients({translate:'chat.type.announcement',with:['Server','normal server is not online.']}))
},15000)
