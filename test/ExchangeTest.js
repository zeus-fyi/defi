const TokenMock = artifacts.require('./utils/TokenMock.sol');
const Exchange = artifacts.require('./Exchange.sol');


var utils = require('web3-utils');

let owner;
let maker;
let taker;
let admin;
let feeAccount;

let exchange;

let token;
let oneHundredTokens = web3.toWei(100, "ether");
let fiftyTokens = web3.toWei(50, "ether");

let etherAddress = '0x0000000000000000000000000000000000000000';

let oneEther = web3.toWei(1, "ether");
let oneFinney = web3.toWei(1, "finney");
let twoFinney = web3.toWei(2, "finney");

let nonce = 0;

contract('ExchangeTest', (accounts) => {

    beforeEach(async () => {
        owner = accounts[0];
        maker = accounts[1];
        taker = accounts[2];        
        admin = accounts[3];
        feeAccount = accounts[4];

        exchange = await Exchange.new(feeAccount);

        await exchange.setAdmin(admin, true);

        token = await TokenMock.new('token', 'T1', 18);
        await token.mint(maker, oneHundredTokens);
        await token.mint(taker, oneHundredTokens);
    });
            
    //helper method
    let getRSV = function(signedMsg) {
        const r = signedMsg.substr(0, 66);
        const s = '0x' + signedMsg.substr(66, 64);
        const v = '0x' + signedMsg.substr(130, 2);
        const v_decimal = web3.toDecimal(v) + 27;
        return [r, s, v_decimal];
    };

    //fake nonce
    let getNonce = function() {
        nonce += 1;
        return nonce;
    };

    it("deposit and signed (admin) withdrawal of ether works correctly", async () => {
        await exchange.deposit({from: maker, value: oneEther});
        assert(oneEther == (await exchange.balanceOf(etherAddress, maker)), "deposit amount correctly");

        const feeDue = oneEther * 1 / 1000;
        const nonce = getNonce();
        let withdrawHash = utils.soliditySha3(exchange.address, etherAddress, oneEther, maker, nonce);
        let signedWithdrawHash = await web3.eth.sign(maker, withdrawHash);
        let [r, s, v] = getRSV(signedWithdrawHash);

        await exchange.adminWithdraw(etherAddress, oneEther, maker, nonce, v, r, s, oneFinney, {from: admin});
        assert(0 == (await exchange.balanceOf(etherAddress, maker)), "withdrawal works correctly");
        assert(feeDue == (await exchange.balanceOf(etherAddress, feeAccount)), "withdrawal fee is correct");
    });

    it("deposit and signed (admin) withdrawal of tokens works correctly", async () => {
        await token.approve(exchange.address, oneHundredTokens, {from: maker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: maker});
        assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker)).toNumber(), "token deposit works correctly");

        const feeDue = oneHundredTokens * 1 / 1000;
        const nonce = getNonce();
        let withdrawHash = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, maker, nonce);
        let signedWithdrawHash = await web3.eth.sign(maker, withdrawHash);
        let [r, s, v] = getRSV(signedWithdrawHash);

        await exchange.adminWithdraw(token.address, oneHundredTokens, maker, nonce, v, r, s, oneFinney, {from: admin});
        assert(0 == (await exchange.balanceOf(token.address, maker)), "withdrawal works correctly");
        assert(feeDue == (await exchange.balanceOf(token.address, feeAccount)), "withdrawal fee is correct");
    });

    it("deposit and emergency withdrawal of ether works correctly", async () => {
        await exchange.deposit({from: maker, value: oneEther});
        assert(oneEther == (await exchange.balanceOf(etherAddress, maker)), "deposit amount correctly");

        await exchange.setInactivityReleasePeriod(0);
        await exchange.withdraw(etherAddress, oneEther, {from: maker});
        assert(0 == (await exchange.balanceOf(etherAddress, maker)), "withdrawal works correctly");        
    });


    it("deposit and emergency withdrawal of tokens works correctly", async () => {
        await token.approve(exchange.address, oneHundredTokens, {from: maker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: maker});
        assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker)).toNumber(), "token deposit works correctly");

        await exchange.setInactivityReleasePeriod(0);
        await exchange.withdraw(token.address, oneHundredTokens, {from: maker});
        assert(0 == (await exchange.balanceOf(token.address, maker)), "token withdrawal works correctly");        
    });

    it("simple trade works correctly and fees match", async () => {

        //maker one wants to transfer their ether for erc20 tokens
        await exchange.deposit({from: maker, value: oneEther});

        //taker accepts a trade of their erc20 for ether
        await token.approve(exchange.address, oneHundredTokens, {from: taker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: taker});

        //0.1%
        let makerFee = oneFinney;
        //0.2%
        let takerFee = twoFinney;
        
        let orderNonce = getNonce();
        let tradeNonce = getNonce();

        //sign order
        let orderHash = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, 
            etherAddress, oneEther, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //sign trade
        let tradeHash = utils.soliditySha3(orderHash, oneHundredTokens, taker, tradeNonce);
        let signedTradeHash = await web3.eth.sign(taker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);

        //prepare arguments
        let tradeValues = [oneHundredTokens, oneEther, 
            orderNonce, oneHundredTokens, tradeNonce, makerFee, takerFee];
        let tradeAddresses = [token.address, etherAddress, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];

        //execute
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin});

        let takerFeeDue = oneEther * 2 / 1000;
        let makerFeeDue = oneHundredTokens * 1 / 1000;

        assert(takerFeeDue == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "taker fee matches");
        assert(makerFeeDue == (await exchange.balanceOf(token.address, feeAccount)).toNumber(), "maker fee matches");

        assert(oneHundredTokens - makerFeeDue == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has tokens");
        assert(oneEther - takerFeeDue == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker has ether");
    });

    it("partial trade works correctly and fees match", async () => {

        //maker one wants to transfer their ether for erc20 tokens
        await exchange.deposit({from: maker, value: oneEther});

        //taker accepts a trade of their erc20 for ether
        await token.approve(exchange.address, oneHundredTokens, {from: taker});
        await exchange.depositToken(token.address, oneHundredTokens, {from: taker});

        //0.1%
        let makerFee = oneFinney;
        //0.2%
        let takerFee = twoFinney;
        
        let orderNonce = getNonce();
        let tradeNonce = getNonce();

        //sign order
        let orderHash = utils.soliditySha3(exchange.address, token.address, oneHundredTokens, 
            etherAddress, oneEther, orderNonce, maker);
        let signedOrderHash = await web3.eth.sign(maker, orderHash);
        let [r1, s1, v1] = getRSV(signedOrderHash);

        //sign trade - only half of the available order
        let tradeHash = utils.soliditySha3(orderHash, fiftyTokens, taker, tradeNonce);
        let signedTradeHash = await web3.eth.sign(taker, tradeHash);
        let [r2, s2, v2] = getRSV(signedTradeHash);

        //prepare arguments
        let tradeValues = [oneHundredTokens, oneEther, 
            orderNonce, fiftyTokens, tradeNonce, makerFee, takerFee];
        let tradeAddresses = [token.address, etherAddress, maker, taker];
        let v = [v1, v2];
        let rs = [r1, s1, r2, s2];

        //execute
        await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin});

        //half of ether
        let takerFeeDue = (oneEther/2) * 2 / 1000;
        //fifty tokens
        let makerFeeDue = fiftyTokens * 1 / 1000;

        assert(takerFeeDue == (await exchange.balanceOf(etherAddress, feeAccount)).toNumber(), "taker fee matches");
        assert(makerFeeDue == (await exchange.balanceOf(token.address, feeAccount)).toNumber(), "maker fee matches");

        assert(fiftyTokens - makerFeeDue == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has tokens");
        assert(oneEther/2 - takerFeeDue == (await exchange.balanceOf(etherAddress, taker)).toNumber(), "taker has ether");
    });

    // //this test is a copy of the demo dapp
    // it("trade still works and fees are correct when maker is the taker", async () => {

    //     exchange = Exchange.at('0x345ca3e014aaf5dca488057592ee47305d9b3e10');
    //     await exchange.setAdmin(admin, true);

    //     token = TokenMock.at('0x8f0483125fcb9aaaefa9209d8e9d7b9c8b9fb90f');
    //     maker = owner;
    //     await token.mint(maker, oneHundredTokens);

    //     //maker one wants to transfer their ether for erc20 tokens
    //     await exchange.deposit({from: maker, value: oneEther});

    //     //taker who is also maker accepts a trade of their erc20 for ether
    //     await token.approve(exchange.address, oneHundredTokens, {from: maker});
    //     await exchange.depositToken(token.address, oneHundredTokens, {from: maker});

    //     let makerFee = 0;
    //     let takerFee = 0;
        
    //     let orderNonce = 0;
    //     let tradeNonce = 1;

    //     //sign order
    //     let orderHash = utils.soliditySha3(exchange.address, etherAddress, oneEther, 
    //         token.address, oneHundredTokens, orderNonce, maker);
    //     let signedOrderHash = await web3.eth.sign(maker, orderHash);
    //     let [r1, s1, v1] = getRSV(signedOrderHash);

    //     //sign trade
    //     let tradeHash = utils.soliditySha3(orderHash, oneEther, maker, tradeNonce);
    //     let signedTradeHash = await web3.eth.sign(maker, tradeHash);
    //     let [r2, s2, v2] = getRSV(signedTradeHash);

    //     //prepare arguments
    //     let tradeValues = [oneEther, oneHundredTokens, 
    //         orderNonce, oneEther, tradeNonce, makerFee, takerFee];
    //     let tradeAddresses = [etherAddress, token.address, maker, maker];
    //     let v = [v1, v2];
    //     let rs = [r1, s1, r2, s2];

    //     //execute
    //     await exchange.trade(tradeValues, tradeAddresses, v, rs, {from: admin});

    //     assert(oneHundredTokens == (await exchange.balanceOf(token.address, maker)).toNumber(), "maker has tokens");
    //     assert(oneEther == (await exchange.balanceOf(etherAddress, maker)).toNumber(), "taker has ether");
    // });
  
})