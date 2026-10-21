# Raft Lab — COMSM0122 Workshop 4

## Date
2026-10-21

## Overview
A simplified JavaScript Raft simulator for exploring leader election, heartbeats, replication, failure handling, partitions, log recovery, and operational hardening.

## How to Run
```bash
npm install
node scenarios/leader_election.js
node scenarios/heartbeats.js
node scenarios/leader_failure.js
node scenarios/log_replication.js
node scenarios/follower_failure.js
node scenarios/majority_lost.js
node scenarios/network_partition.js
node scenarios/log_recovery.js
node scenarios/hardening.js