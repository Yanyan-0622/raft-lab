const Node = require("../node");
const Cluster = require("../cluster");
const Simulator = require("../simulator");
const Network = require("../network");

const nodes = [
    new Node("A"),
    new Node("B"),
    new Node("C")
];

const cluster = new Cluster(nodes);
const simulator = new Simulator(cluster, new Network());

console.log("\n====================");
console.log("SCENARIO: LEADER ELECTION");
console.log("====================");

// 让 B 节点发起选举
simulator.electLeader(nodes[1]);