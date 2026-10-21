const Node = require("../node");
const Cluster = require("../cluster");
const Simulator = require("../simulator");
const Network = require("../network");

const a = new Node("A");
const b = new Node("B");
const c = new Node("C");

// 先让 A 成为 Leader
a.becomeLeader();

const simulator = new Simulator(new Cluster([a, b, c]), new Network());

console.log("\n====================");
console.log("SCENARIO: HEARTBEATS");
console.log("====================");
console.log("\nLeader A sends periodic heartbeats (empty AppendEntries)");

// 模拟发送 2 轮心跳
for (let i = 1; i <= 2; i++) {
    console.log(`\n--- Heartbeat round ${i} ---`);
    simulator.heartbeat();
}

console.log("\nLESSON:");
console.log("Heartbeats prevent followers from timing out.");