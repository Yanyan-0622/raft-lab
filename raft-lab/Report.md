# Fundamentals of System Security (COMSM0122)
## Workshop 4: Understanding and Stress-Testing Raft

### Part 1: Establishing Authority (Leader Election)
**Observation:** The cluster started with three followers (A, B, C) at term 0. Node B timed out first, transitioned to a Candidate, incremented its term to 1, and voted for itself. It then requested votes from A and C. Both A and C voted for B, granting B a total of 3 out of 3 votes. Having achieved a majority, B successfully transitioned to Leader.

**Report:** Raft establishes authority before consensus to ensure there is a single coordinator for all operations. In this scenario, Node B initiated an election by becoming a Candidate, incrementing the logical term to 1, and sending RequestVote RPCs. A majority vote (3/3) was required to become Leader. A majority is essential because any two majorities in a cluster always intersect, preventing two leaders from being elected in the same term. Terms act as a logical clock to identify stale leaders; if an old leader reconnects, it recognizes the higher term and steps down. Therefore, leadership is established safely, and the leader is now authorized to coordinate replication and maintain consistency.

---

### Part 2: Maintaining Leadership (Heartbeats)
**Observation:** The scenario initialized Node A as the Leader. Node A periodically sent AppendEntries RPCs to followers B and C. These messages contained an empty entries array (`entries=[]`). Upon receiving these heartbeats, followers implicitly reset their election timers, preventing them from becoming candidates and starting new elections.

**Report:** Once a leader is elected, it must continuously assert its authority to prevent followers from timing out and triggering unnecessary elections. Heartbeats are empty AppendEntries RPCs that serve purely as a liveness signal. Followers reset their election timers every time they receive a heartbeat. If heartbeats stop arriving (e.g., due to leader failure or network partition), followers will eventually time out and transition to candidates, initiating a new election. Raft deliberately uses the AppendEntries message for both log replication and heartbeats to simplify the protocol, reducing the number of distinct RPC types the cluster needs to handle. Stable leadership depends entirely on continuous communication.

---

### Part 3: Leader Failure and Re-Election
**Observation:** Node B was initially the leader. When B failed and went offline, the remaining followers (A and C) stopped receiving heartbeats. Node A timed out first, transitioned to a Candidate, incremented the term to 1, and requested votes. A received 2/3 votes (itself and C, since B is offline), achieving a majority. Node A successfully became the new Leader.

**Report:** When a leader fails, followers detect its absence because they stop receiving periodic heartbeats. This triggers an election timeout in one of the followers (Node A in this case). The follower transitions to a Candidate, increments the current term, and votes for itself. A new term is created to establish a new logical epoch of authority, ensuring that any decisions made under the old leader's term are recognized as historical. Node A collects a majority vote (2 out of 3) from the remaining online nodes, ensuring only one leader is elected. Even if the old leader (B) recovers, it will see Node A's higher term upon communication and automatically step down to a Follower. Terms order the history of authority, ensuring safety is not compromised during leadership transitions.

---

### Part 4: Replicating History
**Observation:** Node B was elected leader. Upon receiving a client request (`instances=10`), the leader created a new log entry at index 1. It then sent AppendEntries RPCs containing this entry to followers A and C. Both followers acknowledged receipt. Once the leader received acknowledgements from a majority of the cluster (in this case, all 3 nodes including itself), the entry was marked as committed.

**Report:** Raft is fundamentally about maintaining a shared log. In this scenario, only the Leader accepts the client request because it is the single authority coordinating the system state. The Leader transforms the request into a LogEntry (containing the index, term, and command) and replicates it by sending AppendEntries RPCs to all followers. An entry becomes committed only when a majority of the nodes (quorum) have acknowledged receiving and storing it. A majority acknowledgement is critical because it guarantees that even if a minority of nodes crash immediately afterward, the committed entry will be preserved on at least one surviving node and can be passed on to future leaders. This ensures durability and consistency across the cluster.

---

### Part 5: Continuing Despite Failure
**Observation:** Node C was taken offline, leaving Nodes A (Leader) and B online. Despite the minority failure, the cluster continued to function. When the leader received a new client request (`instances=10`), it successfully replicated the log entry to the only available follower, Node B. With 2 acknowledgements out of 3 nodes (A and B), the majority quorum was satisfied, and the entry was committed.

**Report:** Raft prioritizes progress through quorums rather than requiring all nodes to be online. In a 3-node cluster, the majority (quorum) is 2. When follower C failed, the cluster retained its majority because Nodes A and B were still online. When the leader created a new log entry, it only needed acknowledgement from one other node (B) to achieve a total of 2, satisfying the quorum requirement. Progress continues because the system only requires a subset of nodes to agree, reducing redundancy but not preventing consensus. A 3-node deployment can tolerate exactly 1 node failure. The nodes essential for progress are the leader and any number of followers that, combined with the leader, form a majority. Raft uses quorums to ensure safety while maximizing availability.

---

### Part 6: When Progress Stops (Majority Lost)
**Observation:** In a 5-node cluster, nodes C, D, and E were taken offline, leaving only nodes A and B online. The cluster requires a majority of 3 nodes to function. Because only 2 nodes were online, the system explicitly stopped making progress. It could not elect a leader, and it could not commit any new entries.

**Report:** Raft strictly prioritizes consistency (safety) over availability. In this scenario, the requirement for a majority quorum (at least 3 out of 5 nodes) was violated. Without a majority, the cluster cannot elect a leader, and any existing leader cannot commit new log entries because it cannot get enough acknowledgements. This deliberate halt in progress protects the system from split-brain scenarios and data loss. If the system allowed a minority of nodes to commit entries, conflicting histories could emerge when the failed nodes recover, destroying the consistency of the shared log. Therefore, Raft sacrifices availability (the system stops responding to new requests) to guarantee that the data remains consistent and safe.

---

### Part 7: Surviving a Network Partition
**Observation:** Before the partition, the leader successfully sent AppendEntries messages to its followers. When the network partition was activated, all outgoing messages were dropped by the network simulator, even though the nodes were technically still online. The cluster stopped making progress. When the partition was repaired, message delivery was restored.

**Report:** A network partition is dangerous because nodes remain operational but lose communication, potentially creating multiple isolated sub-clusters. In this simulation, the leader sent AppendEntries (both heartbeats and log entries), but they were dropped during the partition. Raft prevents split-brain (conflicting histories) by requiring a strict majority quorum to make decisions. Only the partition containing the majority of nodes can elect a leader and commit entries. The side with the minority of nodes cannot elect a leader and will stop processing requests. Therefore, only one partition can evolve the system state, preserving consistency. When the network is repaired, nodes in the minority partition will update their logs to match the authoritative leader.

---

### Part 8: Repairing History (Log Recovery)
**Observation:** The leader had a log length of 5, while the follower had a log length of 3, missing entries at indices 4 and 5. During the recovery process, the follower requested and received the missing entries from the leader. Upon completion, both logs were identical, with the follower's log length increasing to 5.

**Report:** In Raft, the leader is the authoritative source of history. A follower may fall behind due to crashes, restarts, or temporary partitions. When the follower rejoins, the leader detects the mismatch by comparing the prevLogIndex and prevLogTerm during AppendEntries RPCs. The leader then rewinds and sends the missing entries, ensuring the follower's log matches its own. A follower trusts the leader's history because the leader was elected by a majority and its log is guaranteed to be at least as up-to-date as any majority. Log consistency is crucial because conflicting histories would lead to inconsistent application states. By treating the leader as the authoritative source and replaying missing entries, Raft guarantees that all nodes eventually converge to the exact same shared history, ensuring system reliability.

---

### Part 9: Breaking Operational Assumptions
**Observation:** The scenario validated several operational assumptions. It correctly rejected an unsafe election timeout set to 50ms, triggered a leadership churn warning when election counts exceeded 5, and verified that a majority was still available (3 out of 5 nodes). It also listed suggested defenses such as follower lag monitoring and persistent state validation.

**Report:** Raft's correctness relies not only on the protocol but also on operational assumptions. This scenario highlights that poor configurations can cause instability even if the algorithm is correct. If election timeouts are too short, network latency will cause unnecessary elections, leading to "election storms" that consume resources. Leadership churn occurs when the leader changes too frequently, severely degrading performance and delaying replication. Quorum health checks are critical because if a majority is lost, the system halts. Slow followers (lagging) are problematic because they delay log commitment and can be kicked out of the cluster if they fall too far behind. These operational weaknesses do not immediately violate safety, but they destroy reliability and liveness. Monitoring these assumptions (timeouts, churn, quorum, lag) is essential for maintaining a healthy distributed system.

---

### Part 10: Hardening a Raft Deployment
**Weakness being addressed:** In real-world deployments, Raft can suffer from election storms (due to short timeouts), frequent leader changes, lagging followers, or corrupted local state, which degrade availability and reliability even if the protocol logic is technically correct. 

**Assumption being protected:** We protect the assumptions that election timeouts exceed network latency, that leadership remains stable, that a majority quorum is always available, and that followers eventually converge to the leader's log.

**Implementation:** I extended the `hardening.js` script to include automated monitors: (1) `validateElectionTimeout` rejects values under 100ms; (2) `detectElectionStorm` and `detectLeaderChurn` warn on excessive elections; (3) `detectFollowerLag` alerts when a follower is more than 3 entries behind; (4) `validatePersistentState` checks for log contiguity; and (5) `auditLog` timestamps critical events.

**Demonstration:** When run, the script successfully rejected the 50ms timeout, triggered an election storm warning (10 elections/s), detected leadership churn, identified lagging nodes (C and D), and logged the validation event.

**Remaining limitations:** These are purely logical checks within the simulator. A production Raft system would require real network polling, disk I/O verification, TLS/mTLS for secure communication, and persistent WAL (Write-Ahead Logging).

**Additional mechanisms required in production:**
- Persistent disk storage with fsync for log entries and term/votedFor.
- Real network RPCs with timeouts and retries.
- Security (TLS/mTLS for node-to-node and client-to-node communication).
- Snapshotting for log compaction.
- Dynamic cluster membership changes.