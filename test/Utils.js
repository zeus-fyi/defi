function getCurrentBlock() {
    return web3.eth.getBlock(web3.eth.blockNumber);
}

function getCurrentTimestamp() {
    return getCurrentBlock().timestamp;
}

function increaseTime(addSeconds) {
    web3.currentProvider.send({
        jsonrpc: "2.0", 
        method: "evm_increaseTime", 
        params: [addSeconds], 
        id: 0
    });
    web3.currentProvider.send({
        jsonrpc: "2.0", 
        method: "evm_mine", 
        params: [], 
        id: 0
    });
}


async function expectRevertOrLackOfEther(fn) {
    try {
        await fn();
    } catch (error) {
        let errorStr = error.toString();
        assert(errorStr.includes('VM Exception while processing transaction: revert') ||
               errorStr.includes("sender doesn't have enough funds to send tx"), errorStr);
        return true;
    }
    assert(false, "Should throw exception.");
}

async function expectRevert(fn) {
    try {
        await fn();
    } catch (error) {
        let errorStr = error.toString();
        assert(
            errorStr.includes('VM Exception while processing transaction: revert'), 
            errorStr);
        return true;
    }
    assert(false, "Should throw exception.");
}

function getUsedWeiOnGasAmount(tx) {
    let gasPrice = web3.eth.getTransaction(tx['tx']).gasPrice;
    return tx.receipt.gasUsed * gasPrice;
}


module.exports = {
    expectRevert: expectRevert,
    expectRevertOrLackOfEther: expectRevertOrLackOfEther,
    getCurrentBlock: getCurrentBlock,
    getCurrentTimestamp: getCurrentTimestamp,
    increaseTime: increaseTime,
    getUsedWeiOnGasAmount: getUsedWeiOnGasAmount
};