console.log("\n====================");
console.log("HARDENING RAFT (ENHANCED)");
console.log("====================");


function validateElectionTimeout(timeout) {
    if (timeout < 100) throw new Error("Unsafe election timeout: " + timeout);
    return true;
}


function detectElectionStorm(electionsInWindow, windowMs) {
    const rate = electionsInWindow / (windowMs / 1000);
    if (electionsInWindow > 5) {
        console.log(`WARNING: ELECTION STORM (${electionsInWindow} elections in ${windowMs}ms, ${rate.toFixed(2)}/s)`);
        return true;
    }
    return false;
}


function detectLeaderChurn(elections) {
    if (elections > 5) console.log("WARNING: LEADERSHIP CHURN (" + elections + " elections)");
}


function validateMajority(total, online) {
    const majority = Math.floor(total / 2) + 1;
    const ok = online >= majority;
    if (!ok) console.log(`WARNING: NO QUORUM (online=${online}, need=${majority})`);
    return ok;
}


function detectFollowerLag(leaderLogLen, followerLogLens) {
    for (const [id, len] of Object.entries(followerLogLens)) {
        const lag = leaderLogLen - len;
        if (lag > 3) {
            console.log(`WARNING: FOLLOWER LAG on ${id}: ${lag} entries behind leader`);
        }
    }
}


function validatePersistentState(node) {
    if (node.currentTerm < 0) console.log(`ERROR: ${node.id} invalid term`);
    if (node.log.length > 0) {
        for (let i = 1; i < node.log.length; i++) {
            if (node.log[i].index !== node.log[i - 1].index + 1) {
                console.log(`ERROR: ${node.id} non-contiguous log at index ${i}`);
                return false;
            }
        }
    }
    return true;
}


function auditLog(event, detail) {
    console.log(`[AUDIT] ${new Date().toISOString()} | ${event} | ${detail}`);
}



try { validateElectionTimeout(50); }
catch (e) { console.log(e.message); }

detectElectionStorm(10, 1000);
detectLeaderChurn(10);
validateMajority(5, 3);
detectFollowerLag(10, { B: 10, C: 6, D: 2 });  


const fakeNode = { id: "A", currentTerm: 2, log: [{ index: 1 }, { index: 2 }] };
validatePersistentState(fakeNode);

auditLog("CONFIG_VALIDATED", "election timeout, quorum, persistence");

console.log("\nSuggested Defences");
console.log("- Election timeout validation");
console.log("- Leader churn / election storm monitoring");
console.log("- Quorum health checks");
console.log("- Follower lag monitoring");
console.log("- Persistent state verification");
console.log("- Audit logging");