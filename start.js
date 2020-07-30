const config = JSON.parse(require('fs').readFileSync('config.json','utf8'))
const Discord = require('discord.js');
const client = new Discord.Client();
let discordChannel,discordGuild;
client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
	discordChannel=client.channels.cache.get(config.discordChannel);
	//discordChannel.send("Fallback server online!");
});
client.on('message',message=>{
	if(message.channel.id!=config.discordChannel) return
	if(message.author==client.user) return;
	console.log(message)
	const displayName=message.guild.member(message.author).displayName
	sendToClients('[Discord] ['+(displayName?displayName:message.author.username)+'] '+message.content)
})
function sendDiscordEmbeded(message,color,img) {
	discordChannel.send(new Discord.MessageEmbed().setColor(color).setAuthor(message,img));
}

client.login(config.discordToken);
const mc = require('minecraft-protocol');
const Chunk = require('prismarine-chunk')(config.version);
const Vec3 = require('vec3');
const Query= require('mcquery');
const query = new Query(config.normal_server,config.default_port);
const server = mc.createServer({
	"motd":"Fallback Server",
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
	const addr = client.socket.remoteAddress + ":" + client.socket.remotePort
	console.log(client.username + " connected", "(" + addr + ")")
	sendDiscordEmbeded(`${client.username} joined the fallback server`,"#00FF00",`https://minotar.net/helm/${client.username}/128`)

	client.on("end", function () {
		console.log(client.username + " disconnected", "(" + addr + ")")
		sendDiscordEmbeded(`${client.username} left the fallback server`,"#FF0000",`https://minotar.net/helm/${client.username}/128`)
	})
	
	client.slots={}
	client.slot=36;
	client.write('login', {levelType: 'default',gameMode:1,hashedSeed: [0, 0]});
	client.write('position', {x: 0,y: 101,z: 0,yaw: 0,pitch: 0,flags: 0x00});
	sendToClients({
		translate: 'chat.type.announcement',
		"with": [
			'Server',
			'You have been connected to a fallback server, because the normal server is down. The builds here are NOT saved, and are only visible to players currently online. only placed blocks are sent!'
		]
	});
	client.on('chat',packet=>{
		sendToClients({translate:"chat.type.text",with:[client.username,packet.message]})
		discordChannel.send(`${client.username} » ${packet.message}`);
	})
	client.write('map_chunk', {
		x: 0,
		z: 0,
		groundUp: true,
		bitMap: 0xffff,
		chunkData: chunk.dump(),
		blockEntities: []
	});
	client.on('packet',(data,meta)=>{
		if(meta.state!="play") console.log(meta,data);
		if(["flying","look","position","keep_alive","position_look"].includes(meta.name)) return; //stupid amount of spam from this.
		else if(meta.name=="set_creative_slot") client.slots[parseInt(data.slot)]=data.item.blockId;
		else if(meta.name=="held_item_slot") client.slot=data.slotId+36
		else if(meta.name=="block_place") {
			loc=data.location;
			dir=data.direction;
			if(dir==0) loc.y--;
			if(dir==1) loc.y++;
			if(dir==2) loc.z--;
			if(dir==3) loc.z++;
			if(dir==4) loc.x--;
			if(dir==5) loc.x++;
			broadcastPacket("block_change",{
				location:new Vec3(loc.x,loc.y,loc.z),
				type: (client.slots[client.slot] << 4) | 0
			})
		} else console.log(meta.name,data)
	})
	setTimeout(()=>console.log(client.username),1000)
});
function broadcastPacket(name,data) {
	console.log(name,data);
	Object.values(server.clients).forEach(toClient=>{
		toClient.write(name,data)
	})
}
function sendToClients(message) {
	broadcastPacket('chat',{message:JSON.stringify(message),position:0,sender:'0'})
}
setInterval(function () {
	query.connect().then(()=>sendToClients({translate:'chat.type.announcement',with:['Server','normal server seems to be online, no need to stay here :)']}))
		.catch(err=>sendToClients({translate:'chat.type.announcement',with:['Server','normal server is not online.']}))
},15000)
